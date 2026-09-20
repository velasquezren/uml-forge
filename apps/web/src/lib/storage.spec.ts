import { describe, expect, it } from 'vitest';
import { requestPersistentStorage } from './storage';

describe('Storage', () => {
  it('solicita almacenamiento persistente y devuelve un objeto de estado', async () => {
    const result = await requestPersistentStorage();
    expect(result).toHaveProperty('persisted');
  });
});
