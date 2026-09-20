import type { UMLModel } from '@uml-forge/uml-core';

/** Constantes de espaciado y dimension para el auto-layout. */
const NODE_WIDTH = 260;
const NODE_HEIGHT = 180;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 120;
const CANVAS_CENTER_X = 400;
const FIRST_LAYER_Y = 60;
const MIN_X = 50;

/** Elemento colocable en el lienzo: clases, interfaces y enumeraciones. */
interface Placeable {
  readonly id: string;
  readonly layer: number;
}

/**
 * Asigna coordenadas automaticas deterministas y no superpuestas. Las clases se
 * reparten en capas horizontales segun su profundidad de herencia; las
 * enumeraciones caen en una capa propia por debajo de todas ellas, que es donde
 * se leen mejor al no participar en la jerarquia.
 */
export function autoLayout(model: UMLModel): UMLModel {
  const parents = new Map<string, string>();
  for (const relationship of model.relationships) {
    if (relationship.kind === 'generalization' || relationship.kind === 'realization') {
      parents.set(relationship.sourceId, relationship.targetId);
    }
  }

  const classLayers = model.classes.map((umlClass) => ({
    id: umlClass.id,
    layer: depthOf(umlClass.id, parents),
  }));
  const deepestClassLayer = Math.max(0, ...classLayers.map(({ layer }) => layer));
  const enumLayers = model.enums.map((umlEnum) => ({
    id: umlEnum.id,
    layer: model.classes.length === 0 ? 0 : deepestClassLayer + 1,
  }));

  const positions = placeByLayer([...classLayers, ...enumLayers]);

  return {
    ...model,
    classes: model.classes.map((umlClass) => ({
      ...umlClass,
      position: positions.get(umlClass.id) ?? umlClass.position,
    })),
    enums: model.enums.map((umlEnum) => ({
      ...umlEnum,
      position: positions.get(umlEnum.id) ?? umlEnum.position,
    })),
    updatedAt: new Date().toISOString(),
  };
}

/** Profundidad en la jerarquia de herencia, cortando ciclos por si el modelo llega roto. */
function depthOf(elementId: string, parents: ReadonlyMap<string, string>): number {
  const visited = new Set<string>();
  let current = elementId;
  let depth = 0;

  while (!visited.has(current)) {
    visited.add(current);
    const parent = parents.get(current);
    if (parent === undefined) {
      return depth;
    }
    current = parent;
    depth += 1;
  }
  return depth;
}

/** Reparte cada capa en una fila centrada, sin solapamientos. */
function placeByLayer(elements: readonly Placeable[]): Map<string, { x: number; y: number }> {
  const byLayer = new Map<number, string[]>();
  for (const { id, layer } of elements) {
    const row = byLayer.get(layer) ?? [];
    row.push(id);
    byLayer.set(layer, row);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [layer, row] of byLayer) {
    const totalWidth = row.length * NODE_WIDTH + (row.length - 1) * HORIZONTAL_GAP;
    const startX = Math.max(MIN_X, CANVAS_CENTER_X - totalWidth / 2);

    row.forEach((id, index) => {
      positions.set(id, {
        x: startX + index * (NODE_WIDTH + HORIZONTAL_GAP),
        y: FIRST_LAYER_Y + layer * (NODE_HEIGHT + VERTICAL_GAP),
      });
    });
  }

  return positions;
}
