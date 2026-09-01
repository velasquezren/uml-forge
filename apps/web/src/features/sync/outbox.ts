import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { createId, type UmlOperationInput } from '@uml-forge/uml-core';

export interface OutboxItem {
  id: string;
  projectId: string;
  clientId: string;
  seq: number;
  op: UmlOperationInput;
  createdAt: string;
}

interface OutboxDBSchema extends DBSchema {
  outbox_operations: {
    key: string;
    value: OutboxItem;
    indexes: {
      'by-project': string;
      'by-created': string;
    };
  };
}

const DB_NAME = 'uml-forge-outbox-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OutboxDBSchema>> | null = null;

export function getOutboxDb(): Promise<IDBPDatabase<OutboxDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OutboxDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('outbox_operations')) {
          const store = db.createObjectStore('outbox_operations', {
            keyPath: 'id',
          });
          store.createIndex('by-project', 'projectId');
          store.createIndex('by-created', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueOperation(
  projectId: string,
  clientId: string,
  op: UmlOperationInput,
): Promise<OutboxItem> {
  const db = await getOutboxDb();
  const count = await countPendingOperations(projectId);

  const item: OutboxItem = {
    id: createId(),
    projectId,
    clientId,
    seq: count + 1,
    op,
    createdAt: new Date().toISOString(),
  };

  await db.put('outbox_operations', item);
  return item;
}

export async function getPendingOperations(projectId: string): Promise<OutboxItem[]> {
  const db = await getOutboxDb();
  const items = await db.getAllFromIndex('outbox_operations', 'by-project', projectId);
  return items.sort((a, b) => a.seq - b.seq);
}

export async function removeOperations(ids: string[]): Promise<void> {
  const db = await getOutboxDb();
  const tx = db.transaction('outbox_operations', 'readwrite');
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
}

export async function countPendingOperations(projectId: string): Promise<number> {
  const db = await getOutboxDb();
  return db.countFromIndex('outbox_operations', 'by-project', projectId);
}

export async function clearOutbox(projectId: string): Promise<void> {
  const items = await getPendingOperations(projectId);
  await removeOperations(items.map((i) => i.id));
}
