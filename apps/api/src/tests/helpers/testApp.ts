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
  const run = () => (settled ??= Promise.resolve(queue.shift() ?? []));
  return {
    then: (onFulfilled?: ((v: unknown[]) => unknown) | null, onRejected?: ((r: unknown) => unknown) | null) =>
      run().then(onFulfilled, onRejected),
    catch: (onRejected?: ((r: unknown) => unknown) | null) => run().catch(onRejected),
    finally: (onFinally?: (() => void) | null) => run().finally(onFinally),
  };
};

/** JSONB column helper — real client returns a tagged value; tests just need a stable wrapper. */
mockDb.json = (value: unknown) => ({ __json: value });

/** Transaction helper — runs the callback with the same tagged-template mock as the tx handle. */
mockDb.begin = async (cb: (tx: typeof mockDb) => unknown) => cb(mockDb);

/** db.unsafe(query, params) — direct row-set shift. Always awaited directly
 *  (never interpolated as a fragment) so eager resolution is safe here. */
mockDb.unsafe = (_query: string, _params?: unknown[]) =>
  Promise.resolve(queue.shift() ?? []);

/** Push row(s) onto the mock DB queue. */
export const enqueue = (...rows: unknown[]) => { queue.push(rows); };

/** Clear all queued rows (call in beforeEach). */
export const clearQueue = () => { queue.length = 0; };
