# 2026-05-24 — B4 follow-up: per-host canopy-union visualization layer

**Branch.** `feat/atlas-permaculture`. Closes the "Polygon canopy-union
visualisation" still-deferred bullet on the
[2026-05-23 ADR](../decisions/2026-05-23-atlas-b4-guild-member-map-layer-drag.md).
Full design context in
[2026-05-24 ADR](../decisions/2026-05-24-atlas-b4-host-canopy-union-viz.md).

**What changed.**

- [apps/web/src/features/agroforestry/guildLivestockMath.ts](../../apps/web/src/features/agroforestry/guildLivestockMath.ts):
  `hostCanopyUnion` is now `export`-ed and its return shape is
  extended additively from
  `{ unionAreaM2, rawSumM2 } | null` to
  `{ unionAreaM2, rawSumM2, unionGeometry: GeoJSON.Polygon |
  GeoJSON.MultiPolygon } | null`. `turf.union` already produced the
  geometry inside the function; the previous version called
  `turf.area(merged)` and discarded the rest. The new field returns
  `merged.geometry` directly — no additional geometry work. The
  `null` case is unchanged (no guild center / no resolvable canopy
  radius). Existing call site `computeSilvopastureIntegration`
  destructures only `unionAreaM2` + `rawSumM2`; the new field rides
  along unused at the math layer.
- [apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts):
  3 new tests in a `hostCanopyUnion — return geometry shape + area
  parity` describe block: (a) returns a `Polygon` or `MultiPolygon`
  for an overlapping pair, (b) `turf.area(unionGeometry) ≈
  unionAreaM2` to 4 decimal places (proves the returned geometry is
  the same one the area was measured from), (c) single-disk case
  returns `Polygon`. Suite grew 60 → 63.
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
  one new GeoJSON source `guild-host-canopy-union` built inside the
  existing FC-build `useMemo` alongside `memberPointFC` /
  `memberCanopyFC`. Per project, enumerates hosts via
  `resolveSilvopastureHosts(projectId, cropAreas,
  designElementsForProject)`, for each host calls
  `resolveMembers(host, {...}, hosts)` to get the guilds (same
  pin + spatial-overlap logic that `computeSilvopastureIntegration`
  uses, so the visible halo matches the `canopyDedupedM2` number on
  `SilvopastureIntegrationCard`), passes them to `hostCanopyUnion`,
  and emits one Feature per host carrying `unionGeometry` with
  properties `{ kind: 'host-canopy-union', hostId, unionAreaM2 }`.
  Two new layers, both `minzoom: 17`, **inserted before**
  `guild-member-canopy-fill` so individual disks paint on top:
  `guild-host-canopy-union-fill` (`fill-color: '#a8a8a8'`,
  `fill-opacity: 0.15`) and `guild-host-canopy-union-line`
  (`line-color: '#5a5a5a'`, `line-opacity: 0.40`, `line-width:
  1.25`). `useDesignElementsForProject(projectId)` added at the top
  of the component so the FC-builder's dep array tracks
  design-element changes reactively (the popover's existing
  imperative `getDesignElementsForProject` getter is left alone for
  that specific call site).
- [wiki/decisions/2026-05-24-atlas-b4-host-canopy-union-viz.md](../decisions/2026-05-24-atlas-b4-host-canopy-union-viz.md)
  (NEW): ADR with context, decision (return-shape extension,
  per-host iteration via `resolveSilvopastureHosts` +
  `resolveMembers`, neutral-grey halo beneath members, minzoom 17,
  no selection/drag wiring), consequences (the math now exposes
  geometry to one new consumer; future slices needing the union
  footprint should read the same field rather than recomputing),
  and out-of-scope.
- [wiki/decisions/2026-05-23-atlas-b4-guild-member-map-layer-drag.md](../decisions/2026-05-23-atlas-b4-guild-member-map-layer-drag.md):
  "Polygon canopy-union visualisation" still-deferred bullet flipped
  to closed and linked to the new ADR (both in Consequences and
  Out-of-scope).

**Why neutral grey, not LAYER_TINT.** The union is a *per-host*
aggregate — it spans whatever guilds happen to live on the
silvopasture polygon, regardless of which canopy layer (canopy /
sub-canopy / shrub) each member belongs to. Tinting the halo by
layer would mislead the eye into reading the geometry as
layer-specific. Neutral grey at low opacity (15 % fill, 40 % line)
sits behind the individually layer-tinted member disks and reads as
"aggregate footprint" without competing for hue.

**Why beneath the members.** The members render on top so each disk
stays individually readable; the union appears as a soft grey halo
around the cluster. Stewards continue to see and drag individual
canopies — the halo only contextualises what `canopyDedupedM2` on
`SilvopastureIntegrationCard` measures geometrically.

**Geometry covenant — the math now exposes geometry.** Until this
slice, `hostCanopyUnion`'s geometry was internal to the math. With
the additive return-shape extension, one new consumer
(`PlanDataLayers`) reads `unionGeometry`. Future slices that need
the union footprint (e.g., a union-area label, an export overlay)
should read the same field rather than recomputing — the math is
the authoritative source.

**Verification.**
- `npx vitest run src/features/agroforestry` — 63/63 green
  (60 prior + 3 new geometry-shape / area-parity tests).
- `npx tsc --noEmit` — zero new errors on touched files (pre-existing
  `@ogden/shared/*` workspace-resolution errors, `precedesAuto` Zod
  errors from B5.2.x.c, and the `PlanSelectionFloater` `guild-member`
  Record gap from the 2026-05-23 slice all confirmed unrelated).

**Out of scope.** Toggle UI to show/hide the union layer (always-on
at zoom 17+ for now); per-host hover tooltip / popover surfacing
`unionAreaM2` + dedup delta; union-area as a polygon-centroid label;
multi-host map overlap when two hosts themselves overlap
(`resolveSilvopastureHosts` is structured to prevent this; if it
ever produces overlapping hosts, two unions in the same pixel just
compound opacity); light/dark mode theming; ring-radius
ground-truthing, snap-to-other-member, multi-select drag, z-order
between members and other Plan kinds, member-catalog edit via map
popover — all stay deferred.
