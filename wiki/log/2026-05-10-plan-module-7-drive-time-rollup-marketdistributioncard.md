# 2026-05-10 — Plan Module 7 drive-time rollup (MarketDistributionCard)


Closed the last unimplemented Module 7 sub-feature from the
[broiler-product-map ADR](decisions/2026-05-10-atlas-plan-module7-broiler-product-map.md):
the drive-time rollup on `MarketDistributionCard`. The other two
diagnostic cards (`SlaughterThroughputCard`, `ColdChainCoverageCard`)
were already wired to `agribusinessStore`; the market card had the
kind-breakdown and concentration readouts but no distance-aware
output despite the ADR calling for one.

Implementation: `turf.distance` from a great-circle centroid of the
project's `slaughterPoints` (acts as a single-hop hub proxy for "the
line") to each `marketNode`, multiplied by a steward-tunable detour
multiplier (default 1.3 for rural road meander) and divided by a
steward-tunable avg speed (default 60 km/h) → drive minutes. Renders
as a sorted list (ascending by minutes) under the existing kind grid
with an avg-drive-time readout. Falls back to a "Place a Slaughter
point to compute" empty state when no hub exists.

Verified in preview by seeding `localStorage['ogden-agribusiness']`
with 1 slaughter point, 1 freezer, and 3 market nodes across a
~15 km spread, then opening the Broiler Product Map module on the
`mtc` project. All three cards reacted correctly:

- Slaughter throughput: 200 birds/day capacity vs. 50 required (4× headroom, `ok`).
- Cold-chain coverage: 8.0 m³ / 2.88 m³ = 278 % (`ok`).
- Market distribution: drive-times sorted Farmstand 0.6 km / 1 min → Tavern 8.5 km / 9 min → Downtown Coop 15.2 km / 15 min; verdict `undersold` at 69 % demand coverage.

`preview_screenshot` timed out twice (Mapbox tile loading blocking
the headless renderer); DOM `innerText` extraction used as proof
instead per the "if the screenshot tool is unresponsive, say so"
convention.
