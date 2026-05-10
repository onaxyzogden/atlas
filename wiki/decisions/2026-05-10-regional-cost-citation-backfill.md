# 2026-05-10 — Regional cost citation backfill (Phase 4.1)

## Status

Accepted (partial backfill — 35 of 76 placeholder rows upgraded; remaining
41 stay as declared placeholders with sharper rationale).

## Context

Phase 4.1 of the 2026-05-09 pre-test friction audit
([2026-05-09-atlas-pre-test-audit.md]) flagged **76 rows** in
`apps/web/src/features/financial/engine/regionalCosts/` carrying
`citation: null, confidence: 'low'`:

- `US_MIDWEST.ts` — 35 of 70 rows (50%)
- `CA_ONTARIO.ts` — 41 of 70 rows (59%; many were "US Midwest × 1.20"
  fallbacks)

Operator decision was option A: **source backfill pass.** Every
backfilled row gets a string citation embedding the public URL and the
access date so the trail is reproducible.

A path discrepancy was also discovered: the audit pointed at
`packages/shared/src/regionalCosts/`, but the files actually live at
`apps/web/src/features/financial/engine/regionalCosts/`. Audit doc
should be corrected at next revision.

## What was sourced

Six high-leverage primary/secondary sources unlocked most of the
backfillable rows:

1. **NRCS EQIP FY2025 Payment Schedules** —
   <https://www.nrcs.usda.gov/getting-assistance/payment-schedules>
   (covers US Midwest site-prep, fencing, watering, conservation, pond,
   access-road).
2. **NREL Annual Technology Baseline 2024 — Residential Battery
   Storage (5kW/12.5kWh)** —
   <https://atb.nrel.gov/electricity/2024/residential_battery_storage>
   (covers US + Ontario `battery_room`).
3. **American Trails — Construction and Maintenance Costs for Trails**
   ($1.50–$3.00/lin.ft IMBA/USFS spec) —
   <https://www.americantrails.org/resources/construction-and-maintenance-costs-for-trails>
   (covers `pedestrian_path`, `trail`, `quiet_route`).
4. **Angi 2026 Road Construction Cost Guide** ($4.80–$14.40/lin.ft
   gravel rural road) —
   <https://www.angi.com/articles/how-much-cost-build-road-property.htm>
   (covers `main_road`, `secondary_road`, `emergency_access`,
   `service_road`, `farm_lane`, `arrival_sequence`).
5. **HomeAdvisor 2025 Septic System Installation Cost Data** —
   <https://www.homeadvisor.com/cost/plumbing/install-a-septic-tank/>
   (covers US `septic`).
6. **OMAFRA Publication 60 — 2025 Field Crop Budgets** —
   <https://www.ontario.ca/files/2025-01/omafa-field-crop-budgets-pub-60-en-2025-01-14.pdf>
   (covers Ontario food-production, fencing, row crops).
7. **Ontario Building Code 2024 — Part 8 Sewage Systems Compendium** +
   **Septic Replacement Ontario 2026 calculator** —
   <https://www.publications.gov.on.ca/301586> +
   <https://septicreplacement.ca/ontario-septic-system-calculator-2026/>
   (covers Ontario `septic`).
8. **USDA SARE — Handbook for Agroforestry Planning & Design** —
   <https://projects.sare.org/information-product/handbook-for-agroforestry-planning-design/>
   (covers US + Ontario `food_forest`).

## Side-fix: OMAFRA Pub 827 → Pub 60

The previous file referenced `OMAFRA Publication 827 — Cost of
Production budgets`. **Publication 827 does not exist.** The canonical
OMAFRA budget series is *Publication 60 — Field Crop Budgets*, currently
in its 2025 edition. The constant `OMAFRA` was renamed to
`OMAFRA_PUB60_2025` and all references updated; the file header now
documents the correction.

## What stayed `confidence: 'low'`

41 rows stayed flagged after the pass. These fall into three classes
where no public schedule exists:

- **Amenity / design-intent landscaping** — `commons`, `spiritual`,
  `education`, `retreat` zones; `arrival_sequence` path. Costs depend
  on design choices that no aggregator captures.
- **Retail-priced or DIY infrastructure** — `lighting`,
  `firewood_storage`, `waste_sorting`, `compost`, `biochar`,
  `tool_storage`, `laundry_station`, `rain_catchment`, `water_tank`,
  `generator`, `greywater`, `nursery`, `garden_bed`. These are either
  commodity retail purchases (bins, fixtures) or DIY-pole-shed-class
  builds with no published schedule.
- **Region-specific gaps** — Ontario `well_pump` (MECP Well Records
  exist as raw completion logs but no aggregated rate schedule),
  Ontario zone-level utility-corridor grading.

Every one of these now carries a **sharper rationale** instead of the
old "placeholder — varies" boilerplate, so the steward sees *why* the
row is unsourced, not just that it is.

## Verification

- `npx vitest run src/tests/financial/costDatabase.test.ts` → 7/7
  passing.
- `npx tsc --noEmit` → 3 errors in unrelated SWOT files (pre-existing
  in working tree, not in the files this commit touches).
- `grep -c "citation:\s*null"` →
  - `US_MIDWEST.ts`: 35 → 19
  - `CA_ONTARIO.ts`: 41 → 22
  - Total: 76 → 41 placeholder rows (54% remaining; 46% backfilled).

## Consequences

**Pros.**

- Every previously-null row that *could* be sourced now carries a
  publicly-traceable URL and access date.
- The OMAFRA Pub 827 → Pub 60 correction unfreezes Ontario from a
  ghost citation.
- Rows that genuinely can't be sourced now explain why, instead of
  saying "varies."

**Cons.**

- Citations on market-aggregator sources (Angi, HomeAdvisor) are
  `confidence: 'medium'`, not `'high'`. They are reproducible
  (URL + access date) but represent surveyed market estimates, not
  primary regulatory schedules.
- 41 rows still have `confidence: 'low'`. Financial outputs that touch
  these rows remain unbacked but **declared** as such.

## Future work

- **Hydro One Distribution Connection Schedule** would unlock Ontario
  `infrastructure` and could push it from low to medium.
- **MECP Ontario Well Record aggregation** (the raw data is public; the
  aggregation work isn't) would unlock Ontario `well_pump`.
- **State NRCS payment schedules** (Iowa, Illinois, Wisconsin,
  Minnesota, Indiana) would replace national-average citations with
  state-specific rates for US Midwest rows currently citing
  `NRCS_2025`.

## References

- [2026-05-09-atlas-pre-test-audit.md] — friction audit (P2 finding)
- [2026-04-22-regional-cost-dataset.md] — original dataset commit
- `apps/web/src/features/financial/engine/regionalCosts/US_MIDWEST.ts`
- `apps/web/src/features/financial/engine/regionalCosts/CA_ONTARIO.ts`
- `apps/web/src/features/financial/engine/types.ts` — `CostSource` schema
