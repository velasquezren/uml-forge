import type * as Y from 'yjs';
import type { UmlError } from '../errors.js';
import { applyOperation, applyOperations, type ApplyOptions } from '../operations/apply.js';
import { parseOperation, type UmlOperation, type UmlOperationInput } from '../operations/schema.js';
import { err, ok, type Result } from '../result.js';
import type { UMLModel } from '../schemas/model.js';
import { fromYDoc } from './from-ydoc.js';
import { META_UPDATED_AT, ROOT_META } from './keys.js';
import { mutate } from './mutations.js';

/** Opciones de aplicacion sobre el documento compartido. */
export interface YDocApplyOptions extends ApplyOptions {
  /**
   * Origen de la transaccion Yjs. Permite al cliente distinguir sus propios
   * cambios de los que llegan por la red.
   */
  readonly origin?: unknown;
}

/**
 * Aplica una operacion directamente sobre el CRDT.
 *
 * Las precondiciones se comprueban contra el modelo reconstruido del documento
 * reutilizando `applyOperation`, de modo que las reglas viven en un unico sitio.
 * La escritura, en cambio, es nativa: solo se tocan los nodos afectados, que es
 * lo que hace posible la edicion concurrente sin conflictos. Ver ADR 0009.
 */
export function applyOperationToYDoc(
  doc: Y.Doc,
  operation: UmlOperationInput,
  options: YDocApplyOptions = {},
): Result<UMLModel, UmlError> {
  const parsed = parseOperation(operation);
  if (!parsed.ok) {
    return err(parsed.error);
  }
  const current = fromYDoc(doc);
  if (!current.ok) {
    return err(current.error);
  }
  const applied = applyOperation(current.value, parsed.value, options);
  if (!applied.ok) {
    return err(applied.error);
  }
  commit(doc, [parsed.value], applied.value.updatedAt, options.origin);
  return ok(applied.value);
}

/**
 * Aplica una secuencia de operaciones sobre el CRDT de forma atomica: si alguna
 * falla, el documento no se toca en absoluto.
 */
export function applyOperationsToYDoc(
  doc: Y.Doc,
  operations: readonly UmlOperationInput[],
  options: YDocApplyOptions = {},
): Result<UMLModel, UmlError> {
  const parsedOperations: UmlOperation[] = [];
  for (const operation of operations) {
    const parsed = parseOperation(operation);
    if (!parsed.ok) {
      return err(parsed.error);
    }
    parsedOperations.push(parsed.value);
  }

  const current = fromYDoc(doc);
  if (!current.ok) {
    return err(current.error);
  }
  const applied = applyOperations(current.value, parsedOperations, options);
  if (!applied.ok) {
    return err(applied.error);
  }
  commit(doc, parsedOperations, applied.value.updatedAt, options.origin);
  return ok(applied.value);
}

/** Escribe las mutaciones y la marca temporal en una unica transaccion. */
function commit(
  doc: Y.Doc,
  operations: readonly UmlOperation[],
  updatedAt: string,
  origin: unknown,
): void {
  doc.transact(() => {
    for (const operation of operations) {
      mutate(doc, operation);
    }
    doc.getMap<unknown>(ROOT_META).set(META_UPDATED_AT, updatedAt);
  }, origin);
}
