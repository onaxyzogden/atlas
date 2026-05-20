# 2026-05-21 — B4 canopy union dedup + GuildMember spatial positions

**Status.** Implemented on `feat/atlas-permaculture`. Closes the last
open follow-up from
[2026-05-19 B4](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md)
("per-member spatial positions inside hosts would let us do real
`turf.union` canopy dedup instead of the envelope-cap approximation").

## Context

The B4 canopy-clip slice (2026-05-20,
[wiki/log/2026-05-20-b4-canopy-dedup-host-envelope-cap.md](../log/2026-05-20-b4-canopy-dedup-host-envelope-cap.md))
shipped an **envelope clip**: `rawCanopyM2` was bounded at
`turf.area(host.geometry)` so two or more guilds on the same
silvopasture host could no longer sum canopy footprints that physically
exceed the host polygon. That close was honest but coarse — it is a
scalar `Math.min`, not true overlap dedup. Two guilds whose canopies do
**not** actually overlap still get clipped if their summed area exceeds
the host envelope; two guilds whose canopies **do** overlap don't get
dedup credit until the sum crosses the envelope.

The original B4 ADR explicitly deferred real `turf.union` "until the
data model supports it" — i.e. until guild members carry positions
inside their host so each member's canopy disk has a location to be
unioned at. That data-model carve-out is the load-bearing part of this
slice; the math is comparatively small.

## Decision

### Data model — `GuildMember.position?: [number, number]`

[apps/web/src/store/polycultureStore.ts](../../apps/web/src/store/polycultureStore.ts)
extends `GuildMember` with an optional `position?: [number, number]`
guild-local offset in metres as `[east, north]` from `Guild.center`.
Existing rows load with `position === undefined`; the canopy-union
math then derives a deterministic ring layout from `member.layer +
index-within-layer`. Future drag-to-place UI (out of scope here) will
write the field directly.

Zustand `persist` `version: 3 → 4` with a no-op migration — undefined
`position` on a v3-persisted member is valid; the auto-positioner
fills the gap at read time.

### Ring positioner — new module

[apps/web/src/features/agroforestry/guildMemberPositions.ts](../../apps/web/src/features/agroforestry/guildMemberPositions.ts)
exports three small pure functions:

- `ringRadiusForLayer(layer)` — metres from guild center. First-pass
  radii: canopy 0 (anchor at center), sub_canopy 6, shrub 4, vine 3,
  herbaceous 2.5, ground_cover 1.5, root 0.5. Ordering (canopy
  innermost, expanding outward) is what matters; absolute numbers will
  be ground-truthed in a later slice against extension-service
  plant-spacing guidance.
- `assignRingPositions(members)` — groups by layer, distributes each
  layer evenly around a ring of `ringRadiusForLayer(layer)` (angular
  slot = `(2π · indexWithinLayer) / countInLayer`). Members with an
  explicit `position` pass through untouched, so mixed
  explicit/auto-derived guilds don't cross-contaminate.
- `metresToLonLatOffset(eastM, northM, originLat)` — flat-earth
  approximation (good to ~0.1 % at the canopy radii we deal with),
  `Δlon = east / (cos(lat) · 111 320)`, `Δlat = north / 110 540`.

### Canopy union math

[apps/web/src/features/agroforestry/guildLivestockMath.ts](../../apps/web/src/features/agroforestry/guildLivestockMath.ts)
adds `hostCanopyUnion(guilds)` returning
`{ unionAreaM2, rawSumM2 } | null`. For each (guild, member) it builds
one `turf.circle` at the absolute lon/lat resolved from
`Guild.center` + the member's `position` (explicit or ring-derived)
via `metresToLonLatOffset`, pushes every disk into one
`turf.featureCollection`, unions them, and returns
`turf.area(merged)` plus the raw `Σ π·r²` for comparison. Returns
`null` if any guild on the host lacks `center` or no member has a
resolvable `canopySpreadM` — the caller falls back to the legacy
envelope clip in those cases.

`computeSilvopastureIntegration` now branches:

```ts
const union = hostCanopyUnion(guildEntities);
if (union) {
  effectiveCanopyM2 = union.unionAreaM2;
  canopyDedupedM2 = Math.max(0, union.rawSumM2 - union.unionAreaM2);
} else {
  effectiveCanopyM2 =
    hostAreaM2 > 0 ? Math.min(rawCanopyM2, hostAreaM2) : rawCanopyM2;
  canopyClampedM2 = rawCanopyM2 - effectiveCanopyM2;
}
```

`HostIntegrationRow` gains `canopyDedupedM2: number` alongside the
existing `canopyClampedM2`. The two are mutually exclusive in practice
(union path → dedup only; fallback path → clip only).

### Card display

[apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx)
renders two mutually exclusive sub-lines:

- `canopyDedupedM2 > 0` → "canopy unioned across overlapping guilds —
  saved N m²" (new `data-testid="canopy-deduped"`).
- otherwise `canopyClampedM2 > 0` → existing "canopy claims clipped by
  N m² at host envelope" (`data-testid="canopy-clipped"` preserved).

## Consequences

**Newly unblocked (separate slices):**
- Drag-to-place member positioning UI (`GuildSpatialBuilderCard` or
  map-layer drag) — writes `GuildMember.position` directly; the math
  already consumes it.
- Per-member map-layer rendering as its own MapboxGL source + layer.
- Ground-truthing the first-pass ring radii against
  extension-service plant-spacing guidance.

**Preserved:**
- The envelope clip remains as a fallback. Projects whose guilds
  predate `Guild.center` continue to score correctly via the legacy
  path — zero regression for unmigrated data.
- Existing `canopyClampedM2` field + `data-testid="canopy-clipped"`
  assertion both kept.

**Approximation noise.** `turf.circle` uses a 32-step polygon
(undershoots π·r² by ~0.6 %). Tests for the "no overlap" case assert
`canopyDedupedM2 < 5 m²` (two disks) and the "lone canopy" case
asserts `canopyDedupedM2 < 2 m²` (one disk) to absorb that noise
rather than chasing zero.

## Covenant (non-financial / ecological only)

"Integration" remains strictly ecological (fodder × canopy ×
toxicity). The new module + math add no financial / yield-as-return
framing. No riba / gharar / CSRA / salam / investor / financing /
cost-of-capital framing in any new file.

## Out of scope

- Drag-to-place UI for member positions.
- Per-member map rendering as its own MapboxGL source + layer.
- Layer ring-radius tuning against extension-service guidance.
- Conversion between `Guild.centroidUv` (parcel-relative 0..1) and
  member `position` (guild-local metres) — the two coordinate systems
  stay independent.
- B5.2 cover-crop catalog backfill.
- Pig / rabbit / bee browse-toxicity expansion.

## Verification

- `npx vitest run src/features/agroforestry` — 56/56 green across 4
  files (positions 10 + toxicity 18 + hosts 10 + math 18).
- `npx tsc --noEmit` — touched files clean.
- Union path covered by three new "canopy union dedup" cases;
  fallback path covered by two new "envelope-clip fallback" cases
  with `Guild.center` left unset.

## Files

**New (3):**
- [apps/web/src/features/agroforestry/guildMemberPositions.ts](../../apps/web/src/features/agroforestry/guildMemberPositions.ts)
- [apps/web/src/features/agroforestry/__tests__/guildMemberPositions.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildMemberPositions.test.ts)
- [wiki/decisions/2026-05-21-atlas-b4-canopy-union-dedup.md](2026-05-21-atlas-b4-canopy-union-dedup.md) (this ADR)

**Edited (5):**
- [apps/web/src/store/polycultureStore.ts](../../apps/web/src/store/polycultureStore.ts) — `GuildMember.position?` + v3→v4 migration
- [apps/web/src/features/agroforestry/guildLivestockMath.ts](../../apps/web/src/features/agroforestry/guildLivestockMath.ts) — `hostCanopyUnion` + canopy branch + `canopyDedupedM2` field
- [apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx) — dedup vs clip sub-line
- [apps/web/src/features/agroforestry/SilvopastureIntegrationCard.module.css](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.module.css) — `.canopyDeduped` shares `.canopyClipped` styling
- [apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts) — union describe + fallback describe

## References

- [2026-05-19 B4 — guild ↔ livestock ↔ silvopasture integration](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md) (parent ADR)
- [2026-05-20 — canopy dedup via host-envelope cap](../log/2026-05-20-b4-canopy-dedup-host-envelope-cap.md) (the envelope-clip slice this builds on)
- [2026-05-20 — poultry/waterfowl browse-toxicity](../log/2026-05-20-b4-poultry-browse-toxicity.md) (preceding B4 follow-up)
