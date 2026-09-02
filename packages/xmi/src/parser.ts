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
import { IdMapper, toArray } from './parser-helpers.js';
import { asNode, attr, firstAttr, numericAttr, type RawXmlNode } from './raw-xml.js';
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
        attributes: parseAttributes(element, idMapper),
        operations: parseOperations(element, idMapper, isInterface),
        position,
      });
      relationships.push(...parseInheritance(element, elementId, idMapper));
      continue;
    }

    if (kind === 'uml:Enumeration' || kind === 'Enumeration') {
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
    }
  }

  const now = new Date().toISOString();
  const model: UMLModel = {
    id: idMapper.toUuid(attr(modelNode, 'xmi:id')),
    name: attr(modelNode, 'name') ?? fallbackName,
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

/**
 * Recoge las coordenadas de la extension de diagrama, indexadas por el
 * identificador original del documento y no por el UUID ya traducido.
 */
function readDiagramPositions(root: RawXmlNode, modelNode: RawXmlNode): Map<string, Position> {
  const positions = new Map<string, Position>();
  const extensions = toArray(root['xmi:Extension'] ?? modelNode['xmi:Extension']) as RawXmlNode[];

  for (const extension of extensions) {
    const container = asNode(extension['diagramElements'] ?? extension['elements']);
    if (container === null) {
      continue;
    }
    for (const element of toArray(container['element']) as RawXmlNode[]) {
      const idRef = firstAttr(element, 'xmi:idref', 'idref');
      if (idRef !== undefined) {
        positions.set(idRef, {
          x: numericAttr(element, 'x', 0),
          y: numericAttr(element, 'y', 0),
        });
      }
    }
  }

  return positions;
}

/**
 * Aplana la jerarquia de paquetes y devuelve todos los elementos empaquetados
 * del documento, sin importar a que profundidad esten.
 */
function flattenElements(node: RawXmlNode): RawXmlNode[] {
  const children = toArray(node['packagedElement'] ?? node['ownedElement']) as RawXmlNode[];
  const flattened: RawXmlNode[] = [];

  for (const child of children) {
    if (isContainer(firstAttr(child, 'xmi:type', 'type') ?? '')) {
      flattened.push(...flattenElements(child));
      continue;
    }
    flattened.push(child);
  }

  return flattened;
}

/** Paquetes y modelos anidados: contienen elementos, no son elementos del modelo. */
function isContainer(kind: string): boolean {
  return kind === 'uml:Package' || kind === 'Package' || kind === 'uml:Model' || kind === 'Model';
}

/** Indica si el elemento empaquetado es una clase o una interfaz. */
function isClassifier(kind: string): boolean {
  return (
    kind === 'uml:Class' || kind === 'uml:Interface' || kind === 'Class' || kind === 'Interface'
  );
}

/** Cierto cuando ningun clasificador trae coordenadas propias del documento. */
function lacksPositions(model: UMLModel): boolean {
  const placed = [...model.classes, ...model.enums];
  return placed.every(({ position }) => position.x === 0 && position.y === 0);
}
