# 2026-05-06 — Atlas OBSERVE tools made functional + Scholar-grounded right rail

**Status:** Adopted
**Branch:** `feat/atlas-permaculture`
**Predecessor:** [2026-05-06 Atlas Observe Phase B Port + Styling](2026-05-06-atlas-observe-port-styling.md)
**Related:** [2026-04-30 Site-Annotations 7-Namespace Consolidation](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md), [2026-04-26 Zustand Selector Discipline](2026-04-26-zustand-selector-discipline.md), [2026-04-29 OBSERVE IA Restructure](2026-04-29-observe-stage-ia-restructure.md)

## Context

Phase B left every left-rail tool button across the six OBSERVE modules
disabled (titled `— Phase B`) and the right-rail "checklist" as a static
text list with no progression tracking and no pedagogy. The user requested
a Permaculture Scholar consultation to ground the tool palette in Holmgren
P1–P8 + Mollison Designer's Manual, then a full slice making each tool
functional and replacing the right rail with WHY/HOW/Pitfall guidance per
module.

Scholar consultation: notebook `5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`,
turn 1 (six modules × four-part response: purpose, WHY, HOW 2–3 steps,
Pitfall, with citations to Holmgren / Mollison / OSU PDC).

## Decision

### 1. Right-rail Scholar guidance ([ObserveChecklistAside.tsx](../../apps/web/src/v3/observe/components/ObserveChecklistAside.tsx))

Replaced the `CHECKLIST` const with a `MODULE_GUIDANCE: Record<ObserveModule, { why; how[]; pitfall }>` object containing verbatim Scholar content. Component renders a single `GuidanceCard` (header → WHY → HOW ordered list → Pitfall callout) when a module is active, and a stacked accordion of all six when none is active (`/observe` landing). Restyled in `ObserveChecklistAside.module.css` with `.why`, `.howList`, `.pitfall` blocks; group-dot palette preserved from the prior list.

### 2. Store namespace fill-in (Phase 2)

The 7-namespace consolidation (ADR 2026-04-30) had left several Module-specific annotation types absent. Added:

- **NEW** [`humanContextStore`](../../apps/web/src/store/humanContextStore.ts) — `neighbours`, `households`, `accessRoads` (kind: public/private/footpath), `permacultureZones` (six concentric radii anchored on a snapshot of `homesteadStore`)
- [`topographyStore`](../../apps/web/src/store/topographyStore.ts) v1→v2 — added `contours`, `highPoints` (high/low kind), `drainageLines`
- [`externalForcesStore`](../../apps/web/src/store/externalForcesStore.ts) v1→v2 — `HazardType` widened with `'frost'`; `HazardEvent.geometry?: GeoJSON.Polygon` (legacy tabular hazards persist with `geometry: undefined`)
- [`waterSystemsStore`](../../apps/web/src/store/waterSystemsStore.ts) v1→v2 — `watercourses` (natural drainage; distinct from built `earthworks`)
- [`ecologyStore`](../../apps/web/src/store/ecologyStore.ts) v1→v2 — `ecologyZones` (Polygon with `dominantStage: SuccessionStage`)
- [`swotStore`](../../apps/web/src/store/swotStore.ts) — additive optional `position?: [number, number]` for OBSERVE Module 6 map-tagged entries

All bumped persists carry no-op or default-seeding migrates so the additions are backward compatible.

### 3. Tool activation framework (Phase 3)

[`useMapToolStore.MapToolId`](../../apps/web/src/v3/observe/components/measure/useMapToolStore.ts) widened with 17 observe-prefixed ids of shape `'observe.<module>.<tool>'`. [`ObserveTools.tsx`](../../apps/web/src/v3/observe/tools/ObserveTools.tsx) wired to `setActiveTool(toolId === activeTool ? null : toolId)`; `disabled` removed; project-required gate (no `projectId` ⇒ all tools disabled); homestead-required gate for `permaculture` (Mollison Zone 0 anchor). Active-state highlight via `data-active='true'`.

A shared [`useMapboxDrawTool`](../../apps/web/src/v3/observe/components/draw/useMapboxDrawTool.ts) hook centralises the addControl / changeMode / draw.create / removeControl lifecycle (the leak-risk surface flagged in the plan); each tool component is then ~30–90 LOC of store-write + popover-readout shell.

### 4. Draw-tool components (Phase 4)

14 components under [`apps/web/src/v3/observe/components/draw/`](../../apps/web/src/v3/observe/components/draw/), one per (module × annotation kind). All point/line/polygon variants delegate to `useMapboxDrawTool`; two non-MapboxDraw variants (`SunWindWedgeTool`, `PermacultureZoneTool`) are popover-form-only because their geometries are angular wedges or concentric rings rather than user-drawn vertices.

