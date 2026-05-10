# Plan-stage drag-time undo coalescing — one entry per drag

**Date:** 2026-05-09
**Branch:** `feat/atlas-permaculture`
**Status:** Adopted

---

## Decision

Wrap each MapLibre drag-to-translate session in `PlanDataLayers.tsx`
with a `beginDragUndoWindow(store)` window that pauses the underlying
zundo `temporal()` middleware on first threshold cross, replays the
pre-drag state on mouseup, resumes recording, then applies the final
state — so a single drag lands as **one** undo entry instead of the
30–60 entries that one entry per `mousemove` produces.

Applies to all five drag handlers in `PlanDataLayers.tsx`:

| Handler | Store(s) |
|---|---|
| Guild | `usePolycultureStore` |
| Structure | `useStructureStore` |
| Polygon (zone / crop / paddock / water_catchment) | `useZoneStore` / `useCropStore` / `useLivestockStore` / `useWaterSystemsStore` |
| Line/curve (path / utility / water_swale) | `usePathStore` / `useUtilityRunStore` / `useWaterSystemsStore` |
| Center-point (fertility / water_storage / water_sink) | `useClosedLoopStore` / `useWaterSystemsStore` |

The helper lives at `apps/web/src/v3/plan/layers/dragUndo.ts` and is
deliberately tiny (≈40 lines including types) so it can be lifted
verbatim into Observe's `AnnotationDragHandler.tsx` later — Observe
currently pays the same N-entries-per-drag tax.

## Why

zundo's `temporal()` middleware records every `set` call. A drag emits
a `set` per `mousemove` event (typically 30–60 per drag), so reversing
one drag with `Cmd-Z` requires 30–60 keypresses. Stewards on the Plan
canvas repeatedly hit this — the workflow felt unsalvageable until
either undo went away or coalesced.

## Architecture — rewind / resume / replay

zundo 2.3 exposes `pause()` / `resume()` / `isTracking` on
`useStore.temporal.getState()`. `pause()` suppresses *recording* but
does not rewind history — the head past-state remains the pre-drag
snapshot, and any subsequent paused `set` mutates live state silently.

That makes the minimal-correct sequence:

```
mousedown:                               (no temporal call yet)
first mousemove past 4 px threshold:     temporal.pause()
subsequent mousemoves:                   set(liveGeom)        // silent
mouseup:                                 set(origGeom)        // silent rewind
                                         temporal.resume()
                                         set(finalGeom)       // ONE recorded entry
```

The rewind step is load-bearing: without it the next recorded `set`
diffs against the pre-drag state regardless, but the live state would
still be `finalGeom` — so the rewind matches live state to history,
making the resumed `set(finalGeom)` produce exactly one
`pre-drag → final` past-entry.

If the drag never crosses the 4 px threshold (treated as a click),
`pause()` was never called and no work needs to be undone — the helper
guards on whether it actually paused, so callers don't need a branch.

The double-write at mouseup is one synchronous tick — React 18 batches
the two `set`s, so no flicker.

## Trade-offs and risks

- **Single-store assumption.** Each drag handler picks its store at
  `mousedown` (kind-aware dispatch for the polygon and line handlers).
  A drag that mutated multiple stores would need one window per store;
  no such drag exists today.
- **Cancelled drags.** The helper exposes `cancel()` for completeness;
  current handlers never need it because the only escape hatch is
  Esc-to-clear-selection, which doesn't interrupt an in-flight drag.
- **Observe parity.** `AnnotationDragHandler.tsx` still records N
  entries per drag. Lifting `dragUndo.ts` into Observe is deferred
  until Observe gets its own follow-up.

## Verification

- `tsc --noEmit` on `apps/web` — clean.
- `vite build` — clean (53.6s, 667 PWA precache entries).
- Interactive smoke pass (drag → single Cmd-Z reversal across all five
  handler kinds) deferred to user verification on the running dev
  server (port 5200) — programmatic drag synthesis on a MapLibre
  canvas is unreliable for the threshold/timing semantics this change
  hinges on.

## Deferred

- Lift `beginDragUndoWindow` into Observe's `AnnotationDragHandler`.
- Drag-time coalescing for vertex-edit (MapboxDraw direct-select)
  sessions; today vertex-edit records one entry per vertex-drop tick.
