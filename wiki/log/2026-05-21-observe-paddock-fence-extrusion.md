# 2026-05-21 — Observe paddocks get a 3D fence-ribbon extrusion

**Branch:** `feat/atlas-permaculture` · **Surface:** Atlas web (`apps/web`)

## Context

Question from steward: do any placed features have 3D extrusions? Goal:
get placed paddocks (Pasture with `kind: 'paddock'`) to render a 3D fence
ribbon around their perimeter.

Audit established: no Observe-stage annotations used 3D today (everything
was `fill` + `line`). `fill-extrusion` was used only in Plan stage Built
Environment (`DesignElementExtrusionLayer.tsx`). `Pasture` model had no
fence/height fields, and the existing "Fence" annotation is a separate
LineString in Built Environment, unrelated to pasture geometry.

## Change

Single-file, presentation-only:

- `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx`
  — for each `Pasture` with `kind: 'paddock'`, derive a thin ring polygon
  by `turf.polygonToLine` → `turf.buffer(line, 0.4, { units: 'meters' })`,
  then render as a new `fill-extrusion` layer
  (`observe-anno-pasture-fence-extrusion`, color `#5a4326`, height 1.5 m,
  opacity 0.92) above the existing pasture `fill` + `line`.

No `Pasture` data-model change, no migration, no new store, no new
dependency (turf was already imported).

## Decisions captured

- **Trigger = `kind: 'paddock'`** (steward choice): all paddocks get the
  fence automatically; `open-pasture` and `hayfield` do not. No new UI.
- **Style = thin extruded ribbon** (steward choice): ~1.5 m tall wall via
  `fill-extrusion`. Rejected alternatives: posts-and-rails (too heavy),
  thicker pitched line (skips the 3D camera issue but doesn't actually
  extrude).
- **Camera tilt left to user/runtime.** Map's `maxPitch` is 60 in the
  current Observe context and default pitch is 0. The wall is invisible
  at pitch 0 by definition; raising default pitch is a follow-up, not
  bundled here.
- **Act stage already covered (verified, no code change).** Steward
  asked whether the extrusion appears in Act as well. `ActLayout.tsx`
  reuses the same `DiagnoseMap` and mounts `ObserveAnnotationLayers`
  read-only (lines 27, 29, 161, 175 of `apps/web/src/v3/act/ActLayout.tsx`).
  The paddock-fence layer therefore renders in Act automatically —
  same pitch-0 caveat applies. Confirmed by source inspection on
  2026-05-21; no Act-specific parallel implementation needed.

## Verification

- `npx tsc --noEmit -p apps/web` exit 0.
- Vite HMR applied with no compile errors.
- Runtime, with one paddock + one open-pasture seeded into
  `usePastureStore`: new layer `observe-anno-pasture-fence-extrusion`
  present alongside `pasture-fill` / `pasture-line`; fence source had
  exactly 1 feature (the paddock; the open-pasture did not get one).
  Pitch raised to 60° via `setMaxPitch(85)` + `setPitch(60)` and held.
- `preview_screenshot` was unresponsive — no visual screenshot captured;
  surfaced explicitly per the project's "do not claim visual success
  without proof" rule.

## Out of scope (follow-ups)

- User-configurable fence height/material on `Pasture`.
- Linking Built-Environment Fence LineStrings to pastures.
- Default tilted pitch in Observe so the ribbon is visible without
  manual camera tilt.
- Posts-and-rails styling.
