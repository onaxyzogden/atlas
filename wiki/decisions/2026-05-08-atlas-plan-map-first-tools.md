# 2026-05-08 — Atlas Plan stage: map-first drawing tools (Water + Zones beachhead)

## Context

The Plan stage's left rail (`PlanTools.tsx`) showed "Tools coming soon" for
all 9 modules. The slide-up cards were the only way to enter plan data,
which inverted the intended workflow: **the map is the primary surface for
Observe / Plan / Act, and slide-ups are reserved for written-report
detail.** The user explicitly redirected an earlier sub-card-navigation
plan with: *"Let's actually have tools that users use to annotate the map
view which then populates the information in the slide-up. If data needs
to be entered, enable the option to do so without triggering the slide-up.
The purpose of the slide-up panes is written reports."*

## Decision

Modules 2 (Water Management) and 3 (Zone & Circulation) ship as a
beachhead with 6 map-draw tools that drop persistent features and a
**floating inline popover** (not a slide-up) for the 2–4 essential fields
needed to commit. The other 7 modules expose a single "Open module" button
as an honest fallback until they get the same treatment.

### Architecture

- **Tool-id namespace** — `MapToolId` extended with 6 ids
  (`plan.water-management.{catchment,storage,swale,sink}`,
  `plan.zone-circulation.{zone,path}`); the existing one-tool-at-a-time
  semantics on `useMapToolStore` cover the new family.
- **`PlanDrawHost`** — switchboard mounted inside the Current-Land
  `DiagnoseMap` render-prop; mirrors `ObserveDrawHost` exactly. Mounts the
  matching tool component when `activeTool.startsWith('plan.')`.
- **6 tool components** — each reuses `useMapboxDrawTool` for the
  MapboxDraw lifecycle. Persist-first: on `draw.create` we generate an id
  via `newAnnotationId()`, write a skeleton record (defaults +
  auto-computed fields like `areaM2`/`lengthM` via turf), then open the
  inline popover with the patch fields. `onSave` patches via the store's
  update action; `onCancel` removes the just-created record so ESC truly
  rolls back.
- **`InlineFeaturePopover` + `inlineFormStore`** — schema-driven mini-form
  anchored at `[lng, lat]` via `map.project()` (re-projects on
  move/zoom/resize). Auto-flips left when the right edge would clip the
  viewport. ESC + click-outside cancel; required-field gate disables Save.
- **`PlanDataLayers`** — renders persisted zones (polygon) and paths
  (line) as MapLibre layers using the same source-per-geometry pattern as
  `DesignElementLayers`. Water nodes are deferred from map-rendering in
  v1 because `WaterNode` doesn't yet carry geometry — they remain
  visible in the Water-Management slide-up cards.

### Trade-offs

- **Re-using existing stores** (`waterSystemsStore`, `zoneStore`,
  `pathStore`) rather than the Vision-Layout `designElementsStore`. The
  Plan slide-up cards already CRUD these stores; routing the new draws
  there means the just-drawn features show up in the slide-ups
  immediately, and we don't fork persistence.
- **Popover, not slide-up.** Slide-up = written report; popover = capture
  the 2–4 fields needed to commit a feature on the map.
- **Beachhead scope** (Water + Zones) keeps blast radius bounded; the
  same pattern lifts to the other 7 modules in follow-ups.

## Out of scope (deferred)

- Water-node map rendering — needs a `geometry` field on `WaterNode`.
- Vertex-edit / drag-reposition for plan features (Observe already has
  these via `AnnotationVertexEditHandler`; can be lifted later).
- Click-to-inspect → `annotationDetailStore` extension (the slide-up
  remains the canonical readout in v1).
- Tool ids in `@ogden/shared` — they stay in `useMapToolStore.ts` next
  to the Observe ids.
- Zundo undo wiring for the new draws.

## Verification

`npx tsc --noEmit` clean. The 12-step dev-preview checklist (drawing each
of the 6 tools, ESC rollback, reload persistence, slide-up parity, no
"Tools coming soon" text in the rail) is pending the steward's manual
preview pass.
