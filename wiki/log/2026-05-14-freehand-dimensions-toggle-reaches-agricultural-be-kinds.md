# 2026-05-14 — Freehand/Dimensions toggle reaches agricultural BE kinds


User reported agricultural features (barn, greenhouse, …) lacked the
Freehand/Dimensions toggle present on bespoke tools. Audit found the 5
canonical agricultural kinds (`barn`, `greenhouse`, `shed`,
`animal-shelter`, `compost`) plus 18 other non-bespoke kinds all route
through the generic `BeV2ExistingTool` at
[apps/web/src/v3/observe/components/draw/BeV2ExistingTool.tsx](../apps/web/src/v3/observe/components/draw/BeV2ExistingTool.tsx),
which was omitted from the original 2026-05-14 rollout. Same component
serves both Observe (state `existing`) and Plan (state `proposed` via
`PlanDrawHost`'s `be.<kind>` dispatch), so one edit covers both stages.

Wired the standard pattern into `BeV2ExistingTool`: gate the existing
`useMapboxDrawTool` on `isPoint || dimMode === 'freehand'`; add a
parallel `useDimensionDrawTool` gated on `!isPoint && dimMode ===
'dimensions'`; both call a shared `place(geom)` that funnels into the
unchanged `useBuiltEnvironmentStoreV2.create`. Render `<DimensionPanel
allowedShapes={['rect','circle']} />` for polygon kinds,
`allowedShapes={['line']}` for line kinds; point kinds get no panel.
Polygon/line hint strings updated to mention both modes. Decision
captured as a follow-up section appended to
[2026-05-14-atlas-freehand-dimensions-toggle.md](decisions/2026-05-14-atlas-freehand-dimensions-toggle.md).

Verified: tsc clean on the touched file; preview opened Barn,
Greenhouse, Shed, Animal Shelter, Compost Station from the Plan rail —
each rendered the expected popover (`aria-label=<kind>`, hint
`"Outline the footprint (Freehand) or set Width × Depth / Radius
(Dimensions)."`, Freehand/Dimensions toggle buttons).
