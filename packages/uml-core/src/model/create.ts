import { createId } from '../ids.js';
import type { UMLModel } from '../schemas/model.js';

/** Crea un modelo vacio con identificador y marcas temporales propias. */
export function createEmptyModel(
  name: string,
  options: { id?: string; now?: string } = {},
): UMLModel {
  const timestamp = options.now ?? new Date().toISOString();
  return {
    id: options.id ?? createId(),
    name,
    classes: [],
    enums: [],
    relationships: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Devuelve una copia del modelo con la marca de modificacion actualizada. */
export function touch(model: UMLModel, now?: string): UMLModel {
  return { ...model, updatedAt: now ?? new Date().toISOString() };
}
