# 2026-05-21 — Tree-planting D2/D3 catalog + cashflow card collapse-to-tooltip

**Branch.** `feat/atlas-permaculture`.
Closes the "D2 / D3 for tree-planting WorkItems" follow-up from
[2026-05-21 — Agroforestry spine](./2026-05-21-atlas-agroforestry-spine.md)
and the corresponding deferred bullet on
[ADR — Atlas habitat-features unification](../decisions/2026-05-21-atlas-habitat-features-unification.md).

## What landed

Two micro-commits (S8-D-1 → S8-D-2) shipping D2 (BOM) + D3 (cost band
+ labor) for the four tree-planting point kinds, plus a render-only
**collapse-to-tooltip** refactor of the stewardship cashflow card.

| Commit | Slice | Artifact |
|---|---|---|
| S8-D-1 | catalog + invariants | `treePlantingCatalog.ts` (4 entries, NRCS 612 + ≥1 extension citation per entry, all point geometry) + 9-case invariants test (unwired at this point) |
| this commit (S8-D-2) | economics math + spine D2/D3 + cashflow fourth loop + card collapse | `treePlantingEconomicsMath.ts` (rollup mirroring agroforestry) + `treePlantingSpineSync.ts` D2/D3 emission + 5 cashflow / spine-sync / card test extensions + `stewardshipProgramsCashflow.ts` fourth-program rollup + `StewardshipProgramsCashflowCard.tsx` 9-col → 3-col collapse with per-program `title` breakdown + ADR closure addendum |

## Why

1. **Tree-planting work-items had no BOM, no cost, no labor.** Slice
   8-A shipped the D0 spine for the four vegetation point kinds —
   stewards saw "Plant oak tree" in `PlanExecutionTrackerCard` but
   no rolled-up material line, no procurement cost band, and no
   labor estimate. The cashflow dashboard rendered nothing for the
   tree-planting program even after S8-C lit up agroforestry.
2. **Card was at 9 columns and about to hit 11.** S8-C-3 pushed
   `StewardshipProgramsCashflowCard` to 9 columns (Phase + 4
   per-program labor/cost pairs). Adding tree-planting as columns
   10–11 would have overflowed the desktop width threshold the rest
   of EconomicsPanel respects.

## Catalog shape

4 entries, each citing NRCS Conservation Practice 612 (Tree/Shrub
Establishment) + ≥1 extension source:

| Kind | Geom | Labor | Cost USD low/mid/high | Extension citation |
|---|---|---|---|---|
| `oak-tree` | point | 1.5 hr | 8 / 35 / 150 | Arbor Day Foundation + USDA Forest Service |
| `pine-tree` | point | 0.75 hr | 5 / 25 / 100 | USDA Forest Service + USDA NAC |
| `apple-tree` | point | 1.5 hr | 20 / 50 / 150 | Cornell Cooperative Extension |
| `shrub` | point | 0.5 hr | 6 / 18 / 50 | UMass Extension |

`TreePlantingSource` is a discriminated union
(`{kind:'nrcs-practice', code:'612', ref}` |
`{kind:'extension', org, ref}`) — structured, not free-text, so the
same downstream "show only NRCS-citable" filter envelope used by
habitat-feature + agroforestry catalogs transfers without
modification.

## Collapse-to-tooltip refactor

The card render changed from 9 columns:

```
Phase | CC labor | CC cost | HF labor | HF cost | AF labor | AF cost | Combined labor | Combined cost
```

to 3:

```
Phase | Labor (hrs) | Cost (USD)
```

Each non-Phase cell carries a `title="..."` attribute with the four
per-program subtotals on newline-joined lines
(`"Cover-crop: …\nHabitat: …\nAgroforestry: …\nTree-planting: …"`).
The data model on `PhaseCashflowRow` retains all four
`ProgramSubtotal` fields — the collapse is purely a render concern,
so the rollup remains losslessly addressable for future consumers
(e.g. a CSV export, a richer ARIA-grade tooltip, or a drill-down
modal). The native `title` attribute is read by most screen readers;
upgrading to a richer tooltip primitive is a follow-up.

## Stewardship sovereignty

The user places the tree point. The system never auto-infers one.
D3 stays strictly project cost / labor tracking, not financing.
National-average bands ship; regional refinement is a follow-up.

## Verification

- `cd apps/web && npx vitest run src/features/economics
  src/features/vegetation src/features/biodiversity
  src/features/coverCrops` — **294 passing across 26 files** (+9
  tree-planting catalog, +5 tree-planting economics math, +5
  spine-sync extension cases, +3 cashflow math, +1 card render with
  breakdown assertion).
- Covenant grep across the four new files (catalog, economics math,
  two test files) + the modified seeder / cashflow / card files:
  matches only on the in-file disclaimer line.
- Branch divergence check before each push.

## Out of scope / next

- D1 predecessor auto-edges for tree-planting — no host concept
  analogous to habitat's `hostTreeFeatureId`; tree-planting IS the
  host. No follow-up planned.
- Inline-popover UI for per-kind catalog overrides (cultivar,
  container size, root-stock, age class) — schema-level only this
  slice; overrides ride the existing `WorkItem.overridden` flag.
- Region-specific cost adjustment — national-average bands ship.
- Surfacing the structured `TreePlantingSource[]` array in any UI —
  future "show citations" panel.
- Richer ARIA-grade tooltip primitive — native `title` attribute is
  the v1 choice. Touch-device interaction for the per-program
  breakdown is also deferred.
