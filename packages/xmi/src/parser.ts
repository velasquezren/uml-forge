import {
  ok,
  err,
  type Position,
  type Result,
  type UMLClass,
  type UMLEnum,
  type UMLModel,
  type UMLRelationship,
} from '@uml-forge/uml-core';
import { XMLParser } from 'fast-xml-parser';
import { autoLayout } from './autolayout.js';
import { invalidXmlError, missingModelError, type XmiError } from './errors.js';
import {
  collectClassOwnedEnds,
  emptyClassOwnedEnds,
  parseAssociation,
} from './parser-associations.js';
import { parseAttributes, parseInheritance, parseOperations } from './parser-classifiers.js';
import { parseDependency } from './parser-dependencies.js';
import {
  dependencyKindOf,
  flattenElements,
  isClassifier,
  isEnumeration,
  isModelElement,
  modelIdentity,
  readEaPropertyTypes,
} from './parser-structure.js';
import { IdMapper, toArray } from './parser-helpers.js';
import { readDiagramPositions } from './parser-positions.js';
import { asNode, attr, firstAttr, type RawXmlNode } from './raw-xml.js';
import type { XmiImportOptions } from './types.js';

/** Origen del que no hay coordenadas: el auto-layout decidira donde va. */
const NO_POSITION: Position = { x: 0, y: 0 };

/** Importa un documento XMI 2.1 y lo transforma en un modelo UML valido de UML Forge. */
export function importXmi(
  xmlContent: string,
  options?: Partial<XmiImportOptions>,
): Result<UMLModel, XmiError> {
  const allowAutoLayout = options?.autoLayout ?? true;
  const fallbackName = options?.fallbackName ?? 'Imported Model';

  const parsed = parseXml(xmlContent);
  if (!parsed.ok) {
    return parsed;
  }

  const root = parsed.value;
  const modelNode = asNode(root['uml:Model'] ?? root['Model'] ?? root['packagedElement']);
  if (modelNode === null) {
    return err(missingModelError());
  }

  const idMapper = new IdMapper();
  const positions = readDiagramPositions(root, modelNode);

  const classes: UMLClass[] = [];
  const enums: UMLEnum[] = [];
  const relationships: UMLRelationship[] = [];

  // Enterprise Architect anida las clases dentro de uno o varios paquetes: sin
  // recorrerlos el modelo se importaria vacio.
  const rawElements = flattenElements(modelNode);

  // Mapeo de definiciones de tipos (PrimitiveType, DataType, Class, Enum)
  const typeDefs = new Map<string, string>();
  for (const element of rawElements) {
    const rawId = attr(element, 'xmi:id');
    const name = attr(element, 'name');
    if (rawId && name) {
      typeDefs.set(rawId, name);
    }
  }

  // Los clasificadores se registran antes de leer ningun tipo: asi una
  // referencia a una clase nunca se confunde con un primitivo por su nombre.
  for (const element of rawElements) {
    const kind = firstAttr(element, 'xmi:type', 'type') ?? '';
    const rawId = attr(element, 'xmi:id');
    if (rawId !== undefined && (isClassifier(kind) || isEnumeration(kind))) {
      idMapper.toUuid(rawId);
    }
  }

  // Tipos de propiedades extraidos de la extension de Enterprise Architect
  const eaPropertyTypes = readEaPropertyTypes(root, modelNode);

  // Primera pasada: los extremos de asociacion que poseen las clases, porque
  // una asociacion puede aparecer antes que la clase que guarda su extremo.
  const classOwnedEnds = emptyClassOwnedEnds();
  for (const element of rawElements) {
    if (isClassifier(firstAttr(element, 'xmi:type', 'type') ?? '')) {
      collectClassOwnedEnds(element, attr(element, 'xmi:id'), classOwnedEnds);
    }
  }

  for (const element of rawElements) {
    const kind = firstAttr(element, 'xmi:type', 'type') ?? '';
    const rawId = attr(element, 'xmi:id');
    if (!isModelElement(kind)) {
      // Tipos primitivos, notas, perfiles: no se registran como elementos para
      // que sus identificadores sigan resolviendose como tipos.
      continue;
    }
    const elementId = idMapper.toUuid(rawId);
    const name = attr(element, 'name') ?? 'Unnamed';
    const position = (rawId === undefined ? undefined : positions.get(rawId)) ?? NO_POSITION;

    if (isClassifier(kind)) {
      const isInterface = kind.includes('Interface');
      classes.push({
        id: elementId,
        name,
        isAbstract: attr(element, 'isAbstract') === 'true' || isInterface,
        isInterface,
        stereotypes: isInterface ? ['interface'] : [],
        attributes: parseAttributes(element, idMapper, typeDefs, eaPropertyTypes),
        operations: parseOperations(element, idMapper, isInterface, typeDefs),
        position,
      });
      relationships.push(...parseInheritance(element, elementId, idMapper));
      continue;
    }

    if (isEnumeration(kind)) {
      enums.push({
        id: elementId,
        name,
        literals: toArray(element['ownedLiteral'] as RawXmlNode[]).map(
          (literal) => attr(literal, 'name') ?? 'LITERAL',
        ),
        position,
      });
      continue;
    }

    if (kind === 'uml:Association' || kind === 'Association') {
      const association = parseAssociation(
        element,
        elementId,
        rawId,
        name,
        idMapper,
        classOwnedEnds,
      );
      if (association !== null) {
        relationships.push(association);
      }
      continue;
    }

    const dependencyKind = dependencyKindOf(kind);
    if (dependencyKind !== null) {
      const dependency = parseDependency(element, elementId, dependencyKind, name, idMapper);
      if (dependency !== null) {
        relationships.push(dependency);
      }
    }
  }

  const now = new Date().toISOString();
  const identity = modelIdentity(modelNode);
  const model: UMLModel = {
    id: idMapper.toUuid(identity.rawId),
    name: identity.name ?? fallbackName,
    classes,
    enums,
    relationships,
    createdAt: now,
    updatedAt: now,
  };

  // El auto-layout solo entra cuando el documento no traia coordenadas: una
  // herramienta externa que si las exporta no debe ver su diagrama recolocado.
  return ok(allowAutoLayout && lacksPositions(model) ? autoLayout(model) : model);
}

/** Parsea el XML y devuelve la raiz, tolerando documentos sin envoltorio `xmi:XMI`. */
function parseXml(xmlContent: string): Result<RawXmlNode, XmiError> {
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
  });

  let document: unknown;
  try {
    document = xmlParser.parse(xmlContent);
  } catch (error) {
    return err(invalidXmlError(error instanceof Error ? error.message : String(error)));
  }

  const parsedRoot = asNode(document);
  if (parsedRoot === null) {
    return err(invalidXmlError('el documento no contiene ningun elemento'));
  }
  return ok(asNode(parsedRoot['xmi:XMI'] ?? parsedRoot['XMI']) ?? parsedRoot);
}

/** Cierto cuando ningun clasificador trae coordenadas propias del documento. */
function lacksPositions(model: UMLModel): boolean {
  const placed = [...model.classes, ...model.enums];
  return placed.every(({ position }) => position.x === 0 && position.y === 0);
}
