# 2026-05-22 — B4 follow-up: drag-to-place GuildMember.position on GuildRingsCanvas

**Branch.** `feat/atlas-permaculture`. Closes the "drag-to-place
member positioning UI" newly-unblocked follow-up from the
[2026-05-21 canopy-union-dedup ADR](../decisions/2026-05-21-atlas-b4-canopy-union-dedup.md).
Full design context in
[2026-05-22 ADR](../decisions/2026-05-22-atlas-b4-guild-member-drag-to-place.md).

**What changed.**

- [apps/web/src/v3/plan/cards/plant-systems/GuildRingsCanvas.tsx](../../apps/web/src/v3/plan/cards/plant-systems/GuildRingsCanvas.tsx):
  exports a new `PX_PER_METRE = 18` constant plus three pure helpers
  (`svgToMetres`, `metresToSvg`, `isDrag`) — single source of truth
  for the canvas's pixel↔metre scale. Ring-band radii switched from
  the legacy `FIRST_RING_R + ringIdx * RING_SPACING` to
  `ringRadiusForLayer(layer) * PX_PER_METRE`, so the canvas is honest
  in metres throughout (sub_canopy 108 px, shrub 72, vine 54,
  herbaceous 45, ground_cover 27, root 9). Members render from
  `assignRingPositions(members)` rather than ring-index + slot-angle.
  Anchor reordered to draw **before** members (so inner-ring leaves
  sit on top) and shrunk from `r = 46` to `r = 30`; layer labels
  clamp to `MIN_LABEL_R = ANCHOR_R + 20`. New pointer-event drag
  handlers on the member `<g>` wrappers using
  `setPointerCapture` + `DRAG_THRESHOLD_PX = 4` (matching the
  house-style guild-centroid drag); pointer-up converts the cursor's
  SVG-user coords via `svg.createSVGPoint() +
  svg.getScreenCTM().inverse()` and calls a new
  `onMemberDrag(index, [east, north])` prop. A small chevron disc
  renders on positioned members when `onMemberSnap` is supplied —
  click strips `position` on that one member.
- [apps/web/src/v3/plan/cards/plant-systems/GuildSpatialBuilderCard.tsx](../../apps/web/src/v3/plan/cards/plant-systems/GuildSpatialBuilderCard.tsx):
  new `moveMember(index, position)`, `snapMember(index)`, and
  `snapAllToRings()` handlers, all writing through `updateGuild`
  (zundo captures each as an undo step automatically). New `Snap all
  to rings` button in the active-guild control row, disabled when no
  member carries `position`.
- [apps/web/src/v3/plan/cards/plant-systems/__tests__/GuildRingsCanvas.dragMath.test.ts](../../apps/web/src/v3/plan/cards/plant-systems/__tests__/GuildRingsCanvas.dragMath.test.ts)
  (NEW): 9 pure-math tests — `svgToMetres(CX, CY) = [0, 0]`, one-step
  east + one-step-up north → `[1, 1]`, y-flip preservation,
  `metresToSvg` ↔ `svgToMetres` round-trips on five paired samples
  and SVG-space round-trips on three paired samples, `isDrag`
  threshold behaviour (origin → false, exact threshold → false, past
  threshold → true, 3-4-5 Euclidean → true, 2-2 → false).
- [wiki/decisions/2026-05-22-atlas-b4-guild-member-drag-to-place.md](../decisions/2026-05-22-atlas-b4-guild-member-drag-to-place.md)
  (NEW): ADR — context (data model shipped 2026-05-21 but no UI
  wrote it), decision (in-card SVG drag with
  `PX_PER_METRE = 18` as coordinate-system contract; per-member +
  per-guild reset affordances), consequences (map-layer drag
  remains deferred; the canvas's scale is the contract any future
  map slice must reconcile with), out-of-scope (map-layer drag,
  snap-to-other-member, multi-select).
- [wiki/decisions/2026-05-21-atlas-b4-canopy-union-dedup.md](../decisions/2026-05-21-atlas-b4-canopy-union-dedup.md):
  "drag-to-place member positioning UI" bullet under
  *Consequences → Newly unblocked* flipped to closed and linked to
  the new ADR.

**Why in-card SVG and not map-layer.** Members are visualised inside
`GuildRingsCanvas` today; guilds render as a single centroid point on
the map. Wiring per-member MapboxGL sources, selection, and inverse
`metresToLonLatOffset` arithmetic is its own slice. The in-card
surface reuses the existing member `<g>` wrappers, the established
house-style pointer-event pattern (no dnd-kit anywhere in the
codebase), and the immediate-write zustand semantics that all other
guild edits already follow.

**Verification.**
- `npx vitest run src/v3/plan/cards/plant-systems/__tests__/GuildRingsCanvas.dragMath.test.ts`
  — 9/9 green.
- `npx vitest run src/features/agroforestry` — 56/56 still green
  (the math suite locked down by the 2026-05-21 slice is untouched).
- `npx tsc --noEmit` against `apps/web` — no new errors on touched
  files (pre-existing `@ogden/shared/*` workspace-resolution errors
  unrelated to this slice).

**Out of scope.** Map-layer drag (per-member MapboxGL source + layer
with absolute-lon/lat drag and inverse `metresToLonLatOffset`
arithmetic); snap-to-other-member / snap-to-grid; multi-select /
batch drag; in-canvas overlap badge (the
[SilvopastureIntegrationCard](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx)
already surfaces `canopyDedupedM2`); layer ring-radius
ground-truthing; pointer-event test harness (codebase has no
precedent).
