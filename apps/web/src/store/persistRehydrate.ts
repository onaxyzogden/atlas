/**
 * persistRehydrate — shared instrumentation for zustand persist rehydration.
 *
 * Background: on 2026-05-21 the `ogden-conventional-crops` and `ogden-pastures`
 * localStorage keys for project mtc rehydrated EMPTY after a dev-server drop,
 * and the failure was completely silent — the first sign was missing data.
 *
 * Root cause (zustand 5.0.12, node_modules/zustand/esm/middleware.mjs:431-436):
 * the persist middleware's hydrate() chain ends in
 *   `.catch((e) => postRehydrationCallback(undefined, e))`
 * The error is HANDLED there and the rehydrate() promise RESOLVES — it never
 * rejects. So a `.catch()` on `store.persist.rehydrate()` can never observe a
 * rehydrate failure. The ONLY place the error is exposed is the callback
 * returned by `onRehydrateStorage`, as its second `error` argument.
 *
 * `rehydrateWithLogging` therefore installs — composing with any existing
 * handler so migration logic is preserved — an `onRehydrateStorage` callback
 * that `console.error`s on failure (via `setOptions`), and THEN triggers
 * rehydration. The next silent recurrence becomes diagnosable, e.g.:
 *   [persist:ogden-conventional-crops] rehydrate failed SyntaxError: ...
 *
 * Beyond the dev console, the same failure is forwarded to the general
 * client-error telemetry sink (`recordClientError`, source
 * `persist_rehydrate`) so it is captured server-side in production, not
 * only when an engineer happens to have the console open. That call is
 * best-effort and never throws — see clientErrorLog.ts.
 *
 * The persist key is auto-derived from `getOptions().name`, so call sites are a
 * uniform one-arg swap: `rehydrateWithLogging(useConventionalCropStore);`
 *
 * Async-hydration hook (`onHydrated`): when a store moves off synchronous
 * `localStorage` to the IndexedDB backend (see lib/indexedDBStorage.ts),
 * hydration resolves on a later microtask. Code that previously ran a one-time
 * migration synchronously AFTER `rehydrateWithLogging(...)` (e.g.
 * `useWorkItemStore.getState().ensureMigrated()`) would then run on EMPTY,
 * pre-hydration state. Pass that logic as the `onHydrated` callback instead: it
 * fires once hydration settles, for both sync and async backends. It must be
 * idempotent — onRehydrateStorage can fire on more than one hydration pass.
 *
 * See wiki/log/2026-05-21-persist-rehydrate-instrumentation.md and
 * wiki/log/2026-05-21-client-error-telemetry-sink.md.
 */

import { recordClientError } from '../lib/clientErrorLog.js';

/* eslint-disable @typescript-eslint/no-explicit-any -- structural shape spans
   ~60 differently-typed persist stores; `any` on the state param keeps the
   onRehydrateStorage function type bivariant so every store is assignable. */
type RehydrateCallback = (hydratedState: any, error?: unknown) => void;
type OnRehydrateStorage = (state: any) => RehydrateCallback | void;

interface PersistInstrumentable {
  persist: {
    getOptions: () => { name?: string; onRehydrateStorage?: OnRehydrateStorage };
    setOptions: (options: { onRehydrateStorage: OnRehydrateStorage }) => void;
    rehydrate: () => Promise<void> | void;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Optional config for `rehydrateWithLogging` (back-compat: both fields optional). */
export interface RehydrateOptions {
  /** Label for the failure log; defaults to the persist `name` option. */
  nameOverride?: string;
  /**
   * Runs AFTER hydration settles (sync or async backend). Use for post-rehydrate
   * side effects — one-time migrations, derived seeding — that must not see
   * empty pre-hydration state. MUST be idempotent: it can fire on more than one
   * hydration pass. `error` is set if hydration failed (the callback still runs
   * so callers can recover/seed defaults).
   */
  onHydrated?: (error?: unknown) => void;
}

/**
 * Trigger `store.persist.rehydrate()` with failure logging.
 *
 * @param store any zustand store created with the `persist` middleware
 * @param opts  a string is accepted as a shorthand for `{ nameOverride }`
 *              (preserves the original two-arg signature); or pass
 *              `{ nameOverride?, onHydrated? }`.
 */
export function rehydrateWithLogging(
  store: PersistInstrumentable,
  opts?: string | RehydrateOptions,
): void {
  const normalized: RehydrateOptions =
    typeof opts === 'string' ? { nameOverride: opts } : opts ?? {};
  const { nameOverride, onHydrated } = normalized;

  const options = store.persist.getOptions();
  const name = nameOverride ?? options.name ?? 'unknown';
  const existing = options.onRehydrateStorage;

  // Compose: log the error, then delegate to any pre-existing handler so
  // stores with migration/legacy logic in onRehydrateStorage keep working.
  store.persist.setOptions({
    onRehydrateStorage: (state) => {
      const innerCallback = existing?.(state);
      return (hydratedState, error) => {
        if (error) {
          console.error(`[persist:${name}] rehydrate failed`, error);
          // Forward to the durable client-error sink (best-effort, never
          // throws). projectId is null: a persist store is global and may
          // rehydrate at boot before any project/login context exists.
          const e = error instanceof Error ? error : undefined;
          recordClientError({
            source: 'persist_rehydrate',
            name: e?.name ?? 'Error',
            message: e?.message ?? String(error),
            stack: e?.stack,
            projectId: null,
            context: { persistKey: name },
          });
        }
        if (innerCallback) innerCallback(hydratedState, error);
        // Post-hydration hook runs last, after any composed migration handler,
        // so it observes fully-hydrated state. Best-effort: a throw here must
        // not break the hydration chain for other stores.
        if (onHydrated) {
          try {
            onHydrated(error);
          } catch (hookErr) {
            console.error(`[persist:${name}] onHydrated hook threw`, hookErr);
          }
        }
      };
    },
  });

  store.persist.rehydrate();
}
