# 2026-05-07 — Plan stage: Vision-Layout canvas + design-element palette

## Context

The Plan stage to date has been **module-driven**: 18 plan cards routed
through 8 `PlanModule`s via `PlanModuleBar` + `PlanModuleSlideUp`, with the
map reduced to a passive backdrop showing Observe annotations. A reference
image supplied by the user (a permaculture site-design tool with categorised
left palette, top temporal tabs, right tool rail, and floating basemap card)
made it clear that the current Plan UI lacks a **spatial design substrate** —
a canvas where stewards can place proposed paddocks, ponds, structures, paths,
etc. and see them rendered as labelled features.

The Permaculture Scholar synthesis already in the wiki
([atlas-sidebar-permaculture.md](../concepts/atlas-sidebar-permaculture.md),
[permaculture-alignment.md](../concepts/permaculture-alignment.md)) flagged
several P0 gaps that this redesign addresses directly: a temporal slider for
Yeomans-ordered phasing, and clearer separation between *measured present*
(Observe annotations) and *proposed future* (design elements).

## Decision

Add a new **Vision-Layout canvas** surface alongside the existing module rail.
Surface is selected via a top `PlanPhaseTabs` strip with five tabs:

- `Current Land` — legacy module-driven view (PlanTools + DiagnoseMap +
  MapToolbar + ObserveAnnotationLayers, PlanModuleBar bottom).
- `Vision Layout` — design canvas, all phases visible, all elements editable.
- `Year 1` (`phase-1`) — Yeomans-capped at `water` (climate → landshape → water).
- `Year 5` (`phase-2`) — Yeomans-capped at `buildings`.
- `3D Terrain` — placeholder, disabled in v1.

### Key sub-decisions

1. **Additive, not a replacement.** The 18 plan-card modules remain reachable
   via `Current Land` and the `PlanChecklistAside` rail. Design elements live
   in their own persisted store (`useDesignElementsStore`), separate from
   `siteAnnotationsStore`, to preserve the diagnose-before-design ordering the
   Scholar emphasised.

2. **Yeomans Scale of Permanence drives phasing.** The `PhaseKey` enum
   (`climate | landshape | water | access | trees | buildings | subdivision |
   soil`) is canonical; phase tabs use practitioner-friendly labels behind it.

3. **Reuse `useMapboxDrawTool`.** A thin wrapper
   `useDesignElementDrawTool` writes to the design store on completion,
   computes acres via turf for polygons, and assigns sequential A/B/C labels
   per element kind. No fork of the draw pipeline.

4. **Categorised palette is Yeomans-ordered, not alphabetical.** Water and
   Access first; Structures and Amenity later. Surfaces the design sequence
   in the IA itself.

5. **One source of truth for basemap + matrix toggles.** The new
   `BaseMapCard` reuses `useBasemapStore` and `useMatrixTogglesStore` so the
   Plan and Observe stages stay in sync.

## Consequences

- New files under `apps/web/src/v3/plan/canvas/` (palette, tabs, tool rail,
  basemap card, vision canvas, layers, draw hook, element catalog) plus
  `apps/web/src/store/designElementsStore.ts`.
- `PlanLayout.tsx` gains an `activeView` state and conditionally swaps
  `leftRail` (palette vs PlanTools), `canvas` (VisionLayoutCanvas vs the
  legacy DiagnoseMap composition), and hides `bottomTray` while on the
  canvas surface.
- The Yeomans phase ordering becomes a visible, user-facing concept
  (closes part of [2026-04-28-temporal-slider-succession-modeling.md](2026-04-28-temporal-slider-succession-modeling.md)).
- Deferred to follow-ups: 3D Terrain rendering, Select/Pan/Duplicate
  affordances on the tool rail, custom-element upload, live acreage recompute
  on vertex edit, needs/yields dependency graph (separate ADR), and
  consolidating legacy `apps/web/src/features/plan/` cards.

## References

- Approved plan: `~/.claude/plans/plan-page-and-design-cached-nebula.md`
- [permaculture-alignment.md](../concepts/permaculture-alignment.md)
- [atlas-sidebar-permaculture.md](../concepts/atlas-sidebar-permaculture.md)
- [2026-04-28-temporal-slider-succession-modeling.md](2026-04-28-temporal-slider-succession-modeling.md)
- [2026-04-28-needs-yields-dependency-graph.md](2026-04-28-needs-yields-dependency-graph.md)
