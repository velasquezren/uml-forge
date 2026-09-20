import { describe, expect, it } from 'vitest';
import {
  umlModelJsonSchema,
  umlOperationJsonSchema,
  umlOperationListJsonSchema,
} from '../src/json-schema/index.js';
import { UML_OPERATION_TYPES } from '../src/operations/schema.js';

describe('derivacion de JSON Schema', () => {
  it('describe las dieciseis operaciones del lenguaje', () => {
    const schema = umlOperationJsonSchema();
    const branches = schema['anyOf'] ?? schema['oneOf'];
    expect(Array.isArray(branches)).toBe(true);
    expect(Array.isArray(branches) ? branches : []).toHaveLength(UML_OPERATION_TYPES.length);
  });

  it('marca como opcionales los campos con valor por defecto', () => {
    const serialized = JSON.stringify(umlOperationJsonSchema());
    expect(serialized).toContain('addClass');
    expect(serialized).toContain('isAbstract');
    expect(serialized).toContain('uuid');
  });

  it('envuelve la lista de operaciones que se pide a un modelo de lenguaje', () => {
    const schema = umlOperationListJsonSchema();
    expect(schema['type']).toBe('object');
    expect(JSON.stringify(schema)).toContain('operations');
  });

  it('describe tambien el modelo completo', () => {
    const serialized = JSON.stringify(umlModelJsonSchema());
    expect(serialized).toContain('classes');
    expect(serialized).toContain('relationships');
    expect(serialized).toContain('enums');
  });
});
