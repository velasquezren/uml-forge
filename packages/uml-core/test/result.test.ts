import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, ok } from '../src/result.js';
import { fromZodError, umlError } from '../src/errors.js';

describe('tipo Result', () => {
  it('distingue exito de error', () => {
    const success = ok(42);
    const failure = err('roto');

    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(isOk(failure)).toBe(false);
    expect(isErr(failure)).toBe(true);
    expect(success.ok && success.value).toBe(42);
    expect(!failure.ok && failure.error).toBe('roto');
  });
});

describe('errores del metamodelo', () => {
  it('construye errores con y sin datos adicionales', () => {
    expect(umlError('duplicate_name', 'repetido')).toEqual({
      code: 'duplicate_name',
      message: 'repetido',
      elementId: undefined,
      path: undefined,
    });
    expect(umlError('unknown_type', 'sin tipo', { elementId: 'x', path: ['a', 0] })).toMatchObject({
      elementId: 'x',
      path: ['a', 0],
    });
  });

  it('traduce los problemas de Zod y tolera una lista vacia', () => {
    const translated = fromZodError(
      [{ code: 'custom', path: ['class', 'name'], message: 'requerido' }],
      'operacion invalida',
    );
    expect(translated.code).toBe('invalid_payload');
    expect(translated.message).toContain('class.name: requerido');
    expect(fromZodError([], 'contexto').message).toContain('payload invalido');
  });
});
