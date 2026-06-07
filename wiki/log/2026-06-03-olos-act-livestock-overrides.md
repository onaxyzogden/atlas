# Act-stage objective->tool overrides — livestock_operation (R1/R3)

**Date:** 2026-06-03
**Project:** [[entities/olos]] / Atlas (`atlas/`, repo `onaxyzogden/atlas`)
**Branch:** `feat/atlas-permaculture`
**Commit:** `7da9fe8a`
**Follows:** [[log/2026-06-03-olos-act-orchard-overrides]] (orchard R1/R3)
**ADR:** [[decisions/2026-06-03-olos-act-objective-coverage-audit]]

## What happened

Fifth per-type catalogue wired in the Act-stage objective->tool coverage
remediation, after homestead, regenerative_farm, market_garden and orchard.
Authored explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries for all 30
livestock_operation objectives in [[entities/shared-package]]
(`packages/shared/src/relationships/objectiveActTools.ts`) — the 23 `lvs-*`
primary objectives plus the 7 `lvs-sec-*` standalone *additive* objectives
(which surface when livestock is a secondary type, the same situation that
forced the silvopasture-secondary overrides) — and extended the
[[entities/act-tier-shell]] conformance test
(`apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts`) with a
livestock ratchet assertion over the primary + secondary union.

The 3 `LIVESTOCK_SECONDARY_PATCHES` inject items into universal objectives
(`s4-water-strategy`, `s5-soil-improvement`, `s5-access`) that already carry
universal overrides, so they needed no new entry.

## Why it mattered

Before this, the livestock objectives fell through to the coarse
`STRATUM_ACT_TOOLS_DEFAULT` with the familiar misfit:

- S2/S3 forage & stock-water reading surfaced **access-utilities** / the
  **water-line** set instead of pasture / stock-water tools.
- S5 paddock / fencing / handling design surfaced **roads/fencing**
  generically rather than the paddocks / gates / barns family.

The mappings reuse the silvopasture livestock vocabulary (paddocks, pasture,
fencing, gates, barns, water-lines) so the two grazing catalogues stay
consistent.

## The 30 mappings

Grounded-candidate method — every tool id verified against a real livestock
checklist item AND confirmed present in `ACT_TOOL_CATALOG`:

| Objective | Tools |
|---|---|
| `lvs-s1-enterprise-vision` | `[]` — vision decision |
| `lvs-s1-production-goals` | `[]` — targets decision |
| `lvs-s1-welfare-ethic` | `[]` — welfare-standard decision |
| `lvs-s2-forage-base` | pasture, vegetation, transect |
| `lvs-s2-stock-water-sources` | watercourse, spring, storage, wells, tanks, water-lines |
| `lvs-s2-existing-infrastructure` | fencing, barns, buildings, gates, path |
| `lvs-s3-carrying-capacity` | pasture, transect |
| `lvs-s3-health-baseline` | soil (forage/soil mineral sampling) |
| `lvs-s3-predator-risk` | wildlife-sector, hazard-zone, neighbour-pin, fire-sector |
| `lvs-s4-species-breed` | `[]` — selection |
| `lvs-s4-stocking-rate` | `[]` — formula decision |
| `lvs-s4-grazing-system` | `[]` — method decision |
| `lvs-s4-stock-water-strategy` | water-lines, storage, tanks, wells |
| `lvs-s5-paddock-layout` | paddocks, gates, path, zone |
| `lvs-s5-fencing-water` | fencing, water-lines, tanks, storage |
| `lvs-s5-handling-shelter` | barns, buildings |
| `lvs-s5-feed-budget` | `[]` — budgeting decision |
| `lvs-s6-herd-health` | `[]` — protocol decision |
| `lvs-s6-nutrient-cycling` | paddocks, compost, pasture, transect, flow-connector |
| `lvs-s6-biosecurity` | fencing, barns, neighbour-pin |
| `lvs-s7-herd-buildup` | `[]` — sequencing gate |
| `lvs-s7-break-even` | `[]` — financial, Amanah-clean |
| `lvs-s7-marketing` | `[]` — off-site marketing decision (CSA-flagged) |
| `lvs-sec-s1-enterprise-intent` | `[]` — intent decision |
| `lvs-sec-s3-carrying-capacity-fit` | pasture, vegetation, transect, zone |
| `lvs-sec-s4-species-stocking` | `[]` — selection / decision set |
| `lvs-sec-s4-stock-infrastructure` | fencing, barns, buildings, water-lines |
| `lvs-sec-s5-integration-timing` | paddocks, zone, path |
| `lvs-sec-s6-health-biosecurity` | fencing, barns, zone, neighbour-pin |
| `lvs-sec-s6-nutrient-integration` | flow-connector, compost, paddocks, zone |

17 tool-bearing · 13 intentional `[]`.

## Amanah

`lvs-s7-break-even` is ordinary establishment-to-cashflow break-even (no riba /
advance-sale) → clean `[]`. `lvs-s7-marketing` surfaces meat-share / herd-share /
CSA advance-subscription, which the catalogue encodes verbatim with the
bay-ma-laysa-indak scopeNotes flag (routed to Scholar Council, never defaulted);
it is an off-site marketing decision → `[]`. The secondary layer has no
sales-channel objective (the host owns the economics), so no advance-sale
surface there. The CSA flags were left untouched — encoding, not re-wording.

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` — EXIT 0.
- Audit re-run: 316 objectives — Gap A **194 -> 171** (the 23 lvs-* primary
  enumerated by the audit; the 7 lvs-sec-* additive are wired + ratcheted but
  not separately enumerated by the per-type audit walk), Gap B 0, Gap C 58 -> 66
  (47 intentional / 19 default-driven; +11 intentional = livestock primary
  decision/financial objectives, -3 default-driven now explicitly wired).
- Bounded tests (`--pool=forks`, per-workspace):
  `actToolCoverage.test.ts` **10/10** · `objectiveObserveDomains.test.ts` **8/8**
  · `resolveProjectObjectives.test.ts` **25/25**.

## Remaining

Gap A now 171 across the other 8 primary types. R2 (form-arm tools for the s1
vision objectives) stays deferred — it needs operator-designed per-type form
content, which must not be fabricated.
