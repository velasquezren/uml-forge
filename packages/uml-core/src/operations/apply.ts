import type { UmlError } from '../errors.js';
import { touch } from '../model/create.js';
import { err, ok, type Result } from '../result.js';
import type { UMLModel } from '../schemas/model.js';
import { applyClassOperation } from './apply-class.js';
import { applyEnumOperation } from './apply-enum.js';
import { applyMemberOperation } from './apply-member.js';
import { applyRelationshipOperation } from './apply-relationship.js';
import { parseOperation, type UmlOperation, type UmlOperationInput } from './schema.js';

/** Opciones comunes a la aplicacion de operaciones. */
export interface ApplyOptions {
  /** Marca temporal a escribir en `updatedAt`. Util para pruebas deterministas. */
  readonly now?: string;
}

/**
 * Aplica una operacion sobre el modelo. Es una funcion pura: devuelve un modelo
 * nuevo y jamas modifica el recibido. Nunca lanza excepciones.
 */
export function applyOperation(
  model: UMLModel,
  operation: UmlOperationInput,
  options: ApplyOptions = {},
): Result<UMLModel, UmlError> {
  const parsed = parseOperation(operation);
  if (!parsed.ok) {
    return err(parsed.error);
  }
  const applied = dispatch(model, parsed.value);
  return applied.ok ? ok(touch(applied.value, options.now)) : applied;
}

/**
 * Aplica una secuencia de operaciones de forma atomica: si alguna falla, el
 * modelo devuelto es exactamente el original y se informa del indice culpable.
 */
export function applyOperations(
  model: UMLModel,
  operations: readonly UmlOperationInput[],
  options: ApplyOptions = {},
): Result<UMLModel, UmlError> {
  let current = model;
  for (const [index, operation] of operations.entries()) {
    const parsed = parseOperation(operation);
    if (!parsed.ok) {
      return err(withIndex(parsed.error, index));
    }
    const applied = dispatch(current, parsed.value);
    if (!applied.ok) {
      return err(withIndex(applied.error, index));
    }
    current = applied.value;
  }
  return ok(operations.length === 0 ? current : touch(current, options.now));
}

/** Encamina cada operacion hacia su familia de manejadores. */
function dispatch(model: UMLModel, operation: UmlOperation): Result<UMLModel, UmlError> {
  switch (operation.type) {
    case 'addClass':
    case 'updateClass':
    case 'deleteClass':
    case 'setPosition':
      return applyClassOperation(model, operation);
    case 'addAttribute':
    case 'updateAttribute':
    case 'deleteAttribute':
    case 'addOperation':
    case 'updateOperation':
    case 'deleteOperation':
      return applyMemberOperation(model, operation);
    case 'addRelationship':
    case 'updateRelationship':
    case 'deleteRelationship':
      return applyRelationshipOperation(model, operation);
    case 'addEnum':
    case 'updateEnum':
    case 'deleteEnum':
      return applyEnumOperation(model, operation);
  }
}

/** Antepone el indice de la operacion a la ruta del error. */
function withIndex(error: UmlError, index: number): UmlError {
  return { ...error, path: [index, ...(error.path ?? [])] };
}
