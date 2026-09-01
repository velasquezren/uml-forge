import type { UMLClass, UMLModel } from '@uml-forge/uml-core';

/** Constantes de espaciado y dimension para el auto-layout. */
const NODE_WIDTH = 260;
const NODE_HEIGHT = 180;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 120;

/** Asigna coordenadas automaticas deterministas y no superpuestas al modelo UML. */
export function autoLayout(model: UMLModel): UMLModel {
  const parentMap = new Map<string, string>();
  for (const rel of model.relationships) {
    if (rel.kind === 'generalization' || rel.kind === 'realization') {
      parentMap.set(rel.sourceId, rel.targetId);
    }
  }

  // Calcular la profundidad jerarquica de cada clase
  function getDepth(classId: string, visited = new Set<string>()): number {
    if (visited.has(classId)) return 0;
    visited.add(classId);
    const parentId = parentMap.get(classId);
    if (!parentId) return 0;
    return 1 + getDepth(parentId, visited);
  }

  // Agrupar elementos por capa
  const layers = new Map<number, UMLClass[]>();

  for (const umlClass of model.classes) {
    const depth = getDepth(umlClass.id);
    const layerList = layers.get(depth) ?? [];
    layerList.push(umlClass);
    layers.set(depth, layerList);
  }

  const updatedClasses: UMLClass[] = [];
  const maxDepth = Math.max(0, ...Array.from(layers.keys()));

  // Colocar clases por capa horizontal
  for (let depth = 0; depth <= maxDepth; depth++) {
    const classesInLayer = layers.get(depth) ?? [];
    const totalWidth =
      classesInLayer.length * NODE_WIDTH + (classesInLayer.length - 1) * HORIZONTAL_GAP;
    const startX = Math.max(50, 400 - totalWidth / 2);

    classesInLayer.forEach((umlClass, index) => {
      const x = startX + index * (NODE_WIDTH + HORIZONTAL_GAP);
      const y = 60 + depth * (NODE_HEIGHT + VERTICAL_GAP);
      updatedClasses.push({
        ...umlClass,
        position: { x, y },
      });
    });
  }

  return {
    ...model,
    classes: updatedClasses,
    updatedAt: new Date().toISOString(),
  };
}
