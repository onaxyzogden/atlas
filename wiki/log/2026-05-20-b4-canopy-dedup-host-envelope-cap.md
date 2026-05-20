# 2026-05-20 — B4 follow-up: canopy overlap dedup via host-envelope clip

**Branch.** `feat/atlas-permaculture`. Closes an undocumented gap in
[B4](../decisions/2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md):
two or more guilds on the same silvopasture host could sum canopy
footprints that physically exceed the host polygon itself. The
`min(100, …)` clamp on `canopyCoveragePct` masked this in the display
but the underlying `canopyM2` was still impossible — and the
`scoreCanopy` band saturated at the clamp instead of reflecting real
coverage.

**Diagnosis.** Atlas has no per-member spatial position inside a host
(guilds are pinned to the host polygon, not placed individually), so a
true `turf.union` of canopy disks isn't possible without inventing
positions. The honest, minimal fix is to clip `rawCanopyM2` at the
host polygon's own area — the physical envelope canopy cannot
exceed — and surface the discount as a separate field so the steward
can see when claims have been clipped.

**What changed.**

- [apps/web/src/features/agroforestry/guildLivestockMath.ts](../../apps/web/src/features/agroforestry/guildLivestockMath.ts):
  added `hostPolygonAreaM2(host)` (try/catch `turf.area(turf.feature(host.geometry))`,
  returns 0 on failure). Inside the per-host loop, `rawCanopyM2` is
  now clipped at `hostAreaM2` before division; `canopyClampedM2 =
  rawCanopyM2 − clippedCanopyM2` is exposed on `HostIntegrationRow`
  alongside `hostAreaM2`. **Denominator unchanged** —
  `totalPaddockAreaM2` still divides the clipped numerator, because
  silvopasture canopy coverage is over the *grazed* area, not the
  full silvopasture polygon (which may include uncovered margins).
- [apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx)
  + matching `.module.css`: conditional muted sub-line
  `canopy claims clipped by N m² at host envelope` rendered only
  when `row.canopyClampedM2 > 0`. `data-testid="canopy-clipped"` for
  test selection.
- [apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts](../../apps/web/src/features/agroforestry/__tests__/guildLivestockMath.test.ts):
  new `describe('canopy envelope clip (overlap dedup)')` block with
  two cases — (1) "clips raw canopy at host polygon area when guilds
  overstack" using a tiny `rect(0, 0, 0.0001, 0.0001)` host
  (~123 m²) with two single-walnut guilds (~308 m² raw), asserting
  `canopyClampedM2 > 0` and the clip is strictly less than the raw
  sum; (2) "does not clip when raw canopy already fits within host
  envelope" using the standard 10°×10° host (~1.2e9 m²) with one
  walnut, asserting `canopyClampedM2 === 0`. Suite grew 13 → 15
  tests; all 40 agroforestry tests green.
- [wiki/decisions/2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md](../decisions/2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md):
  flipped status from "Not pushed" to pushed-and-verified (the
  parallel session had already shipped commits `0e5c9cb2 → 67b26296
  → 61b37795` to origin out-of-band; this ADR's earlier draft was
  stale). Added a Follow-ups block linking this entry plus the still-
  open poultry browse-toxicity expansion + per-member spatial
  positions gap.

**Why not swap the denominator.** The plan considered swapping the
denominator from paddock-area to host-polygon-area but that subtly
changes the meaning of "canopy coverage %" from "shade over grazed
surface" to "canopy fraction of silvopasture footprint." The first is
what matters operationally; the second drags coverage down when the
silvopasture polygon includes non-grazed buffer zones. Kept the
paddock-area denominator and only added the envelope clip — minimal
intervention, same dedup outcome, no test-fixture churn for the 60+
existing cases that use 10°×10° host rects in lon/lat space.

**Verification.**
- `npx vitest run src/features/agroforestry` — 40/40 green (3 files).
- `npx tsc --noEmit` against `apps/web` — touched files clean; pre-
  existing `@ogden/shared/*` resolution errors in unrelated `v3/`
  modules unchanged (not part of this slice).

**Out of scope.** Per-member position-based `turf.union` dedup;
poultry browse-toxicity expansion; toxicity catalog audit for the
ruminant ↔ caprine asymmetry called out in the original B4 ADR.
