import type { UMLEnd, UMLRelationship } from '@uml-forge/uml-core';
import { eaElementType, findClassifier, type EaExportContext } from './ea-context.js';
import { eaId } from './ea-ids.js';
import { escapeXml } from './xml-text.js';

/** Tipo de conector de Enterprise Architect y subtipo, si lo tiene. */
function connectorType(kind: UMLRelationship['kind']): { type: string; subtype: string | null } {
  switch (kind) {
    case 'composition':
      return { type: 'Aggregation', subtype: 'Strong' };
    case 'aggregation':
      return { type: 'Aggregation', subtype: 'Weak' };
    case 'generalization':
      return { type: 'Generalization', subtype: null };
    case 'realization':
      return { type: 'Realisation', subtype: null };
    case 'dependency':
      return { type: 'Dependency', subtype: null };
    case 'association':
      return { type: 'Association', subtype: null };
  }
}

/** Direccion del conector a partir de la navegabilidad de los extremos. */
function direction(relationship: UMLRelationship): string {
  const structural = ['association', 'aggregation', 'composition'].includes(relationship.kind);
  if (!structural) {
    return 'Source -&gt; Destination';
  }
  const toTarget = relationship.targetEnd.navigable;
  const toSource = relationship.sourceEnd.navigable;
  if (toTarget && toSource) return 'Bi-Directional';
  if (toTarget) return 'Source -&gt; Destination';
  if (toSource) return 'Destination -&gt; Source';
  return 'Unspecified';
}

/**
 * Seccion `connectors` de la extension. Repite lo que ya dice la parte UML con
 * el vocabulario de la herramienta: tipo de conector, direccion y, sobre todo,
 * en que extremo va el rombo. En UML Forge el rombo esta siempre en el origen.
 */
export function eaConnectorsLines(context: EaExportContext, indent: string): string[] {
  if (context.model.relationships.length === 0) {
    return [`${indent}<connectors/>`];
  }
  const lines = [`${indent}<connectors>`];
  let localId = 1;

  for (const relationship of context.model.relationships) {
    const { type, subtype } = connectorType(relationship.kind);
    const inner = `${indent}    `;
    const subtypeAttr = subtype === null ? '' : ` subtype="${subtype}"`;
    const wholeAggregation =
      relationship.kind === 'composition'
        ? 'composite'
        : relationship.kind === 'aggregation'
          ? 'shared'
          : 'none';

    lines.push(
      `${indent}  <connector xmi:idref="${eaId(relationship.id)}">`,
      ...endLines(
        context,
        'source',
        relationship.sourceId,
        relationship.sourceEnd,
        relationship,
        wholeAggregation,
        inner,
      ),
      ...endLines(
        context,
        'target',
        relationship.targetId,
        relationship.targetEnd,
        relationship,
        'none',
        inner,
      ),
      `${inner}<model ea_localid="${localId}"/>`,
      `${inner}<properties ea_type="${type}"${subtypeAttr} direction="${direction(relationship)}"/>`,
      `${inner}<modifiers isRoot="false" isLeaf="false"/>`,
      `${inner}<appearance linemode="3" linecolor="-1" linewidth="0" seqno="0" headStyle="0" lineStyle="0"/>`,
      relationship.name
        ? `${inner}<labels mt="${escapeXml(relationship.name)}"/>`
        : `${inner}<labels/>`,
      `${indent}  </connector>`,
    );
    localId += 1;
  }

  lines.push(`${indent}</connectors>`);
  return lines;
}

function endLines(
  context: EaExportContext,
  tag: 'source' | 'target',
  classifierId: string,
  end: UMLEnd,
  relationship: UMLRelationship,
  aggregation: string,
  indent: string,
): string[] {
  const classifier = findClassifier(context.model, classifierId);
  const structural = ['association', 'aggregation', 'composition'].includes(relationship.kind);
  const multiplicity = structural ? ` multiplicity="${escapeXml(end.multiplicity)}"` : '';
  const roleName = structural && end.role ? ` name="${escapeXml(end.role)}"` : '';
  const navigable = structural ? end.navigable : tag === 'target';
  const navigability = navigable ? 'Navigable' : structural ? 'Non-Navigable' : 'Unspecified';
  const inner = `${indent}  `;

  return [
    `${indent}<${tag} xmi:idref="${eaId(classifierId)}">`,
    `${inner}<model ea_localid="${context.localIds.get(classifierId) ?? 0}" type="${classifier ? eaElementType(classifier) : 'Class'}" name="${escapeXml(classifier?.name ?? '')}"/>`,
    `${inner}<role${roleName} visibility="Public" targetScope="instance"/>`,
    `${inner}<type${multiplicity} aggregation="${aggregation}" containment="Unspecified"/>`,
    `${inner}<modifiers isOrdered="false" changeable="none" isNavigable="${String(navigable)}"/>`,
    `${inner}<style value="Union=0;Derived=0;AllowDuplicates=0;Owned=0;Navigable=${navigability};"/>`,
    `${indent}</${tag}>`,
  ];
}
