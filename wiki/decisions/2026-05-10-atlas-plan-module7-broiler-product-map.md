---
title: Atlas Plan — Module 7 Broiler Product Map (post-farm-gate value chain)
date: 2026-05-10
status: accepted
tags: [atlas, plan, agribusiness, broiler, slaughter, cold-chain, market, newman, yeomans-10]
---

# Module 7 — Broiler Product Map

## Context

The [2026-05-10 Farm-Scholar Module 6 verdict](2026-05-10-atlas-plan-module6-livestock-farm-scholar.md)
explicitly named the **agribusiness layer** — slaughter → butchery →
pack → freeze → rendering → market/distribution — as out-of-scope for
the Livestock pass and tracked it as the next-session candidate.
Newman, *First Generation Farming*: a farm designed in isolation from
the agribusiness interface is *"a ticking timebomb."*

This ADR establishes the new Plan-stage module that closes that gap.

## Decision — add Module 7 "Broiler Product Map" at Yeomans rank 10

- **Placement:** between `livestock` (rank 9) and `plant-systems` in
  `PLAN_MODULES`. Yeomans' Scale of Permanence treats subdivision (9)
  as the floor of *land* design; post-farm-gate value-chain
  infrastructure sits one tick further toward malleability (rank 10,
  Atlas-specific extension — Yeomans himself stopped at 8/soil).
- **Short label:** `Broiler Map`. **Full label:** `Broiler Product Map`.
- **Module slug:** `broiler-product-map`.
- **Scope:** Spatial **and** diagnostic. Three Point draw tools, three
  non-spatial diagnostic cards.

## Surface

### Three Point draw tools (spatial)

| Tool | Geometry | Popover fields | Render |
|---|---|---|---|
| **Slaughter Point** | `Point` | `name`, `kind` (mobile / on-farm / shared / contract), `capacityBirdsPerDay` | red dot on `plan-data-point` |
| **Cold-Chain Unit** | `Point` | `name`, `kind` (freezer / chiller / blast / reefer), `capacityM3` | blue dot |
| **Market Node** | `Point` | `name`, `kind` (farmstand / wholesale / restaurant / csa-dropoff), `weeklyDemandKg` | green dot |

All three follow the **persist-first lifecycle** proven in
`FenceLineTool` and `PaddockTool` (skeleton on `draw.create`, patch on
Save, remove on Cancel/ESC).

### Three diagnostic cards (non-spatial)

| Card | Readout |
|---|---|
| **SlaughterThroughputCard** | Heads/yr × dressed-weight × line-rate → required stations vs. configured `slaughterPoints[]` |
| **ColdChainCoverageCard** | Sum `coldChainUnits[].capacityM3` vs. peak-week pack volume from throughput card → coverage % |
| **MarketDistributionCard** | `marketNodes[]` count, weekly demand vs. throughput, drive-time rollup |

Cards reuse the `MultiSpeciesPlannerCard` pattern: `{ projectId }`
prop, Zustand selector, `useMemo`-derived rollups, companion
`.module.css`.

## Why a separate `agribusinessStore`

Newman frames the value chain as a *distinct domain* from the
on-farm livestock decisions. The rank-9 / rank-10 split is real:

- `livestockStore` answers *"what animals on what land?"*
- `agribusinessStore` answers *"how does the product leave the gate?"*

Keeping the slices separate (a) preserves the Module 6 schema
untouched, (b) makes future Halal-certification overlays
(slaughter-point-specific) easy to layer on without polluting
livestock, and (c) matches the Farm-Scholar's framing.

## Schema

```ts
type SlaughterKind = 'mobile' | 'on-farm' | 'shared' | 'contract';
type ColdChainKind = 'freezer' | 'chiller' | 'blast' | 'reefer';
type MarketKind = 'farmstand' | 'wholesale' | 'restaurant' | 'csa-dropoff';

interface SlaughterPoint {
  id: string;
  name: string;
  geometry: GeoJSON.Point;
  kind: SlaughterKind;
  capacityBirdsPerDay: number;
  phase: PhaseTag;
}

interface ColdChainUnit {
  id: string;
  name: string;
  geometry: GeoJSON.Point;
  kind: ColdChainKind;
  capacityM3: number;
  phase: PhaseTag;
}

interface MarketNode {
  id: string;
  name: string;
  geometry: GeoJSON.Point;
  kind: MarketKind;
  weeklyDemandKg: number;
  phase: PhaseTag;
}
```

CRUD: `add/update/remove` per slice. All defaults `[]` so existing
canvases stay unaffected.

## Out of scope (deferred)

- **Rendering / by-product capture** as its own visual layer — folded
  into `MarketDistributionCard`'s by-product line item only. Full
  rendering module is post-MVP.
- **Mobile-Processing-Unit (MPU) routing** — Newman's later chapters
  treat MPU logistics; out of v1.
- **Halal certification overlay** on slaughter points — flagged for a
  Scholar Council review pass before any UI claim. The `kind`
  enumeration leaves room (e.g. future `kind: 'halal-certified'`)
  without committing.
- **Three-sisters / new species additions** to `plantDatabase.ts` —
  still deferred from the Livestock pass.

## Files touched

- `apps/web/src/store/agribusinessStore.ts` — new slice.
- `apps/web/src/v3/plan/draw/tools/SlaughterPointTool.tsx`
- `apps/web/src/v3/plan/draw/tools/ColdChainUnitTool.tsx`
- `apps/web/src/v3/plan/draw/tools/MarketNodeTool.tsx`
- `apps/web/src/v3/plan/draw/PlanDrawHost.tsx` — three switch cases.
- `apps/web/src/v3/plan/PlanTools.tsx` — `broiler-product-map` group.
- `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` — render the three
  kinds on `plan-data-point` (colour-coded).
- `apps/web/src/v3/observe/components/measure/useMapToolStore.ts` —
  `MapToolId` union extended.
- `apps/web/src/v3/plan/types.ts` — `PlanModule` union + `PLAN_MODULES`
  + both label maps + `MODULE_CARDS`.
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — three sectionId cases.
- `apps/web/src/features/agribusiness/SlaughterThroughputCard.tsx`
- `apps/web/src/features/agribusiness/ColdChainCoverageCard.tsx`
- `apps/web/src/features/agribusiness/MarketDistributionCard.tsx`
- Companion `*.module.css` for each card.

## Related

- [2026-05-10 atlas-plan-module6-livestock-farm-scholar](2026-05-10-atlas-plan-module6-livestock-farm-scholar.md)
  — names the agribusiness gap and tracks this module as the next
  candidate.
