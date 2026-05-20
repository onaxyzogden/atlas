# 2026-05-13 — Plan: temporal slider (succession & maturity) v1


**Closed.** Permaculture-alignment Rec #2 (P0) — Holmgren P9 (*Use small
and slow solutions*). Atlas's canvas was temporally flat; saplings and
mature canopies rendered identically. Now ships a Year 1..50 scrubber
in the bottom canvas chrome that scales placed vegetation point trees
on both Current 2D (`circle-radius` via feature-state) and Vision 3D
(deck.gl `ScenegraphLayer` per-instance scale). A forward-overlap
evaluator (`findOverlaps`, lookahead 5 y) lights a fired-clay stroke on
crowding pairs and lists them in the new lazy `TemporalCoherenceCard`
(Plant Systems module). New `metadata.designHorizonYears` (default 20)
+ `getDesignHorizon` accessor lets the steward pin a planning horizon;
slider's "↺" snaps to it. New shared subpath
`packages/shared/src/succession/` (`speciesData`, `growthCurves`,
barrel + 8 vitest specs) hosts the per-kind `GrowthCurve` table (oak,
pine, apple, shrub) with linear interpolation clamped to
`matureAtYears`. ADR:
[2026-05-13 atlas-temporal-slider](decisions/2026-05-13-atlas-temporal-slider.md).
Verification: shared 8/8, apps/web math 4/4, tsc clean except the
pre-existing `DesignElementLayers.tsx` Geometry-width error (unchanged).
