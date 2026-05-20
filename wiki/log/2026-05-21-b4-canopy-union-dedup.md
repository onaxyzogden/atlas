# 2026-05-21 — B4 follow-up: per-member positions + real canopy union dedup

**Branch.** `feat/atlas-permaculture`. Closes the last open follow-up
from [2026-05-19 B4](../decisions/2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md):
the envelope-clip slice that shipped 2026-05-20 was an honest but
coarse `Math.min(rawCanopyM2, hostAreaM2)`; today's slice replaces it
with real `turf.union` of per-member canopy disks while preserving the
envelope clip as a fallback for projects whose guilds lack
`Guild.center`. Full design context in
[2026-05-21 ADR](../decisions/2026-05-21-atlas-b4-canopy-union-dedup.md).

**What changed.**

- [apps/web/src/store/polycultureStore.ts](../../apps/web/src/store/polycultureStore.ts):
  `GuildMember` gains an optional `position?: [number, number]`
  guild-local offset in metres as `[east, north]` from `Guild.center`.
  Zustand `persist` bumped `version: 3 → 4` with a no-op migration —
  existing rows load with `position === undefined` and the canopy
  math's auto-positioner takes over.
- [apps/web/src/features/agroforestry/guildMemberPositions.ts](../../apps/web/src/features/agroforestry/guildMemberPositions.ts)
  (NEW): three pure helpers — `ringRadiusForLayer` (canopy 0 m,
  sub_canopy 6 m, shrub 4 m, vine 3 m, herbaceous 2.5 m, ground_cover
  1.5 m, root 0.5 m), `assignRingPositions` (groups by layer,
  distributes angularly, preserves explicit `position`), and
  `metresToLonLatOffset` (flat-earth approximation).
- [apps/web/src/features/agroforestry/guildLivestockMath.ts](../../apps/web/src/features/agroforestry/guildLivestockMath.ts):
  new `hostCanopyUnion(guilds)` helper builds one `turf.circle` per
  (guild, member) at the absolute lon/lat resolved from
  `Guild.center` + ring-derived position, unions all disks across
  the host, and returns `{ unionAreaM2, rawSumM2 }` — or `null` if any
  guild lacks `center` or no canopy radius resolves (caller falls back
  to the envelope clip). `computeSilvopastureIntegration` now
  branches: union path on success (sets `canopyDedupedM2`), envelope
  clip otherwise (sets `canopyClampedM2`). `HostIntegrationRow` gains
  `canopyDedupedM2: number` alongside the existing `canopyClampedM2`.
- [apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx)
  + [.module.css](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.module.css):
  replaced the single canopy-clip sub-line with two mutually
  exclusive cases — "canopy unioned across overlapping guilds — saved
  N m²" (`data-testid="canopy-deduped"`) on the union path; the
  existing "canopy claims clipped by N m² at host envelope"
  (`data-testid="canopy-clipped"` preserved) on the fallback path.
  `.canopyDeduped` shares `.canopyClipped` styling.
- [apps/web/src/features/agroforestry/__tests__/guildMemberPositions.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildMemberPositions.test.ts)
  (NEW): 10 pure-math tests covering determinism, angular
  distribution, explicit-position passthrough, canopy-at-origin,
  mixed explicit + auto-derived, equator longitude, latitude at any
  longitude, and `cos(lat)` scaling at lat 60°.
- [apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts):
  replaced the old "envelope clip (overlap dedup)" block with two
  new describes — "canopy union dedup" (3 cases: same-center
  overlap dedupes ~one full disk's worth; guilds 1° lon apart with
  no dedup, asserted `< 5 m²` for 32-gon polygon noise; lone canopy
  with self-noise `< 2 m²`) and "canopy envelope-clip fallback"
  (2 cases using guilds without `center`: one where `rawCanopyM2`
  exceeds host area and `canopyClampedM2 > 0`, one where it fits
  inside and both fields are 0). Suite grew 13 → 18; full
  agroforestry 43 → 56.
- [wiki/decisions/2026-05-21-atlas-b4-canopy-union-dedup.md](../decisions/2026-05-21-atlas-b4-canopy-union-dedup.md)
  (NEW): ADR with context, decision, consequences, and the
  approximation-noise caveat.
- [wiki/decisions/2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md](../decisions/2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md):
  "Still open: per-member spatial positions" follow-up bullet
  flipped to closed and linked to the new ADR.

**Why preserve the envelope-clip fallback.** Projects whose guilds
predate `Guild.center` (or whose canopy members never set
`canopySpreadM` in the catalog) would otherwise lose their canopy
score entirely. The fallback path keeps unmigrated data scoring
correctly via the legacy `Math.min(rawCanopyM2, hostAreaM2)`; the
union path takes over for any host where every guild has `center`
and at least one canopy radius resolves. `canopyDedupedM2` and
`canopyClampedM2` are mutually exclusive in practice — the card
renders whichever is positive.

**Approximation noise — 32-gon polygons.** `turf.circle` defaults to
a 32-step polygon, undershooting π·r² by roughly 0.6 %. Rather than
chasing zero in the "no overlap" assertions, the tests absorb the
noise with `< 2 m²` (lone canopy: self-noise from one disk) and
`< 5 m²` (two non-overlapping disks ~111 km apart). Bumping `steps`
would close the gap but at quadratic union cost — not worth it for a
sub-1 % effect.

**Verification.**
- `npx vitest run src/features/agroforestry` — 56/56 green across 4
  files (positions 10 + toxicity 18 + hosts 10 + math 18).
- `npx tsc --noEmit` against `apps/web` — touched files clean.

**Out of scope.** Drag-to-place member positioning UI; per-member
MapboxGL rendering; ring-radius ground-truthing against
extension-service spacing guidance; `Guild.centroidUv` ↔ member
`position` conversion (the two coordinate systems stay independent);
B5.2 cover-crop catalog backfill; pig / rabbit / bee browse-toxicity.
