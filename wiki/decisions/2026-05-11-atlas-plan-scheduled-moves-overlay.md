# 2026-05-11 — Cross-stage Plan-map overlay for scheduled livestock moves

## Context

The Plan stage is where the steward designs paddocks and structures.
The Act stage is where they schedule and log livestock moves against
those features (`RotationScheduleCard`, Structure-moves tail in
`RotationScheduleCard.tsx`, `LivestockMoveCard.tsx`). Until this pass,
the *plan side* of the operation (unfulfilled
`ScheduledLivestockMove` rows) was invisible from the Plan-stage
map — the steward had to stage-switch to remember "this paddock has
a planned move next week."

Cross-stage surfacing closes the loop the other direction. We
already surface Plan-stage features (paddocks, structures) on the
Act-stage cards; this overlay surfaces Act-stage *plans* back onto
the Plan-stage map.

## Decision

Add a read-only map overlay layer (`PlanScheduledMovesOverlay`)
that renders one centroid badge per destination — paddock or
structure — with at least one unfulfilled `ScheduledLivestockMove`.

### Surface

Badge text format: `📅 N · YYYY-MM-DD` where `N` is the count of
unfulfilled plans for that destination and the date is the soonest
`plannedDate` across them. Rendered at:

- **Paddock destinations.** `turf.centroid(p.geometry)` of the
  paddock polygon.
- **Structure destinations.** `s.center` from the structure store
  (already a `[lng, lat]` anchor — no recompute needed).

Visibility gated on a new `scheduledMoves` boolean in
`useMatrixTogglesStore` (default off), wired through the existing
`BaseMapCard` overlay legend.

### Read-only

Editing the plan still happens on the Act-stage card. Clicking the
badge is a deferred polish — for now the overlay is purely
informational (no `mouseenter`/`click` handlers wired). This is
consistent with how `PlanZoneRingsOverlay` and `PlanSunPathOverlay`
behave: legend-toggled, decorative, non-interactive.

### Store changes

`matrixTogglesStore` v10 → v11: added `scheduledMoves: boolean`
(default false). Migrate seeds the default for any missing key so
existing stewards don't inherit an unfamiliar layer. Type union
extended; `setAll` covers the new key.

### Why a fresh toggle, not a sub-mode of `layeringLensStore`

The Layering Lens is a *recolour* lens over existing Plan features
(Yeomans rank vs enterprise tagging). The scheduled-moves overlay
adds *new* features to the map (badges at centroids), not a recolour
of existing ones. Forcing it into the lens would split lens-mode
semantics across two concerns. The matrix-toggle store already
exists for legend-driven optional overlays (`zoneRings`, `sunPath`,
`builtEnvironment`, etc.) — this is the natural home.

### Layer ordering

The overlay registers two layers on a single source:

- `plan-scheduled-moves-bg` — empty-text symbol kept as a future
  hit target for click handlers. No paint, no text.
- `plan-scheduled-moves-text` — actual badge text with halo (acts
  as the pill background visually).

Both layers honor the `scheduledMoves` toggle via
`setLayoutProperty('visibility', …)` and re-ensure on `styledata`
events so basemap swaps don't drop the source.

## Files

### Modify

- **`apps/web/src/store/matrixTogglesStore.ts`** — added
  `scheduledMoves` to the toggle union + state + initial + `setAll`
  + migrate; bumped persist version 10 → 11.
- **`apps/web/src/v3/plan/PlanLayout.tsx`** — imported the overlay
  and mounted it after `PlanSunPathOverlay` on the Current map
  branch.
- **`apps/web/src/v3/plan/canvas/BaseMapCard.tsx`** — added the
  toggle row to `DEFAULT_OVERLAYS` (swatch `#5a8a6a`).

### Create

- **`apps/web/src/v3/plan/layers/PlanScheduledMovesOverlay.tsx`** —
  new ~155-LOC overlay component; reads `scheduledLivestockMoveStore`
  + `livestockStore.paddocks` + `structureStore.structures`; groups
  unfulfilled plans by destination; emits a Point FeatureCollection;
  registers source + two layers; gated on
  `matrixTogglesStore.scheduledMoves`.

## Verification

`tsc --noEmit` clean across `apps/web`.

## Out of scope (deferred)

- **Click → popover.** A click on a badge could open a small
  read-only popover listing each unfulfilled plan
  (date · direction · species · head). Worth shipping once stewards
  report whether the count-only badge is enough signal.
- **Hover tooltip.** Same data, lighter touch. MapLibre doesn't
  ship a native tooltip primitive; reuse of the
  `InlineFeaturePopover` is overkill for read-only data — a
  thinner display-only popover is the right tool.
- **Plan-stage scheduling.** Letting the steward *create* a
  scheduled move directly from the Plan-stage map by clicking a
  paddock. Crosses the read-only line and risks scope creep — the
  Act-stage card remains the canonical create surface.
- **Other plan kinds.** No other scheduled-* stores exist yet
  (`scheduledLivestockMoveStore` is the only one). When new ones
  land (scheduled-maintenance, scheduled-fertility-pass), follow
  this same overlay pattern.
- **Per-paddock badge stacking.** When a paddock has many plans,
  the single badge collapses them all into a count. Multi-row
  callouts could surface each plan, but that's polish.
- ~~**Past-due styling.**~~ **Shipped 2026-05-11.** Each destination
  bucket now tags `pastDue = soonest < today` on the feature, and the
  `TEXT_LAYER` paint uses data-driven `case` expressions to swap the
  text colour to `#a3401d` and the halo to `#f5cbb8` when past-due —
  matching the Plan-stage warning palette. On-time plans keep the
  default warm-cream halo.

## Related

- [2026-05-10 atlas-livestock-move-event-v3](2026-05-10-atlas-livestock-move-event-v3.md) — introduced `scheduledLivestockMoveStore` and the Act-stage planned-move surfacing this overlay mirrors.
- [2026-05-11 atlas-livestock-rotate-linked-pair](2026-05-11-atlas-livestock-rotate-linked-pair.md) — same-day sibling work on the actual-events side of the rotation surface.

## Commits

- (filed at session close) — `matrixTogglesStore` v10→v11 with
  `scheduledMoves` toggle, new `PlanScheduledMovesOverlay`
  component, mount in `PlanLayout`, legend entry in `BaseMapCard`.
