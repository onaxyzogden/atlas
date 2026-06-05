# 2026-05-10 — Plan/Livestock Welfare phasing: pasture-quality-adjusted stocking


`LivestockWelfarePhasingCard.tsx` now surfaces a recommended-stocking row in
both the empty-state reference grid and the populated per-species rollup,
with values driven by pasture quality.

**Multipliers** (derived from the AUE/ha figures in the Paddock popover's
`PASTURE_QUALITY_OPTIONS`, normalised so `good` = 1.0 baseline matching
`LIVESTOCK_SPECIES.typicalStocking`):

```
poor      → 0.7 / 2.5 = 0.28
fair      → 1.2 / 2.5 = 0.48
good      → 1.0
excellent → 3.7 / 2.5 = 1.48
```

- **Empty-state branch** — global `Pasture quality` `<select>` (default
  `good`) above the species grid; selection rescales every species's
  Stocking row in real time. Units rendered per-species via
  `info.stockingUnit` (`head` / `birds` / `hives`).
- **Populated branch** — `SpeciesRow` extended with `qualityMultiplierSum`
  and `qualityCount`; the reducer accumulates
  `PASTURE_QUALITY_MULTIPLIER[paddock.pastureQuality] ?? 1.0` per
  species's paddocks. Each species card now carries a Stocking row
  showing `Math.round(typicalStocking * avgMultiplier * 10) / 10` with
  the species's unit.

No `livestockAnalysis.computeRecommendedStocking()` use here — that
helper takes a forage-quality score (soil OM / canopy / slope), not the
`PastureQuality` enum the steward sets per paddock. Bridging the two is
deferred (which is canonical?).

**Verification.** `apps/web npx tsc --noEmit` clean (exit 0). DOM probes
against `/v3/project/mtc/plan/livestock` → Welfare phasing tab with three
test paddocks (P1=sheep+good, P2=poultry+poor, P3=goats+excellent, plus a
2nd sheep paddock with `poor`):

- Sheep avg multiplier `(1.0 + 0.28) / 2 = 0.64` → `12 × 0.64 = 7.7 head/ha` ✓
- Poultry `0.28` → `250 × 0.28 = 70 birds/ha` ✓
- Goats `1.48` → `10 × 1.48 = 14.8 head/ha` ✓

Test paddocks scrubbed from `ogden-livestock` localStorage afterwards.
