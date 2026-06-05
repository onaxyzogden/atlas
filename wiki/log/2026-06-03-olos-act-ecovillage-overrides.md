# Act-stage objective->tool overrides — ecovillage (R1/R3)

**Date:** 2026-06-03
**Project:** [[entities/olos]] / Atlas (`atlas/`, repo `onaxyzogden/atlas`)
**Branch:** `feat/atlas-permaculture`
**Commit:** `71c4671f` (code) + docs commit
**Follows:** [[log/2026-06-03-olos-act-agritourism-overrides]] (agritourism R1/R3)
**ADR:** [[decisions/2026-06-03-olos-act-objective-coverage-audit]]

## What happened

Ninth per-type catalogue wired in the Act-stage objective->tool coverage
remediation, after homestead, regenerative_farm, market_garden, orchard,
livestock_operation, conservation, off_grid and agritourism. Authored explicit
`OBJECTIVE_ACT_TOOLS_OVERRIDE` entries for all 31 ecovillage objectives in
[[entities/shared-package]] (`packages/shared/src/relationships/objectiveActTools.ts`)
— the 31 `ev-*` primary objectives. Ecovillage is **primary-only**
(`canBeSecondary: false`, no standalone secondary layer, no patches), so this is
a primary-only wiring, and the [[entities/act-tier-shell]] conformance test
(`apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts`) gains a
primary-only ratchet assertion (like homestead / regen-farm / market-garden /
conservation / off-grid / agritourism).

## Count note — 31, not 29

The catalogue header table reads "Primary: 29", but the per-tier sub-headers
(3+4+4+5+5+4+6) and the v1.2 totals both yield **31**; "29" is a stale pre-v1.2
summary (v1.2 added the Stratum 7 adaptive-management objective, EV-S7.9, given
the next free ref slot to disambiguate a duplicate "6.6" label in the source).
The ratchet reads `ECOVILLAGE_PRIMARY_OBJECTIVES` live, so all 31 are covered.

## Why it mattered

Before this, the ecovillage objectives fell through to the coarse
`STRATUM_ACT_TOOLS_DEFAULT` with the familiar misfit:

- The **S2/S3 site & systems surveys** (carrying capacity, tenure & boundary,
  landscape vectors, water yield, waste cycling, energy potential, infra
  condition) surfaced the **access-utilities** set instead of source
  (watercourse/spring/catchment/wells), structure (buildings/barns), climate-
  sector (sun/wind-sector) and zoning/survey tools.
- The **S5 design block** (cluster layout, communal systems, sanitation & waste,
  energy system, food zones) surfaced generic access tools rather than the
  structure (dwellings/buildings/tanks), zoning (zone/buffer-ring) and water
  (water-lines/swale) families the checklists call for.

## The 31 mappings

Grounded-candidate method — every tool id verified against a real ecovillage
checklist item AND confirmed present in `ACT_TOOL_CATALOG`:

