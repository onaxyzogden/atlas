# 2026-05-23 — B4 follow-up: per-member map-layer rendering + drag

**Branch.** `feat/atlas-permaculture`. Closes the "Map-layer drag"
still-deferred bullet on the
[2026-05-22 ADR](../decisions/2026-05-22-atlas-b4-guild-member-drag-to-place.md).
Full design context in
[2026-05-23 ADR](../decisions/2026-05-23-atlas-b4-guild-member-map-layer-drag.md).

**What changed.**

- [apps/web/src/features/agroforestry/guildMemberPositions.ts](../../apps/web/src/features/agroforestry/guildMemberPositions.ts):
  new `lonLatToMetresOffset(dLon, dLat, originLat): [eastM, northM]`
  inverse of the existing `metresToLonLatOffset`. Same flat-earth
  approximation, same `M_PER_DEG_LAT = 110_540` /
  `M_PER_DEG_LON_EQUATOR = 111_320` constants. Load-bearing piece for
  writing back to `GuildMember.position` from an absolute-lon/lat
  drag delta.
- [apps/web/src/features/agroforestry/__tests__/guildMemberPositions.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildMemberPositions.test.ts):
  4 new tests asserting round-trips with the forward helper at lat 0,
  60°, -45°, and origin. Suite grew 10 → 14.
- [apps/web/src/store/planSelectionStore.ts](../../apps/web/src/store/planSelectionStore.ts):
  `PlanSelectionKind` gains `'guild-member'`; `PlanSelectionItem`
  gains optional `memberIndex?: number`. `sameItem` extended to
  compare `kind + id + memberIndex` so two member dots inside the
  same guild remain distinguishable.
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
  two new GeoJSON sources (`plan-data-guild-member-point` +
  `plan-data-guild-member-canopy`) built inside the existing FC-build
  `useMemo`. Per `(guild, member)` where `Guild.center` is set, emits
  one Point at `Guild.center + metresToLonLatOffset(eastM, northM,
  centerLat)` and (when the species has `canopySpreadM`) one
  32-step `turf.circle` Polygon. Three new layers gated at
  `minzoom: 17`: canopy-fill (`fill-opacity: 0.10`), canopy-line
  (`opacity: 0.30`), and member-point (radius 5, selection-aware
  stroke that highlights yellow when the matching
  `selectedMemberKey = '${guildId}:${memberIndex}'` is selected).
  New `useEffect` block mirroring the guild-centroid drag block
  verbatim: `mousedown` sets selection + captures
  `origPosition` from `assignRingPositions(members)[i]` and
  `hadExplicitOrig = member.position !== undefined`; `mousemove`
  past 4 px crosses into drag mode (disables dragPan); commits via
  `updateGuild(guildId, { members: ... position: [origEast +
  lonLatToMetresOffset(dLng, dLat, centerLat)] })`; `mouseup`
  commits the asymmetric undo step — restore explicit position if
  one existed pre-drag, otherwise strip the `position` field on
  undo. Click-without-drag opens an inline-form popover anchored at
  the click `lngLat` with no editable fields, only two
  `customActions`: **Snap to ring** (strips `position`) and
  **Remove from guild** (`window.confirm` then filter the member
  out of `Guild.members[]`). Background-click selectable-layers
  list extended to include `plan-data-guild-member-point` so the
  click after a member mousedown doesn't immediately clear the
  selection it just set.
- [apps/web/src/v3/plan/layers/__tests__/memberDragMath.test.ts](../../apps/web/src/v3/plan/layers/__tests__/memberDragMath.test.ts)
  (NEW): 6 pure-math tests — `lonLatToMetresOffset(0, 0, 0) = [0,
  0]`; round-trips with `metresToLonLatOffset` at lat 0, 45°, 60°,
  -30° (3 metric samples each, sub-mm tolerance); absolute-lon/lat
  → guild-local-metres conversion from a fixed `Guild.center` of
  `[-95, 40]` recovers `[3, 4]` to sub-mm.
- [wiki/decisions/2026-05-23-atlas-b4-guild-member-map-layer-drag.md](../decisions/2026-05-23-atlas-b4-guild-member-map-layer-drag.md)
  (NEW): ADR with context, decision, consequences, and the
  coordinate-system-covenant note documenting that
  `PX_PER_METRE = 18` (in-card) and `lonLatToMetresOffset` (map) are
  the two halves of the same `GuildMember.position` field.
- [wiki/decisions/2026-05-22-atlas-b4-guild-member-drag-to-place.md](../decisions/2026-05-22-atlas-b4-guild-member-drag-to-place.md):
  "Map-layer drag" still-deferred bullet flipped to closed and linked
  to the new ADR.

**Why the asymmetric undo branch.** A member dragged for the first
time crosses from "no `position` field, render via the ring
positioner" to "explicit `position`, render at the dragged coords."
A symmetric undo that just writes back `origPosition` would create
an explicit field that the next render would honour — the dot would
sit at exactly the ring slot but stop participating in the
auto-positioner if other members later joined the same layer. So
the undo branch instead **strips** `position` for previously
ring-derived members, restoring the pre-drag invariant that
"position is undefined and the layout follows from `assignRingPositions`."

**Why minzoom 17.** Below 17 the parcel envelope is small enough that
member dots cluster too tightly to distinguish — the steward would
mis-click. The guild centroid on the existing `plan-data-point`
layer remains the right abstraction at lower zoom; at 17+ both layers
render and the centroid still drives guild-level drag/edit.

**Verification.**
- `npx vitest run src/features/agroforestry
  src/v3/plan/layers/__tests__/memberDragMath.test.ts
  src/v3/plan/cards/plant-systems` — 87/87 green (60
  agroforestry incl. 4 new inverse + 6 new map-math + 21 in-card).
- `npx tsc --noEmit` — zero new errors on touched files (pre-existing
  `@ogden/shared/*` workspace-resolution errors unrelated).

**Out of scope.** Multi-select / batch drag; snap-to-other-member /
snap-to-grid; member catalog edit via popover (stays in-card);
polygon canopy-union visualisation (each member's disk is drawn
individually — visual overlap conveys union); ring-radius
ground-truthing against extension-service guidance; z-order between
members and other Plan kinds.
