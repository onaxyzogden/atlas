# 2026-05-12 — Continuous point placement for Plan trees


**Why.** Placing a tree from the Plan palette was one-shot — every click
disarmed the tool, so a 30-tree orchard meant 30 round-trips through the
palette.

**What.** New `useContinuousPointDrawTool` hook bypasses MapboxDraw for
`drawMode: 'draw_point'` kinds and keeps the tool armed across many
single clicks; double-click (4 px / 260 ms tolerance) or Esc exits.
`useDesignElementDrawTool` branches on `isPoint`; `useMapboxDrawTool`
gained an `enabled` flag so both hooks call unconditionally and the
right one binds. Sequential letter labels (A → B → C…) read live from
`getDesignElementsForProject` per click so the count never lags React
render. Polygon / line kinds untouched (dblclick already means
"finish polygon" there). ADR
`2026-05-12-atlas-plan-continuous-point-placement.md`.
