# 2026-05-07 — Atlas OBSERVE touch-first drag + multi-item batch edit + per-store undo specs


Closed the three deferred items called out in the 2026-05-06
selection/drag/vertex-edit/zundo ADR.

**What landed:**
- **Touch-first drag:** `AnnotationDragHandler.tsx` refactored from
  mouse-only to pointer-agnostic (`onLayerPointerDown` /
  `onPointerMove` / `onPointerUp`). Wires both `mousedown`+`touchstart`
  on every point layer and `mouse{move,up}`+`touch{move,end}` on the
  global map. Touch events gate by
  `e.originalEvent.touches.length === 1` so pinch-zoom never engages
  drag. A 4-pixel screen-space movement threshold prevents tap-to-select
  from being hijacked. While dragging,
  `map.touchZoomRotate.disableRotation()` keeps finger drift from
  doubling as a rotate-pinch.
- **Multi-item batch edit:** `annotationFormStore.Active` widens to
  `mode: 'create' | 'edit' | 'edit-batch'` with
  `existingIds?: string[]`; `AnnotationFormSlideUp` seeds values from
  the first id and loops `schema.save()` once per id on Save; eyebrow
  reads `Edit ${n} ${kind}s`. `SelectionFloater` Edit gate widens to
  enable on same-kind multi-select (`selected.every((s) => s.kind ===
  first.kind)`); mixed-kind selections still disable Edit with a
  tooltip explanation. v1 batch undo is N-step (one zundo entry per
  patched record) — `temporal.pause()`/`resume()` framing deferred.
- **Per-store undo specs:** `temporal-undo.test.ts` extended with four
  new `describe` blocks (topography / externalForces / waterSystems /
  ecology) for 14 tests total. All seven OBSERVE namespace stores now
  have at least one `add → undo` and one `add+update → undo` spec
  passing under happy-dom.

**Verification:** `npx tsc --noEmit` clean; `npx vite build` clean
(29.37s, 626 PWA precache entries); `npx vitest run
src/store/__tests__/temporal-undo.test.ts` 14/14 pass.

**Scope deferrals (future):**
- Single-undo for batch edits via `temporal.pause()`/`resume()`.
- "(Mixed)" indicator on batch-edit form when items diverge on a field.
- Project-level annotation export (CSV / GeoJSON / KML).
- Lucide-style SVG sprite symbology for points.
- PLAN and ACT stage tool palettes.

ADR: [2026-05-07-atlas-observe-batch-edit-touch-drag.md](decisions/2026-05-07-atlas-observe-batch-edit-touch-drag.md)
