# Atlas Plan · Module 2 (Water) — BUILD_FRESH per Permaculture Scholar verdict

**Date:** 2026-05-07
**Branch:** `feat/atlas-permaculture`
**Type:** decision · iteration step (Module 2 of 8 in plan-stage Scholar review)

## Context

Second module in the Plan-stage Permaculture Scholar adjudication loop
(NotebookLM `5aa3dcf3-…`). Atlas's incumbent is three loosely-coupled
form cards: rational-method runoff calculator, length-only swale log,
capacity-only storage log. OGDEN's prototype is five visually rich
pages with mocked civil-engineering numbers (hydrographs, Q10
discharge, RUSLE soil-loss tables).

## Scholar verdict

**BUILD_FRESH.** Both options miss. Direct quotes:

- Atlas current is "too abstract and non-spatial. Form-based logs and
  disconnected calculators fail to help a steward visualise how water
  actually moves across their specific terrain."
- OGDEN is "over-engineered. While beautifully spatial, it leans
  heavily into civil engineering (hydrographs, Q10 discharge, RUSLE
  soil-loss rows). Permaculture prioritises 'Observe and Interact' and
  practical implementation over exhaustive quantitative modelling."

Architectural insight (verbatim):

> "Build a map-centric tool where users draw polygons (catchments) and
> polylines (swales/overflows) that are linked together. The core data
> state should be a directed graph of water nodes (Roofs → Tanks →
> Swales → Ponds), where each node calculates its volume (V = C × P × A)
> and passes the excess capacity along its overflow edge to the next
> node down the topographic slope."

The validation rule, also verbatim: *"Make sure OVERFLOW is noted for
every RAIN BARREL, RAINGARDEN, SWALE, POND, or other WATER
HARVESTING/STORAGE element."*

## Build-fresh sketch (executed — scope option (b), v1)

User chose option **(b) scaled v1 BUILD_FRESH**: keep the directed
graph + mandatory overflow as the irreplaceable architectural insight;
defer map-draw integration to a follow-up so this iteration ships in
one session.

Schema extension to `waterSystemsStore`:

- New `WaterNode` type with `kind: 'catchment' | 'storage' | 'swale' |
  'sink'` plus surface, capacity, and L×W×D fields.
- Mandatory `overflowToNodeId: string | 'offsite' | null` on every
  non-sink node; remove cascades to null any inbound edges.
- Persist version bumped 2 → 3 with a backfill migration.

Three new cards under `apps/web/src/v3/plan/cards/water-management/`:

1. **`WaterCatchmentsCard.tsx`** — define source nodes (roof / paved /
   pasture / forest) by area and surface coefficient. Site annual
   precipitation is read from `siteDataStore` climate layer when
   present, with a per-card override input. Per-row yield computed
   from `V = Area × P × C` and aggregated.

2. **`WaterStorageCard.tsx`** — add storage / swale / sink nodes. The
   add form *forces* an overflow target before commit (another node or
   the literal `offsite`). Inline overflow-target dropdown on every
   row so the steward can re-route after the fact. Swale capacity
   derived from `L × W × D`.

3. **`WaterNetworkCard.tsx`** — directed-graph SVG laid out top-down
   (catchments → storage → swales → sinks). Edge thickness scales with
   annual flow. Annual balance panel (total yield, retained on-site,
   off-site loss). Validation panel flags orphan nodes (overflow not
   set) and any cycles detected by depth-bounded traversal.

Shared math helper `waterMath.ts`:

- `DEFAULT_COEFF` table for the five surfaces.
- `catchmentYieldM3()` and `effectiveCapacityL()` per-node.
- `computeFlow()` — single-pass DFS from each catchment, capping each
  storage/swale at capacity and spilling the remainder downstream;
  rejects cycles and depth > 32; returns `{ inflowL, retainedL,
  overflowL, offsiteLossL, cycleNodes }`.

## Wiring

- `types.ts` — `MODULE_CARDS['water-management']` swapped from the
  three legacy `sectionId`s to `plan-water-catchments` /
  `plan-water-storage` / `plan-water-network`.
- `PlanModuleSlideUp.tsx` — three lazy imports + switch cases
  re-routed.
- `PlanChecklistAside.tsx` — water-management WHY/HOW rewritten to
  cite Mollison ch.7 + the directed-graph framing.
- Atlas legacy cards at `features/plan/RunoffCalculatorCard.tsx`,
  `SwaleDrainTool.tsx`, `StorageInfraTool.tsx` retained — still
  referenced by `V3PlanPage` and `DashboardRouter`. The legacy
  `earthworks` and `storageInfra` collections in
  `waterSystemsStore` also remain; the new `waterNodes` collection
  is independent.

## Verification

- `npm run typecheck` — clean.
- `npm run build` (`NODE_OPTIONS=--max-old-space-size=8192`) — pending
  at time of writing; will be run before commit.

## Follow-ups (deferred from option (a))

- **Map-draw integration:** polygon tool for catchments, polyline
  tool for swales/overflows. Atlas's draw infrastructure lives in
  OBSERVE; needs re-mounting on the Plan map.
- ✅ **Topographic context (summary fields)** — landed 2026-05-07.
  `WaterCatchmentsCard` now reads the elevation layer from
  `siteDataStore` and surfaces a Yeomans-grounded "Topographic
  context" panel at the top of the card: elevation range + mean,
  mean slope (with max), predominant aspect (labelled as the
  downslope direction). One-line callout cites Yeomans's Scale of
  Permanence ("Climate & Landform precede Water") so the steward
  reads landform *before* sizing catchments. Falls back to an
  "Observe fetch needed" prompt when the elevation layer isn't yet
  populated. Contour overlay + ridge/valley auto-trace remain
  deferred — those need raster work, not just summary fields.
- ✅ **Peak-event sizing** — landed 2026-05-07. `WaterNetworkCard`
  gains a "Peak-event sizing" panel between Annual balance and
  Validation. Steward enters a design-storm depth (default 100 mm /
  24 hr — coarse NOAA Atlas-14 100-yr mid-latitude NA figure); card
  computes peak inflow as `Σ Area × stormDepth × C` over catchments
  and compares against the sum of effective storage capacities
  (`effectiveCapacityL` per non-catchment node, swales via L×W×D).
  When peak > capacity the row reads "undersized — N L must spill to
  emergency overflow" in warning red plus a Yeomans-grounded callout
  recommending capacity expansion or a non-erosive vegetated
  spillway. Reuses the existing `catchmentYieldM3` math — no new
  helper. Cites Mollison ch.7 + USDA NRCS TR-55.
- **Migrate legacy `earthworks` and `storageInfra` collections** into
  `waterNodes` once `V3PlanPage` and `DashboardRouter` no longer
  reference the old features/plan/* cards.
