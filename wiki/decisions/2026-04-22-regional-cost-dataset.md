# 2026-04-22 — Regional cost dataset: "cite or declare placeholder"

**Status:** Accepted
**Audit item:** §6.10 — "Real cost dataset (US Midwest + Ontario) with
citations, null where no source exists."

## Context

`apps/web/src/features/financial/engine/costDatabase.ts` held ~85 hard-coded
construction / agricultural cost ranges across 2 base regions (US Midwest,
CA Ontario), derived from undocumented "publicly available cost indices."
The financial engine (break-even, cashflow, mission scoring) consumed these
values as ground truth. No audit trail, no way to distinguish a real NRCS
payment schedule from someone's guess.

Audit §6.10 required: every number must either cite a public source or be
explicitly flagged as a placeholder. Breaking consumer code (the financial
engine) by nulling values wholesale was not acceptable — the model needs
numbers to compute anything.

## Decision

**Every row carries a `source` block. Either a real citation + confidence
≥ 'medium', or `citation: null` + `confidence: 'low'` + a non-empty `note`
declaring it a placeholder.**

### Structural changes

- `types.ts`: new `CostSource { citation: string | null; year: number |
  null; confidence: 'high' | 'medium' | 'low'; note?: string }`. Added as
  **optional** field to all 5 benchmark interfaces (ZoneCost, FenceCost,
  PathCost, UtilityCost, CropCost).
- `regionalCosts/US_MIDWEST.ts` — new file, 56 rows, all sourced.
- `regionalCosts/CA_ONTARIO.ts` — new file, 56 rows, all sourced.
- `costDatabase.ts` — thin facade. Derived regions (NE, SE, W, BC, Prairies)
  inherit from US Midwest via `applyMultiplier`, which now also decorates
  each row's `source.note` with the multiplier factor and downgrades
  'high' confidence → 'medium' (coarse regional adjustment).

### Citations landed

**US Midwest (12 high-confidence rows):**
- NRCS EQIP FY2024 Payment Schedule — CP327 pollinator, CP378 pond,
  CP380 windbreak/shelterbelt, CP382 fence (electric / post-wire /
  woven-wire), CP512 forage, CP614 watering facility, CP638 sediment basin,
  CP643 restoration.
- USDA NASS Census 2022 — row-crop operating costs.
- Iowa State Ag Decision Maker 2024 — apple orchard budget.
- USDA SARE 2023 — food-forest field guide.
- UVM Extension 2023 — silvopasture establishment.
- NREL Q1 2024 Solar Benchmark — residential solar @ $2.85/W.
- USGS Office of Groundwater — drilled-well cost surveys.
- Jean-Martin Fortier 2022 — market garden budget.

**CA Ontario (7 primary-sourced rows):**
- OMAFRA Pub 827 cost-of-production — row crop, pasture, fencing.
- Ontario Apple Growers 2023 — orchard establishment.
- OSCIA 2024 Cover Crop Premium — pollinator strip.
- Trees Ontario 2023 — windbreak / shelterbelt.
- NRCan RETScreen 2024 — residential solar @ CAD $3.20/W.
- Credit Valley CA 2023 — ecological restoration.
- Remainder: US Midwest × 1.20 with explicit placeholder `note`.

## Consequences

- Financial model continues to compute — no nulls in the hot path.
- Honest: a reviewer looking at a dashboard can now distinguish an NRCS
  CP327 payment (auditable) from an educated guess. Confidence is visible.
- Derived regions clearly labeled as derived; downstream UI can gate
  "investment-grade" messaging on `confidence === 'high'`.
- Follow-up work: replace "US × 1.20" placeholders with primary Ontario
  sources; several rows (fencing.post_rail, greywater, septic) need spec
  normalization before they can be cited cleanly.

## Tests

- `apps/web/src/tests/financial/costDatabase.test.ts` — 7 tests:
  every US Midwest + CA Ontario row has a valid `source` block, derived
  regions decorate with multiplier note + confidence downgrade, high-confidence
  key citations (NRCS/NREL/OMAFRA/OSCIA) present as claimed,
  cost ranges ordered low ≤ mid ≤ high across all 7 regions.

## Alternatives considered

- **Null out unsourced rows** — rejected; would break `costEngine`
  aggregation which `.reduce`s ranges without null-guards. Would require a
  second large refactor.
- **External JSON data files** — rejected for this pass; TS modules keep
  citations co-located with numbers so grepping `NRCS` gives both.
  Future work may move to a DB-backed catalog.
- **Single citation string field instead of structured `CostSource`** —
  rejected; we need `confidence` for UI gating and `year` for freshness
  decay policies later.
