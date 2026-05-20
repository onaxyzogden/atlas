# 2026-05-22 — B4 follow-up: drag-to-place GuildMember.position on GuildRingsCanvas

**Status.** Implemented on `feat/atlas-permaculture`. Closes the
"drag-to-place member positioning UI" newly-unblocked follow-up from
[2026-05-21 canopy-union-dedup ADR](2026-05-21-atlas-b4-canopy-union-dedup.md).

## Context

The 2026-05-21 slice shipped the data-model carve-out
(`GuildMember.position?: [number, number]`, guild-local metres
`[east, north]` from `Guild.center`) and rebuilt `hostCanopyUnion` on
top of it. But no UI wrote the field — every member rendered at its
ring-derived slot, and `hostCanopyUnion` always saw
`position === undefined`. The math could do real `turf.union`
overlap dedup; the steward had no surface to *make* members overlap.

This slice closes the gap with **drag-to-place** on the SVG leaf
glyphs of
[GuildRingsCanvas.tsx](../../apps/web/src/v3/plan/cards/plant-systems/GuildRingsCanvas.tsx),
plus per-member and per-guild reset affordances.

## Decision

### Surface — in-card SVG (deferring map-layer drag)

Members are visualised inside `GuildRingsCanvas` today; that surface
already owns the layer-aware composition flow (anchor at centre,
rings below, click-to-add). Adding pointer-event drag here reuses the
canvas's existing `<g className="grc-member">` wrappers and the
house-style raw `pointerdown / setPointerCapture / pointermove /
pointerup` pattern (same as the guild-centroid drag on
[PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)).
**No dnd-kit anywhere in the codebase — not introduced here either.**

Per-member MapboxGL rendering with absolute-lon/lat drag remains
out-of-scope: guilds currently render as a single centroid point on
the map, and the inverse-offset arithmetic
(`absoluteLonLat → Guild.center + position`) needs its own slice
once per-member rendering exists.

### Coordinate-system source of truth — `PX_PER_METRE = 18`

The canvas adopts the canonical metric ring radii from
[guildMemberPositions.ts](../../apps/web/src/features/agroforestry/guildMemberPositions.ts).
A new exported constant `PX_PER_METRE = 18` drives both:

- ring-band radii: `ringRadiusForLayer(layer) * PX_PER_METRE` (so
  sub_canopy renders at 108 px, shrub 72, vine 54, herbaceous 45,
  ground_cover 27, root 9), and
- the drag delta-to-metres conversion via the new pure helpers
  `svgToMetres(x, y) = [(x − CX)/PX_PER_METRE, (CY − y)/PX_PER_METRE]`
  and `metresToSvg(east, north) = [CX + east·s, CY − north·s]`.

The y-flip is load-bearing: SVG y grows downward, metric north grows
upward. Tests pin the flip with `metresToSvg(0, 3)` lying above the
centre rather than below it.

Anchor disc shrunk from `r = 46` to `r = 30` so the new inner rings
(root at 9 px) sit visibly outside the disc. Layer labels clamp to
`MIN_LABEL_R = ANCHOR_R + 20` so labels for inner rings don't collide
with the anchor. Anchor draws **before** members so inner-ring leaves
sit on top.

### Drag handlers

The leaf-glyph `<g>` wrappers receive pointer-event handlers when
`onMemberDrag` is supplied:

- `onPointerDown`: `setPointerCapture(pointerId)`, record
  `{ index, startClientX, startClientY, previewSvg: null }`.
- `onPointerMove`: once `Math.hypot(dx, dy) > DRAG_THRESHOLD_PX` (4 px,
  matching the existing house constant), convert the cursor's client
  coords to SVG-user space via `svg.createSVGPoint() +
  svg.getScreenCTM().inverse()`, update the transient preview.
- `onPointerUp` / `onPointerCancel`: if the threshold was crossed,
  `onMemberDrag(index, svgToMetres(x, y))`; otherwise treat as a
  click and call the existing `onClickMember(index)` (preserves
  click-to-remove).

