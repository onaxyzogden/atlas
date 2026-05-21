# 2026-05-21 — Agroforestry (hedgerow / orchard / silvopasture) WorkItem spine

**Branch.** `feat/atlas-permaculture`.
Closes the "line / polygon vegetation deferred" follow-up from
[ADR — Atlas habitat-features unification](../decisions/2026-05-21-atlas-habitat-features-unification.md).

## What landed

Three micro-commits (S8-C-1 → S8-C-3) shipping D0 + D2 + D3 for the
three multi-stem long-lived plantings under a single new
`'agroforestry'` `WorkItemSource` value, plus the cashflow dashboard
extension.

| Commit | Slice | Artifact |
|---|---|---|
| S8-C-1 | enum / store / helper lift | `'agroforestry'` `WorkItemSource` + `generatedFromAgroforestryElement` provenance + `workItemStore.replaceAgroforestryRows` action + `biodiversity/geometryHelpers.ts` lift (`safeLineLengthM` / `safePolygonAreaM2` / `elementScale` / `scaledCostBandFor` / `scaledMaterialsFor`) consumed by both habitat-feature and agroforestry catalogs |
| S8-C-2 | catalog / seeder / economics / wiring | `agroforestryCatalog.ts` (3 entries, NRCS + extension citations) + `agroforestrySpineSync.ts` (`agf__<id>` ids, geometry-type guard, D0+D2+D3 emission) + `agroforestryEconomicsMath.ts` + `PlanLayout.tsx` third signature-keyed `useEffect` |
| this commit (S8-C-3) | cashflow + card + ADR | `stewardshipProgramsCashflow.ts` third per-phase column + `StewardshipProgramsCashflowCard.tsx` two new columns + 3 cashflow math test cases + 1 card render case + ADR closure addendum |

## Why

1. **Line / polygon vegetation had no D0 row.** Tree-planting (S8-A)
   shipped point kinds only — `oak-tree` / `pine-tree` / `apple-tree`
   / `shrub` emit `tree__<id>` WorkItems but the three multi-stem
   plantings (`hedgerow`, `orchard`, `silvopasture`) emitted nothing.
   Stewards saw them on the canvas but no install task appeared in
   `PlanExecutionTrackerCard`.
2. **Cashflow dashboard was silent on agroforestry.**
   `stewardshipProgramsCashflow` only iterated `'habitat-feature'`
   items. The steward question — "what will the hedgerow + orchard
   cost across Year 0–1?" — stayed unanswerable until S8-C lit up
   the third column.

## Catalog shape

3 entries, each citing ≥1 NRCS practice code + ≥1 extension source:

| Kind | Geom | Labor | Cost USD low/mid/high | Citations |
|---|---|---|---|---|
| `hedgerow` | line | 0.10 hr/m | 1.5 / 4.0 / 9.0 per m | NRCS CP422 + CP380 + Xerces |
| `orchard` | polygon | 0.06 hr/m² | 0.4 / 1.1 / 3.0 per m² | NRCS CP666 + USDA NAC + Cornell Coop. Extension |
| `silvopasture` | polygon | 0.04 hr/m² | 0.2 / 0.55 / 1.4 per m² | NRCS CP379 + USDA NAC + UMass Extension |

`AgroforestrySource` is a discriminated union (`nrcs-practice` |
`extension`) — structured, not free-text, so downstream "show only
NRCS-citable" filters can consume the data without prose parsing.

## Helper lift

`safeLineLengthM` / `safePolygonAreaM2` and the three habitat-catalog
scaling helpers (`habitatElementScale`, `scaledCostBand`,
`scaledMaterials`) were lifted into a shared
`apps/web/src/features/biodiversity/geometryHelpers.ts` under generic
names (`elementScale`, `scaledCostBandFor`, `scaledMaterialsFor`).
Habitat-feature catalog now imports from the helper file and
re-exports the original public names — zero behavior change, full
backward compatibility for downstream callers.

## Stewardship sovereignty

The user places the line / polygon. The system never auto-infers it.
D3 stays strictly project cost / labor tracking, not financing.
National-average bands ship; regional refinement is a follow-up.

## Verification

- `cd apps/web && npx vitest run src/features/economics
  src/features/vegetation src/features/biodiversity
  src/features/coverCrops` — **273 passing across 24 files** (+5
  agroforestry economics math, +9 agroforestry catalog, +7 agroforestry
  spine-sync, +3 cashflow math, +1 card render).
- `cd packages/shared && npx vitest run` — 318 passing across 21 files
  with the `'agroforestry'` enum + `generatedFromAgroforestryElement`
  field additions.
- Covenant grep across the six new files (catalog, seeder, economics
  math, three test files) + the two modified economics files:
  matches only on the in-file disclaimer line ("No riba / gharar /
  CSRA / salam / investor / financing / cost-of-capital semantics").
- Branch divergence check before each push.

## Out of scope / next

- D1 predecessor auto-edges for agroforestry (e.g. "establish orchard
  polygon after the irrigation phase completes") — the habitat-feature
  S8-B `hostTreeFeatureId` pattern doesn't transfer cleanly to line /
  polygon plantings; deferred to a future slice if needed.
- Inline-popover UI for agroforestry kind metadata (per-tree spacing,
  cultivar list, row orientation) — schema-level only this slice.
- Region-specific cost adjustment — national-average bands ship.
- Surfacing the structured `AgroforestrySource[]` array in any UI —
  future "show citations" panel.
- D2 / D3 for tree-planting WorkItems — still empty `materialsAuto`,
  no `costRangeAuto` / `laborHrs`; a future S8-D may author a
  tree-planting catalog mirroring `habitatFeatureCatalog`.
