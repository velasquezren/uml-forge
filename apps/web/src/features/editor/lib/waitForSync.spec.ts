import { describe, expect, it } from 'vitest';
import { waitForSync } from './waitForSync';

describe('espera de sincronizacion con el servidor', () => {
  it('sin proveedor (trabajo local) no espera', async () => {
    await expect(waitForSync(null)).resolves.toBe(true);
  });

  it('espera a que no queden cambios pendientes', async () => {
    const source = { isSynced: true, hasUnsyncedChanges: true };
    setTimeout(() => {
      source.hasUnsyncedChanges = false;
    }, 30);
    await expect(waitForSync(source, 1000, 5)).resolves.toBe(true);
  });

  it('se rinde al agotar el plazo', async () => {
    const source = { isSynced: false, hasUnsyncedChanges: false };
    await expect(waitForSync(source, 30, 5)).resolves.toBe(false);
  });
});
