# 2026-05-10 — Built Environment joins the global undo coordinator


`useBuiltEnvironmentStoreV2` is now an `UndoableStoreName` in
`apps/web/src/store/undoCoordinatorStore.ts` under the fresh key
`'builtEnvironment'`. Three-line change: import, union entry, `STORES`
record. Closes the gap left by the Phase 3 V2-facade refactor
(`cfd97dd`) — facades have no temporal middleware, so prior to this
the coordinator silently skipped every create/update/delete on
buildings, wells, septics, gates, fences, hazards, ecology zones, and
existing driveways. `caba624` had already routed drag windows through
V2's `temporal`; this commit completes the wiring for non-drag
mutations.

Why a fresh key rather than reviving `'structure'`: the V2 store is
broader than just structures, and `b40f881` (the blank-screen fix
that removed the stale `'structure'` entry) explicitly tombstoned the
old name to avoid `git blame` / wiki-search confusion.

V2 already had the canonical `persist(temporal(reducer, { limit: 200
}), persistConfig)` idiom (identical to `useTopographyStore`), so the
existing `setupUndoCoordinator()` machinery — `onFinishHydration`
gate, initial `temporal.clear()` to discard rehydration past states,
`temporal.subscribe()` push-mutation listener — picks it up with no
store-side changes.

End-to-end verified in the running dev preview by scripting a Building
`create` via `preview_eval`: V2 `pastStates` went 0→1, coordinator
`history` pushed `'builtEnvironment'`, `coord.undo()` removed the
entity and flipped `past/future` 1/0 → 0/1, `coord.redo()` restored
it. Build/tsc/lint clean; `builtEnvironmentStoreV2` (16) +
`builtEnvironmentAdapters` (16) test suites both pass.

Plan: `C:\Users\MY OWN AXIS\.claude\plans\builtenvironmentstorev2-needs-a-coordin-sequential-canyon.md`.
