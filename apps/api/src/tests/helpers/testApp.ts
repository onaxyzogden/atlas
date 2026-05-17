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
 *
 * The mock is a faithful-enough postgres.js double:
 *
 *   - A tagged-template call returns a *lazy thenable*. The queued row-set
 *     is consumed only when that result is actually awaited — exactly like
 *     postgres.js, where `sql`…`` is a PendingQuery that executes on await.
 *     Sub-fragments built with `sql`…`` and embedded into an outer query
 *     (e.g. the telemetry aggregate's `WHERE ${userFilter}${projectFilter}`)
 *     are never awaited on their own, so they never consume a row.
 *   - A helper call — `db(value)` dynamic fragment, `db.json`, `db.array` —
 *     builds an inert fragment and never consumes a row. This is what keeps
 *     a guard like `db.json(...)` or `WHERE id IN ${db([...])}` from
 *     silently shifting every canned response by one.
 */

// ─── Mock state ──────────────────────────────────────────────────────────────

const queue: unknown[][] = [];

/** Inert marker returned for non-executing SQL fragment helpers. */
const SQL_FRAGMENT = Object.freeze({ __mockSqlFragment: true });

/** A tagged-template call passes the strings array (with `.raw`) as arg 0. */
function isTaggedTemplateCall(args: unknown[]): boolean {
  const first = args[0] as { raw?: unknown } | undefined;
  return Array.isArray(first) && first != null && 'raw' in (first as object);
}

/**
 * A lazy thenable: the next row-set is shifted off the queue only when the
 * result is awaited (`.then` is invoked), mirroring postgres.js's deferred
 * query execution. Embedding it as an interpolation value never awaits it,
 * so composed sub-fragments don't consume canned rows.
 */
function pendingQuery() {
  let consumed = false;
  const rows = () => {
    if (!consumed) consumed = true;
    return queue.shift() ?? [];
  };
  return {
    __mockPendingQuery: true,
    then<T>(
      onfulfilled?: ((v: unknown[]) => T) | null,
      onrejected?: ((reason: unknown) => T) | null,
    ) {
      try {
        const v = rows();
        return Promise.resolve(onfulfilled ? onfulfilled(v) : (v as T));
      } catch (err) {
        return onrejected
          ? Promise.resolve(onrejected(err))
          : Promise.reject(err);
      }
    },
    catch(onrejected?: ((reason: unknown) => unknown) | null) {
      return this.then(undefined, onrejected);
    },
    finally(onfinally?: (() => void) | null) {
      onfinally?.();
      return this.then();
    },
  };
}

/**
 * Structural type for the mock. Deliberately NOT compatible with
 * `postgres.Sql` — every test decorates `fastify.db` with this behind a
 * `// @ts-expect-error — mock` directive, and that directive must stay
 * "used" (TS2578) for `pnpm --filter @ogden/api typecheck` to pass.
 */
export interface MockDb {
  (...args: unknown[]): unknown;
  json(value: unknown): typeof SQL_FRAGMENT;
  array(value: unknown): typeof SQL_FRAGMENT;
  typed(value: unknown): typeof SQL_FRAGMENT;
  unsafe(query?: unknown, params?: unknown): ReturnType<typeof pendingQuery>;
  begin(cb: (sql: MockDb) => unknown | Promise<unknown>): Promise<unknown>;
}

/**
 * Callable as either:
 *   - db`SELECT ...`            → lazy thenable; shifts queue on await
 *   - db(value)                 → dynamic fragment (no queue consumption)
 */
const mockDbFn = (...args: unknown[]): unknown => {
  if (isTaggedTemplateCall(args)) {
    return pendingQuery();
  }
  return SQL_FRAGMENT;
};

export const mockDb = mockDbFn as MockDb;

// postgres.js parameter/fragment helpers — inert, never consume the queue.
mockDb.json = (_value: unknown) => SQL_FRAGMENT;
mockDb.array = (_value: unknown) => SQL_FRAGMENT;
mockDb.typed = (_value: unknown) => SQL_FRAGMENT;

// `db.unsafe(query, params?)` executes like a tagged call — consumes a row-set.
mockDb.unsafe = (_query?: unknown, _params?: unknown) => pendingQuery();

// `db.begin(cb)` runs the callback transactionally with the same db handle.
mockDb.begin = async (
  cb: (sql: MockDb) => unknown | Promise<unknown>,
) => cb(mockDb);

/** Push row(s) onto the mock DB queue. */
export const enqueue = (...rows: unknown[]) => { queue.push(rows); };

/** Clear all queued rows (call in beforeEach). */
export const clearQueue = () => { queue.length = 0; };
