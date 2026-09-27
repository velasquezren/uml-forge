import type { UMLEnd, UMLRelationship } from '@uml-forge/uml-core';
import { eaId } from './ea-ids.js';
import { escapeXml, multiplicityLines } from './xml-text.js';

/** Valor de `aggregation` que corresponde a cada tipo de relacion. */
function aggregationFor(kind: UMLRelationship['kind']): string {
  if (kind === 'composition') return 'composite';
  if (kind === 'aggregation') return 'shared';
  return 'none';
}

/** Semillas de los dos extremos: se reutilizan en el diagrama y en los conectores. */
export function associationEndSeeds(relationship: UMLRelationship): {
  source: string;
  target: string;
} {
  return { source: `${relationship.id}-src`, target: `${relationship.id}-tgt` };
}

/**
 * Escribe una relacion estructural (asociacion, agregacion o composicion). La
 * asociacion declara sus dos extremos en `memberEnd` y los posee como
 * `ownedEnd`; los navegables se enumeran ademas en `navigableOwnedEnd`, que en
 * UML 2 es una referencia y no un contenedor. Sin `memberEnd` la herramienta
 * no sabe que clases une la asociacion.
 *
 * En UML Forge el rombo se dibuja en el origen (el todo). Segun UML 2, la
 * agregacion se declara en el extremo cuyo tipo es la parte, de modo que va en
 * el extremo destino.
 */
export function associationLines(relationship: UMLRelationship, indent: string): string[] {
  if (relationship.kind === 'dependency') {
    return dependencyLines(relationship, indent);
  }

  const seeds = associationEndSeeds(relationship);
  const sourceEndId = eaId(seeds.source);
  const targetEndId = eaId(seeds.target);
  const associationId = eaId(relationship.id);
  const nameAttr = relationship.name ? ` name="${escapeXml(relationship.name)}"` : '';
  const inner = `${indent}  `;

  const navigable = [
    relationship.sourceEnd.navigable ? sourceEndId : null,
    relationship.targetEnd.navigable ? targetEndId : null,
  ].filter((id): id is string => id !== null);

  return [
    `${indent}<packagedElement xmi:type="uml:Association" xmi:id="${associationId}"${nameAttr} visibility="public">`,
    `${inner}<memberEnd xmi:idref="${sourceEndId}"/>`,
    `${inner}<memberEnd xmi:idref="${targetEndId}"/>`,
    ...endLines(
      sourceEndId,
      seeds.source,
      associationId,
      relationship.sourceId,
      relationship.sourceEnd,
      'none',
      inner,
    ),
    ...endLines(
      targetEndId,
      seeds.target,
      associationId,
      relationship.targetId,
      relationship.targetEnd,
      aggregationFor(relationship.kind),
      inner,
    ),
    ...navigable.map((id) => `${inner}<navigableOwnedEnd xmi:idref="${id}"/>`),
    `${indent}</packagedElement>`,
  ];
}

/** Una dependencia de UML: el origen (cliente) depende del destino (proveedor). */
function dependencyLines(relationship: UMLRelationship, indent: string): string[] {
  const nameAttr = relationship.name ? ` name="${escapeXml(relationship.name)}"` : '';
  return [
    `${indent}<packagedElement xmi:type="uml:Dependency" xmi:id="${eaId(relationship.id)}"${nameAttr} visibility="public" client="${eaId(relationship.sourceId)}" supplier="${eaId(relationship.targetId)}"/>`,
  ];
}

/** Un extremo de la asociacion, con su rol en `name` como manda UML 2. */
function endLines(
  endId: string,
  endSeed: string,
  associationId: string,
  classifierId: string,
  end: UMLEnd,
  aggregation: string,
  indent: string,
): string[] {
  const nameAttr = end.role ? ` name="${escapeXml(end.role)}"` : '';

  return [
    `${indent}<ownedEnd xmi:type="uml:Property" xmi:id="${endId}"${nameAttr} visibility="public" type="${eaId(classifierId)}" association="${associationId}" aggregation="${aggregation}">`,
    ...multiplicityLines(end.multiplicity, `${indent}  `, endSeed),
    `${indent}</ownedEnd>`,
  ];
}
