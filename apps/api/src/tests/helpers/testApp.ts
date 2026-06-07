/**
 * Shared test helpers — mock DB queue and utilities.
 *
 * NOTE: Do NOT use vi.hoisted() here — it cannot be exported from a helper
 * module. Plain exports work because imports are naturally hoisted before
 * vi.mock() factory functions execute.
 *
 * Usage in test files:
 *   import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
 *   // Each test file must have its own vi.mock() calls using mockDb
 */

// ─── Mock state ──────────────────────────────────────────────────────────────

const queue: unknown[][] = [];

/**
 * Tagged-template function mirroring the real `postgres` client closely
 * enough for the mock harness.
 *
 * Returns a **lazy thenable**, not an eager Promise. The next row-set is
 * shifted off the queue only when the query object is actually awaited
 * (`.then()` is invoked) — and the shift is memoized so awaiting the same
 * object twice yields the same rows.
 *
 * This matches real `postgres` semantics: `db`...`` produces a PendingQuery
 * that does nothing until awaited, and SQL fragments interpolated into
 * another `db`...`` (e.g. `db`WHERE user_id=${x}``) are never executed
 * independently. With the previous eager `Promise.resolve(queue.shift())`,
 * each non-awaited fragment builder still drained a row-set, corrupting the
 * queue for fragment-composing routes (telemetry aggregate). The lazy form
 * is behaviorally identical for the common case (routes that `await` every
 * `db`...`` exactly once) so it carries no regression risk there.
 */
export const mockDb = (_strings: TemplateStringsArray, ..._values: unknown[]) => {
  let settled: Promise<unknown[]> | undefined;
  const run = () =>
    (settled ??= Promise.resolve().then(() => {
      const rows = queue.shift() ?? [];
      // A row-set carrying an `__error` marker (pushed via `enqueueError`)
      // rejects instead of resolving — used to simulate DB faults such as a
      // 23505 unique-violation that a route maps to a 409.
      const err = (rows as { __error?: unknown }).__error;
      if (err !== undefined) return Promise.reject(err);
      return rows as unknown[];
    }));
  return {
    then: (onFulfilled?: ((v: unknown[]) => unknown) | null, onRejected?: ((r: unknown) => unknown) | null) =>
      run().then(onFulfilled, onRejected),
    catch: (onRejected?: ((r: unknown) => unknown) | null) => run().catch(onRejected),
    finally: (onFinally?: (() => void) | null) => run().finally(onFinally),
  };
};

/**
 * db.unsafe(query, params) — shifts the next row-set, mirroring the tagged
 * form. Always awaited by callers (succession/vegetation/machinery typed
 * routes) so a plain resolved promise is sufficient.
 */
mockDb.unsafe = (_query: string, _params?: unknown[]) => Promise.resolve(queue.shift() ?? []);

/** JSONB column helper — real client returns a tagged value; tests just need a stable wrapper. */
mockDb.json = (value: unknown) => ({ __json: value });

/** Transaction helper — runs the callback with the same tagged-template mock as the tx handle. */
mockDb.begin = async (cb: (tx: typeof mockDb) => unknown) => cb(mockDb);

/** Push row(s) onto the mock DB queue. */
export const enqueue = (...rows: unknown[]) => { queue.push(rows); };

/**
 * Push a row-set that REJECTS when awaited — simulates a DB fault (e.g. a
 * Postgres `{ code: '23505' }` unique-violation that a route maps to 409).
 * Consumes one queue slot, like `enqueue`.
 */
export const enqueueError = (err: unknown) => {
  const marker: unknown[] = [];
  (marker as { __error?: unknown }).__error = err;
  queue.push(marker);
};

/** Clear all queued rows (call in beforeEach). */
export const clearQueue = () => { queue.length = 0; };
