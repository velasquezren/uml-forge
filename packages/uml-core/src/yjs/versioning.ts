import type * as Y from 'yjs';

/**
 * Raiz del documento Yjs con el contador de revisiones (ADR 0034). Vive fuera
 * de las cuatro raices del modelo para que deshacer una edicion no haga
 * retroceder el numero: cada cambio, tambien un deshacer, es una revision nueva.
 */
export const ROOT_VERSIONING = 'versioning';
const REVISION_KEY = 'revision';

/** Revision actual del modelo; 0 si el proyecto aun no tiene ninguna. */
export function readRevision(ydoc: Y.Doc): number {
  const value = ydoc.getMap<unknown>(ROOT_VERSIONING).get(REVISION_KEY);
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

/**
 * Anota una revision nueva. Si dos personas editan a la vez y ambas suben de la
 * 10 a la 11, el CRDT se queda con una sola 11: el numero no cuenta ediciones
 * exactas, solo garantiza que crece cuando el modelo cambia.
 */
export function bumpRevision(ydoc: Y.Doc): number {
  const next = readRevision(ydoc) + 1;
  ydoc.getMap<unknown>(ROOT_VERSIONING).set(REVISION_KEY, next);
  return next;
}
