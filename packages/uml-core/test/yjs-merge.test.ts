import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { applyOperationToYDoc } from '../src/yjs/apply-to-ydoc.js';
import { fromYDoc } from '../src/yjs/from-ydoc.js';
import { toYDoc } from '../src/yjs/to-ydoc.js';
import { validateModel } from '../src/validation/validate-model.js';
import { IDS, testId, veterinaryModel } from './fixtures.js';

describe('fusion de ediciones concurrentes', () => {
  function replicate(source: Y.Doc): Y.Doc {
    const copy = new Y.Doc();
    Y.applyUpdate(copy, Y.encodeStateAsUpdate(source));
    return copy;
  }

  function sync(first: Y.Doc, second: Y.Doc): void {
    const fromFirst = Y.encodeStateAsUpdate(first);
    const fromSecond = Y.encodeStateAsUpdate(second);
    Y.applyUpdate(first, fromSecond);
    Y.applyUpdate(second, fromFirst);
  }

  it('fusiona cambios hechos sin conexion sin perder ni duplicar nada', () => {
    const online = toYDoc(veterinaryModel());
    const offline = replicate(online);

    applyOperationToYDoc(online, { type: 'addClass', class: { id: testId(140), name: 'Invoice' } });
    applyOperationToYDoc(offline, {
      type: 'addAttribute',
      classId: IDS.pet,
      attribute: { id: testId(141), name: 'weight', type: 'Double' },
    });

    sync(online, offline);

    const merged = fromYDoc(online);
    expect(merged.ok).toBe(true);
    if (!merged.ok) {
      return;
    }
    expect(merged.value.classes).toHaveLength(3);
    expect(merged.value.classes.flatMap((umlClass) => umlClass.attributes)).toHaveLength(4);
    expect(fromYDoc(offline)).toEqual(merged);
    expect(validateModel(merged.value)).toEqual([]);
  });

  it('deja converger dos ediciones del mismo atributo', () => {
    const first = toYDoc(veterinaryModel());
    const second = replicate(first);

    applyOperationToYDoc(first, {
      type: 'updateAttribute',
      id: IDS.petName,
      changes: { name: 'nickname' },
    });
    applyOperationToYDoc(second, {
      type: 'updateAttribute',
      id: IDS.petName,
      changes: { name: 'alias' },
    });

    sync(first, second);

    const left = fromYDoc(first);
    const right = fromYDoc(second);
    expect(left).toEqual(right);
    if (!left.ok) {
      throw new Error('el documento fusionado deberia ser valido');
    }
    const petName = left.value.classes.find((candidate) => candidate.id === IDS.pet)?.attributes[0]
      ?.name;
    expect(['nickname', 'alias']).toContain(petName);
  });

  it('dos clases creadas con el mismo nombre sobreviven a la fusion y las detecta el validador', () => {
    const first = toYDoc(veterinaryModel());
    const second = replicate(first);

    applyOperationToYDoc(first, { type: 'addClass', class: { id: testId(142), name: 'Invoice' } });
    applyOperationToYDoc(second, { type: 'addClass', class: { id: testId(143), name: 'Invoice' } });

    sync(first, second);

    const merged = fromYDoc(first);
    expect(merged.ok && merged.value.classes).toHaveLength(4);
    expect(merged.ok && validateModel(merged.value).map((error) => error.code)).toContain(
      'duplicate_name',
    );
  });
});
