# ADR: Feature-edit popover docked at a fixed right-edge position

**Date:** 2026-05-16
**Status:** accepted

**Context:**
`InlineFeaturePopover` is the single shared schema-driven mini-form (the
"EDIT BUILDING"/feature form) mounted once per stage inside `DiagnoseMap`
across Plan, Observe, and Act. It rendered **anchored to the edited
feature's `[lng, lat]`**, re-projected through `map.project()` on every
`move`/`zoom`/`resize`. It auto-flipped right→left when it would clip the
right edge, but had **no vertical clamping and no max-height/scroll**. A
feature near the bottom of the map therefore pushed the form behind the
bottom module bar / selection floater or off-screen entirely
(steward-reported, with screenshot). The horizontal-only flip could not
solve a vertical clip.

**Decision:**
Stop anchoring the form to the feature. Render it in a fixed, predictable
dock on the right edge of the map canvas — identical behaviour across all
three stages (one shared component ⇒ one localized fix). Minimal scope: no
selection-highlight / connector line back to the feature (steward opted
out).

- `InlineFeaturePopover.module.css` — `.popover` changed from
  anchor-translate positioning to a fixed dock: `position: absolute;
  top: 56px; right: 12px; z-index: 6; max-height: calc(100% - 56px - 96px);
  overflow-y: auto`. `top: 56px` clears the `DesignToolRail` (top-right,
  ~48 px tall); the `max-height` reserves ~96 px above the bottom-right
  buttons / module bar so the panel is always fully on-canvas and long
  forms scroll *inside* the panel. The `transform: translate(...)` and the
  entire `.popover[data-flipped='true']` block were removed.
- `InlineFeaturePopover.tsx` — removed the `screen` `useState` and the
  `useEffect` that projected `active.anchor` and bound
  `map.on('move'|'zoom'|'resize', recalc)`; `if (!active || !screen)` →
  `if (!active)`; the `<form>` no longer emits `data-flipped` or
  `style={{ left, top }}` (position is fully CSS-driven). The `map` prop is
  retained (renamed `_props`) so the three call sites typecheck unchanged —
  changing them was out of scope and noisier than the fix warrants. ESC /
  click-outside / save / cancel behaviour unchanged.

**Consequences:**
- The form now appears in one predictable place regardless of where the
  feature sits, including features near the bottom edge (the original
  failure). Long forms (expanded disclosures) scroll within the bounded
  panel instead of overflowing the viewport.
- `z-index: 6` sits above the prior value (5) but still below the
  bottom-center selection-floater stack (z-index 10), so the
  Zone/Edit-vertices/Delete/Clear toolbar stays reachable and on top; the
  existing click-outside guard already exempts it.
- The map no longer fires layout work on pan/zoom for this form (one fewer
  per-frame `map.project` listener set while a form is open).
- Verification: `tsc --noEmit` (8 GB heap) exit 0; live stylesheet
  inspection confirmed the rule applied and the `calc()` resolved with no
  flip remnants; real-canvas `getBoundingClientRect` showed the panel in
  the safe zone with ~240 px bottom clearance. Screenshot proof was
  unavailable — the WebGL map canvas hangs the capture tool (reported
  honestly, not assumed).

**Deferred:** A live cross-stage manual pass (Observe + Act, long-form
scroll, bottom-edge feature) needs a working MapLibre preview; the preview
environment returned a 0-size viewport this session, so visual confirmation
of the docked position across all three stages is left to a steward pass.