| Objective | Tools |
|---|---|
| `ev-s1-legal-governance` | `[]` — legal/tenure/governance decision |
| `ev-s1-provision-balance` | `[]` — communal-vs-private policy decision |
| `ev-s1-conflict-framework` | `[]` — governance/agreement decision |
| `ev-s2-carrying-capacity` | zone, buffer-ring, note |
| `ev-s2-tenure-boundary` | path, gates, fencing, note |
| `ev-s2-landscape-vectors` | neighbour-pin, catchment, runoff-path, hazard-zone, note |
| `ev-s2-social-fabric` | `[]` — social survey, no spatial act |
| `ev-s3-water-yield` | watercourse, spring, catchment, storage, wells |
| `ev-s3-waste-cycling` | soil, compost, zone, watercourse |
| `ev-s3-energy-potential` | sun-sector, wind-sector, watercourse, vegetation, power |
| `ev-s3-infra-condition` | buildings, barns, roads, path, power, water-lines |
| `ev-s4-settlement-strategy` | `[]` — phasing/sequencing decision |
| `ev-s4-infra-strategy` | `[]` — strategy/governance decision |
| `ev-s4-housing-cluster` | zone, buffer-ring |
| `ev-s4-food-system` | `[]` — food-system strategy decision |
| `ev-s4-financial-model` | `[]` — communal financial decision (Amanah; see below) |
| `ev-s5-cluster-layout` | dwellings, zone, buffer-ring, path, fire-sector |
| `ev-s5-communal-systems` | buildings, barns |
| `ev-s5-sanitation-waste` | tanks, water-lines, compost, swale, buildings |
| `ev-s5-energy-system` | sun-sector, power, buildings, tanks |
| `ev-s5-food-zones` | beds, crops, orchards, water-lines, buildings, zone |
| `ev-s6-social-monitoring` | `[]` — social monitoring protocol |
| `ev-s6-maintenance-protocol` | `[]` — maintenance protocol design |
| `ev-s6-coordination-feedback` | `[]` — coordination protocol design |
| `ev-s6-external-relations` | `[]` — relations/compliance admin protocol |
| `ev-s7-settlement-plan` | `[]` — phasing decision |
| `ev-s7-financial-plan` | `[]` — communal financial decision (Amanah; see below) |
| `ev-s7-launch-sequence` | `[]` — sequencing decision |
| `ev-s7-onboarding` | `[]` — HR/protocol decision |
| `ev-s7-adaptive-management` | `[]` — review protocol |
| `ev-s7-exit-succession` | `[]` — legal/financial protocol |

13 tool-bearing · 18 intentional `[]`.

## Amanah

EV-S4.8 (financial contribution & shared economics model) and EV-S7.5 (communal
financial plan & capital contribution schedule) are **communal member cost-
sharing among co-owners** — member buy-in, ongoing levies, capital reserves —
**NOT advance sale of future yield**. They were encoded verbatim in the
catalogue per the operator's informed **2026-05-29 "encode verbatim, no gating"
authorisation** ([[fiqh-csra-erased-2026-05-04]] governs the distinction:
permitted communal cost-sharing vs. forbidden *bayʿ mā laysa ʿindak* advance
sale). The Act override maps both to an intentional `[]` — they are financial /
governance decisions with no spatial or field-log act — so **no act surface
engages a contribution instrument**. No new fiqh is re-encoded at the Act layer;
the catalogue stays the single source. Clean — mirrors how market_garden's and
livestock's CSA-flagged objectives already resolve to `[]`.

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` — EXIT 0.
- Audit re-run: 316 objectives — Gap A **80 -> 49** (ecovillage's 31 ev-* now
  covered), Gap B 0, Gap C 97 -> 112 (105 intentional / 7 default-driven;
  +18 intentional = ecovillage governance/financial/protocol objectives,
  -3 default-driven now explicitly wired).
- Bounded tests (`--pool=forks`, per-workspace):
  `actToolCoverage.test.ts` **14/14** · `objectiveObserveDomains.test.ts` **8/8**
  · `resolveProjectObjectives.test.ts` **25/25**.

## Note on the code commit

Clean capture — `71c4671f` committed via `git commit -- <explicit pathspec>`
(the off_grid `ee3af9b1` index-pollution lesson), so it took exactly the 3
intended files (`objectiveActTools.ts`, `actToolCoverage.test.ts`, the
regenerated `act-objective-coverage.md` matrix) despite heavy out-of-band
working-tree changes. **One blemish:** the commit-message body miscounts the
split as "19 grounded / 12 []"; the **authoritative split is 13 grounded / 18
intentional `[]`** (confirmed by the audit's +18 intentional delta). Code,
tests and audit are correct — only the message prose is wrong. Correcting it
needs `--amend` (forbidden on this rebased branch), so it is left for the
operator; this entry and the findings doc carry the correct counts.

## Remaining

Gap A now **49** across the remaining primary types (education, wellness). R2
(form-arm tools for the s1 vision objectives) stays deferred — it needs
operator-designed per-type form content, which must not be fabricated.
