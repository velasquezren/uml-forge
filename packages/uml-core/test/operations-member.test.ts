import { describe, expect, it } from 'vitest';
import { applyOperation } from '../src/operations/apply.js';
import { findAttribute, findClass, findOperation } from '../src/model/lookup.js';
import type { UmlOperationInput } from '../src/operations/schema.js';
import { IDS, testId, veterinaryModel } from './fixtures.js';

describe('operaciones sobre atributos', () => {
  it('agrega un atributo con los valores por defecto del metamodelo', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'addAttribute',
      classId: IDS.pet,
      attribute: { id: testId(60), name: 'birthDate', type: 'Date' },
    });
    expect(result.ok).toBe(true);
    expect(result.ok && findAttribute(result.value, testId(60))?.attribute).toMatchObject({
      visibility: 'private',
      multiplicity: '1',
      isNullable: true,
      isIdentifier: false,
      defaultValue: null,
    });
  });

  it('acepta como tipo el identificador de otra clase', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'addAttribute',
      classId: IDS.owner,
      attribute: { id: testId(61), name: 'favorite', type: IDS.pet },
    });
    expect(result.ok).toBe(true);
  });

  it('rechaza un tipo que no existe', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'addAttribute',
      classId: IDS.owner,
      attribute: { id: testId(62), name: 'ghost', type: testId(999) },
    });
    expect(!result.ok && result.error.code).toBe('unknown_type');
  });

  it('rechaza un atributo repetido dentro de la misma clase', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'addAttribute',
      classId: IDS.pet,
      attribute: { id: testId(63), name: 'Name', type: 'String' },
    });
    expect(!result.ok && result.error.code).toBe('duplicate_name');
  });

  it('admite el mismo nombre de atributo en clases distintas', () => {
    const model = veterinaryModel();
    expect(findAttribute(model, IDS.ownerName)?.attribute.name).toBe('name');
    expect(findAttribute(model, IDS.petName)?.attribute.name).toBe('name');
  });

  it('rechaza agregar a una clase inexistente', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'addAttribute',
      classId: testId(998),
      attribute: { id: testId(64), name: 'x', type: 'String' },
    });
    expect(!result.ok && result.error.code).toBe('class_not_found');
  });

  it('actualiza un atributo', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'updateAttribute',
      id: IDS.petName,
      changes: { multiplicity: '0..1', isIdentifier: true, defaultValue: 'sin nombre' },
    });
    expect(result.ok && findAttribute(result.value, IDS.petName)?.attribute).toMatchObject({
      multiplicity: '0..1',
      isIdentifier: true,
      defaultValue: 'sin nombre',
    });
  });

  it('rechaza actualizar hacia un tipo inexistente o un nombre ocupado', () => {
    const unknownType = applyOperation(veterinaryModel(), {
      type: 'updateAttribute',
      id: IDS.petName,
      changes: { type: testId(997) },
    });
    expect(!unknownType.ok && unknownType.error.code).toBe('unknown_type');

    const clash = applyOperation(veterinaryModel(), {
      type: 'updateAttribute',
      id: IDS.petSpecies,
      changes: { name: 'name' },
    });
    expect(!clash.ok && clash.error.code).toBe('duplicate_name');
  });

  it('borra un atributo y avisa si no existe', () => {
    const deleted = applyOperation(veterinaryModel(), { type: 'deleteAttribute', id: IDS.petName });
    expect(deleted.ok && findAttribute(deleted.value, IDS.petName)).toBeUndefined();

    const missing = applyOperation(veterinaryModel(), { type: 'deleteAttribute', id: testId(996) });
    expect(!missing.ok && missing.error.code).toBe('attribute_not_found');
  });
});

describe('operaciones sobre metodos de clase', () => {
  const addOperation: UmlOperationInput = {
    type: 'addOperation',
    classId: IDS.pet,
    operation: {
      id: IDS.operation,
      name: 'vaccinate',
      parameters: [{ id: IDS.parameter, name: 'date', type: 'Date' }],
    },
  };

  it('agrega una operacion con retorno nulo por defecto', () => {
    const result = applyOperation(veterinaryModel(), addOperation);
    expect(result.ok).toBe(true);
    expect(result.ok && findOperation(result.value, IDS.operation)?.operation).toMatchObject({
      returnType: null,
      visibility: 'public',
      isAbstract: false,
      isStatic: false,
    });
  });

  it('admite sobrecarga con firmas distintas y la rechaza con la misma firma', () => {
    const model = veterinaryModel();
    const first = applyOperation(model, addOperation);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const overload = applyOperation(first.value, {
      type: 'addOperation',
      classId: IDS.pet,
      operation: {
        id: testId(70),
        name: 'vaccinate',
        parameters: [{ id: testId(71), name: 'label', type: 'String' }],
      },
    });
    expect(overload.ok).toBe(true);

    const repeated = applyOperation(first.value, {
      type: 'addOperation',
      classId: IDS.pet,
      operation: {
        id: testId(72),
        name: 'vaccinate',
        parameters: [{ id: testId(73), name: 'otherDate', type: 'Date' }],
      },
    });
    expect(!repeated.ok && repeated.error.code).toBe('duplicate_name');
  });

  it('rechaza parametros repetidos y tipos inexistentes', () => {
    const duplicated = applyOperation(veterinaryModel(), {
      type: 'addOperation',
      classId: IDS.pet,
      operation: {
        id: testId(74),
        name: 'feed',
        parameters: [
          { id: testId(75), name: 'a', type: 'String' },
          { id: testId(75), name: 'b', type: 'String' },
        ],
      },
    });
    expect(!duplicated.ok && duplicated.error.code).toBe('duplicate_id');

    const badReturn = applyOperation(veterinaryModel(), {
      type: 'addOperation',
      classId: IDS.pet,
      operation: { id: testId(76), name: 'ghost', returnType: testId(995) },
    });
    expect(!badReturn.ok && badReturn.error.code).toBe('unknown_type');
  });

  it('actualiza y borra una operacion', () => {
    const created = applyOperation(veterinaryModel(), addOperation);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const updated = applyOperation(created.value, {
      type: 'updateOperation',
      id: IDS.operation,
      changes: { returnType: 'Boolean', isStatic: true, parameters: [] },
    });
    expect(updated.ok && findOperation(updated.value, IDS.operation)?.operation).toMatchObject({
      returnType: 'Boolean',
      isStatic: true,
      parameters: [],
    });

    const removed = applyOperation(created.value, { type: 'deleteOperation', id: IDS.operation });
    expect(removed.ok && findClass(removed.value, IDS.pet)?.operations).toHaveLength(0);

    const missing = applyOperation(created.value, { type: 'deleteOperation', id: testId(994) });
    expect(!missing.ok && missing.error.code).toBe('operation_not_found');
  });
});
