import { umlError, type UmlError } from '../../errors.js';
import { findCyclicClassIds } from '../../model/inheritance.js';
import { findClass } from '../../model/lookup.js';
import type { UMLModel } from '../../schemas/model.js';

/** Detecta ciclos de herencia y usos incorrectos de generalizacion y realizacion. */
export function checkInheritance(model: UMLModel): UmlError[] {
  return [...cycles(model), ...misusedKinds(model)];
}

function cycles(model: UMLModel): UmlError[] {
  return findCyclicClassIds(model.relationships).map((classId) =>
    umlError(
      'cyclic_inheritance',
      `la clase ${findClass(model, classId)?.name ?? classId} participa en un ciclo de herencia`,
      {
        elementId: classId,
      },
    ),
  );
}

function misusedKinds(model: UMLModel): UmlError[] {
  const errors: UmlError[] = [];
  for (const relationship of model.relationships) {
    const source = findClass(model, relationship.sourceId);
    const target = findClass(model, relationship.targetId);
    if (source === undefined || target === undefined) {
      continue;
    }
    if (relationship.kind === 'realization' && !target.isInterface) {
      errors.push(
        umlError(
          'invalid_realization',
          `${source.name} realiza ${target.name}, que no es una interfaz`,
          {
            elementId: relationship.id,
          },
        ),
      );
    }
    if (relationship.kind === 'generalization' && target.isInterface && !source.isInterface) {
      errors.push(
        umlError(
          'invalid_generalization',
          `${source.name} deberia realizar la interfaz ${target.name}`,
          {
            elementId: relationship.id,
          },
        ),
      );
    }
  }
  return errors;
}
