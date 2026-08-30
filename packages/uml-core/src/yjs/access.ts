import * as Y from 'yjs';
import { umlError, type UmlError } from '../errors.js';
import { err, ok, type Result } from '../result.js';
import { ROOT_CLASSES, ROOT_ENUMS, ROOT_RELATIONSHIPS } from './keys.js';

/** Accesos tipados a las estructuras del documento, sin recurrir a `any`. */

/**
 * `instanceof Y.Map` estrecha a `Y.Map<any>` porque ese es el parametro de tipo
 * por defecto de Yjs. Estas guardas devuelven la version con `unknown`, que es
 * la unica forma de leer del documento sin propagar `any` por todo el paquete.
 */
export function asYMap(value: unknown): Y.Map<unknown> | null {
  return value instanceof Y.Map ? (value as Y.Map<unknown>) : null;
}

export function asYArray(value: unknown): Y.Array<unknown> | null {
  return value instanceof Y.Array ? (value as Y.Array<unknown>) : null;
}

export function classesMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>(ROOT_CLASSES);
}

export function enumsMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>(ROOT_ENUMS);
}

export function relationshipsMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>(ROOT_RELATIONSHIPS);
}

/** Obtiene un mapa anidado o un error si el documento no tiene la forma esperada. */
export function requireMap(
  container: Y.Map<unknown>,
  key: string,
): Result<Y.Map<unknown>, UmlError> {
  const value = asYMap(container.get(key));
  return value === null
    ? err(
        umlError('invalid_document', `el documento no contiene el mapa ${key}`, { elementId: key }),
      )
    : ok(value);
}

/** Obtiene un array anidado o un error si el documento no tiene la forma esperada. */
export function requireArray(
  container: Y.Map<unknown>,
  key: string,
): Result<Y.Array<unknown>, UmlError> {
  const value = asYArray(container.get(key));
  return value === null
    ? err(
        umlError('invalid_document', `el documento no contiene el array ${key}`, {
          elementId: key,
        }),
      )
    : ok(value);
}

/** Busca en un Y.Array de mapas el indice del elemento con el identificador dado. */
export function indexOfElement(array: Y.Array<unknown>, elementId: string): number {
  for (let index = 0; index < array.length; index += 1) {
    const entry = asYMap(array.get(index));
    if (entry !== null && entry.get('id') === elementId) {
      return index;
    }
  }
  return -1;
}

/** Recorre todos los mapas de clase del documento. */
export function eachClassMap(doc: Y.Doc, visit: (classMap: Y.Map<unknown>) => void): void {
  for (const value of classesMap(doc).values()) {
    const classMap = asYMap(value);
    if (classMap !== null) {
      visit(classMap);
    }
  }
}
