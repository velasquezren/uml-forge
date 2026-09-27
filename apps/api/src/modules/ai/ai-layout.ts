import type { UMLModel, UmlOperation } from '@uml-forge/uml-core';

type AddClass = Extract<UmlOperation, { type: 'addClass' }>;
type AddEnum = Extract<UmlOperation, { type: 'addEnum' }>;

const COLUMN_WIDTH = 320;
const COLUMNS = 4;
const ROW_GAP = 90;
const MEMBER_HEIGHT = 22;
const HEADER_HEIGHT = 70;
const ORIGIN = 60;

/**
 * Coloca las clases y enumeraciones nuevas. Las coordenadas que inventa un
 * modelo de lenguaje suelen amontonar las cajas encima de lo que ya habia en el
 * lienzo, asi que se ignoran: lo nuevo va en filas por debajo del diagrama
 * existente, las superclases por encima de sus hijas y las enumeraciones al
 * final, con el alto de cada fila calculado por el numero de miembros.
 */
export function layoutNewClassifiers(
  classes: readonly AddClass[],
  enums: readonly AddEnum[],
  operations: readonly UmlOperation[],
  model: UMLModel | undefined,
  memberCounts: ReadonlyMap<string, number>,
): UmlOperation[] {
  const { top, left } = freeArea(model);
  const depth = inheritanceDepth(classes, operations);

  const rows: (AddClass | AddEnum)[][] = [];
  const byDepth = [...classes].sort(
    (a, b) => (depth.get(a.class.id) ?? 0) - (depth.get(b.class.id) ?? 0),
  );
  let currentDepth = -1;
  for (const op of byDepth) {
    const level = depth.get(op.class.id) ?? 0;
    const row = rows.at(-1);
    if (row === undefined || level !== currentDepth || row.length >= COLUMNS) {
      rows.push([op]);
      currentDepth = level;
    } else {
      row.push(op);
    }
  }
  for (let index = 0; index < enums.length; index += COLUMNS) {
    rows.push(enums.slice(index, index + COLUMNS));
  }

  const placed: UmlOperation[] = [];
  let y = top;
  for (const row of rows) {
    let rowHeight = 0;
    row.forEach((op, column) => {
      const position = { x: left + column * COLUMN_WIDTH, y };
      if (op.type === 'addClass') {
        placed.push({ ...op, class: { ...op.class, position } });
        rowHeight = Math.max(
          rowHeight,
          HEADER_HEIGHT + (memberCounts.get(op.class.id) ?? 0) * MEMBER_HEIGHT,
        );
      } else {
        placed.push({ ...op, enum: { ...op.enum, position } });
        rowHeight = Math.max(rowHeight, HEADER_HEIGHT + op.enum.literals.length * MEMBER_HEIGHT);
      }
    });
    y += rowHeight + ROW_GAP;
  }

  return placed;
}

/** Esquina superior izquierda de la zona libre bajo el diagrama existente. */
function freeArea(model: UMLModel | undefined): { top: number; left: number } {
  const classifiers = [...(model?.classes ?? []), ...(model?.enums ?? [])];
  if (classifiers.length === 0) {
    return { top: ORIGIN, left: ORIGIN };
  }
  const bottoms = [
    ...(model?.classes ?? []).map(
      (c) =>
        c.position.y + HEADER_HEIGHT + (c.attributes.length + c.operations.length) * MEMBER_HEIGHT,
    ),
    ...(model?.enums ?? []).map(
      (e) => e.position.y + HEADER_HEIGHT + e.literals.length * MEMBER_HEIGHT,
    ),
  ];
  return {
    top: Math.max(...bottoms) + ROW_GAP,
    left: Math.min(...classifiers.map((c) => c.position.x)),
  };
}

/** Profundidad de herencia dentro del lote nuevo: 0 para las raices. */
function inheritanceDepth(
  classes: readonly AddClass[],
  operations: readonly UmlOperation[],
): Map<string, number> {
  const parents = new Map<string, string>();
  for (const op of operations) {
    if (op.type === 'addRelationship' && op.relationship.kind === 'generalization') {
      parents.set(op.relationship.sourceId, op.relationship.targetId);
    }
  }

  const depth = new Map<string, number>();
  for (const { class: umlClass } of classes) {
    const seen = new Set<string>();
    let current = umlClass.id;
    let level = 0;
    while (parents.has(current) && !seen.has(current)) {
      seen.add(current);
      current = parents.get(current) ?? current;
      level += 1;
    }
    depth.set(umlClass.id, level);
  }
  return depth;
}
