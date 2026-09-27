import type { UMLRelationship } from '@uml-forge/uml-core';
import { toArray, type IdMapper } from './parser-helpers.js';
import { asNode, firstAttr, type RawXmlNode } from './raw-xml.js';

/**
 * Traduce una dependencia (o una realizacion suelta, como la escribe
 * Enterprise Architect cuando el destino no es una interfaz). El cliente es el
 * origen y el proveedor el destino.
 */
export function parseDependency(
  element: RawXmlNode,
  relationshipId: string,
  kind: 'dependency' | 'realization',
  name: string,
  idMapper: IdMapper,
): UMLRelationship | null {
  const client = firstAttr(element, 'client') ?? childRef(element, 'client');
  const supplier = firstAttr(element, 'supplier') ?? childRef(element, 'supplier');
  if (client === undefined || supplier === undefined) {
    return null;
  }
  const neutral = { name: '', role: '', multiplicity: '1', navigable: true };
  return {
    id: relationshipId,
    kind,
    name: kind === 'dependency' ? name : '',
    sourceId: idMapper.toUuid(client),
    targetId: idMapper.toUuid(supplier),
    sourceEnd: { ...neutral },
    targetEnd: { ...neutral },
  };
}

/** Referencia escrita como hijo `<client xmi:idref="..."/>`. */
function childRef(element: RawXmlNode, key: string): string | undefined {
  const [first] = toArray(element[key]);
  return firstAttr(asNode(first) ?? undefined, 'xmi:idref', 'idref');
}
