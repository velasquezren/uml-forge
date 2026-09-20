import { describe, expect, it } from 'vitest';
import { applyOperation } from '../src/operations/apply.js';
import { findClass } from '../src/model/lookup.js';
import { build, emptyModel, IDS, LATER, NOW, testId, veterinaryModel } from './fixtures.js';

describe('operaciones sobre clases', () => {
  it('agrega una clase con los valores por defecto resueltos', () => {
    const result = applyOperation(emptyModel(), {
      type: 'addClass',
      class: { id: IDS.pet, name: 'Pet' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const created = findClass(result.value, IDS.pet);
    expect(created).toMatchObject({
      name: 'Pet',
      isAbstract: false,
      isInterface: false,
      stereotypes: [],
      attributes: [],
      operations: [],
      position: { x: 0, y: 0 },
    });
  });

  it('no modifica el modelo recibido', () => {
    const original = emptyModel();
    const snapshot = structuredClone(original);
    applyOperation(original, { type: 'addClass', class: { id: IDS.pet, name: 'Pet' } });
    expect(original).toEqual(snapshot);
  });

  it('actualiza la marca temporal', () => {
    const result = applyOperation(
      emptyModel(),
      { type: 'addClass', class: { id: IDS.pet, name: 'Pet' } },
      { now: LATER },
    );
    expect(result.ok && result.value.updatedAt).toBe(LATER);
    expect(result.ok && result.value.createdAt).toBe(NOW);
  });

  it('rechaza un identificador repetido', () => {
    const model = veterinaryModel();
    const result = applyOperation(model, {
      type: 'addClass',
      class: { id: IDS.pet, name: 'Otra' },
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('duplicate_id');
  });

  it('rechaza un nombre de clase repetido sin distinguir mayusculas', () => {
    const model = veterinaryModel();
    const result = applyOperation(model, {
      type: 'addClass',
      class: { id: testId(99), name: 'pet' },
    });
    expect(!result.ok && result.error.code).toBe('duplicate_name');
    expect(!result.ok && result.error.elementId).toBe(IDS.pet);
  });

  it('rechaza un payload mal formado', () => {
    const result = applyOperation(emptyModel(), { type: 'addClass', class: { id: 'x', name: '' } });
    expect(!result.ok && result.error.code).toBe('invalid_payload');
  });

  it('actualiza nombre y banderas de una clase', () => {
    const model = veterinaryModel();
    const result = applyOperation(model, {
      type: 'updateClass',
      id: IDS.pet,
      changes: { name: 'Animal', isAbstract: true, stereotypes: ['entity'] },
    });
    expect(result.ok).toBe(true);
    expect(result.ok && findClass(result.value, IDS.pet)).toMatchObject({
      name: 'Animal',
      isAbstract: true,
      stereotypes: ['entity'],
    });
  });

  it('rechaza renombrar hacia un nombre ya ocupado', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'updateClass',
      id: IDS.pet,
      changes: { name: 'Owner' },
    });
    expect(!result.ok && result.error.code).toBe('duplicate_name');
  });

  it('permite renombrar una clase con su propio nombre', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'updateClass',
      id: IDS.pet,
      changes: { name: 'Pet' },
    });
    expect(result.ok).toBe(true);
  });

  it('informa cuando la clase no existe', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'updateClass',
      id: testId(77),
      changes: { name: 'X' },
    });
    expect(!result.ok && result.error.code).toBe('class_not_found');
  });

  it('borra la clase en cascada con sus relaciones y referencias de tipo', () => {
    const model = build(
      [
        {
          type: 'addOperation',
          classId: IDS.owner,
          operation: {
            id: IDS.operation,
            name: 'findPet',
            returnType: IDS.pet,
            parameters: [{ id: IDS.parameter, name: 'pet', type: IDS.pet }],
          },
        },
      ],
      veterinaryModel(),
    );

    const result = applyOperation(model, { type: 'deleteClass', id: IDS.pet });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(findClass(result.value, IDS.pet)).toBeUndefined();
    expect(result.value.relationships).toHaveLength(0);
    const owner = findClass(result.value, IDS.owner);
    expect(owner?.operations[0]?.returnType).toBeNull();
    expect(owner?.operations[0]?.parameters).toHaveLength(0);
  });

  it('mueve una clase en el lienzo', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'setPosition',
      classId: IDS.pet,
      position: { x: 120, y: 240 },
    });
    expect(result.ok && findClass(result.value, IDS.pet)?.position).toEqual({ x: 120, y: 240 });
  });

  it('no mueve una clase inexistente', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'setPosition',
      classId: testId(78),
      position: { x: 1, y: 1 },
    });
    expect(!result.ok && result.error.code).toBe('class_not_found');
  });
});
