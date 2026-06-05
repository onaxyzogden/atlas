# 2026-05-10 — Phase 5.4: V2 category KPIs surfaced in BuiltEnvironmentDashboard


**Motive.** Phase 5.2 made the 23 non-legacy BE kinds placeable + clickable
+ editable in Observe, but the dashboard (`BuiltEnvironmentDashboard.tsx`)
remained V1-locked: 8 hardcoded KPI cards reading exclusively through the
legacy facade. A steward placing 12 yurts and 3 solar arrays saw zero
feedback on those entities. Phase 5.4 closes that loop with a hybrid
8-legacy + 5-V2-category layout that preserves the legacy visual + the
existing `built_environment_report` export shape.

**Implementation (one helper, one mount, one export extension).**

- `derivations.ts` (~250 LOC added):
  - `BuiltKpiItem['iconKey']` union extended with `'tent' | 'sprout' | 'truck' | 'flame' | 'square'`.
  - `V2_CATEGORY_SPECS` — 5 stable cards in fixed order: Habitable
    structures, Agricultural, Utility (extended), Machinery, Amenity.
    Skips `infrastructure` deliberately (would double-count the legacy
    power-line/buried-utility/fence/gate/driveway cards).
  - `bucketGeometryMetric(bucket)` — geometry-aware secondary metric:
    polygon majority → total area via turf; line majority → total length;
    point majority / mixed → bare count.
  - `builtEnvironmentV2CategoryKpis({entities, projectId})` — filters by
    `projectId && state==='existing' && !LEGACY_OBSERVE_BE_KINDS.has(kind)`,
    buckets by `getBuiltEnvironmentKind(kind).category`, returns 5 cards
    with dominant-kind pill resolved to `spec.label`.
  - `builtV2EntitiesForExport` + `builtV2Counts` — export payload helpers
    emitting `{id, kind, state, category, areaM2?|lengthM?, label?, notes?}`
    rows + `{total, byCategory}` counts.
- `BuiltEnvironmentDashboard.tsx`:
  - Subscribes to `useBuiltEnvironmentStoreV2((s) => s.entities)`.
  - Renders `[...kpis, ...v2Kpis].map(...)` — single grid, 13 cards.
  - Export payload's `payload.builtEnvironment` block extended with
    `v2Entities` array + `v2: {total, byCategory}` counts. Legacy 8
    buckets stay byte-for-byte identical for back-compat.
- Module-health ring formula (`moduleHealthPct`) intentionally unchanged
  — keeping pre-/post-5.4 health snapshots comparable; documented inline.

**Tests.** New file `src/v3/observe/modules/built-environment/__tests__/derivations.test.ts`
covers 9 cases: empty input → 5 dim cards, kind bucketing, polygon-area
metric over bare count, cross-project / wrong-state / legacy-kind
filtering, export shape (areaM2 + category), counts. Combined run
`vitest run derivations.test.ts builtEnvironmentStoreV2.test.ts builtEnvironmentAdapters.test.ts`
→ 41/41 green.

**Verification.**
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` → exit 0.
- 3 vitest files / 41 cases green.
- Manual MTC smoke deferred to user.

**Deferred / next.**
- Phase 6: delete v1 `builtEnvironmentStore.ts` + reduce `structureStore.ts`
  to a thin V2 wrapper; delete duplicated `AnnotationVertexEditHandler`;
  final `tsc / vitest / eslint` ratchet sweep.
