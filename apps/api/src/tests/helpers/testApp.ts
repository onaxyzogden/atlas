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
 * Tagged-template function that shifts the next row-set off the queue.
 * Called as: db`SELECT ...` → Promise<row[]>
 */
export const mockDb = Object.assign(
  (_strings: TemplateStringsArray, ..._values: unknown[]) =>
    Promise.resolve(queue.shift() ?? []),
  {
    // postgres.js helpers used by route handlers: passthrough is fine for the
    // mock since values are never inspected — the queue serves canned rows.
    // `db.json(x)` wraps a JSON value; `db(arr)` builds an IN-list.
    json: (v: unknown) => v,
  },
);

/** Push row(s) onto the mock DB queue. */
export const enqueue = (...rows: unknown[]) => { queue.push(rows); };

/** Clear all queued rows (call in beforeEach). */
export const clearQueue = () => { queue.length = 0; };
