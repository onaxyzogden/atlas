---
title: Atlas Plan — Module 6 Livestock — Farm-Scholar adjudication
date: 2026-05-10
status: accepted
tags: [atlas, plan, livestock, scholar, orthodoxy, yeomans-9, newman]
---

# Module 6 Livestock — Farm-Scholar adjudication

## Context

Module 6 (Livestock & Subdivision, Yeomans rank 9, Holmgren P3 *Obtain a
yield*) was the final unadjudicated Plan-stage module. The 2026-05-07
Permaculture-Scholar sweep covered the other 8 modules. Today the **Farm
Scholar** notebook (NotebookLM `b0597846-3d6d-439c-b86d-441ae080a41e`,
corpus: Chris Newman, *First Generation Farming*) was queried with the
existing surface — 17 livestock cards, 8 slide-up tabs, the `Paddock`
schema, and the single polygon `PaddockTool`.

This ADR records the verdict and the implementation it triggers.

## Verdict — BUILD_FRESH

The Scholar names three orthodoxy violations in the current surface:

1. **Cheesecake-farm trap.** `Paddock.species[]` (sheep/cattle/goats/pigs/
   poultry/waterfowl/bees/horses/rabbits) plus `MultiSpeciesPlannerCard`
   actively encourage the over-diversified small-farm pattern Newman names
   as the #1 cause of first-generation-farm collapse. The path to food
   sovereignty per Newman is *specialization* in 1–2 product lines, not
   whole-diet farming.
2. **Agritourism out-of-scope.** `GuestSafeBufferAuditCard` violates
   Newman's definition of farming ("relying on AirBnBs or farm tours for
   viability is the stuff MLMs and Ponzi schemes are made of"). Farming
   is producing food at scale for a community, not entertaining tourists.
3. **Static-polygon limitation.** Strip and mob grazing — the workhorse
   techniques of regenerative pasture management — depend on linear,
   frequently-moved electric wire ("rolling up a single line of electric
   wire separating them from the next batch of fresh grass"). The
   single-polygon `PaddockTool` cannot represent these temporary
   subdivisions.

Plus one missing canonical concept:

- **"Eat a Third / Foul a Third / Leave a Third"** — the carrying-capacity
  rule of thumb. The forage a paddock produces ≠ what a herd actually
  eats; a third is consumed, a third is trampled / fouled / ignored
  (which is the biological engine for soil building), a third is left
  for rest and regrowth.

## Per-card adjudication

| Card | Verdict | Action |
|---|---|---|
| LivestockLandFitCard | KEEP / REVISE | Retain; future revision should add carrying-capacity weight |
| MultiSpeciesPlannerCard | KEEP w/ reframe | Relabel to "Specialization"; add advisory at species count > 2 (informational, non-blocking). Do not delete the card or schema. |
| PaddockCellDesignCard | KEEP + extend | Add "Eat a Third" carrying-capacity readout |
| FencingLayoutCard | KEEP | No change |
| AnimalTractorZonesCard | KEEP | No change |
| LivestockWelfarePhasingCard | KEEP | No change |
| BiosecurityBufferCard | KEEP | No change |
| GuestSafeBufferAuditCard | UNMOUNT | Remove from livestock slide-up tabs. **Preserve file** per "no deletion in revamps" rule — re-mountable if MTC reasserts agritourism scope. |

Off-slide-up cards (`AnimalCorridorGrazingRouteCard`,
`BrowsePressureRiskCard`, `ForageQualitySeasonalCard`,
`PastureUtilizationCard`, `PredatorRiskHotspotsCard`,
`RotationScheduleCard`, `WelfareAccessAuditCard`) are untouched in this
pass.

## Map-tool decision — add fence-line linear tool

Augment the rail with a **`FenceLine`** linear tool alongside the
existing `PaddockTool`:

- Geometry: `GeoJSON.LineString`.
- Popover fields (≤ 4): `name`, `fenceType` (electric / post-wire /
  post-rail / woven-wire / temporary / none), `mobility` (`permanent` |
  `temporary-strip`), optional `paddockId` parent pointer.
- Render: shared `plan-data-line` source. `mobility: 'temporary-strip'`
  uses `line-dasharray`; `permanent` is solid.
- Persist-first lifecycle mirroring `PaddockTool`: skeleton on
  `draw.create`, patch on Save, remove on Cancel/ESC.

This is the smallest change that gives stewards a way to draw the
moveable wire line that strip/mob grazing requires, without disturbing
the existing `Paddock` schema.

## Schema change

`livestockStore` gains an additive slice:

```ts
type FenceLineMobility = 'permanent' | 'temporary-strip';

interface FenceLine {
  id: string;
  name: string;
  geometry: GeoJSON.LineString;
  fenceType: FenceType;
  mobility: FenceLineMobility;
  paddockId?: string;
  phase: PhaseTag;
}

// store
fenceLines: FenceLine[];                   // default []
addFenceLine(line: FenceLine): void;
updateFenceLine(id: string, patch: Partial<FenceLine>): void;
removeFenceLine(id: string): void;
```

Default `[]` in hydration so existing canvases are unaffected. The
`Paddock` schema is **untouched**.

## Why not delete the Cheesecake card outright

Two reasons:

1. **"No deletion in revamps"** — preserve the file; the Steward
   Council may want to reintroduce multi-species authoring later in a
   different framing (e.g., poultry + bees as a pollinator/manure
   pairing — not a 9-species menagerie).
2. The advisory is **informational, not blocking** — Newman's argument
   is empirical (small farms with too many species burn out), not
   prescriptive. A steward who knows what they're doing can still
   author 5 species; they just see the warning.

## Out of scope (deferred follow-ups)

The Scholar identified a fourth gap that this pass does **not** close:

- **Broiler Product Map / agribusiness layer.** The whole farm-centric
  module ignores the slaughter → butchery → pack → freeze → rendering
  → market / distribution interface. Newman calls farms designed in
  isolation from the agribusiness interface "a ticking timebomb." This
  is too large for the current pass and is tracked as the next-session
  candidate after this Livestock orthodoxy pass lands.

## Files touched

- `apps/web/src/store/livestockStore.ts` — `FenceLine` type + slice.
- `apps/web/src/v3/plan/draw/tools/FenceLineTool.tsx` — new linear tool.
- `apps/web/src/v3/plan/draw/PlanDrawHost.tsx` — switch case.
- `apps/web/src/v3/plan/PlanTools.tsx` — rail entry.
- `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` — render + dasharray.
- `apps/web/src/v3/observe/components/measure/useMapToolStore.ts` —
  `MapToolId` union.
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — unmount `guest-safe`;
  relabel `species-mix` → "Specialization".
- `apps/web/src/features/livestock/MultiSpeciesPlannerCard.tsx` —
  advisory block.
- `apps/web/src/features/livestock/PaddockCellDesignCard.tsx` —
  "Eat a Third" readout.

## Related

- [2026-05-08 atlas-plan-module4-livestock](2026-05-08-atlas-plan-module4-livestock.md)
  — original PaddockTool decision; this ADR extends it with the linear
  fence-line tool.
- 2026-05-07 Permaculture-Scholar sweep (8 modules) — this ADR closes
  the orthodoxy set with a different scholar (Farm vs. Permaculture)
  whose corpus addresses the agribusiness gap that pure permaculture
  literature does not.
