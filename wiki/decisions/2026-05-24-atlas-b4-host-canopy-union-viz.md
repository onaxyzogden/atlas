# 2026-05-24 — B4 follow-up: per-host canopy-union visualization layer

**Status.** Implemented on `feat/atlas-permaculture`. Closes the
"Polygon canopy-union visualisation" still-deferred bullet from
[2026-05-23 ADR](2026-05-23-atlas-b4-guild-member-map-layer-drag.md).

## Context

The 2026-05-21 slice
([2026-05-21-atlas-b4-canopy-union-dedup.md](2026-05-21-atlas-b4-canopy-union-dedup.md))
shipped real `turf.union` math: `hostCanopyUnion(guilds)` builds one
`turf.circle` per (guild, member), unions across the host, and
returns `{ unionAreaM2, rawSumM2 }` so `SilvopastureIntegrationCard`
can surface "canopy unioned across overlapping guilds — saved N m²"
via `canopyDedupedM2`. The 2026-05-23 slice
([2026-05-23-atlas-b4-guild-member-map-layer-drag.md](2026-05-23-atlas-b4-guild-member-map-layer-drag.md))
added per-member dots + individual canopy disks on the map at
`minzoom: 17`, so the steward sees each disk and can drag it — but
visual overlap is the only cue. The *unioned* footprint (the
geometry that `canopyDedupedM2` actually measures) wasn't drawn
anywhere.

The load-bearing observation: `hostCanopyUnion` already calls
`turf.union(...)` at
[guildLivestockMath.ts:158](../../apps/web/src/features/agroforestry/guildLivestockMath.ts),
assigns the merged Feature to `merged`, then **discards the
geometry** — only `turf.area(merged)` survived. Plumbing the
geometry through is the work.

## Decision

### Return-shape extension — additive

[apps/web/src/features/agroforestry/guildLivestockMath.ts](../../apps/web/src/features/agroforestry/guildLivestockMath.ts):
`hostCanopyUnion` is now `export`-ed and returns
`{ unionAreaM2, rawSumM2, unionGeometry: Polygon | MultiPolygon } |
null`. The `null` case is unchanged (no center on any guild / no
member has a resolvable `canopySpreadM`). Existing callers
(`computeSilvopastureIntegration` line 262) destructure only
`unionAreaM2` and `rawSumM2`; the new field rides along.

`turf.union` returns `Feature<Polygon | MultiPolygon>`; we return
`merged.geometry` directly without any further geometry work.

### Per-host iteration — reuse the math's membership selector

[apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
the FC-builder `useMemo` that already produces `memberPointFC` +
`memberCanopyFC` now also produces `hostCanopyUnionFC`. Per project:

- `resolveSilvopastureHosts(projectId, cropAreas,
  designElementsForProject)` enumerates hosts.
- For each host, `resolveMembers(host, {...}, hosts)` returns its
  guilds (same pin + spatial-overlap logic as
  `computeSilvopastureIntegration`).
- Each host's guild list goes through `hostCanopyUnion`; hosts with
  a non-null union emit one Feature carrying `unionGeometry` with
  properties `{ kind: 'host-canopy-union', hostId, unionAreaM2 }`.

The reactive `useDesignElementsForProject(projectId)` hook is added
at the top of the component so the dep array tracks design-element
changes (the popover's existing `getDesignElementsForProject`
imperative getter is left in place for that specific call site).

### Source + layers — neutral grey, beneath members

- New source `guild-host-canopy-union` via the existing
  `ensureSource(...)` pattern.
- Two new layers, both `minzoom: 17`, **inserted before**
  `guild-member-canopy-fill` so individual disks paint on top:
  - `guild-host-canopy-union-fill` — `fill-color: '#a8a8a8'`,
    `fill-opacity: 0.15`.
  - `guild-host-canopy-union-line` — `line-color: '#5a5a5a'`,
    `line-opacity: 0.40`, `line-width: 1.25`.

Neutral grey (not `LAYER_TINT`) because the union is a per-host
aggregate, not a per-layer geometry; layer-tinting would mislead
the eye into reading the halo as canopy-layer-specific. Members
paint on top so the disks remain legible.

### No selection / drag / popover wiring

The union layer is read-only visual context. `SELECTABLE_LAYERS`
unchanged. No hover tooltip, no click handler. The steward already
reads `unionAreaM2` numerically on `SilvopastureIntegrationCard`;
the map shows where that number lives geometrically.

## Consequences

**Newly closed (was open on 2026-05-23):**
- Polygon canopy-union visualisation.

**Geometry covenant — the math now exposes geometry.** Until this
slice, `hostCanopyUnion`'s geometry was internal to the math. With
the additive return-shape extension, one new consumer
(PlanDataLayers) reads `unionGeometry`. Future slices that need the
union footprint (e.g., a union-area label, an export overlay) should
read the same field rather than recomputing — the math is the
authoritative source.

**Per-rasterisation noise unchanged.** The same 32-step polygon
discipline from 2026-05-21 carries through; sub-pixel at zoom 17–20.

**Newly closed 2026-05-25:**
- ~~Per-host hover tooltip / popover showing `unionAreaM2`,
  `rawSumM2`, dedup delta.~~ — shipped via
  [2026-05-25 ADR](2026-05-25-atlas-b4-host-union-hover-tooltip.md):
  cursor-following floating tooltip on `guild-host-canopy-union-fill`
  (mousemove) that surfaces host name, guild + canopy-bearing-member
  counts, and the three m² values (union footprint, raw π·r² sum,
  saved overlap). Feature properties extended additively with
  `hostName`, `rawSumM2`, `guildCount`, `memberCount`; tooltip
  portalled into the map's canvas container with edge-clamp.

**Still deferred (own slices):**
- Toggle UI to show/hide the union layer (always-on at zoom 17+
  for now).
- Rendering `unionAreaM2` as a label on the polygon centroid.
- Multi-host overlap when two hosts themselves overlap on the map
  — `resolveSilvopastureHosts` is structured to avoid this, but if
  it ever produces overlapping hosts, two unions in the same pixel
  just compound opacity.
- Light/dark mode theming for the neutral grey.
- Layer ring-radius ground-truthing, snap-to-other-member,
  multi-select drag, z-order vs other Plan kinds,
  member-catalog edit via popover — all stay deferred.

## Covenant (non-financial / ecological only)

Presentation-only slice on an ecological data model. No riba /
gharar / CSRA / salam / investor / financing / cost-of-capital
framing in any new file.

## Out of scope

- Toggle UI for the union layer.
- ~~Per-host hover tooltip / popover.~~ — shipped 2026-05-25,
  see [2026-05-25 ADR](2026-05-25-atlas-b4-host-union-hover-tooltip.md).
- Union-area as a map label.
- Multi-host map overlap.
- Colour theming (light/dark mode).
- All other 2026-05-23-still-deferred follow-ups.

## Verification

- `npx vitest run src/features/agroforestry` — 63/63 green
  (60 prior + 3 new geometry-shape / area-parity tests in
  `guildLivestockMath.test.ts`).
- `npx tsc --noEmit` — zero new errors on touched files (pre-existing
  `@ogden/shared/*` workspace-resolution errors,
  `precedesAuto` Zod errors from B5.2.x.c, and the
  `PlanSelectionFloater` `guild-member` Record gap from the
  2026-05-23 slice all confirmed unrelated).

## Files

**New (2):**
- [wiki/decisions/2026-05-24-atlas-b4-host-canopy-union-viz.md](2026-05-24-atlas-b4-host-canopy-union-viz.md) (this ADR)
- [wiki/log/2026-05-24-b4-host-canopy-union-viz.md](../log/2026-05-24-b4-host-canopy-union-viz.md)

**Edited (3):**
- [apps/web/src/features/agroforestry/guildLivestockMath.ts](../../apps/web/src/features/agroforestry/guildLivestockMath.ts)
  — `hostCanopyUnion` exported; return shape extended with
  `unionGeometry`.
- [apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts)
  — 3 new tests on the geometry return shape + area parity.
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — per-host union FC accumulator; new source + fill/line layers at
  `minzoom: 17` inserted before the existing member-canopy-fill
  layer; `useDesignElementsForProject` hook added for reactive deps.
- [wiki/decisions/2026-05-23-atlas-b4-guild-member-map-layer-drag.md](2026-05-23-atlas-b4-guild-member-map-layer-drag.md)
  — flip "Polygon canopy-union visualisation" still-deferred bullet
  to closed; link this ADR.

## References

- [2026-05-23 — per-member map-layer rendering + drag](2026-05-23-atlas-b4-guild-member-map-layer-drag.md) (parent slice)
- [2026-05-21 — canopy union dedup + GuildMember positions](2026-05-21-atlas-b4-canopy-union-dedup.md) (math carve-out)
- [2026-05-19 — B4 guild ↔ livestock ↔ silvopasture integration](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md) (root B4 ADR)
