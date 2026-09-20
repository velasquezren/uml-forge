import { describe, expect, it } from 'vitest';
import { applyOperation, applyOperations } from '../src/operations/apply.js';
import { findAttribute, findEnum } from '../src/model/lookup.js';
import { emptyModel, IDS, NOW, testId, veterinaryModel } from './fixtures.js';

describe('operaciones sobre enumeraciones', () => {
  it('agrega una enumeracion', () => {
    const result = applyOperation(emptyModel(), {
      type: 'addEnum',
      enum: { id: IDS.species, name: 'Species', literals: ['DOG'] },
    });
    expect(result.ok && findEnum(result.value, IDS.species)?.literals).toEqual(['DOG']);
  });

  it('agrega una enumeracion sin literales', () => {
    const result = applyOperation(emptyModel(), {
      type: 'addEnum',
      enum: { id: IDS.species, name: 'Species' },
    });
    expect(result.ok && findEnum(result.value, IDS.species)?.literals).toEqual([]);
  });

  it('la enumeracion nace en el origen del lienzo si no se indica posicion', () => {
    const result = applyOperation(emptyModel(), {
      type: 'addEnum',
      enum: { id: IDS.species, name: 'Species' },
    });
    expect(result.ok && findEnum(result.value, IDS.species)?.position).toEqual({ x: 0, y: 0 });
  });

  it('mueve una enumeracion por el lienzo con setPosition', () => {
    const created = applyOperation(emptyModel(), {
      type: 'addEnum',
      enum: { id: IDS.species, name: 'Species', position: { x: 10, y: 10 } },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const moved = applyOperation(created.value, {
      type: 'setPosition',
      classId: IDS.species,
      position: { x: 320, y: 180 },
    });
    expect(moved.ok && findEnum(moved.value, IDS.species)?.position).toEqual({ x: 320, y: 180 });
  });

  it('setPosition sobre un identificador inexistente falla', () => {
    const result = applyOperation(emptyModel(), {
      type: 'setPosition',
      classId: testId(91),
      position: { x: 1, y: 1 },
    });
    expect(!result.ok && result.error.code).toBe('class_not_found');
  });

  it('rechaza literales repetidos', () => {
    const result = applyOperation(emptyModel(), {
      type: 'addEnum',
      enum: { id: IDS.species, name: 'Species', literals: ['DOG', 'dog'] },
    });
    expect(!result.ok && result.error.code).toBe('duplicate_name');
  });

  it('rechaza nombres de enumeracion repetidos', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'addEnum',
      enum: { id: testId(85), name: 'species' },
    });
    expect(!result.ok && result.error.code).toBe('duplicate_name');
  });

  it('actualiza nombre y literales', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'updateEnum',
      id: IDS.species,
      changes: { name: 'AnimalKind', literals: ['DOG', 'CAT', 'BIRD'] },
    });
    expect(result.ok && findEnum(result.value, IDS.species)).toMatchObject({
      name: 'AnimalKind',
      literals: ['DOG', 'CAT', 'BIRD'],
    });
  });

  it('rechaza actualizar una enumeracion inexistente o con literales repetidos', () => {
    const missing = applyOperation(veterinaryModel(), {
      type: 'updateEnum',
      id: testId(984),
      changes: { name: 'X' },
    });
    expect(!missing.ok && missing.error.code).toBe('enum_not_found');

    const repeated = applyOperation(veterinaryModel(), {
      type: 'updateEnum',
      id: IDS.species,
      changes: { literals: ['DOG', 'DOG'] },
    });
    expect(!repeated.ok && repeated.error.code).toBe('duplicate_name');
  });

  it('borra la enumeracion y con ella los atributos que la usaban', () => {
    const result = applyOperation(veterinaryModel(), { type: 'deleteEnum', id: IDS.species });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.enums).toHaveLength(0);
    expect(findAttribute(result.value, IDS.petSpecies)).toBeUndefined();
    expect(findAttribute(result.value, IDS.petName)).toBeDefined();
  });

  it('avisa al borrar una enumeracion inexistente', () => {
    const result = applyOperation(veterinaryModel(), { type: 'deleteEnum', id: testId(983) });
    expect(!result.ok && result.error.code).toBe('enum_not_found');
  });
});

describe('aplicacion por lotes', () => {
  it('es atomica: si una operacion falla no se aplica ninguna', () => {
    const model = veterinaryModel();
    const result = applyOperations(model, [
      { type: 'addClass', class: { id: testId(86), name: 'Appointment' } },
      {
        type: 'addAttribute',
        classId: testId(982),
        attribute: { id: testId(87), name: 'x', type: 'String' },
      },
    ]);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('class_not_found');
    expect(!result.ok && result.error.path?.[0]).toBe(1);
    expect(model.classes).toHaveLength(2);
  });

  it('aplica operaciones que dependen de las anteriores', () => {
    const result = applyOperations(emptyModel(), [
      { type: 'addClass', class: { id: testId(88), name: 'Invoice' } },
      {
        type: 'addAttribute',
        classId: testId(88),
        attribute: { id: testId(89), name: 'total', type: 'BigDecimal' },
      },
    ]);
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.classes[0]?.attributes).toHaveLength(1);
  });

  it('informa del indice cuando el payload es invalido', () => {
    const result = applyOperations(emptyModel(), [
      { type: 'addClass', class: { id: testId(70), name: 'Ok' } },
      { type: 'addClass', class: { id: 'no-es-uuid', name: 'Mal' } },
    ]);
    expect(!result.ok && result.error.code).toBe('invalid_payload');
    expect(!result.ok && result.error.path?.[0]).toBe(1);
  });

  it('no toca la marca temporal con un lote vacio', () => {
    const model = veterinaryModel();
    const result = applyOperations(model, []);
    expect(result.ok && result.value.updatedAt).toBe(NOW);
  });
});
