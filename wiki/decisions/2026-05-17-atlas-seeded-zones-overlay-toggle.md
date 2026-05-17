---
title: Seeded-zones overlay show/hide toggle
date: 2026-05-17
status: accepted
stage: plan
module: matrix-overlays / plan-data-layers
---

# ADR: Seeded-zones overlay show/hide toggle

**Date:** 2026-05-17
**Status:** accepted

## Context

Generator-seeded ("ring-seed") `LandZone`s — emitted by `ringSeedGenerator`
and carrying `seedProvenance === 'ring-seed'` (see
`2026-05-15-atlas-zone-generator-seam-ring-seeding.md` and
`2026-05-16-atlas-click-to-anchor-ring-seeding.md`) — were rendered on the
Plan-stage map with **no way to hide them**. They share the
`plan-data-poly-fill` / `plan-data-poly-line` layers with every other
polygon, plus a dedicated dashed `plan-data-poly-seed-line` provisional
indicator. A steward who had seeded provisional drafts but wanted to declutter
the canvas (e.g. to read the hand-drawn design underneath) had no recourse.

Steward decisions (confirmed via clarifying questions): the control belongs in
the **BaseMapCard "Overlays" legend** (the canonical matrix-overlay legend,
top-left of every map view) alongside the other matrix toggles; hiding removes
the **entire** seeded zone (fill + solid line + dashed seed-line + label);
default is **visible** — no regression for existing stewards.

## Decision

Add `seededZones` as a matrix overlay toggle, **defaulting ON** (unlike the
off-by-default overlays) so existing stewards keep the prior always-visible
behavior.

Because seeded zones live on the *shared* polygon/label layers, visibility is
implemented with maplibre `setFilter`, not layer-visibility flips — mirroring
the existing `fence-temp-line` / `poly-seed-line` filtered-sub-layer precedent
in `PlanDataLayers`:

- A `hideSeedFilter` = `['!=', ['coalesce', ['get','seedProvenance'],
  'manual'], 'ring-seed']` is applied to the shared `poly-fill`, `poly-line`,
  and `label` layers when the toggle is off. Non-zone features lack the prop
  and `coalesce` to `'manual'`, so they always pass — **only ring-seed
  features are ever dropped**; manual zones, crops, structures, paddocks,
  paths are untouched.
- The seeded-only `poly-seed-line` uses a match-everything-ring-seed filter
  when on and a match-nothing filter (`['==', ['literal',0], 1]`) when off,
  preserving its dashed-provisional styling when visible.

State lives in `matrixTogglesStore` (persisted to `localStorage`,
`ogden-atlas-matrix-toggles`) — a pure UI/view preference, not project data,
consistent with the rest of the matrix toggles. The legend row is stage-scoped
(hidden on Observe/Act, same treatment as `zoneRings` / `sunPath`) because the
seeded-zone layers are only mounted by `PlanDataLayers`.

No existing layer or behavior was deleted (per the project "no deletion in
revamps" convention).

## Consequences

- Stewards can declutter the Plan canvas by hiding provisional ring-seed
  drafts without deleting them; re-checking restores them with dashed
  provisional styling intact.
- The shared-layer filter only ever removes `ring-seed` features — zero risk
  to manual zones or other polygon kinds (coalesce-to-`manual` guarantees
  pass).
- `matrixTogglesStore` persist version bumped 11 → 12; `migrate` defaults
  `seededZones ?? true`, so existing persisted stores self-heal to the
  no-regression default.

## Files changed

- `apps/web/src/store/matrixTogglesStore.ts` — `'seededZones'` added to the
  `MatrixToggleKey` union + `MatrixTogglesState` (doc comment, defaults
  `true`); `setAll` extended; persist `version` 11→12 with v12 comment;
  `migrate` adds `seededZones: prev.seededZones ?? true`.
- `apps/web/src/v3/plan/canvas/BaseMapCard.tsx` — new `DEFAULT_OVERLAYS` row
  (`seededZones`, "Seeded zones (ring-seed provisional drafts)", swatch
  `#7a9a4a`) placed by the zone rows; `seededZones` added to
  `STAGE_HIDDEN.observe` + `STAGE_HIDDEN.act`.
- `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` — reads
  `useMatrixTogglesStore(s => s.seededZones)`; defines `hideSeedFilter` /
  `seedLineFilter` in `apply()`; first-mount `ensureLayer` specs for
  `poly-fill` / `poly-line` / `label` carry the filter when hidden;
  `poly-seed-line` uses the seed-line filter; the toggle-time re-apply `try`
  block re-`setFilter`s all four (guarded by `map.getLayer`);
  `seededZonesVisible` added to the `apply` effect deps.
- `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx` —
  typecheck-only: `'seededZones'` added to the three `Exclude<MatrixToggleKey,
  …>` unions (`toggleKey?`, `GROUP_TOGGLE`, `subToggles`) so the new key is
  not treated as a sector sub-toggle.

## Verification

- `tsc --noEmit` (full web project, 8 GiB heap) — clean, exit 0.
- `lint` (= `tsc --noEmit`, default heap) hit a JS-heap OOM (exit 134) —
  environment memory limit, not a code defect (typecheck script with the
  8 GiB flag passed clean).
- End-to-end render verified by injecting a test `ring-seed` zone into
  `localStorage` on the Current Land canvas tab (where `plan-data-*` layers
  mount — not Vision Layout, which uses `design-el-*`): seeded-feature render
  count 2 → 0 (toggle off) → 2 (toggle on); 78 non-seed features unaffected;
  filter expressions confirmed exact. Test data cleaned up afterward.
- Live WebGL screenshot walkthrough unobtainable offline (MapLibre returns
  black frames) — disclosed, not faked; verification was via store injection +
  layer-state introspection.

## Scope / non-goals

Plan only. No data-model change; `seedProvenance` semantics unchanged. A
pre-existing unrelated `DesignElementLayers` crash ("Cannot read properties of
undefined (reading 'type')", commits ec5ed028 / a4d04c74) was observed in a
different component, is not caused by this change, and was flagged separately.
