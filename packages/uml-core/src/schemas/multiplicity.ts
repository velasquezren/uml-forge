import { z } from 'zod';

/**
 * Multiplicidad UML. Formas admitidas: "1", "0..1", "1..*", "0..*", "*",
 * "n" y "n..m", donde n y m son enteros no negativos.
 */
const MULTIPLICITY_PATTERN = /^(\*|\d+|\d+\.\.(\d+|\*))$/u;

export const MultiplicitySchema = z
  .string()
  .regex(MULTIPLICITY_PATTERN, 'multiplicidad invalida: use 1, 0..1, 1..*, 0..*, * o n..m');

export type Multiplicity = z.infer<typeof MultiplicitySchema>;

/** Limites de una multiplicidad ya interpretada. `Infinity` representa "*". */
export interface MultiplicityBounds {
  readonly lower: number;
  readonly upper: number;
}

/**
 * Interpreta una multiplicidad. Devuelve null si la cadena no tiene una forma
 * reconocible. No comprueba la coherencia entre limites: de eso se encarga el
 * validador del modelo.
 */
export function parseMultiplicity(value: string): MultiplicityBounds | null {
  if (!MULTIPLICITY_PATTERN.test(value)) {
    return null;
  }
  if (value === '*') {
    return { lower: 0, upper: Number.POSITIVE_INFINITY };
  }
  const [rawLower, rawUpper] = value.split('..');
  if (rawLower === undefined) {
    return null;
  }
  const lower = Number.parseInt(rawLower, 10);
  if (rawUpper === undefined) {
    return { lower, upper: lower };
  }
  return {
    lower,
    upper: rawUpper === '*' ? Number.POSITIVE_INFINITY : Number.parseInt(rawUpper, 10),
  };
}

/** Indica si la multiplicidad admite mas de un elemento. */
export function isCollection(value: string): boolean {
  const bounds = parseMultiplicity(value);
  return bounds !== null && bounds.upper > 1;
}

/** Indica si la multiplicidad exige al menos un elemento. */
export function isRequired(value: string): boolean {
  const bounds = parseMultiplicity(value);
  return bounds !== null && bounds.lower >= 1;
}
