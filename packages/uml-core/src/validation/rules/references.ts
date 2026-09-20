import { umlError, type UmlError } from '../../errors.js';
import { findClass, typeExists } from '../../model/lookup.js';
import type { UMLModel } from '../../schemas/model.js';

/** Detecta referencias colgantes y tipos que no se resuelven. */
export function checkReferences(model: UMLModel): UmlError[] {
  return [...danglingRelationshipEnds(model), ...unresolvedTypes(model)];
}

function danglingRelationshipEnds(model: UMLModel): UmlError[] {
  const errors: UmlError[] = [];
  for (const relationship of model.relationships) {
    if (findClass(model, relationship.sourceId) === undefined) {
      errors.push(
        umlError('dangling_reference', `la relacion apunta a una clase origen inexistente`, {
          elementId: relationship.id,
          path: ['relationships', relationship.id, 'sourceId'],
        }),
      );
    }
    if (findClass(model, relationship.targetId) === undefined) {
      errors.push(
        umlError('dangling_reference', `la relacion apunta a una clase destino inexistente`, {
          elementId: relationship.id,
          path: ['relationships', relationship.id, 'targetId'],
        }),
      );
    }
  }
  return errors;
}

function unresolvedTypes(model: UMLModel): UmlError[] {
  const errors: UmlError[] = [];
  for (const umlClass of model.classes) {
    for (const attribute of umlClass.attributes) {
      if (!typeExists(model, attribute.type)) {
        errors.push(
          umlError('unknown_type', `el atributo ${attribute.name} tiene un tipo que no existe`, {
            elementId: attribute.id,
            path: ['classes', umlClass.id, 'attributes', attribute.id],
          }),
        );
      }
    }
    for (const operation of umlClass.operations) {
      if (operation.returnType !== null && !typeExists(model, operation.returnType)) {
        errors.push(
          umlError(
            'unknown_type',
            `la operacion ${operation.name} devuelve un tipo que no existe`,
            {
              elementId: operation.id,
            },
          ),
        );
      }
      for (const parameter of operation.parameters) {
        if (!typeExists(model, parameter.type)) {
          errors.push(
            umlError('unknown_type', `el parametro ${parameter.name} tiene un tipo que no existe`, {
              elementId: parameter.id,
            }),
          );
        }
      }
    }
  }
  return errors;
}
