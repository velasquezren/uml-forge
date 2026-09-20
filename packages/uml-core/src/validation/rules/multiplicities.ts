import { umlError, type UmlError } from '../../errors.js';
import { parseMultiplicity } from '../../schemas/multiplicity.js';
import type { UMLModel } from '../../schemas/model.js';

/** Detecta multiplicidades mal formadas o con limites incoherentes. */
export function checkMultiplicities(model: UMLModel): UmlError[] {
  const errors: UmlError[] = [];

  for (const umlClass of model.classes) {
    for (const attribute of umlClass.attributes) {
      const problem = describeProblem(attribute.multiplicity);
      if (problem !== null) {
        errors.push(
          umlError('invalid_multiplicity', `el atributo ${attribute.name} ${problem}`, {
            elementId: attribute.id,
          }),
        );
      }
    }
  }

  for (const relationship of model.relationships) {
    for (const [side, end] of [
      ['origen', relationship.sourceEnd],
      ['destino', relationship.targetEnd],
    ] as const) {
      const problem = describeProblem(end.multiplicity);
      if (problem !== null) {
        errors.push(
          umlError('invalid_multiplicity', `el extremo ${side} de la relacion ${problem}`, {
            elementId: relationship.id,
          }),
        );
      }
    }
  }

  return errors;
}

function describeProblem(multiplicity: string): string | null {
  const bounds = parseMultiplicity(multiplicity);
  if (bounds === null) {
    return `tiene una multiplicidad mal formada: ${multiplicity}`;
  }
  if (bounds.lower > bounds.upper) {
    return `tiene una multiplicidad con limites incoherentes: ${multiplicity}`;
  }
  return null;
}
