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
/** Max ops materialised into memory per flush pass — bounds peak heap. */
const FLUSH_BATCH = 200;

export type SyncStoreType =
  | 'project'
  | 'zone'
  | 'structure'
  | 'path'
  | 'point'
  | 'comment'
  | 'state-blob'
  | 'typed-record'
  | 'vegetation'
  | 'succession'
  | 'proof_photo_upload';
export type SyncAction = 'create' | 'update' | 'delete';

/**
 * Offline-sync drain priority — the canonical 5-tier order from ADR 12
 * (wiki/decisions/2026-05-29-atlas-spec-offline-sync-priority-queues.md). Lower
 * number drains first; 1 is divergence (unconditional, ahead of all others).
 * Derived from the typed record's fields at enqueue (see derivePriority); legacy
 * in-flight ops with no priority sort as the lowest tier.
 */
export type SyncPriority = 1 | 2 | 3 | 4 | 5;

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
  /**
   * 5-tier drain priority (ADR 12). Set at enqueue for typed Act records (and
   * the divergence proof photo). Optional so legacy/other-store ops omit it and
   * sort as the lowest tier — no IndexedDB migration needed (the queue sorts in
   * memory; see compareQueuedOps).
   */
  priority?: SyncPriority;
}

/** Coalescing key for a queued op: one slot per (storeType, action, entity). */
function opKey(storeType: SyncStoreType, action: SyncAction, localId: string): string {
  return `${storeType}:${action}:${localId}`;
}

/** Lowest tier — the floor for ops that carry no derived priority. */
const LOWEST_PRIORITY: SyncPriority = 5;

/**
 * The subset of a typed Act record's fields the 5-tier mapping reads. Kept
 * structural (not a schema import) so this module stays dependency-free and the
 * comparator is unit-testable in isolation. `divergenceFlag` is the FieldAction
 * field that is non-null ONLY when status is 'diverged' (schema default null).
 */
export interface RecordTierFields {
  divergenceFlag?: unknown;
  taskType?: unknown;
  cycleId?: unknown;
}

/**
 * Map a typed Act record to its 5-tier offline-sync priority (ADR 12 §Decision):
 *   1 divergence            — divergenceFlag present (UNCONDITIONAL: checked
 *                             first, so a diverged survey still beats a baseline)
 *   2 baseline survey       — field_survey + cycleId 'baseline'
 *   3 non-baseline survey   — field_survey + any numbered cycle
 *   4 monitoring proof      — monitoring_task
 *   5 implementation proof  — implementation_task, administrative_task, untyped,
 *                             and observe records (the default floor)
 * taskType tokens are the ADR 2 4-value taxonomy landed in Phase 0.
 */
export function derivePriority(rec: RecordTierFields | null | undefined): SyncPriority {
  if (rec?.divergenceFlag != null) return 1;
  if (rec?.taskType === 'field_survey') {
    return rec?.cycleId === 'baseline' ? 2 : 3;
  }
  if (rec?.taskType === 'monitoring_task') return 4;
  return LOWEST_PRIORITY;
}

/** Dual-track: structured typed-record ops drain before proof-photo blobs. */
function isBlobTrack(op: QueuedOperation): boolean {
  return op.storeType === 'proof_photo_upload';
}

/**
 * Total order the queue drains in (ADR 12): priority tier ascending, then
 * structured-before-blob within a tier, then FIFO by timestamp. A missing
 * priority sorts as the lowest tier so legacy in-flight ops never preempt a
 * derived one. This is the single sort key getAll()/getBatch() share — proving
 * it proves the drain order without touching IndexedDB.
 */
