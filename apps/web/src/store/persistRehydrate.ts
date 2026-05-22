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

/**
 * Trigger `store.persist.rehydrate()` with failure logging.
 *
 * @param store        any zustand store created with the `persist` middleware
 * @param nameOverride optional label; defaults to the persist `name` option
 */
export function rehydrateWithLogging(
  store: PersistInstrumentable,
  nameOverride?: string,
): void {
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
      };
    },
  });

  store.persist.rehydrate();
}
