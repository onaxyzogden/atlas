# 2026-05-08 — Permaculture Zone editing + Plan/Act module bar & bento parity

## Status
Accepted

## Context
Five UI/correctness gaps surfaced after the v3 map-layout standardisation
landed earlier on 2026-05-08:

1. Pre-existing `tsc --noEmit` errors blocked `npm run lint`:
   - `DesignElementLayers.tsx` typed `selFlag` with `as const`, producing a
     readonly tuple incompatible with MapLibre's mutable
     `ExpressionSpecification`.
   - `elementCatalog.ts` imported `DrawMode` from a wrong relative path
     (`../../../observe/...` resolved to `apps/web/src/observe/...` which
     does not exist; correct prefix is `../../`).
   - `InlineFeaturePopover.tsx` typed `popoverRef` as `HTMLDivElement`
     while attaching it to a `<form>`.
   - `PathLineTool.tsx` and `WaterSwaleTool.tsx` passed a bare
     `LineString` geometry to `turf.length`, which expects a Feature /
     FeatureCollection wrapper.
2. Act module bar wrapped to two rows: grid declared `repeat(5, 1fr)`
   while `ACT_MODULES` carries six entries (Network).
3. Plan module bar had the same wrap risk: `repeat(8, 1fr)` for nine
   `PLAN_MODULES`.
4. Permaculture-zone editing in Observe always inserted a new zone
   (`addPermacultureZone(crypto.randomUUID()…)` ignored any existing
   record), and there was no way to relocate the centre or resize an
   individual ring without re-typing radii.
5. `ActTools` left rail rendered as N stacked cards instead of a bento:
   outer `.toolbox` was `background: transparent; border: none;` with
   no padding, while `PlanTools` and `ObserveTools` use a panel shell
   (surface bg + hairline border + soft shadow + `--radius-lg`).
6. PlanTools `Open module` fallback called `onSelectModule(mod)` but did
   not actually open the slide-up — the user had to click the active
   card a second time to surface the report sheet.

## Decision

### Lint cleanup
- Annotate `selFlag: ExpressionSpecification` instead of `as const`, and
  import the type from `maplibre-gl`. Eight downstream paint expressions
  now type-check without per-call casts.
- Fix the `DrawMode` import path to `../../observe/components/draw/...`.
- Retype `popoverRef` to `HTMLFormElement | null`.
- Wrap the geometry argument with `turf.feature(geom)` in both
  `PathLineTool` and `WaterSwaleTool` (turf typings demand a Feature on
  the input, not a bare geometry).

### Module bar columns
- `ActModuleBar.module.css`: `repeat(5, 1fr)` → `repeat(6, 1fr)` (and
  the responsive 900-px breakpoint mirrors it).
- `PlanModuleBar.module.css`: `repeat(8, 1fr)` → `repeat(9, 1fr)`.

### Permaculture-zone editing
- `PermacultureZoneTool` now upserts: it reads
  `useHumanContextStore(s => s.permacultureZones.find(z => z.projectId === projectId))`
  and, if a zone exists, pre-fills the radii form and calls
  `updatePermacultureZone(existingZone.id, { ringRadiiM })` on Save
  (instead of `addPermacultureZone`). The dialog title flips to
  `"Permaculture zones (edit)"` and the primary button to
  `"Save changes"` for clarity.
- While the tool is mounted with an existing zone, two kinds of
  draggable Maplibre `Marker`s are attached to the map: (a) a single
  gold anchor at `zone.anchorPoint` whose `dragend` writes
  `anchorPoint`, and (b) one teal handle per ring placed due east of
  the anchor at the ring's outer radius (`turf.destination(anchor,
  r/1000, 90)`). On `dragend` the handle's distance from the anchor
  (`turf.distance(...) * 1000`) is rounded to metres and written into
  `ringRadiiM[i]`. Markers are torn down on tool unmount.
- The form input still works as a numeric editor; the marker drag
  re-renders the form via the existing store subscription.

### ActTools bento parity
- `ActTools.module.css` rewritten to mirror `PlanTools.module.css`:
  outer `.toolbox` becomes the panel shell; inner `.group` cards become
  quieter insets on `--color-bg` with `--radius-md`. The 6-module dot
  palette is updated to include Livestock (`#e6c34a`).

### Open-module wiring
- `PlanTools` accepts a new optional `onOpenSlideUp?: () => void`.
  The fallback "Open module" handler now calls `onSelectModule(mod)`
  *and* `onOpenSlideUp?.()`. `PlanLayout` passes
  `() => setSlideUpOpen(true)` so a single click both selects the
  module and opens its slide-up.

## Consequences
- `npm run lint` (`tsc --noEmit`) exits clean again — the project's
  grounding gate is unblocked.
- Act and Plan module bars never wrap regardless of viewport width.
- A single Permaculture zone per project is now correctly editable; the
  store's `updatePermacultureZone` action is finally exercised. Drag-
  to-relocate and per-ring drag-to-resize work via Maplibre's built-in
  draggable markers, avoiding a custom event-handler mesh.
- All three stage left-rails read as one bento containing N module
  cards. Plan's `Open module` fallback is a one-click affordance again.

## Verification
- `tsc --noEmit` from `apps/web/`: zero errors before and after the
  PlanTools edit.
- Preview checks at `/v3/project/mtc/{observe,plan,act}`:
  - Act bar: 6 columns, 1 row (`getBoundingClientRect().top` identical
    across all six tiles).
  - Plan bar: 9 columns, 1 row.
  - ActTools: outer `.toolbox` carries the panel shell (`background-
    color: oklch-surface`, `box-shadow: 0 1px 2px rgba(0,0,0,0.1)`),
    inner cards sit on `--color-bg`.
  - Permaculture Zone tool with a seeded zone: dialog title reads
    *"Permaculture zones (edit)"*, button reads *"Save changes"*, and
    7 `.maplibregl-marker` elements are mounted (1 anchor + 6 ring
    handles).
  - PlanTools Open module: clicking the button mounts a
    `[role="dialog"][aria-modal="true"]` whose
    `aria-label` matches `"<module> — plan tools"`.
