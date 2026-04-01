/**
 * IndexedDB-backed cache for large geospatial blobs (GeoJSON boundaries,
 * parsed file data). Keeps localStorage lean and within quota.
 *
 * Usage:
 *   await geodataCache.put('boundary:project-123', featureCollection);
 *   const fc = await geodataCache.get('boundary:project-123');
 *   await geodataCache.remove('boundary:project-123');
 */

const DB_NAME = 'ogden-geodata';
const STORE_NAME = 'blobs';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, mode);
  transaction.oncomplete = () => db.close();
  transaction.onerror = () => db.close();
  return transaction.objectStore(STORE_NAME);
}

export const geodataCache = {
  async put(key: string, value: unknown): Promise<void> {
    const store = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async get<T = unknown>(key: string): Promise<T | null> {
    const store = await tx('readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  },

  async remove(key: string): Promise<void> {
    const store = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async removeByPrefix(prefix: string): Promise<void> {
    const store = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  },
};
