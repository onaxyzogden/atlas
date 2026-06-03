# Act-stage objective->tool overrides — off_grid (R1/R3)

**Date:** 2026-06-03
**Project:** [[entities/olos]] / Atlas (`atlas/`, repo `onaxyzogden/atlas`)
**Branch:** `feat/atlas-permaculture`
**Commit:** `ee3af9b1` (code) + docs commit
**Follows:** [[log/2026-06-03-olos-act-conservation-overrides]] (conservation R1/R3)
**ADR:** [[decisions/2026-06-03-olos-act-objective-coverage-audit]]

## What happened

Seventh per-type catalogue wired in the Act-stage objective->tool coverage
remediation, after homestead, regenerative_farm, market_garden, orchard,
livestock_operation and conservation. Authored explicit
`OBJECTIVE_ACT_TOOLS_OVERRIDE` entries for all 27 off_grid objectives in
[[entities/shared-package]] (`packages/shared/src/relationships/objectiveActTools.ts`)
— the 27 `ofg-*` primary objectives. Off_grid ships **no standalone secondary
layer and no patches**, so this is a primary-only wiring, and the
[[entities/act-tier-shell]] conformance test
(`apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts`) gains a
primary-only ratchet assertion (like homestead / regen-farm / market-garden /
conservation).

## Why it mattered

Before this, the off_grid objectives fell through to the coarse
`STRATUM_ACT_TOOLS_DEFAULT` with the familiar misfit:

- S2/S3 site & systems surveys (water sources, energy potential, access road,
  fire/evacuation, water quality, food conditions) surfaced the
  **access-utilities** set instead of source (spring/watercourse/catchment/
  wells), climate-sector (sun/wind/fire-sector/hazard-zone) and survey tools.
- S5 infrastructure design (water / energy / shelter / food / comms systems)
  surfaced roads/fencing generically rather than the structure
  (wells/tanks/buildings/dwellings/power) and production families.

Off_grid is the most infrastructure-heavy type, but its catalogue front-loads
philosophy (S1), surveys (S2-S3), and decisions (S4), then concentrates the
spatial design in S5, with S6 monitoring protocols and S7 phasing being
decisions. The grounded acts therefore cluster in S2-S3 and S5.

## The 27 mappings

Grounded-candidate method — every tool id verified against a real off_grid
checklist item AND confirmed present in `ACT_TOOL_CATALOG`:

| Objective | Tools |
|---|---|
| `ofg-s1-resilience-philosophy` | `[]` — independence-target design gate |
| `ofg-s1-critical-systems-redundancy` | `[]` — criticality classification |
| `ofg-s1-site-selection-access` | roads, parking |
| `ofg-s2-water-sources-yield` | spring, watercourse, catchment, wells |
| `ofg-s2-energy-generation-potential` | sun-sector, wind-sector, watercourse, vegetation |
| `ofg-s2-access-road-emergency-route` | roads, path, hazard-zone |
| `ofg-s2-fire-risk-evacuation` | fire-sector, vegetation, path, hazard-zone |
| `ofg-s3-water-quality-treatment` | spring, watercourse, wells |
| `ofg-s3-energy-demand-balance` | `[]` — generation-vs-demand calc |
| `ofg-s3-communications-connectivity` | neighbour-pin |
| `ofg-s3-food-production-storage-conditions` | frost-pocket, zone |
| `ofg-s4-water-system-redundancy` | `[]` — strategy/redundancy (infra in s5) |
| `ofg-s4-energy-system-redundancy` | `[]` — sizing/redundancy (infra in s5) |
| `ofg-s4-food-security-storage` | `[]` — strategy (infra in s5) |
| `ofg-s4-emergency-comms-response` | `[]` — protocol & training |
| `ofg-s4-shelter-thermal-performance` | `[]` — performance spec (infra in s5) |
| `ofg-s5-water-system-infrastructure` | wells, spring, tanks, water-lines |
| `ofg-s5-energy-system-infrastructure` | sun-sector, power, buildings, tanks |
| `ofg-s5-shelter-thermal-infrastructure` | dwellings, sun-sector, tanks |
| `ofg-s5-food-production-infrastructure` | beds, orchards, paddocks, buildings |
| `ofg-s5-communications-emergency-infrastructure` | buildings, power, note |
| `ofg-s6-systems-performance-monitoring` | `[]` — monitoring-protocol design |
| `ofg-s6-emergency-preparedness-monitoring` | `[]` — scheduling protocol |
| `ofg-s6-adaptive-management` | `[]` — review protocol |
| `ofg-s7-systems-establishment-sequence` | `[]` — sequencing / hard gates |
| `ofg-s7-resourcing-supply-chain` | `[]` — logistics (Amanah-clean) |
| `ofg-s7-phased-habitation` | `[]` — habitation gate decision |

13 tool-bearing · 14 intentional `[]`.

## Amanah

Every off_grid objective is life-safety resilience — water, energy, shelter,
food, communications, emergency response, and habitation sequencing. The
catalogue ships no sales channel, advance purchase, or financing instrument;
`ofg-s7-resourcing-supply-chain` is materials logistics, not capital formation.
Nothing engages riba or gharar — clean throughout, no scopeNotes flag needed.

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` — EXIT 0.
- Audit re-run: 316 objectives — Gap A **141 -> 114** (off_grid's 27 ofg-*
  now covered), Gap B 0, Gap C 74 -> 85 (72 intentional / 13 default-driven;
  +14 intentional = off_grid decision/strategy/protocol objectives,
  -3 default-driven now explicitly wired).
- Bounded tests (`--pool=forks`, per-workspace):
  `actToolCoverage.test.ts` **12/12** · `objectiveObserveDomains.test.ts` **8/8**
  · `resolveProjectObjectives.test.ts` **25/25**.

## Note on the code commit

The code commit (`ee3af9b1`) unintentionally bundled 3 unrelated files
(`observe/lens/lensData/liveBundle.ts`, its test, and `observe/lens/types.ts`)
that an out-of-band process had pre-staged in the index — `git commit` without
a pathspec commits the whole index, not just the explicitly `git add`-ed paths.
The off_grid override change within the commit is correct and self-contained;
the stray files' newer versions remain in the working tree (not lost).
Un-bundling would need `git commit --amend` or a reset, both forbidden by the
standing branch-hygiene rule on this externally-rebased branch, so it was left
for the operator. Going forward, commits use `git commit -- <pathspec>` to
commit only named paths regardless of what an external process has staged.

## Remaining

Gap A now 114 across the remaining primary types
(agritourism, ecovillage, education, wellness). R2 (form-arm tools for the s1
vision objectives) stays deferred — it needs operator-designed per-type form
content, which must not be fabricated.
