import type { UMLClass } from '../schemas/elements.js';
import type { UMLModel } from '../schemas/model.js';

/**
 * Elimina toda referencia a un tipo que deja de existir. Ver ADR 0008: el
 * borrado en cascada mantiene el modelo siempre valido, que es lo que necesitan
 * tanto el CRDT como el generador de codigo.
 */
export function removeTypeReferences(model: UMLModel, typeId: string): UMLModel {
  return { ...model, classes: model.classes.map((umlClass) => cleanClass(umlClass, typeId)) };
}

function cleanClass(umlClass: UMLClass, typeId: string): UMLClass {
  return {
    ...umlClass,
    attributes: umlClass.attributes.filter((attribute) => attribute.type !== typeId),
    operations: umlClass.operations.map((operation) => ({
      ...operation,
      returnType: operation.returnType === typeId ? null : operation.returnType,
      parameters: operation.parameters.filter((parameter) => parameter.type !== typeId),
    })),
  };
}

/** Elimina las relaciones en las que participa una clase. */
export function removeRelationshipsOf(model: UMLModel, classId: string): UMLModel {
  return {
    ...model,
    relationships: model.relationships.filter(
      (relationship) => relationship.sourceId !== classId && relationship.targetId !== classId,
    ),
  };
}
