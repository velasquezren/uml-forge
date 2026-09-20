import type { z } from 'zod';
import type { UmlError } from '../errors.js';
import { removeRelationshipsOf, removeTypeReferences } from '../model/cascade.js';
import { findClass, findEnum } from '../model/lookup.js';
import { err, ok, type Result } from '../result.js';
import type { UMLClass } from '../schemas/elements.js';
import type { UMLModel } from '../schemas/model.js';
import type { Position } from '../schemas/primitives.js';
import { classNotFound, ensureClassNameIsFree, ensureIdIsFree, firstError } from './guards.js';
import type { ClassChangesSchema, ClassInputSchema } from './payloads.js';
import type { UmlOperation } from './schema.js';

type ClassInput = z.infer<typeof ClassInputSchema>;
type ClassChanges = z.infer<typeof ClassChangesSchema>;
type ClassOperation = Extract<
  UmlOperation,
  { type: 'addClass' | 'updateClass' | 'deleteClass' | 'setPosition' }
>;

/** Aplica las operaciones que afectan a una clase completa. */
export function applyClassOperation(
  model: UMLModel,
  operation: ClassOperation,
): Result<UMLModel, UmlError> {
  switch (operation.type) {
    case 'addClass':
      return addClass(model, operation.class);
    case 'updateClass':
      return updateClass(model, operation.id, operation.changes);
    case 'deleteClass':
      return deleteClass(model, operation.id);
    case 'setPosition':
      return setPosition(model, operation.classId, operation.position);
  }
}

function addClass(model: UMLModel, input: ClassInput): Result<UMLModel, UmlError> {
  const problem = firstError(
    ensureIdIsFree(model, input.id),
    ensureClassNameIsFree(model, input.name),
  );
  if (problem !== null) {
    return err(problem);
  }
  const created: UMLClass = {
    id: input.id,
    name: input.name,
    isAbstract: input.isAbstract,
    isInterface: input.isInterface,
    stereotypes: input.stereotypes,
    attributes: [],
    operations: [],
    position: input.position,
  };
  return ok({ ...model, classes: [...model.classes, created] });
}

function updateClass(
  model: UMLModel,
  classId: string,
  changes: ClassChanges,
): Result<UMLModel, UmlError> {
  const current = findClass(model, classId);
  if (current === undefined) {
    return err(classNotFound(classId));
  }
  if (changes.name !== undefined) {
    const clash = ensureClassNameIsFree(model, changes.name, classId);
    if (clash !== null) {
      return err(clash);
    }
  }
  const updated: UMLClass = {
    ...current,
    name: changes.name ?? current.name,
    isAbstract: changes.isAbstract ?? current.isAbstract,
    isInterface: changes.isInterface ?? current.isInterface,
    stereotypes: changes.stereotypes ?? current.stereotypes,
    position: changes.position ?? current.position,
  };
  return ok(replaceClass(model, updated));
}

/**
 * Borrado en cascada: al desaparecer una clase se van con ella sus relaciones y
 * toda referencia de tipo que apuntase a ella. Ver ADR 0008.
 */
function deleteClass(model: UMLModel, classId: string): Result<UMLModel, UmlError> {
  if (findClass(model, classId) === undefined) {
    return err(classNotFound(classId));
  }
  const withoutReferences = removeTypeReferences(removeRelationshipsOf(model, classId), classId);
  return ok({
    ...withoutReferences,
    classes: withoutReferences.classes.filter((candidate) => candidate.id !== classId),
  });
}

/**
 * Mueve un clasificador. El identificador puede ser el de una clase o el de una
 * enumeracion, porque ambas se dibujan y se arrastran en el mismo lienzo.
 */
function setPosition(
  model: UMLModel,
  classifierId: string,
  position: Position,
): Result<UMLModel, UmlError> {
  const current = findClass(model, classifierId);
  if (current !== undefined) {
    return ok(replaceClass(model, { ...current, position }));
  }
  const currentEnum = findEnum(model, classifierId);
  if (currentEnum === undefined) {
    return err(classNotFound(classifierId));
  }
  return ok({
    ...model,
    enums: model.enums.map((candidate) =>
      candidate.id === classifierId ? { ...candidate, position } : candidate,
    ),
  });
}

/** Sustituye una clase conservando el orden del resto. */
export function replaceClass(model: UMLModel, updated: UMLClass): UMLModel {
  return {
    ...model,
    classes: model.classes.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
  };
}
