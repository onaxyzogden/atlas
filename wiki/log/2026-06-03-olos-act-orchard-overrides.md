# Act-stage objective->tool overrides — orchard (R1/R3)

**Date:** 2026-06-03
**Project:** [[entities/olos]] / Atlas (`atlas/`, repo `onaxyzogden/atlas`)
**Branch:** `feat/atlas-permaculture`
**Commit:** `da4a96f2`
**Follows:** [[log/2026-06-03-olos-act-market-garden-overrides]] (market_garden R1/R3)
**ADR:** [[decisions/2026-06-03-olos-act-objective-coverage-audit]]

## What happened

Fourth per-type catalogue wired in the Act-stage objective->tool coverage
remediation, after homestead, regenerative_farm and market_garden. Authored
explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries for all 30 orchard objectives
in [[entities/shared-package]]
(`packages/shared/src/relationships/objectiveActTools.ts`) — the 25 `orch-*`
primary objectives plus the 5 `orch-sec-*` standalone *additive* objectives
(which surface when orchard is a secondary type, the same situation that forced
the silvopasture-secondary overrides) — and extended the
[[entities/act-tier-shell]] conformance test
(`apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts`) with an
orchard ratchet assertion over the primary + secondary union.

The 4 `ORCHARD_SECONDARY_PATCHES` inject items into universal objectives
(`s4-water-strategy`, `s5-soil-improvement`, `s2-ecology`, `s7-phase1`) that
already carry universal overrides, so they needed no new entry.

## Why it mattered

Before this, the orchard objectives fell through to the coarse
`STRATUM_ACT_TOOLS_DEFAULT` with the familiar misfit:

- S3 rootzone-depth / pest-disease-pressure surfaced **access-utilities** tools.
- S4 / S5 perennial design (water-strategy, planting-layout, guild-plan,
  tree-protection) surfaced **roads/fencing** or the **water-line** set instead
  of orchard / vegetation / frost / guild tools.

## The 30 mappings

Grounded-candidate method — every tool id verified against a real orchard
checklist item AND confirmed present in `ACT_TOOL_CATALOG`:

| Objective | Tools |
|---|---|
| `orch-s1-species-philosophy` | `[]` — design-philosophy decision |
| `orch-s1-production-intent` | `[]` — production-intent decision |
| `orch-s1-provenance-sourcing` | `[]` — sourcing decision (off-site) |
| `orch-s2-tree-cover` | vegetation, orchards |
| `orch-s2-frost-drainage` | frost-pocket, drainage, sun-sector |
| `orch-s2-landscape-context` | neighbour-pin, hazard-zone, wind-sector, catchment, wildlife-sector |
| `orch-s3-rootzone-depth` | soil, drainage, transect |
| `orch-s3-water-availability` | watercourse, spring, catchment, storage |
| `orch-s3-pest-disease-pressure` | vegetation, wildlife-sector, hazard-zone, soil |
| `orch-s4-species-mix` | `[]` — species selection (sited in s5) |
| `orch-s4-water-strategy` | water-lines, storage |
| `orch-s4-guild-planting` | vegetation, wildlife-sector |
| `orch-s4-succession-management` | `[]` — temporal management decision |
| `orch-s4-pest-disease-management` | vegetation, wildlife-sector |
| `orch-s5-planting-layout` | orchards, zone, frost-pocket |
| `orch-s5-guild-plan` | orchards, vegetation |
| `orch-s5-establishment-irrigation` | water-lines, tanks |
| `orch-s5-access-harvest` | path, roads, buildings |
| `orch-s5-tree-protection` | fencing, buffer-ring |
| `orch-s6-phenological-monitoring` | frost-pocket, harvest, transect |
| `orch-s6-pest-disease-monitoring` | transect, wildlife-sector |
| `orch-s6-adaptive-management` | `[]` — review protocol decision |
| `orch-s7-planting-establishment` | `[]` — sequencing / readiness gate |
| `orch-s7-succession-plan` | `[]` — long-term planning decision |
| `orch-s7-financial-viability` | `[]` — financial, Amanah-clean (ORCH-S7.6) |
| `orch-sec-s2-climate-chill-fit` | frost-pocket, sun-sector, hazard-zone |
| `orch-sec-s4-species-pollination` | `[]` — cultivar / pollination selection |
| `orch-sec-s5-guild-layout` | orchards, vegetation, zone |
| `orch-sec-s6-perennial-care` | `[]` — management commitment / resourcing |
| `orch-sec-s6-harvest-pathway` | harvest, buildings |

19 tools · 11 intentional `[]`.

`orch-s5-guild-plan` and `orch-sec-s5-guild-layout` carry
`legacyCardSectionId: 'plan-guild-builder'`; both get orchard + vegetation
placement tools (the latter also a guild management `zone`).

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` — EXIT 0.
- Audit re-run: 316 objectives — Gap A **219 -> 194** (the 25 orch-* primary
  enumerated by the audit; the 5 orch-sec-* additive are wired + ratcheted but
  not separately enumerated by the per-type audit walk), Gap B 0, Gap C 52 -> 58
  (36 intentional / 22 default-driven; +9 intentional = orchard primary
  decision/financial objectives, -3 default-driven now explicitly wired).
- Bounded tests (`--pool=forks`, per-workspace):
  `actToolCoverage.test.ts` **9/9** · `objectiveObserveDomains.test.ts` **8/8**
  · `resolveProjectObjectives.test.ts` **25/25**.

## Remaining

Gap A now 194 across the other 9 primary types. R2 (form-arm tools for the s1
vision objectives) stays deferred — it needs operator-designed per-type form
content, which must not be fabricated.
