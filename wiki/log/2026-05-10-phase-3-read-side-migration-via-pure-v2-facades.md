# 2026-05-10 — Phase 3: read-side migration via pure V2 facades


Phase 3 of the BE unification (ADR
`2026-05-10-atlas-built-environment-unification.md`) landed. The three
legacy stores (`builtEnvironmentStore`, `structureStore`,
`designElementsStore`) are now in-memory facades that subscribe to
`useBuiltEnvironmentStoreV2` and reproject on every entities change;
all writes forward to V2's `create / updateMetadata / updateGeometry /
delete`.

**Departure from approved plan:** original Phase 3 design gated the
swap behind `FLAGS.BUILT_ENV_V2` so consumers could fall back to a
legacy V1 store. An external rewrite (signaled as intentional via
system-reminder) collapsed that to a pure facade with no flag and no
V1 fallback. Honored the signal — V2 is the sole source of truth from
this commit forward; rollback now requires a revert rather than a
flag flip.

**Files:**
- *new* `packages/shared/src/builtEnvironmentProjection.ts` —
  inverse of `migrateLegacyToV2`; per-kind projection helpers
  (`projectToBuildings`, `…Wells`, `…Septics`, `…PowerLines`,
  `…BuriedUtilities`, `…Fences`, `…Gates`, `…ExistingDriveways`,
  `…Structures`, `…DesignElements`, `…DesignElementsByProject`).
  Reverse map `KIND_TO_LEGACY_STRUCTURE_TYPE` restores snake_case for
  Plan callers; structure-class set (12 kinds) gates which V2 entries
  surface as design elements.
- *rewritten* `apps/web/src/store/builtEnvironmentStore.ts` —
  V2-facade; preserves all 8 V1 type interfaces and add/update/remove
  per-kind action surface; V1 caller-supplied ids are dropped (V2
  mints its own).
- *rewritten* `apps/web/src/store/structureStore.ts` — V2-facade;
  preserves `StructureType` enum + `Structure` interface; `placementMode`
  stays local.
- *rewritten* `apps/web/src/store/designElementsStore.ts` — bimodal
  facade. Structure-class kinds (yurt, greenhouse, barn, shed,
  machinery-shed, fuel-station, equipment-yard, water-tank, parking,
  prayer-pavilion, fire-circle, compost) route to V2; non-structure
  kinds (paddock, pond, swale, orchard, path, road, gate, bridge, …)
  stay in an internal Zustand-persist substore on the original
  `'ogden-atlas-design-elements'` key.
- *new* `apps/web/src/store/__tests__/builtEnvironmentAdapters.test.ts` —
  16 vitest cases under happy-dom: Observe round-trip per kind, Plan
  snake↔kebab kind translation, design-element bimodal routing,
  byProject merge, KPI parity (2 buildings + 2 fences + 1 well →
  totalArea=180, totalFenceM=250, wellCount=1, module-health=52).

**Test isolation note:** `useDesignElementsStore`'s internal
non-structure substore is in-memory and survives `localStorage.clear()`,
so `resetAll()` calls `useDesignElementsStore.getState().clear(PROJECT)`
plus a direct `setState({ byProject: {} })` between tests.

**Verification:** `vitest run
src/store/__tests__/builtEnvironmentAdapters.test.ts` → 16/16 pass;
`tsc --noEmit` (apps/web) → exit 0.

Phase 4 next: lift `DesignElementGlbLayer` / `DesignElementExtrusionLayer`
/ `Terrain3DController` and `PlanVertexEditHandler` /
`InlineFeaturePopover` into shared mounts so Observe inherits Plan's
3D + edit affordances against the unified store.
