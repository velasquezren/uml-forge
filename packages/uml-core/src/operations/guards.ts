import { umlError, type UmlError } from '../errors.js';
import { collectElementIds, typeExists } from '../model/lookup.js';
import type { UMLClass } from '../schemas/elements.js';
import type { UMLModel } from '../schemas/model.js';

/** Comprobaciones previas comunes a las operaciones. Devuelven null si todo va bien. */

export function ensureIdIsFree(model: UMLModel, id: string): UmlError | null {
  return collectElementIds(model).includes(id)
    ? umlError('duplicate_id', `ya existe un elemento con el identificador ${id}`, {
        elementId: id,
      })
    : null;
}

export function ensureTypeResolves(
  model: UMLModel,
  type: string,
  path: readonly (string | number)[],
): UmlError | null {
  return typeExists(model, type)
    ? null
    : umlError('unknown_type', `el tipo ${type} no es primitivo ni existe en el modelo`, { path });
}

export function ensureClassNameIsFree(
  model: UMLModel,
  name: string,
  exceptId?: string,
): UmlError | null {
  const normalized = name.trim().toLowerCase();
  const clash = model.classes.find(
    (candidate) => candidate.id !== exceptId && candidate.name.trim().toLowerCase() === normalized,
  );
  return clash === undefined
    ? null
    : umlError('duplicate_name', `ya existe una clase llamada ${clash.name}`, {
        elementId: clash.id,
      });
}

export function ensureEnumNameIsFree(
  model: UMLModel,
  name: string,
  exceptId?: string,
): UmlError | null {
  const normalized = name.trim().toLowerCase();
  const clash = model.enums.find(
    (candidate) => candidate.id !== exceptId && candidate.name.trim().toLowerCase() === normalized,
  );
  return clash === undefined
    ? null
    : umlError('duplicate_name', `ya existe una enumeracion llamada ${clash.name}`, {
        elementId: clash.id,
      });
}

export function ensureAttributeNameIsFree(
  owner: UMLClass,
  name: string,
  exceptId?: string,
): UmlError | null {
  const normalized = name.trim().toLowerCase();
  const clash = owner.attributes.find(
    (candidate) => candidate.id !== exceptId && candidate.name.trim().toLowerCase() === normalized,
  );
  return clash === undefined
    ? null
    : umlError(
        'duplicate_name',
        `la clase ${owner.name} ya tiene un atributo llamado ${clash.name}`,
        {
          elementId: clash.id,
        },
      );
}

/**
 * Dos operaciones de la misma clase pueden compartir nombre solo si difieren en
 * la lista de tipos de sus parametros: es la sobrecarga habitual en UML.
 */
export function ensureOperationSignatureIsFree(
  owner: UMLClass,
  name: string,
  parameterTypes: readonly string[],
  exceptId?: string,
): UmlError | null {
  const normalized = name.trim().toLowerCase();
  const signature = parameterTypes.join(',');
  const clash = owner.operations.find(
    (candidate) =>
      candidate.id !== exceptId &&
      candidate.name.trim().toLowerCase() === normalized &&
      candidate.parameters.map((parameter) => parameter.type).join(',') === signature,
  );
  return clash === undefined
    ? null
    : umlError(
        'duplicate_name',
        `la clase ${owner.name} ya tiene la operacion ${clash.name} con esa firma`,
        {
          elementId: clash.id,
        },
      );
}

export function classNotFound(classId: string): UmlError {
  return umlError('class_not_found', `no existe la clase ${classId}`, { elementId: classId });
}

export function enumNotFound(enumId: string): UmlError {
  return umlError('enum_not_found', `no existe la enumeracion ${enumId}`, { elementId: enumId });
}

export function relationshipNotFound(relationshipId: string): UmlError {
  return umlError('relationship_not_found', `no existe la relacion ${relationshipId}`, {
    elementId: relationshipId,
  });
}

export function attributeNotFound(attributeId: string): UmlError {
  return umlError('attribute_not_found', `no existe el atributo ${attributeId}`, {
    elementId: attributeId,
  });
}

export function operationNotFound(operationId: string): UmlError {
  return umlError('operation_not_found', `no existe la operacion ${operationId}`, {
    elementId: operationId,
  });
}

/** Devuelve el primer error no nulo de una lista de comprobaciones. */
export function firstError(...checks: readonly (UmlError | null)[]): UmlError | null {
  return checks.find((check): check is UmlError => check !== null) ?? null;
}
