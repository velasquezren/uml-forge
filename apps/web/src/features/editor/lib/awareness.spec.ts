import { describe, expect, it } from 'vitest';
import { presenceSignature, toUserAwareness } from './awareness';

describe('awareness', () => {
  it('interpreta un participante con su cursor', () => {
    const state = {
      user: { id: 'u1', name: 'Ada', color: '#38bdf8' },
      cursor: { x: 10, y: 20 },
    };

    expect(toUserAwareness(state)).toEqual({
      user: { id: 'u1', name: 'Ada', color: '#38bdf8' },
      cursor: { x: 10, y: 20 },
    });
  });

  it('acepta un participante sin cursor publicado', () => {
    const state = { user: { id: 'u1', name: 'Ada', color: '#38bdf8' } };

    expect(toUserAwareness(state)).toEqual({
      user: { id: 'u1', name: 'Ada', color: '#38bdf8' },
    });
  });

  it('descarta estados que no traen un usuario reconocible', () => {
    expect(toUserAwareness({})).toBeNull();
    expect(toUserAwareness({ user: null })).toBeNull();
    expect(toUserAwareness({ user: { id: 1, name: 'Ada', color: '#000' } })).toBeNull();
  });

  it('ignora un cursor incompleto en lugar de rechazar al participante', () => {
    const state = { user: { id: 'u1', name: 'Ada', color: '#000' }, cursor: { x: 10 } };

    expect(toUserAwareness(state)).toEqual({ user: { id: 'u1', name: 'Ada', color: '#000' } });
  });

  it('la firma de presencia solo cambia al entrar o salir alguien', () => {
    const ada = { user: { id: 'u1', name: 'Ada', color: '#000' } };
    const grace = { user: { id: 'u2', name: 'Grace', color: '#fff' } };

    expect(presenceSignature([ada])).toBe(presenceSignature([{ ...ada, cursor: { x: 5, y: 5 } }]));
    expect(presenceSignature([ada])).not.toBe(presenceSignature([ada, grace]));
  });
});
