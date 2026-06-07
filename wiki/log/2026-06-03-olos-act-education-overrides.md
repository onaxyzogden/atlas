# Act-stage objective->tool overrides — education (R1/R3)

**Date:** 2026-06-03
**Project:** [[entities/olos]] / Atlas (`atlas/`, repo `onaxyzogden/atlas`)
**Branch:** `feat/atlas-permaculture`
**Commit:** `ac98a686` (code) + docs commit
**Follows:** [[log/2026-06-03-olos-act-ecovillage-overrides]] (ecovillage R1/R3)
**ADR:** [[decisions/2026-06-03-olos-act-objective-coverage-audit]]

## What happened

Tenth per-type catalogue wired in the Act-stage objective->tool coverage
remediation, after homestead, regenerative_farm, market_garden, orchard,
livestock_operation, conservation, off_grid, agritourism and ecovillage.
Authored explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries for all 22 education
objectives in [[entities/shared-package]]
(`packages/shared/src/relationships/objectiveActTools.ts`) — the 22 `edu-*`
primary objectives. Education is **primary-only** (no standalone secondary
layer, no patches), so this is a primary-only wiring, and the
[[entities/act-tier-shell]] conformance test
(`apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts`) gains a
primary-only ratchet assertion (like homestead / regen-farm / market-garden /
conservation / off-grid / agritourism / ecovillage).

## Why it mattered

Before this, the education objectives fell through the coarse
`STRATUM_ACT_TOOLS_DEFAULT` with the familiar misfit:

- The **S2/S3 site & demo surveys** (teaching infrastructure, learning
  potential, landscape vectors, learner access & safety, demo baseline)
  surfaced the **access-utilities** set instead of structure (buildings),
  zoning (zone), survey (soil/vegetation/crops) and safety (hazard-zone/
  fencing/path) tools.
- The **S4/S5 teaching-zone & demo-plot design block** (teaching-zone
  allocation, safety-risk framework, teaching spaces, demo plots & signage,
  learner amenity, food & kitchen) surfaced generic access tools rather than
  the structure (buildings/barns), zoning (zone) and water (water-lines)
  families the checklists call for.

## The 22 mappings

Grounded-candidate method — every tool id verified against a real education
checklist item AND confirmed present in `ACT_TOOL_CATALOG`:

| Objective | Tools |
|---|---|
| `edu-s1-mission-audience` | `[]` — mission/audience decision |
| `edu-s1-curriculum-programs` | `[]` — curriculum/program decision |
| `edu-s1-regulatory-framework` | `[]` — regulatory hard gate, no spatial act |
| `edu-s2-teaching-infrastructure` | buildings, zone, path, note |
| `edu-s2-learning-potential` | soil, watercourse, vegetation, crops, note |
| `edu-s2-landscape-vectors` | neighbour-pin, catchment, hazard-zone, note |
| `edu-s3-learner-access-safety` | path, hazard-zone, parking, fencing, buildings |
| `edu-s3-demo-baseline` | soil, crops, vegetation, water-lines |
| `edu-s4-teaching-zone-allocation` | buildings, zone, path, beds |
| `edu-s4-safety-risk-framework` | hazard-zone, fencing, path |
| `edu-s4-program-delivery` | `[]` — delivery-model decision |
| `edu-s4-food-hospitality` | `[]` — food strategy decision (infra in S5) |
| `edu-s5-teaching-spaces` | buildings, zone |
| `edu-s5-demo-plots-signage` | beds, crops, path, note |
| `edu-s5-learner-amenity` | buildings, water-lines, zone |
| `edu-s5-food-kitchen` | buildings, barns |
| `edu-s6-program-evaluation` | `[]` — monitoring protocol |
| `edu-s6-external-relations-compliance` | `[]` — admin/compliance protocol |
| `edu-s6-adaptive-management` | `[]` — review protocol |
| `edu-s7-program-launch` | `[]` — phasing hard gate |
| `edu-s7-instructor-onboarding` | `[]` — HR protocol |
| `edu-s7-financial-viability` | `[]` — financial, clean (see Amanah) |

11 tool-bearing - 11 intentional `[]`.

## Amanah

EDU-S7.6 (financial viability) is ordinary **fee-for-service / break-even
budgeting** — course fees, grants — with no riba, no gharar and no advance
sale of undelivered service. The Act override maps it to an intentional `[]`
(a financial decision with no spatial or field-log act), so **no act surface
engages a money instrument**. The catalogue's three hard gates (EDU-S1.6
regulatory-framework, EDU-S4.5 safety-risk-framework, EDU-S7.4 program-launch)
remain honoured at the catalogue layer; the Act layer maps the two pure-
decision gates to `[]` and gives safety-risk-framework its spatial half
(hazard-zone/fencing/path). No new fiqh is re-encoded at the Act layer; the
catalogue stays the single source. Clean.

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` — EXIT 0.
- Audit re-run: 316 objectives — Gap A **49 -> 27** (education's 22 edu-* now
  covered), Gap B 0, Gap C 112 -> 120 (116 intentional / 4 default-driven;
  +11 intentional = education decision/financial/protocol objectives,
  -3 default-driven now explicitly wired).
- Bounded tests (`--pool=forks`, per-workspace):
  `actToolCoverage.test.ts` **15/15** · `objectiveObserveDomains.test.ts` **8/8**
  · `resolveProjectObjectives.test.ts` **25/25**.

## Note on the code commit

Clean capture — `ac98a686` committed via `git commit -- <explicit pathspec>`,
so it took exactly the 3 intended files (`objectiveActTools.ts`,
`actToolCoverage.test.ts`, the regenerated `act-objective-coverage.md` matrix)
despite out-of-band working-tree changes. The commit-message body states the
correct **11 grounded / 11 intentional `[]`** split (the ecovillage `71c4671f`
miscount lesson applied — the count was double-checked against the audit's +11
intentional delta before committing).

## Remaining

Gap A now **27** across the last remaining primary type (wellness). R2 (form-
arm tools for the s1 vision objectives) stays deferred — it needs operator-
designed per-type form content, which must not be fabricated.
