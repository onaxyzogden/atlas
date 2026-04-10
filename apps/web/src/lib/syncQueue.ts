/**
 * IndexedDB-backed queue for failed sync operations.
 *
 * When a write to the backend fails (network error, server down), the
 * operation is enqueued here. On reconnect or periodic heartbeat, the
 * queue is flushed with exponential backoff. Operations are never
 * silently discarded.
 */

const DB_NAME = 'ogden-sync-queue';
const STORE_NAME = 'ops';
const DB_VERSION = 1;

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export type SyncStoreType = 'project' | 'zone' | 'structure';
export type SyncAction = 'create' | 'update' | 'delete';

export interface QueuedOperation {
  id: string;
  timestamp: number;
  storeType: SyncStoreType;
  action: SyncAction;
  localId: string;
  /** For create/update: the request body. For delete: the serverId. */
  payload: unknown;
  retryCount: number;
  lastError?: string;
}

// ─── IndexedDB helpers (same pattern as geodataCache.ts) ─────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
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

// ─── Queue API ───────────────────────────────────────────────────────────────

export const syncQueue = {
  async enqueue(
    op: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>,
  ): Promise<void> {
    const full: QueuedOperation = {
      ...op,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    const store = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(full);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async dequeue(id: string): Promise<void> {
    const store = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async dequeueByLocalId(localId: string): Promise<void> {
    const all = await this.getAll();
    const matching = all.filter((op) => op.localId === localId);
    for (const op of matching) {
      await this.dequeue(op.id);
    }
  },

  async getAll(): Promise<QueuedOperation[]> {
    const store = await tx('readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const ops = (req.result as QueuedOperation[]).sort(
          (a, b) => a.timestamp - b.timestamp,
        );
        resolve(ops);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getPendingCount(): Promise<number> {
    const store = await tx('readonly');
    return new Promise((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Process all queued operations in order. Each op is retried with
   * exponential backoff. Successfully processed ops are removed.
   * Failed ops beyond MAX_RETRIES remain in the queue with lastError set.
   *
   * @param executor - callback that actually performs the API call for an op.
   *   Must throw on failure.
   */
  async flush(
    executor: (op: QueuedOperation) => Promise<void>,
  ): Promise<{ processed: number; failed: number }> {
    const ops = await this.getAll();
    let processed = 0;
    let failed = 0;

    for (const op of ops) {
      if (op.retryCount >= MAX_RETRIES) {
        failed++;
        continue;
      }

      try {
        await executor(op);
        await this.dequeue(op.id);
        processed++;
      } catch (err) {
        const updated: QueuedOperation = {
          ...op,
          retryCount: op.retryCount + 1,
          lastError: err instanceof Error ? err.message : String(err),
        };

        // Write back with incremented retry count
        const store = await tx('readwrite');
        await new Promise<void>((resolve, reject) => {
          const req = store.put(updated);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });

        failed++;

        // Exponential backoff before next op
        const delay = BASE_DELAY_MS * Math.pow(2, op.retryCount);
        await new Promise((r) => setTimeout(r, Math.min(delay, 16000)));
      }
    }

    return { processed, failed };
  },
};
