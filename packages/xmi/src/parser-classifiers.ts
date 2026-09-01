import {
  createId,
  type UMLOperation,
  type UMLParameter,
  type UMLProperty,
  type UMLRelationship,
} from '@uml-forge/uml-core';
import {
  normalizeMultiplicity,
  normalizeType,
  normalizeVisibility,
  toArray,
  type IdMapper,
} from './parser-helpers.js';
import { asNode, attr, childValue, firstAttr, type RawXmlNode } from './raw-xml.js';

/** Extremo neutro: la herencia y la realizacion no llevan multiplicidad propia. */
const NEUTRAL_END = { name: '', role: '', multiplicity: '1', navigable: true } as const;

/** Lee los `ownedAttribute` de un clasificador como propiedades del metamodelo. */
export function parseAttributes(element: RawXmlNode, idMapper: IdMapper): UMLProperty[] {
  const attributes: UMLProperty[] = [];

  for (const node of toArray(element['ownedAttribute']) as RawXmlNode[]) {
    const name = attr(node, 'name') ?? 'attr';
    const rawType = attr(node, 'type') ?? attr(asNode(node['type']) ?? undefined, 'href');
    const lower = childValue(node, 'lowerValue') ?? '1';
    const upper = childValue(node, 'upperValue') ?? '1';

    attributes.push({
      id: idMapper.toUuid(attr(node, 'xmi:id')),
      name,
      type: normalizeType(rawType, idMapper),
      visibility: normalizeVisibility(attr(node, 'visibility')),
      multiplicity: normalizeMultiplicity(lower, upper),
      isStatic: attr(node, 'isStatic') === 'true',
      isDerived: attr(node, 'isReadOnly') === 'true',
      isUnique: attr(node, 'isUnique') === 'true',
      isNullable: String(lower).trim() === '0',
      isIdentifier: name.toLowerCase() === 'id',
      defaultValue: childValue(node, 'defaultValue') ?? null,
    });
  }

  return attributes;
}

/** Lee los `ownedOperation` de un clasificador, separando el parametro de retorno. */
export function parseOperations(
  element: RawXmlNode,
  idMapper: IdMapper,
  isInterface: boolean,
): UMLOperation[] {
  const operations: UMLOperation[] = [];

  for (const node of toArray(element['ownedOperation']) as RawXmlNode[]) {
    const parameters: UMLParameter[] = [];
    let returnType: string | null = null;

    for (const parameterNode of toArray(node['ownedParameter']) as RawXmlNode[]) {
      const direction = attr(parameterNode, 'direction') ?? 'in';
      const type = normalizeType(attr(parameterNode, 'type'), idMapper);

      if (direction === 'return') {
        returnType = type;
        continue;
      }
      parameters.push({
        id: idMapper.toUuid(attr(parameterNode, 'xmi:id')),
        name: attr(parameterNode, 'name') ?? 'param',
        type,
        direction: direction === 'out' ? 'out' : direction === 'inout' ? 'inout' : 'in',
      });
    }

    operations.push({
      id: idMapper.toUuid(attr(node, 'xmi:id')),
      name: attr(node, 'name') ?? 'op',
      returnType,
      visibility: normalizeVisibility(attr(node, 'visibility')),
      isAbstract: attr(node, 'isAbstract') === 'true' || isInterface,
      isStatic: attr(node, 'isStatic') === 'true',
      parameters,
    });
  }

  return operations;
}

/**
 * Traduce `generalization` e `interfaceRealization` a relaciones del metamodelo.
 * Ambas nacen dentro del clasificador origen, no como elementos empaquetados.
 */
export function parseInheritance(
  element: RawXmlNode,
  sourceId: string,
  idMapper: IdMapper,
): UMLRelationship[] {
  const relationships: UMLRelationship[] = [];

  for (const node of toArray(element['generalization']) as RawXmlNode[]) {
    const target = firstAttr(node, 'general', 'generalization');
    if (target !== undefined) {
      relationships.push({
        id: createId(),
        kind: 'generalization',
        name: '',
        sourceId,
        targetId: idMapper.toUuid(target),
        sourceEnd: { ...NEUTRAL_END },
        targetEnd: { ...NEUTRAL_END },
      });
    }
  }

  for (const node of toArray(element['interfaceRealization']) as RawXmlNode[]) {
    const supplier = firstAttr(node, 'supplier', 'contract');
    if (supplier !== undefined) {
      relationships.push({
        id: createId(),
        kind: 'realization',
        name: '',
        sourceId,
        targetId: idMapper.toUuid(supplier),
        sourceEnd: { ...NEUTRAL_END },
        targetEnd: { ...NEUTRAL_END },
      });
    }
  }

  return relationships;
}

/** Traduce un `packagedElement` de tipo asociacion a una relacion del metamodelo. */
export function parseAssociation(
  element: RawXmlNode,
  associationId: string,
  name: string,
  idMapper: IdMapper,
): UMLRelationship | null {
  const ends = toArray(element['ownedEnd']) as RawXmlNode[];
  const sourceEnd = ends[0];
  const targetEnd = ends[1];
  if (sourceEnd === undefined || targetEnd === undefined) {
    return null;
  }

  const aggregations = [attr(sourceEnd, 'aggregation'), attr(targetEnd, 'aggregation')];
  const kind = aggregations.includes('composite')
    ? 'composition'
    : aggregations.includes('shared')
      ? 'aggregation'
      : 'association';

  return {
    id: associationId,
    kind,
    name,
    sourceId: idMapper.toUuid(attr(sourceEnd, 'type')),
    targetId: idMapper.toUuid(attr(targetEnd, 'type')),
    sourceEnd: readEnd(sourceEnd),
    targetEnd: readEnd(targetEnd),
  };
}

function readEnd(node: RawXmlNode): UMLRelationship['sourceEnd'] {
  return {
    name: '',
    role: attr(node, 'role') ?? '',
    multiplicity: normalizeMultiplicity(
      childValue(node, 'lowerValue') ?? '1',
      childValue(node, 'upperValue') ?? '1',
    ),
    navigable: attr(node, 'navigable') !== 'false',
  };
}
