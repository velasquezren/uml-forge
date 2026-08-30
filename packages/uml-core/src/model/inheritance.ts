import { INHERITANCE_KINDS, type UMLRelationship } from '../schemas/relationships.js';

/** Arista de herencia: la clase origen hereda de la clase destino. */
interface InheritanceEdge {
  readonly childId: string;
  readonly parentId: string;
}

function inheritanceEdges(relationships: readonly UMLRelationship[]): InheritanceEdge[] {
  return relationships
    .filter((relationship) => INHERITANCE_KINDS.includes(relationship.kind))
    .map((relationship) => ({ childId: relationship.sourceId, parentId: relationship.targetId }));
}

/** Devuelve los ancestros alcanzables desde una clase siguiendo la herencia. */
export function collectAncestors(
  relationships: readonly UMLRelationship[],
  classId: string,
): Set<string> {
  const edges = inheritanceEdges(relationships);
  const visited = new Set<string>();
  const pending: string[] = [classId];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) {
      break;
    }
    for (const edge of edges) {
      if (edge.childId === current && !visited.has(edge.parentId)) {
        visited.add(edge.parentId);
        pending.push(edge.parentId);
      }
    }
  }
  return visited;
}

/**
 * Indica si anadir una herencia de `childId` hacia `parentId` cerraria un ciclo.
 * Tambien detecta la herencia de una clase respecto a si misma.
 */
export function wouldCreateCycle(
  relationships: readonly UMLRelationship[],
  childId: string,
  parentId: string,
): boolean {
  if (childId === parentId) {
    return true;
  }
  return collectAncestors(relationships, parentId).has(childId);
}

/** Devuelve los identificadores de clase implicados en algun ciclo de herencia. */
export function findCyclicClassIds(relationships: readonly UMLRelationship[]): string[] {
  const edges = inheritanceEdges(relationships);
  const cyclic = new Set<string>();
  for (const edge of edges) {
    if (
      edge.childId === edge.parentId ||
      collectAncestors(relationships, edge.parentId).has(edge.childId)
    ) {
      cyclic.add(edge.childId);
      cyclic.add(edge.parentId);
    }
  }
  return [...cyclic].sort();
}
