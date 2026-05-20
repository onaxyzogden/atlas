# 2026-05-10 — Phase 4.1: shared Built-Environment layer shim path


Established `apps/web/src/v3/builtEnvironment/layers/` as the shared
import surface for the 3D + extrusion + terrain machinery, per Phase 4
of ADR `2026-05-10-atlas-built-environment-unification.md`.

**Shipped:**
- `v3/builtEnvironment/layers/{DesignElementGlbLayer,DesignElementExtrusionLayer,Terrain3DController}.tsx`
  — thin re-export shims to the canonical Plan implementations.
- `v3/builtEnvironment/layers/index.ts` — barrel export.
- `v3/plan/canvas/VisionLayoutCanvas.tsx` switched to the shared barrel
  import; Plan behavior unchanged.

**Why shims, not a physical lift:** the three layer files (~740 lines
combined) are tightly coupled to Plan-specific types (`PlanView`,
`phaseIndex`, `PHASE_VIEW_CAP`, `findElementSpec`, `getElementHeightSpec`,
`EXTRUDED_KINDS`) and read from `useDesignElementsStore`. A genuine
shared module needs to (a) decouple from Plan filtering primitives and
(b) read directly from `useBuiltEnvironmentStoreV2` with a
`stateFilter: 'existing' | 'proposed' | 'all'` prop so Observe can
opt into existing-state extrusion. That generalization (Phase 4.1b)
is properly its own session under the plan's ~25k token estimate.
The shim establishes the import path now so Phase 4.2's Observe
mounts can subscribe through the shared barrel without churn when
4.1b lands.

**Verification:** `tsc --noEmit` exit 0.

**Remaining Phase 4 work (next session):**
- 4.1b — physical lift + V2-direct data source + state filter prop.
- 4.2 — mount the 3D layers in `ObserveLayout` for existing-state
  entries; wire a Terrain3D toggle into the Observe rail.
- 4.3 — generalize `PlanVertexEditHandler` + `InlineFeaturePopover`
  into shared `BuiltEnvironmentVertexEditHandler` +
  `BuiltEnvironmentInlineFormPopover` driven by per-kind field schemas.
- 4.4 — merge Observe `annotationFieldSchemas` with Plan
  `InlineFormStore` field defs into a registry-driven schema source.
- 4.5 — repair the Phase 0 broken Observe edit paths (all 8 BE kinds
  missing from `POINT_KINDS` / `LINESTRING_KINDS` / `POLYGON_KINDS`)
  via the new shared handler.
