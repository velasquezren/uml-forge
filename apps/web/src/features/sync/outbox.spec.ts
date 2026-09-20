import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { createId } from '@uml-forge/uml-core';
import {
  clearOutbox,
  countPendingOperations,
  enqueueOperation,
  getPendingOperations,
  removeOperations,
} from './outbox';

describe('IndexedDB Outbox Queue', () => {
  const projectId = 'proj-123';
  const clientId = 'client-456';

  beforeEach(async () => {
    await clearOutbox(projectId);
  });

  it('encola operaciones y las recupera ordenadas por secuencia', async () => {
    const classId = createId();
    await enqueueOperation(projectId, clientId, {
      type: 'addClass',
      class: { id: classId, name: 'Usuario' },
    });

    await enqueueOperation(projectId, clientId, {
      type: 'addAttribute',
      classId,
      attribute: { id: createId(), name: 'email', type: 'String' },
    });

    const pending = await getPendingOperations(projectId);
    expect(pending).toHaveLength(2);
    expect(pending[0]?.seq).toBe(1);
    expect(pending[1]?.seq).toBe(2);
    expect(pending[0]?.op.type).toBe('addClass');

    const count = await countPendingOperations(projectId);
    expect(count).toBe(2);
  });

  it('elimina operaciones procesadas de la cola', async () => {
    const item = await enqueueOperation(projectId, clientId, {
      type: 'addClass',
      class: { id: createId(), name: 'Factura' },
    });

    await removeOperations([item.id]);

    const count = await countPendingOperations(projectId);
    expect(count).toBe(0);
  });
});
