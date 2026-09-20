import { describe, expect, it } from 'vitest';
import { createId, isId } from '../src/ids.js';
import {
  isCollection,
  isRequired,
  MultiplicitySchema,
  parseMultiplicity,
} from '../src/schemas/multiplicity.js';
import {
  isPrimitiveType,
  PrimitiveTypeSchema,
  VisibilitySchema,
} from '../src/schemas/primitives.js';
import { UMLModelSchema } from '../src/schemas/model.js';
import { emptyModel, veterinaryModel } from './fixtures.js';

describe('identificadores', () => {
  it('genera UUID validos', () => {
    const id = createId();
    expect(isId(id)).toBe(true);
    expect(id).not.toEqual(createId());
  });

  it('rechaza cadenas que no son UUID', () => {
    expect(isId('Mascota')).toBe(false);
    expect(isId('')).toBe(false);
  });
});

describe('multiplicidades', () => {
  it.each(['1', '0..1', '1..*', '0..*', '*', '3', '2..5'])('acepta la forma %s', (value) => {
    expect(MultiplicitySchema.safeParse(value).success).toBe(true);
  });

  it.each(['', 'uno', '1..', '..*', '1-*', '*..1'])('rechaza la forma %s', (value) => {
    expect(MultiplicitySchema.safeParse(value).success).toBe(false);
  });

  it('interpreta los limites', () => {
    expect(parseMultiplicity('1')).toEqual({ lower: 1, upper: 1 });
    expect(parseMultiplicity('0..1')).toEqual({ lower: 0, upper: 1 });
    expect(parseMultiplicity('2..5')).toEqual({ lower: 2, upper: 5 });
    expect(parseMultiplicity('1..*')).toEqual({ lower: 1, upper: Number.POSITIVE_INFINITY });
    expect(parseMultiplicity('*')).toEqual({ lower: 0, upper: Number.POSITIVE_INFINITY });
    expect(parseMultiplicity('invalida')).toBeNull();
  });

  it('distingue colecciones de valores obligatorios', () => {
    expect(isCollection('0..*')).toBe(true);
    expect(isCollection('1')).toBe(false);
    expect(isCollection('mal')).toBe(false);
    expect(isRequired('1..*')).toBe(true);
    expect(isRequired('0..1')).toBe(false);
    expect(isRequired('mal')).toBe(false);
  });
});

describe('tipos primitivos y visibilidad', () => {
  it('reconoce los diez primitivos del metamodelo', () => {
    expect(PrimitiveTypeSchema.options).toHaveLength(10);
    expect(isPrimitiveType('BigDecimal')).toBe(true);
    expect(isPrimitiveType('Mascota')).toBe(false);
  });

  it('acepta las cuatro visibilidades UML', () => {
    expect(VisibilitySchema.options).toEqual(['public', 'private', 'protected', 'package']);
  });
});

describe('esquema del modelo', () => {
  it('valida un modelo vacio y uno completo', () => {
    expect(UMLModelSchema.safeParse(emptyModel()).success).toBe(true);
    expect(UMLModelSchema.safeParse(veterinaryModel()).success).toBe(true);
  });

  it('rechaza un modelo sin identificador valido', () => {
    expect(UMLModelSchema.safeParse({ ...emptyModel(), id: 'sin-uuid' }).success).toBe(false);
  });
});
