# 2026-05-21 — Habitat-feature D1 host-tree auto-edges + cashflow dashboard

**Branch.** `feat/atlas-permaculture`.
Closes the D1 + cashflow follow-ups from
[ADR — Atlas habitat-features unification](../decisions/2026-05-21-atlas-habitat-features-unification.md).

## What landed

Five micro-commits (S7-A → S8-B) shipping the combined cover-crop +
habitat-feature phase-cashflow dashboard and the host-tree D1
predecessor projection.

| Commit | Slice | Artifact |
|---|---|---|
| `58754c5a` | S7-A | `stewardshipProgramsCashflow.ts` + math test (6 cases) |
| `7e8ffb4d` | S7-B | `StewardshipProgramsCashflowCard.tsx` + card test + `EconomicsPanel` mount |
| `aeb0ce9d` | S8-A-1 | `'tree-planting'` `WorkItemSource` + `generatedFromTreeElement` provenance + `replaceTreePlantingRows` store action |
| `01d1fdb4` (bundled) | S8-A-2 | `treePlantingSpineSync.ts` + 6 vitest cases + `PlanLayout` signature-keyed `useEffect` host wiring |
| this commit | S8-B | `habitatMetadata.hostTreeFeatureId` schema field + `habitatFeatureDependencyGraph.ts` + `seedHabitatFeatureWorkItems` D1 projection + ADR addendum |

## Why

1. **Cashflow per-phase.** The cover-crop and habitat-feature
   economics rollups each returned a single project total + a per-kind
   / per-species `Map`. Neither bucketed by `WorkItem.phaseId`, so the
   steward could not answer "what will Year 0–1 of stewardship cost me
   across cover-crop seeding + habitat-feature installs?" The new
   `computeStewardshipProgramsCashflow` helper joins both rollups by
   declared `BuildPhase.order`, projects the cover-crop flat-USD into
   a degenerate `CostRange`, and surfaces the per-phase split + total
   in a dedicated card under the Costs tab.

2. **D1 host-tree edges.** "Install owl box only after host tree is
   planted" is a natural `dependsOnAuto` projection, but two
   prerequisites were missing: (a) the DesignElement schema had no
   field to declare the host-tree linkage, and (b) tree DesignElements
   didn't emit WorkItems, so `dependsOnAuto` had no target id.
   Slice 8 closes both: the tree-planting seeder (S8-A) provides the
   target, and `habitatMetadata.hostTreeFeatureId` (S8-B) carries the
   steward-named linkage. `habitatFeatureDependencyGraph` validates
   the host as a placed vegetation-category point with a
   tree-planting kind before projecting the edge into
   `WorkItem.dependsOnAuto`. Missing / non-vegetation / non-point /
   non-tree-kind hosts silently collapse to `dependsOnAuto: []`.

## Stewardship sovereignty

The user places features + names host trees. The system never
auto-infers either linkage. A future inline-popover slice can wrap
the `hostTreeFeatureId` field in a constrained picker (vegetation
point kinds only); for now the field is set via the
`designElementsStore` directly.

## Verification

- `cd apps/web && npx vitest run src/features/biodiversity
  src/features/vegetation` — 119 passing across 8 files (+6 new
  dependency-graph cases, +6 tree-planting seeder cases, +1 D1
  projection case on the existing habitat-feature spine-sync suite).
- `cd apps/web && npx vitest run src/features/economics
  src/features/coverCrops` — green.
- Covenant grep across the four new files
  (`stewardshipProgramsCashflow.ts`,
  `StewardshipProgramsCashflowCard.tsx`,
  `treePlantingSpineSync.ts`, `habitatFeatureDependencyGraph.ts`):
  matches only on the in-file disclaimer line ("No riba / gharar /
  CSRA / salam / investor / financing / cost-of-capital semantics").
- Branch divergence check before each push: `0/0` versus
  `origin/feat/atlas-permaculture`.

## Out of scope / next

- Line / polygon vegetation (hedgerow, orchard, silvopasture)
  WorkItem emission — deferred to a future S8-C; those scale by
  length / area and need their own catalog before riding the spine.
- Inline-popover UI for `hostTreeFeatureId` — schema-level only this
  slice; a future popover slice can wrap the field in a constrained
  picker.
- D2 / D3 for tree-planting WorkItems — empty `materialsAuto`, no
  `costRangeAuto` or `laborHrs`; a future S8-D may author a
  tree-planting catalog mirroring `habitatFeatureCatalog`.
- Full retirement of the legacy `habitatFeatureStore` — separate ADR
  once branch stability returns.
