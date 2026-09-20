import type * as Y from 'yjs';
import { asYArray, asYMap, classesMap, indexOfElement } from './access.js';

/** Posicion de un miembro dentro del documento. */
export interface MemberLocation {
  readonly classMap: Y.Map<unknown>;
  readonly container: Y.Array<unknown>;
  readonly index: number;
  readonly entry: Y.Map<unknown>;
}

/** Localiza un atributo o una operacion por identificador en todo el documento. */
export function locateMember(
  doc: Y.Doc,
  memberId: string,
  containerKey: 'attributes' | 'operations',
): MemberLocation | null {
  for (const value of classesMap(doc).values()) {
    const classMap = asYMap(value);
    if (classMap === null) {
      continue;
    }
    const container = asYArray(classMap.get(containerKey));
    if (container === null) {
      continue;
    }
    const index = indexOfElement(container, memberId);
    if (index < 0) {
      continue;
    }
    const entry = asYMap(container.get(index));
    if (entry !== null) {
      return { classMap, container, index, entry };
    }
  }
  return null;
}
