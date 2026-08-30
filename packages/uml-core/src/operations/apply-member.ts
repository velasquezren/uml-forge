import type { z } from 'zod';
import { umlError, type UmlError } from '../errors.js';
import { findAttribute, findClass, findOperation } from '../model/lookup.js';
import { err, ok, type Result } from '../result.js';
import type { UMLOperation, UMLProperty } from '../schemas/elements.js';
import type { UMLModel } from '../schemas/model.js';
import { replaceClass } from './apply-class.js';
import {
  attributeNotFound,
  classNotFound,
  ensureAttributeNameIsFree,
  ensureIdIsFree,
  ensureOperationSignatureIsFree,
  ensureTypeResolves,
  firstError,
  operationNotFound,
} from './guards.js';
import type {
  AttributeChangesSchema,
  AttributeInputSchema,
  OperationChangesSchema,
  OperationInputSchema,
  ParameterInputSchema,
} from './payloads.js';
import type { UmlOperation } from './schema.js';

type AttributeInput = z.infer<typeof AttributeInputSchema>;
type AttributeChanges = z.infer<typeof AttributeChangesSchema>;
type OperationInput = z.infer<typeof OperationInputSchema>;
type OperationChanges = z.infer<typeof OperationChangesSchema>;
type ParameterInput = z.infer<typeof ParameterInputSchema>;

type MemberOperation = Extract<
  UmlOperation,
  {
    type:
      | 'addAttribute'
      | 'updateAttribute'
      | 'deleteAttribute'
      | 'addOperation'
      | 'updateOperation'
      | 'deleteOperation';
  }
>;

/** Aplica las operaciones que afectan a los miembros de una clase. */
export function applyMemberOperation(
  model: UMLModel,
  operation: MemberOperation,
): Result<UMLModel, UmlError> {
  switch (operation.type) {
    case 'addAttribute':
      return addAttribute(model, operation.classId, operation.attribute);
    case 'updateAttribute':
      return updateAttribute(model, operation.id, operation.changes);
    case 'deleteAttribute':
      return deleteAttribute(model, operation.id);
    case 'addOperation':
      return addOperation(model, operation.classId, operation.operation);
    case 'updateOperation':
      return updateOperation(model, operation.id, operation.changes);
    case 'deleteOperation':
      return deleteOperation(model, operation.id);
  }
}

function addAttribute(
  model: UMLModel,
  classId: string,
  input: AttributeInput,
): Result<UMLModel, UmlError> {
  const owner = findClass(model, classId);
  if (owner === undefined) {
    return err(classNotFound(classId));
  }
  const problem = firstError(
    ensureIdIsFree(model, input.id),
    ensureAttributeNameIsFree(owner, input.name),
    ensureTypeResolves(model, input.type, ['attribute', 'type']),
  );
  if (problem !== null) {
    return err(problem);
  }
  return ok(replaceClass(model, { ...owner, attributes: [...owner.attributes, input] }));
}

function updateAttribute(
  model: UMLModel,
  attributeId: string,
  changes: AttributeChanges,
): Result<UMLModel, UmlError> {
  const found = findAttribute(model, attributeId);
  if (found === undefined) {
    return err(attributeNotFound(attributeId));
  }
  const problem = firstError(
    changes.name === undefined
      ? null
      : ensureAttributeNameIsFree(found.owner, changes.name, attributeId),
    changes.type === undefined
      ? null
      : ensureTypeResolves(model, changes.type, ['changes', 'type']),
  );
  if (problem !== null) {
    return err(problem);
  }
  const updated: UMLProperty = { ...found.attribute, ...changes };
  return ok(
    replaceClass(model, {
      ...found.owner,
      attributes: found.owner.attributes.map((candidate) =>
        candidate.id === attributeId ? updated : candidate,
      ),
    }),
  );
}

function deleteAttribute(model: UMLModel, attributeId: string): Result<UMLModel, UmlError> {
  const found = findAttribute(model, attributeId);
  if (found === undefined) {
    return err(attributeNotFound(attributeId));
  }
  return ok(
    replaceClass(model, {
      ...found.owner,
      attributes: found.owner.attributes.filter((candidate) => candidate.id !== attributeId),
    }),
  );
}

function addOperation(
  model: UMLModel,
  classId: string,
  input: OperationInput,
): Result<UMLModel, UmlError> {
  const owner = findClass(model, classId);
  if (owner === undefined) {
    return err(classNotFound(classId));
  }
  const problem = firstError(
    ensureIdIsFree(model, input.id),
    ensureOperationSignatureIsFree(
      owner,
      input.name,
      input.parameters.map((parameter) => parameter.type),
    ),
    checkReturnType(model, input.returnType),
    checkParameters(model, input.parameters),
  );
  if (problem !== null) {
    return err(problem);
  }
  return ok(replaceClass(model, { ...owner, operations: [...owner.operations, input] }));
}

function updateOperation(
  model: UMLModel,
  operationId: string,
  changes: OperationChanges,
): Result<UMLModel, UmlError> {
  const found = findOperation(model, operationId);
  if (found === undefined) {
    return err(operationNotFound(operationId));
  }
  const merged: UMLOperation = { ...found.operation, ...changes };
  const problem = firstError(
    ensureOperationSignatureIsFree(
      found.owner,
      merged.name,
      merged.parameters.map((parameter) => parameter.type),
      operationId,
    ),
    checkReturnType(model, merged.returnType),
    checkParameters(model, merged.parameters),
  );
  if (problem !== null) {
    return err(problem);
  }
  return ok(
    replaceClass(model, {
      ...found.owner,
      operations: found.owner.operations.map((candidate) =>
        candidate.id === operationId ? merged : candidate,
      ),
    }),
  );
}

function deleteOperation(model: UMLModel, operationId: string): Result<UMLModel, UmlError> {
  const found = findOperation(model, operationId);
  if (found === undefined) {
    return err(operationNotFound(operationId));
  }
  return ok(
    replaceClass(model, {
      ...found.owner,
      operations: found.owner.operations.filter((candidate) => candidate.id !== operationId),
    }),
  );
}

function checkReturnType(model: UMLModel, returnType: string | null): UmlError | null {
  return returnType === null
    ? null
    : ensureTypeResolves(model, returnType, ['operation', 'returnType']);
}

function checkParameters(
  model: UMLModel,
  parameters: readonly ParameterInput[] | readonly UMLOperation['parameters'][number][],
): UmlError | null {
  const seen = new Set<string>();
  for (const [index, parameter] of parameters.entries()) {
    if (seen.has(parameter.id)) {
      return umlError(
        'duplicate_id',
        `el parametro ${parameter.id} esta repetido en la operacion`,
        {
          elementId: parameter.id,
        },
      );
    }
    seen.add(parameter.id);
    const unknownType = ensureTypeResolves(model, parameter.type, ['parameters', index, 'type']);
    if (unknownType !== null) {
      return unknownType;
    }
  }
  return null;
}