While dragging, the leaf glyph's stroke brightens (`1 → rgba(255,
255,255,1)` and `1.25 → 2`) so the steward sees the active member.

### Write semantics — immediate, undoable

`GuildSpatialBuilderCard.moveMember(index, position)` maps the
members array, spreads the entry, and calls `updateGuild` — same
shape as the existing `addMember`. The zundo `temporal` middleware on
[polycultureStore.ts](../../apps/web/src/store/polycultureStore.ts)
captures each drag as an undoable step automatically; no manual undo
wrapper.

### Reset affordances

Two granularities, both clearing `position` so the auto-positioner
takes over:

- **Per-member.** A small chevron (8 px disc + ⤴ glyph) renders on
  members with an explicit `position` when `onMemberSnap` is
  supplied. Click → `snapMember(index)` strips just that one
  member's `position`. `e.stopPropagation()` so the click doesn't
  also fire the leaf's pointer-up branch.
- **Per-guild.** A `Snap all to rings` button in the active-guild
  control panel calls `snapAllToRings()`, mapping every member
  through `({ position: _drop, ...rest })`. Disabled when no member
  carries `position`.

## Consequences

**Newly closed (was open on 2026-05-21):**
- Drag-to-place member positioning UI — shipped.

**Newly closed 2026-05-23:**
- ~~Map-layer drag (per-member MapboxGL source + layer with
  absolute-lon/lat drag and inverse `metresToLonLatOffset`
  arithmetic).~~ — shipped via
  [2026-05-23 ADR](2026-05-23-atlas-b4-guild-member-map-layer-drag.md):
  per-member point + canopy-disk layers gated at `minzoom: 17` on
  PlanDataLayers, drag handler block mirroring the guild-centroid
  pattern, click-without-drag popover with Snap-to-ring + Remove
  actions. The inverse helper `lonLatToMetresOffset` is the
  load-bearing piece.

**Still deferred (own slices):**
- Layer ring-radius ground-truthing against extension-service
  plant-spacing guidance.
- Snap-to-other-member / snap-to-grid alignment helpers.
- Multi-select / batch drag.
- In-canvas overlap badge (the
  [SilvopastureIntegrationCard](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx)
  already surfaces `canopyDedupedM2`).

**Coordinate-system covenant.** `PX_PER_METRE = 18` is the canvas's
contract: any future map-layer slice must reconcile member
`[east, north]` metres with `metresToLonLatOffset(east, north,
originLat)` from `guildMemberPositions.ts` rather than re-deriving its
own scale. The two coordinate systems (parcel-relative
`Guild.centroidUv` vs guild-local `position`) remain independent.

## Covenant (non-financial / ecological only)

UX slice — no riba / gharar / CSRA / salam / investor / financing /
cost-of-capital framing introduced. The drag surface writes to a
spatial field on an ecological data model; nothing in this slice
touches MTC capital channels or yield-share framing.

## Out of scope

- Map-layer drag.
- Snap-to-other-member or snap-to-grid.
- Multi-select / batch drag.
- Visual overlap-badge in canvas.
- Layer ring-radius tuning.
- Z-order changes (per-layer `<g>` grouping preserves draw order).
- Pointer-event test harness — codebase has no precedent; pure-math
  helpers + manual verification stays the established shape.

## Verification

- `npx vitest run src/v3/plan/cards/plant-systems/__tests__/GuildRingsCanvas.dragMath.test.ts`
  — 9/9 green (`svgToMetres` / `metresToSvg` round-trip + y-flip,
  `isDrag` threshold including the 3-4-5 Euclidean case).
- `npx vitest run src/features/agroforestry` — 56/56 still green
  (no regression to the math suite the previous slice locked down).
- `npx tsc --noEmit` — no new errors against touched files
  (pre-existing `@ogden/shared/*` workspace-resolution errors
  unrelated to this slice).

## Files

**New (2):**
- [apps/web/src/v3/plan/cards/plant-systems/__tests__/GuildRingsCanvas.dragMath.test.ts](../../apps/web/src/v3/plan/cards/plant-systems/__tests__/GuildRingsCanvas.dragMath.test.ts)
- [wiki/decisions/2026-05-22-atlas-b4-guild-member-drag-to-place.md](2026-05-22-atlas-b4-guild-member-drag-to-place.md) (this ADR)

**Edited (3):**
- [apps/web/src/v3/plan/cards/plant-systems/GuildRingsCanvas.tsx](../../apps/web/src/v3/plan/cards/plant-systems/GuildRingsCanvas.tsx)
  — `PX_PER_METRE`, `svgToMetres` / `metresToSvg` / `isDrag` exports,
  ring radii from `ringRadiusForLayer`, members rendered from
  `assignRingPositions`, pointer-event drag, snap-back chevron,
  anchor reordered to draw before members.
- [apps/web/src/v3/plan/cards/plant-systems/GuildSpatialBuilderCard.tsx](../../apps/web/src/v3/plan/cards/plant-systems/GuildSpatialBuilderCard.tsx)
  — `moveMember`, `snapMember`, `snapAllToRings` handlers; `Snap all
  to rings` button.
- [wiki/decisions/2026-05-21-atlas-b4-canopy-union-dedup.md](2026-05-21-atlas-b4-canopy-union-dedup.md)
  — flip "drag-to-place" follow-up to closed; link this ADR.

## References

- [2026-05-21 — canopy union dedup + GuildMember positions](2026-05-21-atlas-b4-canopy-union-dedup.md) (parent ADR)
- [2026-05-19 — B4 guild ↔ livestock ↔ silvopasture integration](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md) (root B4 ADR)
