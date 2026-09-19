import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId, isId } from '../src/ids.js';

afterEach(() => vi.unstubAllGlobals());

describe('createId', () => {
  it('generates a valid ID with native crypto', () => {
    expect(isId(createId())).toBe(true);
  });

  it('generates distinct UUID v4 IDs without randomUUID on LAN HTTP', () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal('crypto', { getRandomValues });
    const ids = Array.from({ length: 100 }, () => createId());
    expect(new Set(ids).size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
