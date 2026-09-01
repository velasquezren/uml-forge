import { randomUUID } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import {
  ok,
  err,
  type Result,
  type UMLClass,
  type UMLEnum,
  type UMLModel,
  type UMLOperation,
  type UMLParameter,
  type UMLProperty,
  type UMLRelationship,
} from '@uml-forge/uml-core';
import { autoLayout } from './autolayout.js';
import { invalidXmlError, missingModelError, type XmiError } from './errors.js';
import {
  IdMapper,
  normalizeMultiplicity,
  normalizeType,
  normalizeVisibility,
  toArray,
} from './parser-helpers.js';
import type { XmiImportOptions } from './types.js';

interface RawXmlNode {
  [key: string]: unknown;
}

/** Importa un documento XMI 2.1 y lo transforma en un modelo UML valido de UML Forge. */
export function importXmi(
  xmlContent: string,
  options?: Partial<XmiImportOptions>,
): Result<UMLModel, XmiError> {
  const shouldAutoLayout = options?.autoLayout ?? true;
  const fallbackName = options?.fallbackName ?? 'Imported Model';

  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
  });

  let parsed: RawXmlNode;
  try {
    parsed = xmlParser.parse(xmlContent) as RawXmlNode;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(invalidXmlError(msg));
  }

  const root = ((parsed['xmi:XMI'] || parsed['XMI'] || parsed) ?? {}) as RawXmlNode;
  const modelNode = (root['uml:Model'] || root['Model'] || root['packagedElement']) as
    RawXmlNode | undefined;

  if (!modelNode) {
    return err(missingModelError());
  }

  const idMapper = new IdMapper();
  const modelId = idMapper.toUuid(modelNode['@_xmi:id'] as string | undefined);
  const modelName = (modelNode['@_name'] as string | undefined) || fallbackName;

  const classes: UMLClass[] = [];
  const enums: UMLEnum[] = [];
  const relationships: UMLRelationship[] = [];

  const rawElements = toArray(
    modelNode['packagedElement'] || modelNode['ownedElement'],
  ) as RawXmlNode[];

  // 1. Extraer posiciones del diagrama si existen en las extensiones
  const positions = new Map<string, { x: number; y: number }>();
  const extensions = toArray(root['xmi:Extension'] || modelNode['xmi:Extension']) as RawXmlNode[];
  for (const ext of extensions) {
    const diagElements = toArray(
      (ext['diagramElements'] as RawXmlNode | undefined)?.['element'] ||
        (ext['elements'] as RawXmlNode | undefined)?.['element'],
    ) as RawXmlNode[];
    for (const el of diagElements) {
      const idRef = el['@_xmi:idref'] as string | undefined;
      const x = Number(el['@_x'] ?? 0);
      const y = Number(el['@_y'] ?? 0);
      if (idRef) {
        positions.set(idRef, { x, y });
      }
    }
  }

  // 2. Parsear elementos empaquetados
  for (const el of rawElements) {
    const type = (el['@_xmi:type'] || el['@_type']) as string | undefined;
    const rawId = el['@_xmi:id'] as string | undefined;
    const name = (el['@_name'] as string | undefined) || 'Unnamed';
    const elementId = idMapper.toUuid(rawId);

    if (
      type === 'uml:Class' ||
      type === 'uml:Interface' ||
      type === 'Class' ||
      type === 'Interface'
    ) {
      const isInterface = type.includes('Interface');
      const isAbstract = Boolean(
        el['@_isAbstract'] === 'true' || el['@_isAbstract'] === true || isInterface,
      );

      const attributes: UMLProperty[] = [];
      const operations: UMLOperation[] = [];

      // Atributos
      for (const attrNode of toArray(el['ownedAttribute']) as RawXmlNode[]) {
        const attrId = idMapper.toUuid(attrNode['@_xmi:id'] as string | undefined);
        const attrName = (attrNode['@_name'] as string | undefined) || 'attr';
        const rawType = (attrNode['@_type'] ||
          (attrNode['type'] as RawXmlNode | undefined)?.['@_href']) as string | undefined;
        const attrType = normalizeType(rawType, idMapper);
        const visibility = normalizeVisibility(attrNode['@_visibility'] as string | undefined);

        const lower = (attrNode['lowerValue'] as RawXmlNode | undefined)?.['@_value'] ?? '1';
        const upper = (attrNode['upperValue'] as RawXmlNode | undefined)?.['@_value'] ?? '1';

        attributes.push({
          id: attrId,
          name: attrName,
          type: attrType,
          visibility,
          multiplicity: normalizeMultiplicity(lower as string | number, upper as string | number),
          isStatic: Boolean(attrNode['@_isStatic'] === 'true'),
          isDerived: Boolean(attrNode['@_isReadOnly'] === 'true'),
          isUnique: Boolean(attrNode['@_isUnique'] === 'true'),
          isNullable:
            lower === 0 || lower === '0' || (typeof lower === 'string' && lower.trim() === '0'),
          isIdentifier: attrName.toLowerCase() === 'id',
          defaultValue:
            ((attrNode['defaultValue'] as RawXmlNode | undefined)?.['@_value'] as string | null) ??
            null,
        });
      }

      // Operaciones
      for (const opNode of toArray(el['ownedOperation']) as RawXmlNode[]) {
        const opId = idMapper.toUuid(opNode['@_xmi:id'] as string | undefined);
        const opName = (opNode['@_name'] as string | undefined) || 'op';
        const opVisibility = normalizeVisibility(opNode['@_visibility'] as string | undefined);

        const params: UMLParameter[] = [];
        let returnType: string | null = null;

        for (const pNode of toArray(opNode['ownedParameter']) as RawXmlNode[]) {
          const dir = (pNode['@_direction'] as string | undefined) || 'in';
          const pType = normalizeType(pNode['@_type'] as string | undefined, idMapper);

          if (dir === 'return') {
            returnType = pType;
          } else {
            params.push({
              id: idMapper.toUuid(pNode['@_xmi:id'] as string | undefined),
              name: (pNode['@_name'] as string | undefined) || 'param',
              type: pType,
              direction: dir === 'out' ? 'out' : dir === 'inout' ? 'inout' : 'in',
            });
          }
        }

        operations.push({
          id: opId,
          name: opName,
          returnType,
          visibility: opVisibility,
          isAbstract: Boolean(opNode['@_isAbstract'] === 'true' || isInterface),
          isStatic: Boolean(opNode['@_isStatic'] === 'true'),
          parameters: params,
        });
      }

      // Generalizaciones
      for (const genNode of toArray(el['generalization']) as RawXmlNode[]) {
        const targetRawId = (genNode['@_general'] || genNode['@_generalization']) as
          string | undefined;
        if (targetRawId) {
          relationships.push({
            id: randomUUID(),
            kind: 'generalization',
            name: '',
            sourceId: elementId,
            targetId: idMapper.toUuid(targetRawId),
            sourceEnd: { name: '', role: '', multiplicity: '1', navigable: true },
            targetEnd: { name: '', role: '', multiplicity: '1', navigable: true },
          });
        }
      }

      // Realizaciones
      for (const realNode of toArray(el['interfaceRealization']) as RawXmlNode[]) {
        const supplierRawId = (realNode['@_supplier'] || realNode['@_contract']) as
          string | undefined;
        if (supplierRawId) {
          relationships.push({
            id: randomUUID(),
            kind: 'realization',
            name: '',
            sourceId: elementId,
            targetId: idMapper.toUuid(supplierRawId),
            sourceEnd: { name: '', role: '', multiplicity: '1', navigable: true },
            targetEnd: { name: '', role: '', multiplicity: '1', navigable: true },
          });
        }
      }

      const rawPos = (rawId && positions.get(rawId)) || { x: 0, y: 0 };
      classes.push({
        id: elementId,
        name,
        isAbstract,
        isInterface,
        stereotypes: isInterface ? ['interface'] : [],
        attributes,
        operations,
        position: rawPos,
      });
    } else if (type === 'uml:Enumeration' || type === 'Enumeration') {
      const literals = toArray(el['ownedLiteral'] as RawXmlNode[]).map(
        (lit) => (lit['@_name'] as string | undefined) || 'LITERAL',
      );
      enums.push({
        id: elementId,
        name,
        literals,
      });
    } else if (type === 'uml:Association' || type === 'Association') {
      const ends = toArray(el['ownedEnd']) as RawXmlNode[];
      if (ends.length >= 2) {
        const srcEnd = ends[0]!;
        const tgtEnd = ends[1]!;
        const srcClassId = idMapper.toUuid(srcEnd['@_type'] as string | undefined);
        const tgtClassId = idMapper.toUuid(tgtEnd['@_type'] as string | undefined);

        const isComposition =
          tgtEnd['@_aggregation'] === 'composite' || srcEnd['@_aggregation'] === 'composite';
        const isAggregation =
          tgtEnd['@_aggregation'] === 'shared' || srcEnd['@_aggregation'] === 'shared';

        const kind = isComposition ? 'composition' : isAggregation ? 'aggregation' : 'association';

        relationships.push({
          id: elementId,
          kind,
          name,
          sourceId: srcClassId,
          targetId: tgtClassId,
          sourceEnd: {
            name: '',
            role: (srcEnd['@_role'] as string | undefined) || '',
            multiplicity: normalizeMultiplicity(
              (srcEnd['lowerValue'] as RawXmlNode | undefined)?.['@_value'] as string | number,
              (srcEnd['upperValue'] as RawXmlNode | undefined)?.['@_value'] as string | number,
            ),
            navigable: srcEnd['@_navigable'] !== 'false',
          },
          targetEnd: {
            name: '',
            role: (tgtEnd['@_role'] as string | undefined) || '',
            multiplicity: normalizeMultiplicity(
              (tgtEnd['lowerValue'] as RawXmlNode | undefined)?.['@_value'] as string | number,
              (tgtEnd['upperValue'] as RawXmlNode | undefined)?.['@_value'] as string | number,
            ),
            navigable: tgtEnd['@_navigable'] !== 'false',
          },
        });
      }
    }
  }

  const now = new Date().toISOString();
  let model: UMLModel = {
    id: modelId,
    name: modelName,
    classes,
    enums,
    relationships,
    createdAt: now,
    updatedAt: now,
  };

  const hasAllZeroPositions = model.classes.every((c) => c.position.x === 0 && c.position.y === 0);
  if (shouldAutoLayout || hasAllZeroPositions) {
    model = autoLayout(model);
  }

  return ok(model);
}
