import type { z } from 'zod';
import { umlError, type UmlError } from '../errors.js';
import { wouldCreateCycle } from '../model/inheritance.js';
import { findClass, findRelationship } from '../model/lookup.js';
import { err, ok, type Result } from '../result.js';
import type { UMLModel } from '../schemas/model.js';
import type { UMLRelationship } from '../schemas/relationships.js';
import { classNotFound, ensureIdIsFree, firstError, relationshipNotFound } from './guards.js';
import type { RelationshipChangesSchema, RelationshipInputSchema } from './payloads.js';
import type { UmlOperation } from './schema.js';

type RelationshipInput = z.infer<typeof RelationshipInputSchema>;
type RelationshipChanges = z.infer<typeof RelationshipChangesSchema>;
type RelationshipOperation = Extract<
  UmlOperation,
  { type: 'addRelationship' | 'updateRelationship' | 'deleteRelationship' }
>;

/** Aplica las operaciones que afectan a las relaciones. */
export function applyRelationshipOperation(
  model: UMLModel,
  operation: RelationshipOperation,
): Result<UMLModel, UmlError> {
  switch (operation.type) {
    case 'addRelationship':
      return addRelationship(model, operation.relationship);
    case 'updateRelationship':
      return updateRelationship(model, operation.id, operation.changes);
    case 'deleteRelationship':
      return deleteRelationship(model, operation.id);
  }
}

function addRelationship(model: UMLModel, input: RelationshipInput): Result<UMLModel, UmlError> {
  const problem = firstError(
    ensureIdIsFree(model, input.id),
    checkRelationship(model, input, null),
  );
  if (problem !== null) {
    return err(problem);
  }
  return ok({ ...model, relationships: [...model.relationships, input] });
}

function updateRelationship(
  model: UMLModel,
  relationshipId: string,
  changes: RelationshipChanges,
): Result<UMLModel, UmlError> {
  const current = findRelationship(model, relationshipId);
  if (current === undefined) {
    return err(relationshipNotFound(relationshipId));
  }
  const merged: UMLRelationship = { ...current, ...changes };
  const problem = checkRelationship(model, merged, relationshipId);
  if (problem !== null) {
    return err(problem);
  }
  return ok({
    ...model,
    relationships: model.relationships.map((candidate) =>
      candidate.id === relationshipId ? merged : candidate,
    ),
  });
}

function deleteRelationship(model: UMLModel, relationshipId: string): Result<UMLModel, UmlError> {
  if (findRelationship(model, relationshipId) === undefined) {
    return err(relationshipNotFound(relationshipId));
  }
  return ok({
    ...model,
    relationships: model.relationships.filter((candidate) => candidate.id !== relationshipId),
  });
}

/**
 * Comprobaciones estructurales de una relacion. `exceptId` permite ignorar la
 * propia relacion cuando se esta actualizando.
 */
function checkRelationship(
  model: UMLModel,
  relationship: UMLRelationship,
  exceptId: string | null,
): UmlError | null {
  const source = findClass(model, relationship.sourceId);
  if (source === undefined) {
    return classNotFound(relationship.sourceId);
  }
  const target = findClass(model, relationship.targetId);
  if (target === undefined) {
    return classNotFound(relationship.targetId);
  }

  if (relationship.kind === 'realization' && !target.isInterface) {
    return umlError(
      'invalid_realization',
      `${target.name} no es una interfaz: no se puede realizar`,
      {
        elementId: relationship.id,
      },
    );
  }
  if (relationship.kind === 'generalization' && target.isInterface && !source.isInterface) {
    return umlError(
      'invalid_generalization',
      `${source.name} debe realizar la interfaz ${target.name}, no generalizarla`,
      { elementId: relationship.id },
    );
  }
  if (relationship.kind === 'generalization' || relationship.kind === 'realization') {
    const others = model.relationships.filter((candidate) => candidate.id !== exceptId);
    if (wouldCreateCycle(others, relationship.sourceId, relationship.targetId)) {
      return umlError(
        'cyclic_inheritance',
        `la herencia entre ${source.name} y ${target.name} crea un ciclo`,
        {
          elementId: relationship.id,
        },
      );
    }
  }
  return null;
}
