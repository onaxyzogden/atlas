# 2026-05-23 — B4 follow-up: per-member map-layer rendering + drag

**Status.** Implemented on `feat/atlas-permaculture`. Closes the
"Map-layer drag" follow-up from
[2026-05-22 ADR](2026-05-22-atlas-b4-guild-member-drag-to-place.md).

## Context

The 2026-05-22 slice shipped drag-to-place inside the SVG
`GuildRingsCanvas` — the in-card surface lets the steward compose
member positions, but the map in
[PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
still rendered each guild as a single centroid point. There was no way
to see member positions on the parcel and no way to grab one to nudge
it where it actually wanted to live in the landscape.

The 2026-05-21 canopy-union-dedup ADR
([2026-05-21-atlas-b4-canopy-union-dedup.md](2026-05-21-atlas-b4-canopy-union-dedup.md))
explicitly carved this out as the next slice; the math already
consumes member positions via `assignRingPositions(members)` and the
forward `metresToLonLatOffset`. What was missing was the **inverse**
arithmetic — the load-bearing piece for writing back to
`GuildMember.position` from an absolute-lon/lat drag delta.

## Decision

### Inverse helper — `lonLatToMetresOffset`

[apps/web/src/features/agroforestry/guildMemberPositions.ts](../../apps/web/src/features/agroforestry/guildMemberPositions.ts)
gains `lonLatToMetresOffset(dLon, dLat, originLat): [eastM, northM]`,
the algebraic dual of the existing `metresToLonLatOffset`. Same
flat-earth approximation, same `M_PER_DEG_LAT = 110_540` /
`M_PER_DEG_LON_EQUATOR = 111_320` constants. Round-trips at canopy
radii inside 1 mm at four latitudes (equator, 60°, 45°, -30°).

### Selection-store extension — `'guild-member'` kind

[apps/web/src/store/planSelectionStore.ts](../../apps/web/src/store/planSelectionStore.ts)
adds `'guild-member'` to `PlanSelectionKind` and an optional
`memberIndex?: number` to `PlanSelectionItem`. `sameItem` compares
`kind + id + memberIndex` so two member dots inside the same guild
remain distinguishable.

### Map sources + layers — `minzoom: 17`

Two new sources on the existing `plan-data-*` source prefix:

- `plan-data-guild-member-point` — one Point feature per `(guild,
  member)` where `Guild.center` is defined. Coordinates are
  `Guild.center + metresToLonLatOffset(eastM, northM, centerLat)`
  where `[eastM, northM] = assignRingPositions(members)[i]` (explicit
  `position` wins; ring-derived otherwise). Properties carry
  `kind: 'guild-member'`, `guildId`, `memberIndex`, `color`
  (= `LAYER_TINT[layer]`), `layer`, `speciesId`, `label`.
- `plan-data-guild-member-canopy` — one Polygon feature per member
  whose species has a resolvable `canopySpreadM`. Built via
  `turf.circle([lng, lat], canopySpreadM / 2, { units: 'meters',
  steps: 32 })` — same 32-step polygon `hostCanopyUnion` uses, so the
  rendered disk and the union-math disk agree pixel-for-pixel at
  rasterisation noise.

Three layers — both canopy layers and the point layer share
`minzoom: 17`:

- `plan-data-guild-member-canopy-fill` — `fill-color = ['get',
  'color']`, `fill-opacity: 0.10`.
- `plan-data-guild-member-canopy-line` — same colour, opacity 0.30,
  width 1 px.
- `plan-data-guild-member-point` — circle radius 5, layer-tinted fill,
  selection-aware stroke (yellow `#ffd166` + 3 px when the matching
  `selectedMemberKey` is set, dark `#1f1d1a` + 1.5 px otherwise).

Below zoom 17 the parcel is too small for member dots to read; the
guild centroid (rendered on the existing `plan-data-point` layer)
remains the abstraction. At zoom ≥ 17 the centroid and the members
both render — the centroid still drives guild-level selection + drag.

### Drag handler — mirror of the guild-centroid block

A new `useEffect` block in `PlanDataLayers.tsx`, mirroring the
guild-centroid block's structure verbatim:

- `mouseenter` → `setCursorIntent('move')`.
- `mousedown` → set selection `{ kind: 'guild-member', id: guildId,
  memberIndex }`; capture `{ guildId, memberIndex, startX, startY,
  startLng, startLat, centerLat, origPosition, hadExplicitOrig }`;
  `beginDragUndoWindow(usePolycultureStore)`.
- `mousemove` past `DRAG_THRESHOLD_PX = 4` → `map.dragPan.disable()`;
  compute `[dEastM, dNorthM] = lonLatToMetresOffset(eventLng -
  startLng, eventLat - startLat, centerLat)`; commit
  `updateGuild(guildId, { members: ... position: [origEast + dEastM,
  origNorth + dNorthM] })`.
- `mouseup` → if drag, `undoWindow.commit(undo, redo)`. The undo
  branch is asymmetric: if the member had an *explicit* `position`
  pre-drag, restore that position; if it was ring-derived, **strip**
  the `position` field so the next render re-derives the same slot.
  This keeps zundo history honest for the "first drag of a previously
  unpositioned member" case — the undoable atom is "the dot was on
  the ring" rather than "the dot was at the computed ring slot, then
  position was written, then position was restored to the same slot."

### Click-without-drag popover

When `mouseup` fires without crossing the drag threshold, an inline
form opens at the click `lngLat`. The form has no editable fields —
only two `customActions`:

- **Snap to ring** — strips the member's `position` so the ring
  positioner takes over. No-op when the member had no explicit
  position (the action stays visible for shape consistency with the
  in-card chevron; clicking it just closes).
- **Remove from guild** — `window.confirm(...)`, then filters the
  member out of `Guild.members[]`.

Mirrors the in-card chevron's snap semantics and the existing
click-to-remove behaviour on `GuildRingsCanvas`.

### Background-click selection clearing

`SELECTABLE_LAYERS` in the existing background-click handler gains
`plan-data-guild-member-point` so a click on a member dot doesn't
trip the "click hit no selectable layer → clear selection" branch
between `mousedown` (which sets the selection) and `click` (which
would otherwise clear it).

## Consequences

**Newly closed (was open on 2026-05-22):**
- Map-layer per-member rendering + drag.

**Coordinate-system contract — two halves.** The covenant now spans
both surfaces: `PX_PER_METRE = 18` (in-card SVG, from the 2026-05-22
ADR) and `lonLatToMetresOffset` (map layer, this slice) are the two
coordinate-system halves of the same `GuildMember.position` field.
Future per-member styling or catalog work should not introduce a
third — anything new that touches member geometry must reconcile via
one of these two helpers.

**Per-rasterisation noise.** Canopy disks render via the same
32-step polygon `hostCanopyUnion` uses, undershooting π·r² by ~0.6 %.
At zoom 17–20 this is sub-pixel; not a visible artifact.

**Still deferred (own slices):**
- Multi-select / batch drag of multiple members at once.
- Snap-to-other-member / snap-to-grid alignment helpers.
- Polygon canopy-union visualisation (drawing the `turf.union`
  result as a separate layer) — today's slice draws each member's
  disk individually; visual overlap conveys union to the eye without
  needing a dedicated geometry layer.
- Member catalog edit on map (changing species via the popover).
- Layer ring-radius ground-truthing against extension-service
  plant-spacing guidance.
- Z-order between members and other Plan kinds (water nodes,
  fertility infra). Default Mapbox source-order is acceptable;
  revisit if reports of mis-click confusion surface.

## Covenant (non-financial / ecological only)

Presentation + drag-write slice. No riba / gharar / CSRA / salam /
investor / financing / cost-of-capital framing in any new file. The
new layer paints a spatial field on an ecological data model;
nothing here touches MTC capital channels or yield-share framing.

## Out of scope

- Multi-select / batch drag.
- Snap-to-other-member / snap-to-grid.
- Catalog edit via map popover (stays in the in-card surface).
- Polygon canopy-union visualisation.
- Ring-radius ground-truthing.
- Z-order between members and other Plan kinds.

## Verification

- `npx vitest run src/features/agroforestry
  src/v3/plan/layers/__tests__/memberDragMath.test.ts
  src/v3/plan/cards/plant-systems` — 87/87 green
  (60 agroforestry incl. 4 new inverse + 6 new map-math + 21 in-card).
- `npx tsc --noEmit` — zero new errors on touched files (pre-existing
  `@ogden/shared/*` workspace-resolution errors unrelated).

## Files

**New (2):**
- [apps/web/src/v3/plan/layers/__tests__/memberDragMath.test.ts](../../apps/web/src/v3/plan/layers/__tests__/memberDragMath.test.ts)
- [wiki/decisions/2026-05-23-atlas-b4-guild-member-map-layer-drag.md](2026-05-23-atlas-b4-guild-member-map-layer-drag.md) (this ADR)

**Edited (4):**
- [apps/web/src/features/agroforestry/guildMemberPositions.ts](../../apps/web/src/features/agroforestry/guildMemberPositions.ts)
  — `lonLatToMetresOffset` inverse helper.
- [apps/web/src/features/agroforestry/__tests__/guildMemberPositions.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildMemberPositions.test.ts)
  — 4 round-trip tests for the inverse.
- [apps/web/src/store/planSelectionStore.ts](../../apps/web/src/store/planSelectionStore.ts)
  — `'guild-member'` kind + optional `memberIndex`; `sameItem`
  comparison extended.
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — per-member point + canopy sources, three new layers gated at
  `minzoom: 17`, drag handler block, click-without-drag popover.
- [wiki/decisions/2026-05-22-atlas-b4-guild-member-drag-to-place.md](2026-05-22-atlas-b4-guild-member-drag-to-place.md)
  — flip "Map-layer drag" still-deferred bullet to closed; link this ADR.

## References

- [2026-05-22 — drag-to-place GuildMember.position on GuildRingsCanvas](2026-05-22-atlas-b4-guild-member-drag-to-place.md) (in-card drag, parent slice)
- [2026-05-21 — canopy union dedup + GuildMember positions](2026-05-21-atlas-b4-canopy-union-dedup.md) (data-model carve-out)
- [2026-05-19 — B4 guild ↔ livestock ↔ silvopasture integration](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md) (root B4 ADR)
