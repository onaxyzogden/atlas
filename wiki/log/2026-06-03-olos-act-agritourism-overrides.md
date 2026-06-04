# Act-stage objective->tool overrides — agritourism (R1/R3)

**Date:** 2026-06-03
**Project:** [[entities/olos]] / Atlas (`atlas/`, repo `onaxyzogden/atlas`)
**Branch:** `feat/atlas-permaculture`
**Commit:** `a1f9b042` (code) + docs commit
**Follows:** [[log/2026-06-03-olos-act-offgrid-overrides]] (off_grid R1/R3)
**ADR:** [[decisions/2026-06-03-olos-act-objective-coverage-audit]]
**Interacts with:** [[decisions/2026-06-03-olos-agritourism-eco-resort-extension]] · [[decisions/2026-06-03-olos-agritourism-membership-instrument]]

## What happened

Eighth per-type catalogue wired in the Act-stage objective->tool coverage
remediation, after homestead, regenerative_farm, market_garden, orchard,
livestock_operation, conservation and off_grid. Authored explicit
`OBJECTIVE_ACT_TOOLS_OVERRIDE` entries for all 34 agritourism objectives in
[[entities/shared-package]] (`packages/shared/src/relationships/objectiveActTools.ts`)
— the 34 `ag-*` primary objectives. Agritourism ships **no standalone secondary
layer and no patches**, so this is a primary-only wiring, and the
[[entities/act-tier-shell]] conformance test
(`apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts`) gains a
primary-only ratchet assertion (like homestead / regen-farm / market-garden /
conservation / off-grid).

## Count note — 34, not 29

The agritourism catalogue grew **29 -> 34** out-of-band (commits `89541b55` +
`15680301`, 2026-06-03) via the eco-resort / glamping extension: AG-S3.7
(ecological carrying capacity), AG-S4.9 (guest-to-production biosecurity),
AG-S5.9 (dispersed low-impact siting), AG-S5.10 (decentralised servicing /
dark-sky), AG-S7.8 (seasonal-occupancy resilience). Because the ratchet reads
`AGRITOURISM_PRIMARY_OBJECTIVES` live at test time, the grown set was picked up
automatically — the override block just had to wire all 34, including the 5 new
ones (4 of which are spatial and grounded; AG-S7.8 is a planning decision -> []).

## Why it mattered

Before this, the agritourism objectives fell through to the coarse
`STRATUM_ACT_TOOLS_DEFAULT` with the familiar misfit:

- The **S2/S3 surveys** (arrival experience, hospitality infra, landscape
  context, water & sanitation demand, sensory environment, emergency access,
  food-production capacity, ecological carrying capacity) surfaced the
  **access-utilities** set instead of access (roads/parking/gates/path),
  structure (buildings/dwellings/barns), climate-sector (fire/wind-sector/
  hazard-zone) and survey tools.
- The **S4 zoning + S5 design block** (circulation, biosecurity, accommodation,
  dining, programming, sanitation, safety, dispersed siting, decentralised
  servicing) surfaced roads/fencing generically rather than the structure,
  zoning (zone/buffer-ring/fencing) and water (tanks/water-lines/catchment)
  families the checklists call for.

## The 34 mappings

Grounded-candidate method — every tool id verified against a real agritourism
checklist item AND confirmed present in `ACT_TOOL_CATALOG`:

