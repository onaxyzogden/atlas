# Act-stage objective->tool overrides — regenerative_farm (R1/R3)

**Date:** 2026-06-03
**Project:** [[entities/olos]] / Atlas (`atlas/`, repo `onaxyzogden/atlas`)
**Branch:** `feat/atlas-permaculture`
**Commit:** `187c4f6f`
**Follows:** [[log/2026-06-03-olos-act-objective-coverage-audit]] (audit + homestead R1/R3)
**ADR:** [[decisions/2026-06-03-olos-act-objective-coverage-audit]]

## What happened

Second per-type catalogue wired in the Act-stage objective->tool coverage
remediation, after homestead. Authored explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE`
entries for all 13 `rf-*` regenerative-farm objectives in
[[entities/shared-package]] (`packages/shared/src/relationships/objectiveActTools.ts`),
and extended the [[entities/act-tier-shell]] conformance test
(`apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts`) with a
regen-farm ratchet assertion.

## Why it mattered

Before this, the 13 `rf-*` objectives fell through to the coarse
`STRATUM_ACT_TOOLS_DEFAULT` with a severe semantic misfit:

- S3 nutrient-cycling / pest-pressure surfaced **access-utilities** tools
  (roads/power/water-lines/gates/fencing/buildings).
- S4 fertility-strategy / biodiversity-strategy surfaced **roads/fencing**.
- S5 fertility-system / windbreaks surfaced the **water-line** set
  (water-lines/tanks/wells/water).

These are exactly the kind of misalignment that forced explicit silvopasture
overrides on 2026-06-01.

## The 13 mappings

Grounded-candidate method — every tool id verified against a real `rf-*`
checklist item AND confirmed present in `ACT_TOOL_CATALOG`:

| Objective | Tools |
|---|---|
| `rf-s1-enterprise-mix` | `[]` — enterprise-mix decision (gap all) |
| `rf-s2-land-health` | erosion, soil, drainage, vegetation |
| `rf-s2-landscape-context` | neighbour-pin, hazard-zone, catchment, watercourse, wildlife-sector |
| `rf-s3-nutrient-cycling` | soil, compost, fertility-unit, flow-connector |
| `rf-s3-pest-pressure` | vegetation, wildlife-sector, hazard-zone |
| `rf-s4-fertility-strategy` | compost, flow-connector |
| `rf-s4-biodiversity-strategy` | zone, wildlife-sector, vegetation, buffer-ring |
| `rf-s5-fertility-system` | compost, fertility-unit, paddocks, crops, transect |
| `rf-s5-windbreaks` | vegetation, wind-sector, wildlife-sector, fire-sector, buffer-ring |
| `rf-s6-biodiversity-monitoring` | transect |
| `rf-s6-enterprise-integration` | flow-connector, paddocks, crops |
| `rf-s7-enterprise-sequencing` | `[]` — sequencing decision |
| `rf-s7-cash-flow` | `[]` — financial, Amanah-clean (c5 confirms no capital formation) |

`rf-s4-biodiversity-strategy` is a siting+commitment decision whose actual
design executes in Stratum 5, but its scopeNotes describe a *spatial* siting
act, so it gets tools (zone/buffer-ring placement) rather than an empty rail.

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` — EXIT 0.
- Audit re-run: 316 objectives — Gap A **256 -> 243** (regen's 13 covered),
  Gap B 0, Gap C 47 -> 49 (21 intentional / 28 default-driven; +3 = the regen
  decision/financial objectives consciously set to intentional `[]`).
- Bounded tests (`--pool=forks`, per-workspace):
  `actToolCoverage.test.ts` **7/7** · `objectiveObserveDomains.test.ts` **8/8**
  · `resolveProjectObjectives.test.ts` **25/25**.

Note: the previously pre-existing `resolveProjectObjectives` agritourism count
failure (expected 54, got 59 from the `AG-S4.8` membership extension) is no
longer present — the full suite is green. Likely resolved upstream via the
external rebase / spawned count fix.

## Remaining

Gap A now 243 across the other 11 primary types (market_garden, orchard next).
R2 (form-arm tools for the ~30 s1 vision objectives) stays deferred — it needs
operator-designed per-type form content, which must not be fabricated.
