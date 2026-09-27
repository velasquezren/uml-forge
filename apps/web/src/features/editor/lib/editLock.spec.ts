import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { computeEditLock, describeEditLock, UNLOCKED } from './editLock';
import { bumpRevision, readRevision } from './versioning';

const ada = { user: { id: 'u1', name: 'Ada', color: '#000' } };
const grace = { user: { id: 'u2', name: 'Grace', color: '#fff' } };

describe('bloqueo de exportacion e importacion', () => {
  it('no bloquea si nadie esta editando', () => {
    expect(computeEditLock(false, [ada, grace])).toEqual(UNLOCKED);
    expect(describeEditLock(UNLOCKED)).toBe('');
  });

  it('bloquea por la edicion local y por la de otros participantes', () => {
    const local = computeEditLock(true, [ada]);
    expect(local.locked).toBe(true);
    expect(describeEditLock(local)).toBe('Estas editando el modelo');

    const remote = computeEditLock(false, [{ ...ada, editing: true }, grace]);
    expect(remote.editors).toEqual(['Ada']);
    expect(describeEditLock(remote)).toBe('Ada esta editando el modelo');

    const several = computeEditLock(true, [
      { ...ada, editing: true },
      { ...grace, editing: true },
    ]);
    expect(describeEditLock(several)).toBe('Tu, Ada y Grace estan editando el modelo');
  });
});

describe('revisiones del modelo', () => {
  it('empieza en cero y crece con cada cambio', () => {
    const doc = new Y.Doc();
    expect(readRevision(doc)).toBe(0);
    expect(bumpRevision(doc)).toBe(1);
    expect(bumpRevision(doc)).toBe(2);
    expect(readRevision(doc)).toBe(2);
  });

  it('se sincroniza entre participantes como el resto del documento', () => {
    const origin = new Y.Doc();
    bumpRevision(origin);
    bumpRevision(origin);

    const replica = new Y.Doc();
    Y.applyUpdate(replica, Y.encodeStateAsUpdate(origin));
    expect(readRevision(replica)).toBe(2);
  });
});
