import { randomUUID } from 'node:crypto';
import type { UmlOperation } from '@uml-forge/uml-core';
import {
  asString,
  normalizeMultiplicity,
  normalizeRelationshipKind,
  type RawAiItem,
} from './ai-mapper-helpers';

/** Procesa un ítem de relación creando clases automáticas si faltaban y generando la operación. */
export function processRelationshipItem(
  raw: RawAiItem,
  classIdByName: Map<string, string>,
  classOperations: UmlOperation[],
  getNextPositionIndex: () => number,
): UmlOperation | null {
  const rawRel = (raw.relationship || raw) as RawAiItem;
  const srcName = asString(
    rawRel.source ||
      rawRel.sourceName ||
      rawRel.from ||
      rawRel.classA ||
      rawRel.origin ||
      rawRel.start,
  );
  const tgtName = asString(
    rawRel.target ||
      rawRel.targetName ||
      rawRel.to ||
      rawRel.classB ||
      rawRel.destination ||
      rawRel.end,
  );

  let sourceId = asString(rawRel.sourceId || classIdByName.get(srcName.toLowerCase()));
  let targetId = asString(rawRel.targetId || classIdByName.get(tgtName.toLowerCase()));

  // Auto-crear clases si una relación menciona una clase no listada previamente
  if (!sourceId && srcName) {
    sourceId = randomUUID();
    classIdByName.set(srcName.toLowerCase(), sourceId);
    classOperations.push({
      type: 'addClass',
      class: {
        id: sourceId,
        name: srcName,
        isAbstract: false,
        isInterface: false,
        stereotypes: [],
        position: { x: getNextPositionIndex() * 180 + 60, y: 350 },
      },
    });
  }

  if (!targetId && tgtName) {
    targetId = randomUUID();
    classIdByName.set(tgtName.toLowerCase(), targetId);
    classOperations.push({
      type: 'addClass',
      class: {
        id: targetId,
        name: tgtName,
        isAbstract: false,
        isInterface: false,
        stereotypes: [],
        position: { x: getNextPositionIndex() * 180 + 60, y: 350 },
      },
    });
  }

  if (!sourceId || !targetId) {
    return null;
  }

  const kind = normalizeRelationshipKind(rawRel.kind || rawRel.type || rawRel.relationType);
  const sourceMult = normalizeMultiplicity(rawRel.sourceMultiplicity || rawRel.sourceEnd, '1');
  const targetMult = normalizeMultiplicity(
    rawRel.targetMultiplicity || rawRel.targetEnd,
    kind === 'association' ? '0..*' : '1',
  );

  return {
    type: 'addRelationship',
    relationship: {
      id: asString(rawRel.id, randomUUID()),
      kind,
      name: asString(rawRel.name),
      sourceId,
      targetId,
      sourceEnd: {
        name: '',
        role: asString(rawRel.sourceRole || rawRel.fromRole),
        multiplicity: sourceMult,
        navigable: true,
      },
      targetEnd: {
        name: '',
        role: asString(rawRel.targetRole || rawRel.toRole),
        multiplicity: targetMult,
        navigable: true,
      },
    },
  };
}