A switchboard [`ObserveDrawHost.tsx`](../../apps/web/src/v3/observe/components/draw/ObserveDrawHost.tsx) mounts the appropriate tool based on `activeTool`, anchored to a small dock above the bottom MapToolbar. SwotTagTool is reused across all four buckets via a `bucket: SwotBucket` prop.

### 5. Persistent annotation layers (Phase 5)

[`ObserveAnnotationLayers.tsx`](../../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx) subscribes to all seven annotation namespaces (plus soilSamples and homesteadStore for the sectors anchor), filters by `projectId` via `useMemo` (per ADR 2026-04-26), assembles GeoJSON FeatureCollections per (module × geometry-type), and adds 11+ MapLibre layers backed by 8 sources. Re-applied after every `style.load` event so annotations survive basemap swaps. Cleanup on unmount (route change) and on `projectId` flip.

Earth-Green palette, module-coded:
- human context — warm yellow `#c4a265` (roads kind-graded)
- hazards — amber `#c87a3f`
- sectors — type-graded (sun gold, wind blue, fire amber)
- topography — brown `#8a6a3f` (drainage dashed)
- water — blue `#3a8aa8` perennial / lighter dashed ephemeral
- soil — slate `#6a5a4a`
- ecology — green palette by succession stage
- SWOT — bucket-coded (S green / W amber / O blue / T violet)

A new master toggle `observeAnnotations` (default ON) was added to [`matrixTogglesStore`](../../apps/web/src/store/matrixTogglesStore.ts) v6→v7, surfaced as the top row of the existing `MapToolbar` Overlays popover. Toggling off hides every layer via `setLayoutProperty`.

## Source content provenance

Right-rail content is verbatim from notebook `5aa3dcf3-...`, conversation `48a34396-...`, turn 1, 2026-05-06. Bracketed citation markers `[1, 2]` from the dialogue were stripped; prose retained. Each module's WHY explicitly cites Holmgren P1/P2/P4/P7, Mollison Designer's Manual, and OSU PDC weeks.

## Consequences

- A steward can now place point/line/polygon/sector/concentric annotations for every OBSERVE module, see them rendered on the map, and have them survive reloads + basemap swaps.
- The right rail teaches WHY + HOW + Pitfall per module (no more lists of generic checks).
- The 7-namespace store consolidation is now exercised end-to-end for the OBSERVE stage.
- Active-tool semantics are unified: measure tools (MapToolbar) and module tools (ObserveTools) share the same `useMapToolStore`, so opening one clears the other.

## Deferred

- Edit / delete UX for placed annotations beyond the popover-active session (drag-to-reposition, undo, multi-select).
- Per-module sub-toggles in the Overlays popover (kept compact; one master toggle for v1).
- Project-level annotation export (CSV / GeoJSON / KML).
- Visual symbology refinements (lucide-style SVG sprites for points; currently pure circles).
- The PLAN and ACT stages still read these stores read-only — no tool palette there yet.

## Verification

- `npx tsc --noEmit` clean (8 GB heap).
- Preview at `/v3/project/.../observe/topography`: 16 enabled tools + 1 homestead-gated; Topography WHY/HOW/Pitfall card in the right rail.
- Active-tool toggle confirmed via DOM (`data-active='true'`) and popover render (`role="dialog"` with module-specific aria-label).
- Seven persisted localStorage keys survive a hard reload (`ogden-human-context`, `ogden-topography` v2, `ogden-external-forces` v2, `ogden-water-systems` v2, `ogden-ecology` v2, `ogden-swot`, `ogden-soil-samples`).
- `matrixTogglesStore` migrated v6→v7 with `observeAnnotations: true` default.

## Files touched

**Edited (12):**
- `apps/web/src/v3/observe/components/ObserveChecklistAside.tsx`
- `apps/web/src/v3/observe/components/ObserveChecklistAside.module.css`
- `apps/web/src/v3/observe/components/measure/useMapToolStore.ts`
- `apps/web/src/v3/observe/tools/ObserveTools.tsx`
- `apps/web/src/v3/observe/tools/ObserveTools.module.css`
- `apps/web/src/v3/observe/components/MapToolbar.tsx`
- `apps/web/src/v3/observe/ObserveLayout.tsx`
- `apps/web/src/store/topographyStore.ts`
- `apps/web/src/store/externalForcesStore.ts`
- `apps/web/src/store/waterSystemsStore.ts`
- `apps/web/src/store/ecologyStore.ts`
- `apps/web/src/store/swotStore.ts`
- `apps/web/src/store/matrixTogglesStore.ts`

**Created (18):**
- `apps/web/src/store/humanContextStore.ts`
- `apps/web/src/v3/observe/components/draw/useMapboxDrawTool.ts`
- `apps/web/src/v3/observe/components/draw/ObserveDrawHost.tsx`
- `apps/web/src/v3/observe/components/draw/ObserveDrawHost.module.css`
- 14 individual tool components under `apps/web/src/v3/observe/components/draw/`
- `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx`
