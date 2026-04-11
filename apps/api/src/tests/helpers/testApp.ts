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
export const mockDb = (_strings: TemplateStringsArray, ..._values: unknown[]) =>
  Promise.resolve(queue.shift() ?? []);

/** Push row(s) onto the mock DB queue. */
export const enqueue = (...rows: unknown[]) => { queue.push(rows); };

/** Clear all queued rows (call in beforeEach). */
export const clearQueue = () => { queue.length = 0; };
