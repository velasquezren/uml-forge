import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { applyOperation } from '../src/operations/apply.js';
import type { UmlOperationInput } from '../src/operations/schema.js';
import { applyOperationToYDoc, applyOperationsToYDoc } from '../src/yjs/apply-to-ydoc.js';
import { fromYDoc, hasModel } from '../src/yjs/from-ydoc.js';
import { ROOT_CLASSES, ROOT_META } from '../src/yjs/keys.js';
import { toYDoc } from '../src/yjs/to-ydoc.js';
import { IDS, LATER, normalize, testId, veterinaryModel } from './fixtures.js';

describe('mapeo bidireccional con Yjs', () => {
  it('conserva el modelo completo en la ida y vuelta', () => {
    const model = veterinaryModel();
    const restored = fromYDoc(toYDoc(model));
    expect(restored.ok).toBe(true);
    expect(restored.ok && restored.value).toEqual(normalize(model));
  });

  it('usa mapas indexados por identificador y arrays para los miembros', () => {
    const doc = toYDoc(veterinaryModel());
    const classes = doc.getMap<unknown>(ROOT_CLASSES);
    expect(classes.size).toBe(2);

    const pet = classes.get(IDS.pet);
    expect(pet).toBeInstanceOf(Y.Map);
    if (!(pet instanceof Y.Map)) {
      return;
    }
    expect(pet.get('attributes')).toBeInstanceOf(Y.Array);
    expect(pet.get('operations')).toBeInstanceOf(Y.Array);
    expect(pet.get('position')).toBeInstanceOf(Y.Map);
  });

  it('informa cuando el documento aun no contiene un modelo', () => {
    const doc = new Y.Doc();
    expect(hasModel(doc)).toBe(false);
    const result = fromYDoc(doc);
    expect(!result.ok && result.error.code).toBe('invalid_document');
  });

  it('informa cuando el documento tiene metadatos corruptos', () => {
    const doc = toYDoc(veterinaryModel());
    doc.getMap<unknown>(ROOT_META).set('name', 42);
    const result = fromYDoc(doc);
    expect(!result.ok && result.error.code).toBe('invalid_payload');
  });
});

