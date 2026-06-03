# Act-stage objective->tool overrides — market_garden (R1/R3)

**Date:** 2026-06-03
**Project:** [[entities/olos]] / Atlas (`atlas/`, repo `onaxyzogden/atlas`)
**Branch:** `feat/atlas-permaculture`
**Commit:** `3c340134`
**Follows:** [[log/2026-06-03-olos-act-regen-farm-overrides]] (regen-farm R1/R3)
**ADR:** [[decisions/2026-06-03-olos-act-objective-coverage-audit]]

## What happened

Third per-type catalogue wired in the Act-stage objective->tool coverage
remediation, after homestead and regenerative_farm. Authored explicit
`OBJECTIVE_ACT_TOOLS_OVERRIDE` entries for all 24 `mgd-*` market-garden
objectives in [[entities/shared-package]]
(`packages/shared/src/relationships/objectiveActTools.ts`), and extended the
[[entities/act-tier-shell]] conformance test
(`apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts`) with a
market-garden ratchet assertion.

## Why it mattered

Before this, the 24 `mgd-*` objectives fell through to the coarse
`STRATUM_ACT_TOOLS_DEFAULT` with the same misfit class seen on regen-farm:

- S3 irrigation-water-quality / pest-pressure surfaced **access-utilities**
  tools (roads/power/water-lines/gates/fencing).
- S4 fertility / IPM strategy surfaced **roads/fencing**.
- S5 bed / wash-pack / composting infrastructure surfaced the **water-line**
  set instead of bed/compost/wash-pack tools.

## The 24 mappings

Grounded-candidate method — every tool id verified against a real `mgd-*`
checklist item AND confirmed present in `ACT_TOOL_CATALOG`:

| Objective | Tools |
|---|---|
| `mgd-s1-production-targets-sales` | `[]` — targets & sales-model decision (CSA flag, off-site) |
| `mgd-s1-growing-system-philosophy` | `[]` — philosophy decision |
| `mgd-s1-market-channels` | `[]` — channels / CSA membership decision (off-site) |
| `mgd-s2-soil-fertility-bed-potential` | soil, drainage, transect |
| `mgd-s2-water-access-irrigation` | watercourse, spring, catchment, storage, wells |
| `mgd-s2-landscape-vectors` | neighbour-pin, hazard-zone, wind-sector, catchment |
| `mgd-s3-irrigation-water-quality` | watercourse, spring, water |
| `mgd-s3-pest-disease-weed-pressure` | vegetation, wildlife-sector, hazard-zone, soil |
| `mgd-s4-crop-rotation-bed-layout` | beds, crops, zone |
| `mgd-s4-irrigation-strategy` | water-lines, zone |
| `mgd-s4-fertility-strategy` | compost, fertility-unit, crops, flow-connector |
| `mgd-s4-ipm-strategy` | vegetation, wildlife-sector, buffer-ring |
| `mgd-s4-post-harvest-handling` | buildings, barns, tanks |
| `mgd-s5-bed-growing-infrastructure` | beds, crops, path, vegetation, buildings |
| `mgd-s5-irrigation-system` | water-lines, zone |
| `mgd-s5-wash-pack-cold-storage` | buildings, barns, tanks |
| `mgd-s5-fertility-composting-infrastructure` | compost, fertility-unit |
| `mgd-s5-propagation-nursery` | buildings, beds |
| `mgd-s6-crop-yield-monitoring` | harvest, transect |
| `mgd-s6-sales-revenue-tracking` | `[]` — financial tracking, Amanah-clean |
| `mgd-s6-adaptive-management` | `[]` — review protocol decision |
| `mgd-s7-crop-calendar` | crops, frost-pocket, harvest |
| `mgd-s7-financial-viability` | `[]` — financial, Amanah-clean (MGD-S7.5) |
| `mgd-s7-season-startup-readiness` | soil |

18 tools · 6 intentional `[]`.

The CSA scopeNotes Amanah flags on `mgd-s1-production-targets-sales` (c4 sales
model) and `mgd-s1-market-channels` (c2 "CSA members") are left verbatim — both
objectives are off-site decisions that map to `[]` regardless, so no rail
content cites them.

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` — EXIT 0.
- Audit re-run: 316 objectives — Gap A **243 -> 219** (market garden's 24
  covered), Gap B 0, Gap C 49 -> 52 (27 intentional / 25 default-driven; +6
  intentional = the mgd decision/financial objectives, -3 default-driven now
  explicitly wired).
- Bounded tests (`--pool=forks`, per-workspace):
  `actToolCoverage.test.ts` **8/8** · `objectiveObserveDomains.test.ts` **8/8**
  · `resolveProjectObjectives.test.ts` **25/25**.

## Remaining

Gap A now 219 across the other 10 primary types (orchard next this session).
R2 (form-arm tools for the s1 vision objectives) stays deferred — it needs
operator-designed per-type form content, which must not be fabricated.
