---
title: Vision Layout UX consolidation — canvas-aware legend, rail-docked custom models, bottom-right inline popover
date: 2026-05-17
status: accepted
stage: plan
module: plan-canvas / base-map-card / plan-tools
---

# ADR: Vision Layout UX consolidation

**Date:** 2026-05-17
**Status:** accepted

## Context

The Plan stage has two structurally different canvases that both pass
`stage="plan"`: **Current Land** (`PlanLayout.tsx`, mounts every Plan overlay)
and **Vision Layout** (`VisionLayoutCanvas.tsx`, also serves `terrain3d`;
does NOT mount `PlanSunPathOverlay` / `PlanZoneRingsOverlay` /
`PlanContoursOverlay`). Three steward-visible rough edges on Vision Layout
were reported in this session:

1. The BaseMapCard "Overlays" legend offered `sunPath` and `zoneRings`
   checkboxes that are **dead no-ops** on Vision Layout (those overlay
   components are not mounted there). Two legend labels were also inaccurate:
   `zones` claimed "use-frequency rings — drawn or textbook" (it only toggles
   Observe-drawn permaculture-zone annotations) and `zoneRings` said
   "Z1·Z2·Z3" while `ZONE_RING_BANDS` defines **Z1–Z5**.
2. The custom-GLB upload panel (`CustomModelPalette`) floated as its own card
   bottom-right of the map, separate from the single left tools rail every
   other Plan tool lives in.
3. The inline feature-edit popover (`InlineFeaturePopover`) docked at the
   **top**-right, overlapping the DesignToolRail region and reading as a
   different surface than the other bottom-anchored map cards.

## Decision

**1 — Canvas-aware legend + relabel.** `BaseMapCard` gains an optional
`hiddenOverlays?: ReadonlyArray<MatrixToggleKey>` prop. The mount site (which
knows which overlay components it actually mounts) declares the dead keys;
`BaseMapCard` stays ignorant of canvas topology. The row filter is the union
of `STAGE_HIDDEN[stage]` and `hiddenOverlays`. `VisionLayoutCanvas` passes
`VISION_DEAD_OVERLAYS = ['sunPath','zoneRings']`. `topography` is deliberately
NOT hidden on Vision — its steward-drawn topo annotations still render via the
mounted `ObserveAnnotationLayers` (only its unmounted MapTiler contour half is
absent). `scheduledMoves` stays visible on both Plan canvases (intentional
cross-stage Act surfacing, mounted on both). Two labels corrected: `zones` →
"Permaculture zones (steward-drawn in Observe)"; `zoneRings` → "Design audit
rings (Z1–Z5 around tagged Zone-0 elements)".

**2 — Custom models docked into the left rail.** `CustomModelPalette` is
restyled from a floating `position:absolute` card into a `PlanTools` rail
`<section className={css.group}>` (reuses `PlanTools.module.css`:
`groupHeader`/`dot`/`groupLabel`, `itemGrid` of `toolItem`/`toolGlyph`/
`toolLabel` tiles with the remove-button overlay, `openModuleBtn` upload
button). It is mounted inside `PlanTools` gated by
`usePlanView() ∈ {vision, terrain3d}` (preserves the prior vision/terrain3d-
only availability), and the floating mount + import are removed from
`VisionLayoutCanvas`. All store wiring (`customModelStore`,
`customDrawSelectionStore`, `useMapToolStore`, `validateCustomGlb`,
`CUSTOM_GLB_TOOL_ID`) is unchanged — this is a pure relocation/restyle.

**3 — Inline popover anchored bottom-right.** `InlineFeaturePopover.module.css`
`.popover` switched from `top: 56px` to `bottom: 12px` (keeps `right: 12px`);
`max-height` adjusted to `calc(100% - 80px)` so a tall form grows upward and
stays clear of the top DesignToolRail.

No layer or behavior was deleted (project "no deletion in revamps"
convention). No `matrixTogglesStore` change, no persist bump — the toggles
still exist and persist; they are just not surfaced on a canvas where they
cannot act.

## Consequences

- Vision Layout / 3D Terrain legend no longer offers no-op `sunPath` /
  `zoneRings` rows; Current Land keeps all rows (regression-safe — its
  overlays are all mounted). Observe/Act unaffected (`STAGE_HIDDEN` already
  hid those there).
- The custom-GLB workflow now lives in the same rail as every other Plan
  tool; one consolidated left column instead of a floating card.
- `terrain3d` flows through the same `VisionLayoutCanvas` mount, so it
  inherits the corrected legend and the rail-docked palette automatically.
- The two corrected labels remove a long-standing copy inaccuracy
  (textbook-rings claim, Z-band count).

## Files changed

- `apps/web/src/v3/plan/canvas/BaseMapCard.tsx` — `hiddenOverlays` prop added
  to `BaseMapCardProps`; destructured; filter merges
  `STAGE_HIDDEN[stage]` ∪ `hiddenOverlays` via a `Set`; `zones` / `zoneRings`
  rows relabeled; header comment expanded re per-canvas dead overlays.
- `apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx` —
  `VISION_DEAD_OVERLAYS` const + comment; passed to `<BaseMapCard>`;
  `CustomModelPalette` import + floating mount removed; JSDoc updated.
- `apps/web/src/v3/plan/canvas/CustomModelPalette.tsx` — JSDoc rewritten;
  `import css` switched to `../PlanTools.module.css`; outer floating `<div>`
  replaced with a rail `<section className={css.group}>` using PlanTools
  rail-section markup. Component logic/exports unchanged.
- `apps/web/src/v3/plan/PlanTools.tsx` — imports `CustomModelPalette` +
  `usePlanView`; `const view = usePlanView()`; renders
  `{(view === 'vision' || view === 'terrain3d') && <CustomModelPalette />}`
  just before the toolbox closing `</div>`.
- `apps/web/src/v3/plan/draw/InlineFeaturePopover.module.css` — `.popover`
  re-anchored bottom-right; `max-height` → `calc(100% - 80px)`; comment
  updated.

## Verification

- `pnpm --filter web typecheck` (8 GiB heap) — clean.
- Preview DOM assertion (WebGL canvas blocks screenshots — disclosed, not
  faked):
  - Vision Layout: "Custom models" section sits inside the left toolbox rail
    (left edge 49px, within rail bounds 36–276px) with the `test-yurt` tile +
    "Upload .glb" button. Current Land: section absent (no rail entry, no
    floating card).
  - `InlineFeaturePopover` ("Paddock" dialog) measured 12px from the map's
    right and bottom edges, 343px clear of the top.

## Scope / non-goals

Plan stage UI/view scoping only. No data-model change, no store/persist
change. `PlanLayout.tsx` (Current Land) and Observe/Act mount sites
unchanged.
