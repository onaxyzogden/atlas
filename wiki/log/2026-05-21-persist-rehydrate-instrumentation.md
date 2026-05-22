# 2026-05-21 — Persist-rehydrate failure instrumentation

**Branch.** `feat/atlas-permaculture` (reconciled from the
`wip-pre-mtc-restore` worktree). Follow-up to the
[MTC Observe baseline restoration](2026-05-21-mtc-observe-baseline-restoration.md)
session: that session restored the lost data; this one makes the
**underlying silent failure diagnosable** so the next recurrence is not
invisible.

**Why.** On 2026-05-21 the `ogden-conventional-crops` and `ogden-pastures`
localStorage keys for project mtc rehydrated EMPTY after a dev-server
drop. The first sign of trouble was missing data on the map — there was
no error, no console warning, nothing. A whole class of persist failures
(corrupt JSON, a throwing migration, a storage-quota read error) was
landing in a place no one could see.

**Root cause — why the failure was silent (zustand 5.0.12).** In
`node_modules/zustand/esm/middleware.mjs:431-436` the persist
middleware's `hydrate()` chain ends in:

```js
.catch((e) => postRehydrationCallback(undefined, e))
```

The error is **handled** there and the `rehydrate()` promise **resolves**
— it never rejects. So a `.catch()` on `store.persist.rehydrate()` can
never observe a rehydrate failure. (The original plan proposed exactly
that `.catch()` approach; reading the zustand source proved it would be a
no-op. The plan was corrected mid-flight.) The ONLY place the error is
exposed is the callback returned by `onRehydrateStorage`, as its second
`error` argument:

```js
onRehydrateStorage: (state) => (hydratedState, error) => { /* error here */ }
```

**What changed.**

- [apps/web/src/store/persistRehydrate.ts](../../apps/web/src/store/persistRehydrate.ts)
  (NEW): `rehydrateWithLogging(store, nameOverride?)`. It reads the
  store's existing persist options via `getOptions()`, **composes** with
  any pre-existing `onRehydrateStorage` handler (so stores that use it
  for legacy migration keep working), installs — via `setOptions()` — a
  wrapper that `console.error`s `[persist:<name>] rehydrate failed` on
  the `error` arg and then delegates to the original inner callback, and
  finally triggers `rehydrate()`. The persist key is auto-derived from
  `getOptions().name`, so call sites are a uniform one-arg swap:
  `rehydrateWithLogging(useConventionalCropStore);`. A paragraph-length
  header docstring records the zustand-source root-cause finding so the
  next reader does not have to re-derive it.
- **64 store call sites** across `apps/web/src/store/*.ts`: each bare
  `useXStore.persist.rehydrate();` swapped for
  `rehydrateWithLogging(useXStore);` with the matching
  `import { rehydrateWithLogging } from './persistRehydrate.js';`. The
  two MTC-loss victims —
  [conventionalCropStore.ts](../../apps/web/src/store/conventionalCropStore.ts)
  (`ogden-conventional-crops`) and
  [pastureStore.ts](../../apps/web/src/store/pastureStore.ts)
  (`ogden-pastures`) — were converted first as the highest-confidence
  smoke test. `closedLoopStore.ts` and `builtEnvironmentStoreV2.ts`
  already used `onRehydrateStorage` for migration; the helper **composes
  with** their handlers rather than replacing them. Window-guarded sites
  (`uiStore.ts`, `relationshipsStore.ts`) keep their guards.
- [apps/web/src/store/builtEnvironmentStore.ts](../../apps/web/src/store/builtEnvironmentStore.ts)
  (facade): the V1 projection wraps the V2 rehydrate in
  `Promise.resolve(...).then(project).catch(log)` so a failure in the
  V2→V1 slice projection is also surfaced (the V2 store's own rehydrate
  is already instrumented by its line-580 helper call).
- [apps/web/src/store/__tests__/persistRehydrate.test.ts](../../apps/web/src/store/__tests__/persistRehydrate.test.ts)
  (NEW, 4 tests): proves malformed JSON in storage logs
  `[persist:<name>] rehydrate failed`; a clean rehydrate applies state
  silently (no error log); the name auto-derives from the persist
  `name`; and an explicit `nameOverride` is honoured. Uses an in-memory
  storage map, `skipHydration: true`, `createJSONStorage`,
  `vi.spyOn(console, 'error')`, and a microtask flush.

**How to verify a recurrence is now visible.** Run the unit test
(`npx vitest run src/store/__tests__/persistRehydrate.test.ts`) — it
reproduces the exact silent-failure path with malformed JSON and asserts
the log fires. Manual smoke test in the running preview:

```js
localStorage.setItem('ogden-conventional-crops', '{this is not valid json');
location.reload();
// Console now shows: [persist:ogden-conventional-crops] rehydrate failed SyntaxError: …
localStorage.removeItem('ogden-conventional-crops');
window.__ogdenSeedMtcObserveBaseline();
```

**Verification.**
- `npx vitest run` (web) → all tests green, including the 4 new ones.
- `tsc --noEmit` (web): the same pre-existing unrelated errors as on the
  rebase base; **0 new errors** from this work.
- The bulk swap was eyeballed file-by-file (not a blind ripgrep-replace)
  because a few call sites sit inside `typeof window !== 'undefined'`
  guards or compose with existing `onRehydrateStorage` migration logic.

**Out of scope.** A telemetry sink (the helper logs to `console.error`
only; wiring to a real error-reporting backend is a later concern). The
broader server-side persistence/sync story. Auto-recovery on rehydrate
failure (this surfaces the error; it does not attempt to repair corrupt
storage).
