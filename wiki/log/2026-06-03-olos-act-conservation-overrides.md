# Act-stage objective->tool overrides — conservation (R1/R3)

**Date:** 2026-06-03
**Project:** [[entities/olos]] / Atlas (`atlas/`, repo `onaxyzogden/atlas`)
**Branch:** `feat/atlas-permaculture`
**Commit:** `923464a0` (code) + docs commit
**Follows:** [[log/2026-06-03-olos-act-livestock-overrides]] (livestock_operation R1/R3)
**ADR:** [[decisions/2026-06-03-olos-act-objective-coverage-audit]]

## What happened

Sixth per-type catalogue wired in the Act-stage objective->tool coverage
remediation, after homestead, regenerative_farm, market_garden, orchard and
livestock_operation. Authored explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries
for all 30 conservation objectives in [[entities/shared-package]]
(`packages/shared/src/relationships/objectiveActTools.ts`) — the 30 `con-*`
primary objectives. Conservation ships **no standalone secondary layer** and
**no patches**, so this is a primary-only wiring, and the
[[entities/act-tier-shell]] conformance test
(`apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts`) gains a
primary-only ratchet assertion (like homestead / regen-farm / market-garden,
not a primary+secondary union like orchard / livestock / silvopasture).

## Why it mattered

Before this, the conservation objectives fell through to the coarse
`STRATUM_ACT_TOOLS_DEFAULT` with the familiar misfit:

- S2/S3 ecological surveys (baseline condition, degradation, invasive
  distribution, hydrology, wildlife, fire history) surfaced the
  **access-utilities** / **water-line** sets instead of the
  vegetation / wildlife-sector / erosion / fire-sector / transect ecology
  tools the checklists actually call for.
- S5 restoration design (planting, habitat, water-regime, fencing) surfaced
  **roads/fencing** generically rather than the ecology + earthworks family.

The mappings reuse the regen-farm / silvopasture ecology vocabulary
(vegetation, wildlife-sector, transect, erosion, fire-sector) so the
restoration and production catalogues stay consistent.

## The 30 mappings

Grounded-candidate method — every tool id verified against a real conservation
checklist item AND confirmed present in `ACT_TOOL_CATALOG`:

| Objective | Tools |
|---|---|
| `con-s1-conservation-intent` | `[]` — vision / target-setting decision |
| `con-s1-intervention-philosophy` | `[]` — philosophy decision |
| `con-s1-tenure-covenant` | `[]` — legal-instrument decision |
| `con-s2-baseline-condition` | vegetation, zone, transect, wildlife-sector |
| `con-s2-degradation-history` | erosion, soil, drainage, hazard-zone |
| `con-s2-landscape-context` | neighbour-pin, wildlife-sector, vegetation, catchment |
| `con-s2-invasive-distribution` | vegetation, wildlife-sector, hazard-zone |
| `con-s3-water-regime-degradation` | drainage, watercourse, sink, runoff-path |
| `con-s3-soil-biology-seedbank` | soil, transect |
| `con-s3-wildlife-presence` | wildlife-sector, transect |
| `con-s3-fire-history` | fire-sector, vegetation |
| `con-s4-restoration-priority-zones` | zone |
| `con-s4-native-species-provenance` | `[]` — species selection (sited in s5) |
| `con-s4-pest-invasive-strategy` | `[]` — method/sequence decision (sited in s5) |
| `con-s4-water-regime-restoration` | drainage, sink, watercourse |
| `con-s4-fire-management-strategy` | fire-sector, zone |
| `con-s5-native-planting-plan` | vegetation, zone, water-lines |
| `con-s5-pest-control-infrastructure` | buffer-ring, zone, path |
| `con-s5-water-regime-infrastructure` | drainage, sink, swale, watercourse |
| `con-s5-wildlife-habitat-infrastructure` | wildlife-sector, vegetation |
| `con-s5-fencing-exclusion` | fencing, gates, wildlife-sector |
| `con-s6-ecological-monitoring` | transect, wildlife-sector |
| `con-s6-pest-monitoring` | vegetation, wildlife-sector, transect |
| `con-s6-fire-monitoring` | fire-sector, transect |
| `con-s6-external-relations-compliance` | `[]` — reporting / admin protocol |
| `con-s7-phase1-priorities` | `[]` — sequencing decision |
| `con-s7-longterm-timeline` | `[]` — long-term planning decision |
| `con-s7-funding-resourcing` | `[]` — off-site funding (Amanah-flagged) |
| `con-s7-adaptive-management` | `[]` — review-protocol decision |
| `con-s7-volunteer-stewardship` | `[]` — programme / admin decision |

19 tool-bearing · 11 intentional `[]`.

## Amanah

`con-s7-funding-resourcing` (c1/c3) references conservation grants, trusts,
covenants and — flagged — **carbon credits & biodiversity credits**. These are
environmental-market instruments carrying potential gharar in credit trading;
they are encoded as catalogue content and **routed to the Scholar Council for
review**, not actioned here. The objective is an off-site funding decision and
maps to `[]` regardless. No catalogue content was reworded or omitted. The
conservation catalogue has no break-even / capital-formation / advance-sale
objective, so there is no riba or bay-ma-laysa-indak surface to flag elsewhere.

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` — EXIT 0.
- Audit re-run: 316 objectives — Gap A **171 -> 141** (conservation's 30 con-*
  now covered), Gap B 0, Gap C 66 -> 74 (58 intentional / 16 default-driven;
  +11 intentional = conservation decision/financial/admin objectives,
  -3 default-driven now explicitly wired).
- Bounded tests (`--pool=forks`, per-workspace):
  `actToolCoverage.test.ts` **11/11** · `objectiveObserveDomains.test.ts` **8/8**
  · `resolveProjectObjectives.test.ts` **25/25**.

## Note on the code commit

The code commit (`923464a0`) landed with a malformed subject line — a stray
`@ ` prefix and a trailing `@` line — caused by accidentally using PowerShell
here-string syntax (`@'...'@`) inside the git-bash shell, where it is not a
here-string. The committed **tree and full body + `Co-Authored-By` trailer are
correct**; only the subject cosmetics are affected. A fix would require
`git commit --amend` (or a soft reset), both forbidden by the standing
branch-hygiene rule on this externally-rebased branch, so it was left for the
operator to decide.

## Remaining

Gap A now 141 across the remaining primary types
(agritourism, ecovillage, education, off_grid, wellness). R2 (form-arm tools
for the s1 vision objectives) stays deferred — it needs operator-designed
per-type form content, which must not be fabricated.