| Objective | Tools |
|---|---|
| `ag-s1-experience-vision` | `[]` — experience / proposition decision |
| `ag-s1-visitor-capacity` | `[]` — capacity-numbers decision |
| `ag-s1-regulatory-framework` | `[]` — permits / licensing decision |
| `ag-s2-arrival-experience` | roads, parking, gates, path, hazard-zone |
| `ag-s2-hospitality-infra` | buildings, dwellings, barns |
| `ag-s2-landscape-context` | neighbour-pin, catchment, hazard-zone, note |
| `ag-s2-seasonal-patterns` | `[]` — scheduling read |
| `ag-s3-water-sanitation-demand` | spring, watercourse, wells, storage |
| `ag-s3-sensory-environment` | note, vegetation, wind-sector |
| `ag-s3-emergency-access` | roads, path, fire-sector, hazard-zone |
| `ag-s3-food-production-capacity` | crops, orchards, beds, paddocks, buildings |
| `ag-s3-ecological-carrying-capacity` | soil, erosion, wildlife-sector, buffer-ring, zone |
| `ag-s4-circulation-strategy` | zone, path, buffer-ring, fencing |
| `ag-s4-service-model` | `[]` — service-design decision |
| `ag-s4-food-strategy` | `[]` — strategy decision (production sited in S3.6) |
| `ag-s4-safety-compliance` | fire-sector, hazard-zone, path |
| `ag-s4-revenue-model` | `[]` — financial / sales decision (Amanah scopeNote; see below) |
| `ag-s4-biosecurity-zoning` | buffer-ring, fencing, gates, zone |
| `ag-s5-accommodation` | dwellings, buildings |
| `ag-s5-dining-infra` | buildings, barns |
| `ag-s5-programming-infra` | path, buildings, zone |
| `ag-s5-sanitation-infra` | buildings, tanks, water-lines |
| `ag-s5-safety-infra` | path, fire-sector, roads, hazard-zone |
| `ag-s5-dispersed-siting` | dwellings, zone, path, buffer-ring |
| `ag-s5-decentralised-servicing` | tanks, water-lines, catchment, power |
| `ag-s6-experience-feedback` | `[]` — monitoring-protocol design |
| `ag-s6-compliance-monitoring` | `[]` — compliance admin protocol |
| `ag-s6-food-integration` | harvest |
| `ag-s6-load-monitoring` | `[]` — monitoring-protocol design |
| `ag-s7-staffing-training` | `[]` — HR decision |
| `ag-s7-booking-system` | `[]` — systems decision |
| `ag-s7-phased-launch` | `[]` — phasing / financial decision |
| `ag-s7-adaptive-management` | `[]` — review protocol |
| `ag-s7-seasonal-resilience` | `[]` — operational planning (not a sales surface) |

19 tool-bearing · 15 intentional `[]`.

## Amanah

AG-S4.8 (booking, pricing & revenue model) carries the **membership /
season-pass Amanah scopeNote in the catalogue** — *bayʿ mā laysa ʿindak* /
gharar, structured as a membership benefit (entitlement of belonging,
cancellable with pro-rata refund, NOT advance prepayment of undelivered nights),
required to carry genuine non-stay substance, bounded by the AG-S3.7
carrying-capacity ceiling, and routed to **Scholar Council** review before
adoption (see [[decisions/2026-06-03-olos-agritourism-membership-instrument]]).
The Act override maps AG-S4.8 to an intentional `[]`, so **no act surface
engages the sales instrument** — the correct, Amanah-aware outcome, mirroring how
market_garden's CSA-flagged s1 objectives (MGD-S1.4 / MGD-S1.6) and livestock's
CSA-flagged s7 objective (LVS-S7.7) already resolve to `[]`. No new fiqh is
re-encoded at the Act layer; the catalogue scopeNote stays the single source of
the membership guardrail. AG-S7.8 (seasonal resilience) is explicitly
operational planning and not a sales surface, also `[]`. Clean.

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` — EXIT 0.
- Audit re-run: 316 objectives — Gap A **114 -> 80** (agritourism's 34 ag-*
  now covered), Gap B 0, Gap C 85 -> 97 (87 intentional / 10 default-driven;
  +15 intentional = agritourism decision/financial/protocol objectives,
  -3 default-driven now explicitly wired).
- Bounded tests (`--pool=forks`, per-workspace):
  `actToolCoverage.test.ts` **13/13** · `objectiveObserveDomains.test.ts` **8/8**
  · `resolveProjectObjectives.test.ts` **25/25**.

## Note on the code commit

Clean this time — `a1f9b042` committed via `git commit -- <explicit pathspec>`
(the lesson from the off_grid `ee3af9b1` index-pollution incident), so it
captured exactly the 3 intended files (`objectiveActTools.ts`,
`actToolCoverage.test.ts`, the regenerated `act-objective-coverage.md` matrix)
despite the ~50 unrelated out-of-band changes in the working tree.

## Remaining

Gap A now **80** across the remaining primary types (ecovillage, education,
wellness). R2 (form-arm tools for the s1 vision objectives) stays deferred — it
needs operator-designed per-type form content, which must not be fabricated.