export function compareQueuedOps(a: QueuedOperation, b: QueuedOperation): number {
  const pa = a.priority ?? LOWEST_PRIORITY;
  const pb = b.priority ?? LOWEST_PRIORITY;
  if (pa !== pb) return pa - pb;
  const ta = isBlobTrack(a) ? 1 : 0;
  const tb = isBlobTrack(b) ? 1 : 0;
  if (ta !== tb) return ta - tb;
  return a.timestamp - b.timestamp;
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

/**
 * Build a diagnostic message for a failed queued op. A server validation
 * failure throws an ApiError carrying a `details` array of `{ path, message }`
 * (one entry per offending field); fold those into the message so the give-up
 * log names the field instead of the opaque "Request validation failed".
 * Duck-typed on `details` so this module stays free of apiClient/UI imports.
 */
export function describeSyncError(err: unknown): string {
  const base = err instanceof Error ? err.message : String(err);
  const details = (err as { details?: unknown } | null | undefined)?.details;
  if (Array.isArray(details) && details.length > 0) {
    const fields = details
      .map((d) => {
        const path = (d as { path?: unknown })?.path;
        const message = (d as { message?: unknown })?.message;
        const p = path == null ? '' : String(path);
        const m = message == null ? '' : String(message);
        return p ? `${p}: ${m}`.trim() : m;
      })
      .filter(Boolean)
      .join('; ');
    if (fields) return `${base} [${fields}]`;
  }
  return base;
}

export const syncQueue = {
  async enqueue(
    op: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>,
  ): Promise<void> {
    const full: QueuedOperation = {
      ...op,
      // Deterministic, coalescing key: re-queuing the same entity/action
      // overwrites the prior op instead of appending a new one. This caps the
      // queue at the number of distinct pending entities and makes unbounded
      // growth impossible — the failure mode that previously grew the queue to
      // hundreds of thousands of ops and OOM'd the renderer on flush().
      id: opKey(op.storeType, op.action, op.localId),
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
        const ops = (req.result as QueuedOperation[]).sort(compareQueuedOps);
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
   * Read up to `limit` ops in timestamp order via a cursor, without
   * materialising the whole store. Bounds peak memory regardless of how large
   * the queue has grown — `getAll()` on a runaway queue is what OOM'd the
   * renderer.
   */
  async getBatch(limit: number): Promise<QueuedOperation[]> {
    const store = await tx('readonly');
    return new Promise((resolve, reject) => {
      const out: QueuedOperation[] = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor || out.length >= limit) {
          // Batch-level priority order (ADR 12). The cursor materialises in key
          // order then this sorts the batch; for any queue under FLUSH_BATCH the
          // whole queue is in-batch, so divergence (tier 1) preempts the backlog.
          out.sort(compareQueuedOps);
          resolve(out);
          return;
        }
        out.push(cursor.value as QueuedOperation);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * One-time reconciliation: collapse the queue to a single op per
   * (storeType, action, localId), keeping the most recent, and rewrite kept
   * ops under the deterministic coalescing key. Cursor-based and bounded in
   * memory (only id/key/timestamp bookkeeping is held, never payloads), so it
   * can drain a runaway queue of hundreds of thousands of ops without OOM.
   * Idempotent: a queue already keyed deterministically is left unchanged.
   */
  async reconcile(): Promise<{ before: number; after: number }> {
    const before = await this.getPendingCount();
    if (before === 0) return { before: 0, after: 0 };

    // Pass 1 — find the winning (latest) op id per coalescing key.
    const winners = new Map<string, { id: string; timestamp: number }>();
    {
      const store = await tx('readonly');
      await new Promise<void>((resolve, reject) => {
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve();
            return;
          }
          const op = cursor.value as QueuedOperation;
          const key = opKey(op.storeType, op.action, op.localId);
          const prev = winners.get(key);
          if (!prev || op.timestamp >= prev.timestamp) {
            winners.set(key, { id: op.id, timestamp: op.timestamp });
          }
          cursor.continue();
        };
        req.onerror = () => reject(req.error);
      });
    }

    // Pass 2 — delete every op that is not its key's winner, leaving exactly
    // one op per coalescing key. Legacy winners stored under a random id are
    // left as-is: they drain on the next flush, and meanwhile any new enqueue
    // for the same entity coalesces under the deterministic key. (We must not
    // put() a rekeyed record mid-cursor — the cursor could revisit it and
    // delete it as a "loser".)
    {
      const store = await tx('readwrite');
      await new Promise<void>((resolve, reject) => {
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve();
            return;
          }
          const op = cursor.value as QueuedOperation;
          const key = opKey(op.storeType, op.action, op.localId);
          const winner = winners.get(key);
          if (!winner || op.id !== winner.id) {
            cursor.delete();
          }
          cursor.continue();
        };
        req.onerror = () => reject(req.error);
      });
    }

    const after = await this.getPendingCount();
    return { before, after };
  },

  /**
   * Process queued operations in bounded batches. Each op is retried with
   * exponential backoff. Successfully processed ops are removed. Failed ops
   * beyond MAX_RETRIES are dropped so a permanently-failing op cannot pin the
   * queue open forever.
   *
   * @param executor - callback that actually performs the API call for an op.
   *   Must throw on failure.
   * @param onDrop - optional callback invoked when an op is dropped after
   *   exhausting MAX_RETRIES. Lets the caller surface the give-up to the user
   *   (a permanently-failing write is data the steward needs to know about)
   *   without this module importing UI/store code.
   */
  async flush(
    executor: (op: QueuedOperation) => Promise<void>,
    onDrop?: (op: QueuedOperation) => void,
  ): Promise<{ processed: number; failed: number }> {
    const ops = await this.getBatch(FLUSH_BATCH);
    let processed = 0;
    let failed = 0;

    for (const op of ops) {
      if (op.retryCount >= MAX_RETRIES) {
        // Exhausted — drop it rather than re-skipping it on every flush.
        await this.dequeue(op.id);
        onDrop?.(op);
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
          lastError: describeSyncError(err),
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
