import type * as Y from 'yjs';
import { asYArray, asYMap, classesMap, eachClassMap, relationshipsMap } from './access.js';

/**
 * Borrado en cascada sobre el documento Yjs. Reproduce exactamente la misma
 * politica que `applyOperation` sobre el modelo inmutable. Ver ADR 0008.
 */

/** Elimina toda referencia de tipo hacia un elemento que desaparece. */
export function cascadeTypeRemoval(doc: Y.Doc, typeId: string): void {
  eachClassMap(doc, (classMap) => {
    removeMatchingEntries(classMap.get('attributes'), (entry) => entry.get('type') === typeId);

    const operations = asYArray(classMap.get('operations'));
    if (operations === null) {
      return;
    }
    for (const value of operations.toArray()) {
      const candidate = asYMap(value);
      if (candidate === null) {
        continue;
      }
      if (candidate.get('returnType') === typeId) {
        candidate.set('returnType', null);
      }
      removeMatchingEntries(candidate.get('parameters'), (entry) => entry.get('type') === typeId);
    }
  });
}

/** Elimina las relaciones en las que participa una clase. */
export function cascadeRelationshipRemoval(doc: Y.Doc, classId: string): void {
  const relationships = relationshipsMap(doc);
  for (const key of [...relationships.keys()]) {
    const relationship = asYMap(relationships.get(key));
    if (
      relationship !== null &&
      (relationship.get('sourceId') === classId || relationship.get('targetId') === classId)
    ) {
      relationships.delete(key);
    }
  }
}

/** Elimina una clase del documento junto con todo lo que dependia de ella. */
export function deleteClassWithCascade(doc: Y.Doc, classId: string): void {
  cascadeRelationshipRemoval(doc, classId);
  cascadeTypeRemoval(doc, classId);
  classesMap(doc).delete(classId);
}

/** Recorre un Y.Array hacia atras eliminando los mapas que cumplen el predicado. */
function removeMatchingEntries(
  container: unknown,
  matches: (entry: Y.Map<unknown>) => boolean,
): void {
  const array = asYArray(container);
  if (array === null) {
    return;
  }
  for (let index = array.length - 1; index >= 0; index -= 1) {
    const entry = asYMap(array.get(index));
    if (entry !== null && matches(entry)) {
      array.delete(index, 1);
    }
  }
}
