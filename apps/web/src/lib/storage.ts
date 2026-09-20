// Capa de almacenamiento basada en IndexedDB.
// Prohibido usar localStorage para datos de la aplicacion (ADR 0015).

const DB_NAME = 'uml-forge-db';
const DB_VERSION = 1;
const STORE_NAME = 'key-value-store';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no esta disponible en este entorno'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Error al abrir la base de datos IndexedDB'));
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const val = req.result as T | undefined;
        resolve(val !== undefined ? val : null);
      };
      req.onerror = () =>
        reject(req.error ?? new Error(`Error al leer la clave ${key} en IndexedDB`));
    });
  } catch {
    return null;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(req.error ?? new Error(`Error al escribir la clave ${key} en IndexedDB`));
  });
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(req.error ?? new Error(`Error al eliminar la clave ${key} en IndexedDB`));
  });
}

/**
 * Solicita almacenamiento persistente al navegador.
 * Advierte al usuario si el navegador deniega la persistencia (evita desalojo de modelos e IA).
 */
export async function requestPersistentStorage(): Promise<{
  persisted: boolean;
  quotaBytes?: number;
  usageBytes?: number;
}> {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    const persisted = await navigator.storage.persist();
    let quotaBytes: number | undefined;
    let usageBytes: number | undefined;

    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
      usageBytes = estimate.usage;
    }

    return { persisted, quotaBytes, usageBytes };
  }

  return { persisted: false };
}
