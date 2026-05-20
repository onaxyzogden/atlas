# 2026-05-16 — fix(observe): overlapping selection floaters stack instead of colliding


Steward-reported: when a zone polygon and an adopted basemap building
overlapped and both were selected, their two bottom-center action bars
rendered on top of each other — the lower bar's Edit/Delete/Clear were
unreachable.

Root cause: Observe's `SelectionFloater` (`useObserveSelectionStore`)
and `PlanSelectionFloater` (`usePlanSelectionStore`) are independent
siblings that each rendered their pill `position: absolute; left: 50%;
bottom: 16px; transform: translateX(-50%); z-index: 10` off the *same*
`SelectionFloater.module.css`. Mounted together (`ObserveLayout`
247–248; `ActLayout` 175), a feature-into-each-store selection put both
pills at identical coordinates. Two independently-absolute siblings
can't stack via CSS — they need a shared flex parent.

Fix: a body-level singleton stack container both floaters portal into.
New `floaterStackRoot.ts` (idempotent, SSR-guarded `<div
data-floater-stack>` on `document.body`; re-anchors just above the
stage bottom bar via the pre-existing `[data-stage-bottom]` on
`StageShell`, `resize`-synced, CSS `bottom: 16px` fallback on
tray-less stages e.g. Vision). Positioning moved off `.floater` onto a
new `.stack` class (flex column, `gap: 8px`, `align-items: center`,
`pointer-events: none` so an empty container never blocks the map).
Both components `createPortal(…, stackRoot)` with stable inline
`order` (Observe 1 = upper, Plan 2 = lower). No selection-store,
click, or layout-mount logic changed; only the two `.tsx` import that
CSS module (verified contained).

**Verification.** `tsc --noEmit` (8 GB heap) exit 0; no console errors
after HMR; deterministic `getBoundingClientRect` proof on the running
Observe stage — two bars vertically stacked, 8 px gap, centered, lower
bar 16 px above the rail, single-selection unchanged.

ADR: `wiki/decisions/2026-05-16-atlas-selection-floater-stacking.md`.

**Deferred.** Live re-verification of the bottom-tray re-anchor: the
main preview server stopped before that pass. The offset is additive
with a safe CSS fallback against an existing `data-stage-bottom`
element; full manual UI pass (overlap-select in Observe + Plan + Act)
needs a live MapLibre map.
