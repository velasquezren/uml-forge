import type { z } from 'zod';
import { umlError, type UmlError } from '../errors.js';
import { removeTypeReferences } from '../model/cascade.js';
import { findEnum } from '../model/lookup.js';
import { err, ok, type Result } from '../result.js';
import type { UMLEnum } from '../schemas/elements.js';
import type { UMLModel } from '../schemas/model.js';
import { ensureEnumNameIsFree, ensureIdIsFree, enumNotFound, firstError } from './guards.js';
import type { EnumChangesSchema, EnumInputSchema } from './payloads.js';
import type { UmlOperation } from './schema.js';

type EnumInput = z.infer<typeof EnumInputSchema>;
type EnumChanges = z.infer<typeof EnumChangesSchema>;
type EnumOperation = Extract<UmlOperation, { type: 'addEnum' | 'updateEnum' | 'deleteEnum' }>;

/** Aplica las operaciones que afectan a las enumeraciones. */
export function applyEnumOperation(
  model: UMLModel,
  operation: EnumOperation,
): Result<UMLModel, UmlError> {
  switch (operation.type) {
    case 'addEnum':
      return addEnum(model, operation.enum);
    case 'updateEnum':
      return updateEnum(model, operation.id, operation.changes);
    case 'deleteEnum':
      return deleteEnum(model, operation.id);
  }
}

function addEnum(model: UMLModel, input: EnumInput): Result<UMLModel, UmlError> {
  const problem = firstError(
    ensureIdIsFree(model, input.id),
    ensureEnumNameIsFree(model, input.name),
    checkLiterals(input.literals, input.id),
  );
  if (problem !== null) {
    return err(problem);
  }
  return ok({ ...model, enums: [...model.enums, input] });
}

function updateEnum(
  model: UMLModel,
  enumId: string,
  changes: EnumChanges,
): Result<UMLModel, UmlError> {
  const current = findEnum(model, enumId);
  if (current === undefined) {
    return err(enumNotFound(enumId));
  }
  const merged: UMLEnum = { ...current, ...changes };
  const problem = firstError(
    changes.name === undefined ? null : ensureEnumNameIsFree(model, changes.name, enumId),
    checkLiterals(merged.literals, enumId),
  );
  if (problem !== null) {
    return err(problem);
  }
  return ok({
    ...model,
    enums: model.enums.map((candidate) => (candidate.id === enumId ? merged : candidate)),
  });
}

/** Al borrar una enumeracion desaparece toda referencia de tipo hacia ella. */
function deleteEnum(model: UMLModel, enumId: string): Result<UMLModel, UmlError> {
  if (findEnum(model, enumId) === undefined) {
    return err(enumNotFound(enumId));
  }
  const cleaned = removeTypeReferences(model, enumId);
  return ok({ ...cleaned, enums: cleaned.enums.filter((candidate) => candidate.id !== enumId) });
}

function checkLiterals(literals: readonly string[], enumId: string): UmlError | null {
  const seen = new Set<string>();
  for (const literal of literals) {
    const normalized = literal.trim().toLowerCase();
    if (seen.has(normalized)) {
      return umlError('duplicate_name', `el literal ${literal} esta repetido en la enumeracion`, {
        elementId: enumId,
      });
    }
    seen.add(normalized);
  }
  return null;
}