describe('aplicacion de operaciones sobre el CRDT', () => {
  it('produce el mismo modelo que la aplicacion inmutable', () => {
    const model = veterinaryModel();
    const doc = toYDoc(model);
    const operation: UmlOperationInput = {
      type: 'addAttribute',
      classId: IDS.pet,
      attribute: { id: testId(120), name: 'weight', type: 'Double' },
    };

    const onModel = applyOperation(model, operation, { now: LATER });
    const onDoc = applyOperationToYDoc(doc, operation, { now: LATER });

    expect(onDoc.ok).toBe(true);
    if (!onModel.ok || !onDoc.ok) {
      throw new Error('ambas aplicaciones deberian tener exito');
    }
    expect(onDoc.value).toEqual(normalize(onModel.value));
    expect(fromYDoc(doc)).toEqual({ ok: true, value: normalize(onModel.value) });
  });

  it('aplica cada tipo de operacion con el mismo resultado que el modelo puro', () => {
    const operations: UmlOperationInput[] = [
      { type: 'addClass', class: { id: testId(121), name: 'Appointment' } },
      {
        type: 'updateClass',
        id: testId(121),
        changes: { isAbstract: true, stereotypes: ['entity'] },
      },
      { type: 'setPosition', classId: testId(121), position: { x: 42, y: 24 } },
      {
        type: 'addAttribute',
        classId: testId(121),
        attribute: { id: testId(122), name: 'date', type: 'DateTime' },
      },
      {
        type: 'updateAttribute',
        id: testId(122),
        changes: { isNullable: false, multiplicity: '0..1' },
      },
      {
        type: 'addOperation',
        classId: testId(121),
        operation: {
          id: testId(123),
          name: 'reschedule',
          parameters: [{ id: testId(124), name: 'to', type: 'DateTime' }],
        },
      },
      {
        type: 'updateOperation',
        id: testId(123),
        changes: { returnType: 'Boolean', parameters: [] },
      },
      { type: 'addEnum', enum: { id: testId(125), name: 'Status', literals: ['OPEN'] } },
      { type: 'updateEnum', id: testId(125), changes: { literals: ['OPEN', 'CLOSED'] } },
      {
        type: 'addRelationship',
        relationship: {
          id: testId(126),
          kind: 'association',
          sourceId: testId(121),
          targetId: IDS.pet,
          targetEnd: { multiplicity: '0..*', role: 'pets' },
        },
      },
      { type: 'updateRelationship', id: testId(126), changes: { kind: 'aggregation' } },
      { type: 'deleteRelationship', id: testId(126) },
      { type: 'deleteOperation', id: testId(123) },
      { type: 'deleteAttribute', id: testId(122) },
      { type: 'deleteEnum', id: testId(125) },
      { type: 'deleteClass', id: testId(121) },
    ];

    let model = veterinaryModel();
    const doc = toYDoc(model);

    for (const operation of operations) {
      const onModel = applyOperation(model, operation, { now: LATER });
      const onDoc = applyOperationToYDoc(doc, operation, { now: LATER });
      expect(onDoc.ok, `fallo en ${operation.type}`).toBe(true);
      if (!onModel.ok || !onDoc.ok) {
        throw new Error(`la operacion ${operation.type} deberia aplicarse`);
      }
      model = onModel.value;
      expect(onDoc.value, `divergencia en ${operation.type}`).toEqual(normalize(model));
    }
  });

  it('propaga el borrado en cascada de una enumeracion dentro del documento', () => {
    const withUsage: UmlOperationInput[] = [
      {
        type: 'addOperation',
        classId: IDS.owner,
        operation: {
          id: testId(150),
          name: 'filterBySpecies',
          returnType: IDS.species,
          parameters: [{ id: testId(151), name: 'species', type: IDS.species }],
        },
      },
    ];

    const model = veterinaryModel();
    const doc = toYDoc(model);
    expect(applyOperationsToYDoc(doc, withUsage, { now: LATER }).ok).toBe(true);

    const removed = applyOperationToYDoc(
      doc,
      { type: 'deleteEnum', id: IDS.species },
      { now: LATER },
    );
    expect(removed.ok).toBe(true);
    if (!removed.ok) {
      return;
    }
    const owner = removed.value.classes.find((candidate) => candidate.id === IDS.owner);
    expect(removed.value.enums).toHaveLength(0);
    expect(owner?.operations[0]?.returnType).toBeNull();
    expect(owner?.operations[0]?.parameters).toHaveLength(0);
    expect(
      removed.value.classes.find((candidate) => candidate.id === IDS.pet)?.attributes,
    ).toHaveLength(1);
  });

  it('no toca el documento cuando la operacion es invalida', () => {
    const doc = toYDoc(veterinaryModel());
    const before = fromYDoc(doc);

    const rejected = applyOperationToYDoc(doc, {
      type: 'addAttribute',
      classId: testId(980),
      attribute: { id: testId(127), name: 'x', type: 'String' },
    });

    expect(!rejected.ok && rejected.error.code).toBe('class_not_found');
    expect(fromYDoc(doc)).toEqual(before);
  });

  it('aplica lotes de forma atomica sobre el documento', () => {
    const doc = toYDoc(veterinaryModel());
    const before = fromYDoc(doc);

    const rejected = applyOperationsToYDoc(doc, [
      { type: 'addClass', class: { id: testId(128), name: 'Invoice' } },
      { type: 'addClass', class: { id: testId(129), name: 'Invoice' } },
    ]);
    expect(!rejected.ok && rejected.error.code).toBe('duplicate_name');
    expect(fromYDoc(doc)).toEqual(before);

    const accepted = applyOperationsToYDoc(doc, [
      { type: 'addClass', class: { id: testId(130), name: 'Invoice' } },
      {
        type: 'addAttribute',
        classId: testId(130),
        attribute: { id: testId(131), name: 'total', type: 'BigDecimal' },
      },
    ]);
    expect(accepted.ok).toBe(true);
    expect(accepted.ok && accepted.value.classes).toHaveLength(3);
  });

  it('rechaza operaciones con payload invalido antes de tocar nada', () => {
    const doc = toYDoc(veterinaryModel());
    const result = applyOperationToYDoc(doc, {
      type: 'addClass',
      class: { id: 'malo', name: 'X' },
    });
    expect(!result.ok && result.error.code).toBe('invalid_payload');

    const batch = applyOperationsToYDoc(doc, [
      { type: 'addClass', class: { id: 'malo', name: 'X' } },
    ]);
    expect(!batch.ok && batch.error.code).toBe('invalid_payload');
  });
});
