import { isPrimitiveType } from '../schemas/primitives.js';
import type { UMLClass, UMLEnum, UMLOperation, UMLProperty } from '../schemas/elements.js';
import type { UMLModel } from '../schemas/model.js';
import type { UMLRelationship } from '../schemas/relationships.js';

/** Busca una clase por identificador. */
export function findClass(model: UMLModel, classId: string): UMLClass | undefined {
  return model.classes.find((candidate) => candidate.id === classId);
}

/** Busca una enumeracion por identificador. */
export function findEnum(model: UMLModel, enumId: string): UMLEnum | undefined {
  return model.enums.find((candidate) => candidate.id === enumId);
}

/** Busca una relacion por identificador. */
export function findRelationship(
  model: UMLModel,
  relationshipId: string,
): UMLRelationship | undefined {
  return model.relationships.find((candidate) => candidate.id === relationshipId);
}

/** Busca un atributo en todo el modelo y devuelve tambien su clase contenedora. */
export function findAttribute(
  model: UMLModel,
  attributeId: string,
): { owner: UMLClass; attribute: UMLProperty } | undefined {
  for (const owner of model.classes) {
    const attribute = owner.attributes.find((candidate) => candidate.id === attributeId);
    if (attribute !== undefined) {
      return { owner, attribute };
    }
  }
  return undefined;
}

/** Busca una operacion en todo el modelo y devuelve tambien su clase contenedora. */
export function findOperation(
  model: UMLModel,
  operationId: string,
): { owner: UMLClass; operation: UMLOperation } | undefined {
  for (const owner of model.classes) {
    const operation = owner.operations.find((candidate) => candidate.id === operationId);
    if (operation !== undefined) {
      return { owner, operation };
    }
  }
  return undefined;
}

/** Busca una clase por nombre exacto. Solo lo usan las politicas de conflicto. */
export function findClassByName(model: UMLModel, name: string): UMLClass | undefined {
  const normalized = name.trim().toLowerCase();
  return model.classes.find((candidate) => candidate.name.trim().toLowerCase() === normalized);
}

/** Indica si una referencia de tipo se resuelve dentro del modelo. */
export function typeExists(model: UMLModel, type: string): boolean {
  return (
    isPrimitiveType(type) ||
    findClass(model, type) !== undefined ||
    findEnum(model, type) !== undefined
  );
}

/** Devuelve todos los identificadores de elementos del modelo. */
export function collectElementIds(model: UMLModel): string[] {
  const ids: string[] = [];
  for (const umlClass of model.classes) {
    ids.push(umlClass.id);
    for (const attribute of umlClass.attributes) {
      ids.push(attribute.id);
    }
    for (const operation of umlClass.operations) {
      ids.push(operation.id);
      for (const parameter of operation.parameters) {
        ids.push(parameter.id);
      }
    }
  }
  for (const umlEnum of model.enums) {
    ids.push(umlEnum.id);
  }
  for (const relationship of model.relationships) {
    ids.push(relationship.id);
  }
  return ids;
}
