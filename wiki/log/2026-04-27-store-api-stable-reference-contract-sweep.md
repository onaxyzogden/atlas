# 2026-04-27 — Store-API stable-reference contract sweep


Followed up the 2026-04-26 Zustand selector-stability decision with a full
sweep of every store under [`apps/web/src/store/`](apps/web/src/store/) to
confirm the anti-pattern is closed and document return semantics on read-side
getters.

### Findings

29 stores audited. Three stores expose id-keyed read methods that return
freshly-allocated arrays (`.filter()` / `.sort()`):

- [`zoneStore.getProjectZones(projectId)`](apps/web/src/store/zoneStore.ts) — already documented with warning, no selector call-sites.
- [`phaseStore.getProjectPhases(projectId)`](apps/web/src/store/phaseStore.ts) — already documented with warning, no selector call-sites (TimelinePanel + 3 cards correctly subscribe to raw `.phases` and derive in `useMemo`).
- [`versionStore.getProjectSnapshots(projectId)`](apps/web/src/store/versionStore.ts) — already documented with warning, currently unused.

Three stores expose id-keyed read methods that return **stable stored
references** (`.find()`) — safe in selectors. These had no contract comment;
added one-line JSDoc:

- [`visionStore.getVisionData(projectId)`](apps/web/src/store/visionStore.ts) — 8 selector call-sites confirmed safe.
- [`portalStore.getConfig(projectId)`](apps/web/src/store/portalStore.ts) — internal callers only.
- [`portalStore.getBySlug(slug)`](apps/web/src/store/portalStore.ts) — internal callers only.

The remaining 23 stores (pathStore, structureStore, cropStore, livestockStore,
projectStore, uiStore, scenarioStore, siteDataStore, authStore, nurseryStore,
financialStore, commentStore, presenceStore, connectivityStore, mapStore,
soilSampleStore, regenerationEventStore, fieldworkStore, sitingWeightStore,
and others) expose no id-keyed read methods at all — call-sites already
follow the subscribe-then-derive pattern by default.

### Done

- Annotated `getVisionData`, `getConfig`, `getBySlug` with stable-reference
  contract comments.

### Verification

- No selector call-sites of the three fresh-array getters detected.
- Zero new infinite-render bugs introduced since the 2026-04-26 fix.

### Deferred

- **ESLint custom rule** to flag `useStore((s) => s.array.filter(...))` and
  `useStore((s) => s.getXxx(...))` where `getXxx` is on a known-fresh
  allow-list. Defer until a regression appears — manual JSDoc on the three
  fresh getters is sufficient signal for now.
