import type { UmlError } from '../errors.js';
import type { UMLModel } from '../schemas/model.js';
import { checkDuplicates } from './rules/duplicates.js';
import { checkInheritance } from './rules/inheritance.js';
import { checkMultiplicities } from './rules/multiplicities.js';
import { checkReferences } from './rules/references.js';

/**
 * Valida un modelo completo y devuelve todos los problemas encontrados, sin
 * detenerse en el primero: quien modela quiere ver la lista entera.
 */
export function validateModel(model: UMLModel): UmlError[] {
  return [
    ...checkDuplicates(model),
    ...checkReferences(model),
    ...checkInheritance(model),
    ...checkMultiplicities(model),
  ];
}

/** Atajo para saber si un modelo esta listo para generar codigo. */
export function isValidModel(model: UMLModel): boolean {
  return validateModel(model).length === 0;
}
