# Map overlays follow single-objective focus (Observe + Plan)

**Date:** 2026-05-24
**Branch:** `feat/atlas-permaculture`

## What

The single-objective focus pattern shipped for the *rails* (Goal 2 / Phase 3:
"Open on Map" collapses the tool palette + checklist to the one active objective),
but the **map canvas** still rendered every module's data overlay at once. The
steward directed: *"map view overlays and sector compass segments should only show
what is relevant to that objective when in the initiation phase of that stage."*

## Locked steward decisions

1. **Trigger = single-objective focus** — scope overlays whenever one objective is
   active in the map (valid `$module` from "Open on Map"); full overlays when none.
2. **Overlays = hide non-matching** — strict single-objective map; show only the
   active objective's geometry.
3. **Sector compass HUD = always ambient** — only data overlays get scoped; the
   `SectorCompassOverlay` HUD stays visible (explicit steward choice over the
   original "segments" phrasing).
4. **Plan only, defer Act** — Act map is mostly cross-stage substrate that doesn't
   map to Act modules; deferred to a later kind→`ActModule` taxonomy decision.
5. **Keep substrate ambient** — only scope the active stage's own overlays;
   prior-stage read-only substrate (Observe annotations in the Plan map) stays
   visible; `activeModule` is not passed to substrate mounts.

## How

Two divergent layer architectures → two scoping shapes:

- **Observe (`ObserveAnnotationLayers`)** — clean per-module `LayerSpec[]`. Added
  `SPEC_MODULE: Record<string, ObserveModule>` and folded a `moduleMatch` term into
  both `specVisible` computations; `activeModule` added to the effect deps.
  `field-verification` hides under focus. New `activeModule?: ObserveModule | null`
  prop wired from `ObserveLayout` (`validModule`).
- **Plan merged source (`PlanDataLayers`, ~4k lines)** — all 15 modules' features
  merge into shared `plan-data-*` sources keyed by feature `kind`, so scoping
  filters the FeatureCollections, not per-layer visibility. Added a `KIND_MODULE`
  taxonomy (derived from the per-feature module comments) + a pure `focus(feats)`
  helper applied to all 13 returned FCs (identity pass when `activeModule == null`;
  unmapped kinds drop under focus); `activeModule` added to the `useMemo` deps.
  Geometry-less modules (goal-compass, phasing-budgeting) yield an empty Plan
  overlay under focus → only ambient substrate remains.
- **Plan design-element canvas (`DesignElementLayers`, `design-el-*`)** — features
  built from `designElementsStore` rows carrying `category` (`DesignCategory`).
  Added `CATEGORY_MODULE: Record<DesignCategory, PlanModule | null>` (water→
  water-management, access→zone-circulation, grazing→livestock,
  structure/amenity→structures-subsystems, machinery→machinery,
  vegetation→plant-systems, earthworks→water-management,
  habitat→habitat-allocation, custom→null/hidden) and filtered the `visible` set;
  `activeModule` added to the FC `useMemo` deps. New prop wired from `PlanLayout`.
- **Mounts** — `PlanLayout` passes `activeModule={validModule}` to `PlanDataLayers`
  + `DesignElementLayers` only. The `ObserveAnnotationLayers` substrate mount in
  the Plan map is left unchanged (decision 5). `VisionLayoutCanvas` is also left
  unscoped (dedicated authoring surface, not "Open on Map").

## Preservation (no-deletion-in-revamps)

Pure gate-don't-delete — every layer/feature/spec render path preserved and
conditionally rendered. Outside focus (`activeModule == null`) the render is
byte-for-byte the prior full-overlay behaviour.

## Covenant

Pure presentation/visibility change — no schema, store action, data model,
`MODULE_CARDS`, or migration. No riba/gharar/CSRA/salam/investor/financing/yield/
ROI framing introduced.

## Verification

`tsc --noEmit` at the 3-error pre-existing baseline (`StepBoundary.tsx:365`
`ReactNode`; `HostUnionContextMenu.test.tsx:58` + `HostUnionDrilldownCard.test.tsx:25`
test types) — no new errors. Two explicit-path commits on `feat/atlas-permaculture`:
Observe slice `d5d85fc6` (`ObserveAnnotationLayers.tsx` + `ObserveLayout.tsx`); Plan
slice `0e638cba` (`PlanDataLayers.tsx` + `DesignElementLayers.tsx` + `PlanLayout.tsx`).
Divergence-checked before push (8 ahead / 0 behind — clean fast-forward).

## Deferred

- **Act map overlay scoping** (decision 4) — needs an Act kind→module taxonomy.
- Scoping the sector-compass HUD segments (decision 3 keeps it ambient for now).

ADR: [[decisions/2026-05-24-atlas-single-objective-map-overlay-focus]].
