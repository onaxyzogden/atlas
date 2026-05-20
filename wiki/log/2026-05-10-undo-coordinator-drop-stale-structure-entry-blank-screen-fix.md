# 2026-05-10 — Undo coordinator: drop stale `structure` entry (blank-screen fix)


Atlas web app rendered a blank `#root` on load. Root cause: the Phase 3
V2-facade refactor (`cfd97dd`) repointed `useStructureStore` to an
in-memory V1→V2 projection with no `persist` middleware, but
`undoCoordinatorStore.ts` still listed `structure` in its `STORES`
map and called `store.persist.hasHydrated()` on every entry during
`setupUndoCoordinator()`. The call threw `TypeError: Cannot read
properties of undefined (reading 'hasHydrated')` synchronously at
module-import time, aborting `main.tsx` before React could mount.

Fix: removed `'structure'` from the `UndoableStoreName` union, the
`useStructureStore` import, and the `STORES` record in
`apps/web/src/store/undoCoordinatorStore.ts`. Structure mutations
already route undo/redo through `useBuiltEnvironmentStoreV2` per
`caba624` (`fix(plan): route structure drag undo through V2 store`),
so no replacement coordinator entry is needed today. If
`builtEnvironmentStoreV2` ever needs to participate in the global
undo timeline, add it under a fresh key — don't reuse `'structure'`.

Verified by reload: `#root` now mounts the AppShell nav + page chrome.
Screenshot tool still times out (Mapbox canvas, unrelated).
