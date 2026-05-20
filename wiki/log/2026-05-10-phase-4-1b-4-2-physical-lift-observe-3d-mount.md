# 2026-05-10 — Phase 4.1b + 4.2: physical lift + Observe 3D mount


Completed Phase 4 of ADR `2026-05-10-atlas-built-environment-unification.md`
through the Observe 3D mount.

**Phase 4.1b — physical lift + V2-direct data source:**
- `apps/web/src/v3/builtEnvironment/layers/{DesignElementGlbLayer,DesignElementExtrusionLayer,Terrain3DController}.tsx`
  no longer shims into `v3/plan/canvas/`; the implementations now
  live in the shared dir.
- Both layers read entities directly from `useBuiltEnvironmentStoreV2`
  (selector: `s => s.entities`), filtered by `projectId` and a new
  `stateFilter?: 'existing' | 'proposed' | 'all'` prop (default
  `'all'`). `StateFilter` is exported from the barrel.
- Plan-stage phase capping (`PHASE_VIEW_CAP`/`phaseIndex`) is applied
  only to `state === 'proposed'` entries; existing-state entities
  always render regardless of `view`. Existing-state entries default
  to `proposed?.phase ?? 'building'` when phase is read.
- Old physical files at `v3/plan/canvas/{Terrain3DController.tsx,
  layers/DesignElementGlbLayer.tsx, layers/DesignElementExtrusionLayer.tsx}`
  deleted. `DesignElementLayers.tsx` (flat fill/line/circle/symbol)
  stays in Plan — out of Phase 4 scope.
- `VisionLayoutCanvas.tsx` already imports through the shared barrel
  (Phase 4.1) — no change needed; its mounts now hit V2 directly.

**Phase 4.2 — Observe 3D mount:**
- `ObserveLayout.tsx` now mounts `DesignElementExtrusionLayer` and
  `DesignElementGlbLayer` with `stateFilter="existing"`. They render
  inside `DiagnoseMap` alongside the existing `ObserveAnnotationLayers`.
- Mounts are unconditional (empty FC when no eligible entities) and
  hidden top-down (pitch collapses extrusions). Wiring an explicit
  Terrain3D toggle into `MapToolbar` is deferred — operators can
  still pitch via shift-drag to surface the 3D affordance.
- Plan side gains a free behaviour win: existing-state buildings
  drawn in Observe now appear as 3D extrusions in `VisionLayoutCanvas`
  (the default `stateFilter='all'` covers both states). This satisfies
  the original Verification step #2 of the ADR.

**Verification:** `tsc --noEmit` exit 0 after `PhaseKey` import +
proposed-only phase-cap guard; `vitest run
src/store/__tests__/builtEnvironmentAdapters.test.ts` → 16/16 pass.

**Remaining Phase 4 (next session):**
- 4.3 — generalize `PlanVertexEditHandler` + `InlineFeaturePopover`
  into `BuiltEnvironmentVertexEditHandler` +
  `BuiltEnvironmentInlineFormPopover`.
- 4.4 — merge Observe `annotationFieldSchemas` with Plan
  `InlineFormStore` field defs into a registry-driven schema source.
- 4.5 — repair the Phase 0 broken Observe edit dispatches (all 8 BE
  kinds missing from `POINT_KINDS`/`LINESTRING_KINDS`/`POLYGON_KINDS`)
  via the new shared handler.

**Optional polish (not blocking Phase 5):**
- Wire a Terrain3D toggle into `MapToolbar` so Observe operators get
  the same one-click pitch-and-DEM preset Plan has.
