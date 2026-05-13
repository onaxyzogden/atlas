---
date: 2026-05-12
title: Continuous point placement for Plan-stage trees / shrubs
status: implemented
---

# Continuous point placement (trees) — double-click to exit

## Context

Plan-stage palette tools followed a one-shot lifecycle: arm tool → single
click → drop element → `setActiveTool(null)`. Planting a 30-tree orchard
meant 30 round-trips through the palette. The user asked for continuous
mode for tree placement, with double-click as the exit gesture.

## Decision

Branch the design-element draw lifecycle on `spec.drawMode`:

- `'draw_point'` (oak / pine / apple / generic shrub) → continuous mode
  via the new `useContinuousPointDrawTool` hook. Every single click drops
  another element with the next sequential letter label (A → B → C…).
  Exit gestures: double-click on the map (4 px tolerance, 260 ms window),
  `Escape` keydown, or palette re-arming a different tool.
- `'draw_line_string'` / `'draw_polygon'` → unchanged. MapboxDraw already
  uses dblclick to mean "finish polygon"; reusing it for "exit tool"
  would conflict, so non-point kinds keep the one-shot
  `useMapboxDrawTool` flow.

`useMapboxDrawTool` gained an `enabled?: boolean` flag so both hooks can
be called unconditionally from `useDesignElementDrawTool` (Rules of
Hooks compliance) while only the right one binds map listeners.

## Implementation

- New file: `apps/web/src/v3/plan/canvas/draw/useContinuousPointDrawTool.ts`
  — owns the click-timer / dblclick-tolerance / Esc / cursor /
  `doubleClickZoom` lifecycle without going through MapboxDraw.
- Modified: `apps/web/src/v3/plan/canvas/draw/useDesignElementDrawTool.ts`
  — `isPoint` branch + read `sameKindCount` live via
  `getDesignElementsForProject(projectId)` so the letter sequence
  increments correctly across rapid clicks (no React render dependency).
- Modified: `apps/web/src/v3/observe/components/draw/useMapboxDrawTool.ts`
  — added `enabled` flag with early-return.

## Reused, unchanged

- `addDesignElement` / `getDesignElementsForProject` — single source of
  truth across Plan views.
- `findElementSpec` — drives the point/polygon branch.
- `checkUtilityConflicts` / `depthTriggersVeto` — runs per click; trees
  don't trip the depth threshold so it's a no-op for them.
- Palette unchanged. `VisionLayoutCanvas` and `PlanDesignElementHost`
  still pass `onComplete = () => setActiveTool(null)`; the callback is
  reused as `onExit` (only fires on dblclick / Esc).

## Out of scope

- Continuous mode for line / polygon kinds (would need a different exit
  gesture; revisit if requested).
- Persisting "continuous mode" as a user preference across sessions.
- Bulk / grid placement, spacing constraints, pattern stamping.
