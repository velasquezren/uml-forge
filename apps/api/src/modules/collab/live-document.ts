import {
  applyOperationToYDoc,
  bumpRevision,
  createEmptyModel,
  fromYDoc,
  hasModel,
  writeModel,
  type UMLModel,
  type UmlOperation,
} from '@uml-forge/uml-core';
import type * as Y from 'yjs';

/** Resultado de aplicar un lote de operaciones sobre el documento compartido. */
export interface ApplyReport {
  readonly applied: number;
  readonly failed: number;
  readonly firstError: string | null;
}

/** Modelo de un documento Yjs, o null si aun no tiene o no es legible. */
export function modelOf(doc: Y.Doc): UMLModel | null {
  if (!hasModel(doc)) return null;
  const result = fromYDoc(doc);
  return result.ok ? result.value : null;
}

/** Nombres de las personas conectadas, segun lo que anuncian por awareness. */
export function participantNames(states: Iterable<Record<string, unknown>>): string[] {
  const names = new Set<string>();
  for (const state of states) {
    const user = state.user;
    if (typeof user === 'object' && user !== null) {
      const name = (user as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim() !== '') names.add(name.trim());
    }
  }
  return [...names];
}

/**
 * Aplica las operaciones una a una dentro de la transaccion ya abierta. Una
 * operacion que el metamodelo rechaza (la clase ya no existe, por ejemplo) no
 * impide aplicar las demas. Si se aplico algo, el modelo tiene una revision
 * nueva (ADR 0034).
 */
export function applyOperationsToDoc(
  doc: Y.Doc,
  operations: readonly UmlOperation[],
  fallbackName: string,
  modelId: string,
): ApplyReport {
  if (!hasModel(doc)) {
    writeModel(doc, createEmptyModel(fallbackName, { id: modelId }));
  }

  let applied = 0;
  let failed = 0;
  let firstError: string | null = null;
  for (const operation of operations) {
    const result = applyOperationToYDoc(doc, operation);
    if (result.ok) {
      applied += 1;
    } else {
      failed += 1;
      firstError ??= result.error.message;
    }
  }

  if (applied > 0) {
    bumpRevision(doc);
  }
  return { applied, failed, firstError };
}
