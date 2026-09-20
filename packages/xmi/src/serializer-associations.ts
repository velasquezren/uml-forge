import type { UMLEnd, UMLRelationship } from '@uml-forge/uml-core';
import { escapeXml, multiplicityLines } from './xml-text.js';

/** Valor de `aggregation` que corresponde a cada tipo de relacion. */
function aggregationFor(kind: UMLRelationship['kind']): string {
  if (kind === 'composition') return 'composite';
  if (kind === 'aggregation') return 'shared';
  return 'none';
}

/**
 * Escribe una asociacion en la forma que espera Enterprise Architect: la
 * asociacion declara sus dos extremos en `memberEnd` y los posee como
 * `ownedEnd`, o como `navigableOwnedEnd` cuando el extremo es navegable. Sin
 * `memberEnd` la herramienta no sabe que clases une la asociacion.
 */
export function associationLines(relationship: UMLRelationship): string[] {
  const sourceEndId = `${relationship.id}-src`;
  const targetEndId = `${relationship.id}-tgt`;
  const nameAttr = relationship.name ? ` name="${escapeXml(relationship.name)}"` : '';

  return [
    `    <packagedElement xmi:type="uml:Association" xmi:id="${relationship.id}"${nameAttr}>`,
    `      <memberEnd xmi:idref="${sourceEndId}"/>`,
    `      <memberEnd xmi:idref="${targetEndId}"/>`,
    ...endLines(
      sourceEndId,
      relationship.id,
      relationship.sourceId,
      relationship.sourceEnd,
      'none',
    ),
    ...endLines(
      targetEndId,
      relationship.id,
      relationship.targetId,
      relationship.targetEnd,
      aggregationFor(relationship.kind),
    ),
    '    </packagedElement>',
  ];
}

/** Un extremo de la asociacion, con su rol en `name` como manda UML 2. */
function endLines(
  endId: string,
  associationId: string,
  classifierId: string,
  end: UMLEnd,
  aggregation: string,
): string[] {
  const tag = end.navigable ? 'navigableOwnedEnd' : 'ownedEnd';
  const nameAttr = end.role ? ` name="${escapeXml(end.role)}"` : '';
  const aggregationAttr = aggregation === 'none' ? '' : ` aggregation="${aggregation}"`;

  return [
    `      <${tag} xmi:type="uml:Property" xmi:id="${endId}"${nameAttr} type="${classifierId}" association="${associationId}"${aggregationAttr}>`,
    ...multiplicityLines(end.multiplicity, '        '),
    `      </${tag}>`,
  ];
}
