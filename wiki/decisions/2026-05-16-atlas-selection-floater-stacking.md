# ADR: Selection floaters share one stacking container instead of colliding

**Date:** 2026-05-16
**Status:** accepted

**Context:**
Two independent bottom-center action bars exist: Observe's `SelectionFloater`
(reads `useObserveSelectionStore` — annotations / Built-Environment entities)
and `PlanSelectionFloater` (reads `usePlanSelectionStore` — zones, structures,
design-elements …). Both imported the same `SelectionFloater.module.css` and
each rendered its pill as `position: absolute; left: 50%; bottom: 16px;
transform: translateX(-50%); z-index: 10`. They mount as independent siblings
at the same time (`ObserveLayout` lines 247–248; `ActLayout` 175; plus
`PlanLayout`/`VisionLayoutCanvas`). When a geometrically overlapping click
selected one feature into each store, both pills landed at the *identical*
coordinates and visually collided — the lower pill (and its Edit/Delete/Clear
actions) was unreachable. Two independently-absolute siblings cannot stack via
CSS alone; they need a shared flex parent.

**Decision:**
Introduce one shared, body-level singleton stack container that both floaters
portal into, instead of each pill positioning itself.

- New `apps/web/src/v3/observe/components/floaterStackRoot.ts` — lazily creates
  a single `<div data-floater-stack>` on `document.body`, idempotent,
  SSR-guarded. Re-anchors itself just above the active stage's bottom module
  bar (`[data-stage-bottom]`, a pre-existing attribute on `StageShell`'s bottom
  tray) on every selection change and on `resize`; falls back to the CSS
  `bottom: 16px` on stages with no bottom tray (e.g. Vision).
- `SelectionFloater.module.css` — positioning quartet + `z-index` moved off
  `.floater` onto a new `.stack` class (`position: fixed; left: 50%;
  bottom: 16px; transform: translateX(-50%); z-index: 10; display: flex;
  flex-direction: column; align-items: center; gap: 8px;
  pointer-events: none`). `.floater` keeps all visual styling and its existing
  `pointer-events: auto`, so an empty container never blocks the map.
- `SelectionFloater.tsx` / `PlanSelectionFloater.tsx` — wrap their returned
  pill in `createPortal(…, stackRoot)`; bail to `null` if the root is
  unavailable. Stable stacking order via inline `style={{ order }}`:
  Observe = 1 (upper), Plan = 2 (lower, nearest the bottom rail), so the
  arrangement never depends on selection timing.

No selection-store or click/selection logic changed; no layout-file mounting
changed. Only those two `.tsx` files import that CSS module (verified), so the
positioning refactor is contained.

**Consequences:**
- Overlapping selections now show both bars vertically stacked with an 8 px gap,
  centered, the lower bar sitting just above the stage bottom bar — both fully
  visible and clickable.
- Single-selection is unchanged (one centered pill at the original position).
- Any future bottom-center floater can join the stack by portaling into
  `getFloaterStackRoot()` with an `order` value — no per-layout wiring.
- Verification: `tsc --noEmit` (8 GB heap) clean; no console errors after HMR;
  deterministic `getBoundingClientRect` proof of stacking/gap/centering/offset
  on the running Observe stage. Live re-verification of the bottom-tray
  re-anchor was not possible (main preview server stopped before that pass) —
  the offset is additive with a safe CSS fallback and targets an existing
  `data-stage-bottom` element.
