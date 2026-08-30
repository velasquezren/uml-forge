import { describe, expect, it } from 'vitest';
import { applyOperation } from '../src/operations/apply.js';
import { findRelationship } from '../src/model/lookup.js';
import { build, IDS, testId, veterinaryModel } from './fixtures.js';

const INTERFACE_ID = testId(80);
const ABSTRACT_ID = testId(81);
const CONCRETE_ID = testId(82);

/** Modelo con una interfaz, una clase abstracta y una concreta. */
function inheritanceModel() {
  return build([
    { type: 'addClass', class: { id: INTERFACE_ID, name: 'Identifiable', isInterface: true } },
    { type: 'addClass', class: { id: ABSTRACT_ID, name: 'Animal', isAbstract: true } },
    { type: 'addClass', class: { id: CONCRETE_ID, name: 'Dog' } },
  ]);
}

describe('operaciones sobre relaciones', () => {
  it('agrega una asociacion con extremos por defecto', () => {
    const result = applyOperation(inheritanceModel(), {
      type: 'addRelationship',
      relationship: {
        id: testId(90),
        kind: 'association',
        sourceId: ABSTRACT_ID,
        targetId: CONCRETE_ID,
      },
    });
    expect(result.ok).toBe(true);
    expect(result.ok && findRelationship(result.value, testId(90))?.sourceEnd).toEqual({
      name: '',
      multiplicity: '1',
      navigable: true,
      role: '',
    });
  });

  it('rechaza extremos que no existen', () => {
    const result = applyOperation(inheritanceModel(), {
      type: 'addRelationship',
      relationship: {
        id: testId(91),
        kind: 'association',
        sourceId: testId(989),
        targetId: CONCRETE_ID,
      },
    });
    expect(!result.ok && result.error.code).toBe('class_not_found');
  });

  it('rechaza que una clase se generalice a si misma', () => {
    const result = applyOperation(inheritanceModel(), {
      type: 'addRelationship',
      relationship: {
        id: testId(92),
        kind: 'generalization',
        sourceId: CONCRETE_ID,
        targetId: CONCRETE_ID,
      },
    });
    expect(!result.ok && result.error.code).toBe('cyclic_inheritance');
  });

  it('rechaza cerrar un ciclo de herencia', () => {
    const model = build(
      [
        {
          type: 'addRelationship',
          relationship: {
            id: testId(93),
            kind: 'generalization',
            sourceId: CONCRETE_ID,
            targetId: ABSTRACT_ID,
          },
        },
      ],
      inheritanceModel(),
    );

    const result = applyOperation(model, {
      type: 'addRelationship',
      relationship: {
        id: testId(94),
        kind: 'generalization',
        sourceId: ABSTRACT_ID,
        targetId: CONCRETE_ID,
      },
    });
    expect(!result.ok && result.error.code).toBe('cyclic_inheritance');
  });

  it('exige que la realizacion apunte a una interfaz', () => {
    const invalid = applyOperation(inheritanceModel(), {
      type: 'addRelationship',
      relationship: {
        id: testId(95),
        kind: 'realization',
        sourceId: CONCRETE_ID,
        targetId: ABSTRACT_ID,
      },
    });
    expect(!invalid.ok && invalid.error.code).toBe('invalid_realization');

    const valid = applyOperation(inheritanceModel(), {
      type: 'addRelationship',
      relationship: {
        id: testId(96),
        kind: 'realization',
        sourceId: CONCRETE_ID,
        targetId: INTERFACE_ID,
      },
    });
    expect(valid.ok).toBe(true);
  });

  it('exige realizar la interfaz en lugar de generalizarla', () => {
    const result = applyOperation(inheritanceModel(), {
      type: 'addRelationship',
      relationship: {
        id: testId(97),
        kind: 'generalization',
        sourceId: CONCRETE_ID,
        targetId: INTERFACE_ID,
      },
    });
    expect(!result.ok && result.error.code).toBe('invalid_generalization');
  });

  it('actualiza los extremos de una relacion existente', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'updateRelationship',
      id: IDS.petOwner,
      changes: { kind: 'aggregation', targetEnd: { role: 'animals', multiplicity: '1..*' } },
    });
    expect(result.ok).toBe(true);
    expect(result.ok && findRelationship(result.value, IDS.petOwner)).toMatchObject({
      kind: 'aggregation',
      targetEnd: { role: 'animals', multiplicity: '1..*', navigable: true, name: '' },
    });
  });

  it('borra una relacion y avisa si no existe', () => {
    const deleted = applyOperation(veterinaryModel(), {
      type: 'deleteRelationship',
      id: IDS.petOwner,
    });
    expect(deleted.ok && deleted.value.relationships).toHaveLength(0);

    const missing = applyOperation(veterinaryModel(), {
      type: 'deleteRelationship',
      id: testId(988),
    });
    expect(!missing.ok && missing.error.code).toBe('relationship_not_found');
  });

  it('rechaza actualizar una relacion inexistente', () => {
    const result = applyOperation(veterinaryModel(), {
      type: 'updateRelationship',
      id: testId(987),
      changes: { name: 'x' },
    });
    expect(!result.ok && result.error.code).toBe('relationship_not_found');
  });
});
