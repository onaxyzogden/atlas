# ADR: cursor intent channel closes the ad-hoc-writer follow-up

**Date:** 2026-05-15
**Status:** Accepted
**Area:** apps/web — MapLibre map cursor (Observe / Plan)
**Supersedes:** the "Follow-up (deferred)" + the "brief hover affordances
overridden" trade-off of `2026-05-15-atlas-map-cursor-authoritative.md`

## Context

`2026-05-15-atlas-map-cursor-authoritative.md` made `useMapCursor` the
single authoritative canvas-cursor owner via a `MutationObserver` that
re-asserts the computed cursor after any external write, and explicitly
deferred removing the ~30 redundant ad-hoc
`map.getCanvas().style.cursor = X` writers. It also accepted a
trade-off: the observer would override brief affordance cursors the hook
cannot compute — the `move`/`grab` on draggable-entity and
sector-handle hover, and `grabbing` while a drag has `dragPan`
disabled. With those writers left in place those affordances were
effectively dead (re-asserted away by the observer).

This ADR records executing that deferred follow-up **and** the design
choice for how the affordances were preserved rather than lost.

## Decision

Each ad-hoc writer was resolved per-site as one of two kinds:

1. **Redundant — deleted.** Writers expressing a cursor the hook already
   computes: `crosshair` while a draw tool is armed
   (`AdoptBasemapBuildingTool`, `SunWindWedgeTool`,
   `useDimensionDrawTool` — all run only when `activeTool` starts with
   `observe.`/`plan.`, i.e. `drawArmed`), and `pointer` on
   interactive-feature hover (pure `mouseenter`/`mouseleave` pairs in
   `PlanDataLayers`, `PlanScheduledMovesOverlay` — covered by the hook's
   hover probe; `plan-scheduled-moves-` was added to
   `INTERACTIVE_LAYER_PREFIXES`). These were removed outright.

2. **Genuine affordance the hook can't compute — preserved by
   *extending* the priority model**, not by fighting the observer with a
   bare non-`!important` write. A new imperative channel
   `apps/web/src/v3/plan/canvas/mapCursorIntentStore.ts` (Zustand,
   `CursorIntent = 'grabbing' | 'move' | 'grab'`,
   `setCursorIntent(intent | null)`) is consulted by `useMapCursor`'s
   `compute()` at **priority 2** — immediately *below*
   `drawArmed → crosshair`, *above* hover/pan. `useMapCursor` subscribes
   to the store and re-applies on change. Drag/hover handlers
   (`PlanDataLayers` ×5 move/grabbing blocks, `AnnotationDragHandler`
   grabbing, `AnnotationSectorHandles` grab/move) now call
   `setCursorIntent(...)` / `setCursorIntent(null)` instead of writing
   the canvas directly.

Net: exactly one cursor authority. Intent flows *through* the authority
instead of around it.

## Consequences

- **Positive:** The `move`/`grab`/`grabbing` affordances — previously
  killed by the observer — are now first-class and survive re-assertion,
  because they *are* the computed value. No second cursor system
  remains; no bare-`!important`-less writes anywhere. New drag/hover
  affordances extend the priority enum, not the DOM.
- **Trade-off:** Intent sits below `drawArmed`, so an armed draw tool
  still shows `crosshair` even over a draggable handle. This is correct:
  you are not dragging while drawing. Intent is process-global (one
  canvas, one cursor) — callers must pair every non-null
  `setCursorIntent` with a `setCursorIntent(null)` on drag-end / leave /
  cleanup or the cursor sticks. All converted sites do.
- **`AnnotationSectorHandles` note:** its layer
  (`observe-sector-handles-circle`) is intentionally *not* in
  `INTERACTIVE_LAYER_PREFIXES`, so the hover probe can't yield its
  `grab`/`move`; the intent channel is the only correct mechanism there.

## Verification

`pnpm --filter web typecheck` exit 0. Live on a worktree-dedicated dev
server (`web-wt`, port 5210, serving this branch's code — confirmed by
fetching the new module) across Observe + Plan:

| State | Result |
|---|---|
| Plan / Observe pan rest | `grab !important` |
| Draw armed (Swale / Adopt-from-map / Sun-summer) | `crosshair !important` |
| `setCursorIntent('grabbing')` | `grabbing !important` |
| `setCursorIntent('move')` | `move !important` |
| `setCursorIntent('grab')` | `grab !important` |
| `setCursorIntent(null)` | reverts to `grab !important` |

Intent test drove the real `mapCursorIntentStore` module via the Vite
dev graph (the exact path the converted handlers call). Console: only a
pre-existing `validateDOMNesting` warning in `ObserveModuleBar.tsx:32`
(untouched here) and the expected MapTiler `403` from a throwaway
placeholder key — no cursor / MutationObserver / recursion errors.

A `web-wt` launch config (`--strictPort` 5210) was added to
`.claude/launch.json` so future worktrees verify without colliding with
the port-5200 server.
