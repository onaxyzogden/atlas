# 2026-05-14 — Freehand / Dimensions toggle across Plan + Observe annotation tools

**Status:** Adopted
**Stage:** Plan + Observe
**Areas:** `apps/web/src/v3/plan/draw/` (new primitives), `apps/web/src/v3/plan/draw/tools/` (11 opting tools), `apps/web/src/v3/observe/components/draw/` (14 annotation tools)

## Context

Stewards drawing structures, paddocks, fences, watercourses, etc. wanted to
commit at exact width/depth/radius/length/bearing instead of tracing every
shape freehand. The legacy `useMapboxDrawTool` path is point-by-point;
there was no parametric path.

Mid-session before compaction, a Plan-side parametric "Dimensions" mode was
introduced — a singleton Zustand store, a ghost-layer hook that paints a
preview footprint under the cursor at the configured dimensions, and a
`DimensionPanel` UI inside every Plan tool's popover. All 11 Plan opting
tools (StructureTool, ZonePolygonTool, PaddockTool, CropAreaTool,
WaterCatchmentTool, WaterSwaleTool, FlowConnectorTool, FenceLineTool,
PathLineTool, UtilityRunTool, MonitoringTransectTool) were wired to this
system.

The Observe side — the 14 annotation tools a steward uses to record
existing parcel features — was greenfield: no dimensions imports, no
parametric path, just freehand polyline / point drawing. A steward who
already knew their fence was 30 m long had to trace it anyway.

The user surfaced the gap as "freehand/dimensions toggle not visible in
UI." Scope clarified to **Plan + Observe both**; Plan was already wired,
Observe was the missing surface.

## Decision

Reuse the Plan primitives verbatim from `apps/web/src/v3/plan/draw/`
across both stages:

- **`dimensionDrawStore.ts`** — singleton Zustand store holding
  `mode: 'freehand' | 'dimensions'`, `shape: 'rect' | 'circle' | 'line'`,
  `unit: 'm' | 'ft'`, and per-shape value defaults (widthM=6, depthM=8,
  radiusM=5, lengthM=20). One singleton across Plan/Observe is intentional
  — `useMapToolStore.activeTool` already guarantees only one tool is armed
  at a time, so there is no cross-stage interference.
- **`useDimensionDrawTool.ts`** — ghost-layer + click-to-commit hook.
  Paints a preview footprint under the cursor at the configured shape +
  values; a single click commits the geometry. Signature
  `({ map, shape, values, enabled, onComplete })` — the `enabled` flag
  flips off the freehand draw control when the panel is in `dimensions`
  mode.
- **`DimensionPanel.tsx`** — popover UI. Renders `[Freehand][Dimensions]`
  primary toggle, a shape picker filtered by `allowedShapes`, a `m | ft`
  unit toggle, and per-shape value inputs (Width × Depth + Rotation for
  rect; Radius for circle; Length × Bearing for line).
- **`dimensionGeometry.ts`** — pure geometry helpers turning
  `{shape, values, anchor}` into a `GeoJSON.Polygon | GeoJSON.LineString`.

Per-tool integration pattern (same for Plan and Observe):

1. Read `dimMode = useDimensionDrawStore((s) => s.mode)` and
   `dimValues = useDimensionValues()`.
2. Existing `useMapboxDrawTool` gets `enabled: dimMode === 'freehand'`.
3. Add parallel `useDimensionDrawTool({ shape, values, enabled: dimMode === 'dimensions', onComplete })`.
4. Render `<DimensionPanel allowedShapes={...} />` inside the popover.

## Scope — geometry → allowedShapes

| Geometry | Observe tools | Plan tools | `allowedShapes` |
|---|---|---|---|
| Polygon | Building, Septic, Pasture, FrostPocket, HazardZone, EcologyZone | Structure, ZonePolygon, Paddock, CropArea, WaterCatchment | `['rect', 'circle']` |
| LineString | Fence, PowerLine, BuriedUtility, AccessRoad, ContourLine, DrainageLine, Watercourse, ExistingDriveway | WaterSwale, FlowConnector, FenceLine, PathLine, UtilityRun, MonitoringTransect | `['line']` |

Point tools (Well, Gate, SoilSample, HouseholdPin, NeighbourPin,
HighPoint, SwotTag) intentionally untouched — they commit on a single
click already, and `DimensionPanel` has no point shape.

## Verification

- `tsc --noEmit` clean.
- `vitest --run`: **710 / 710 pass** (47 files).
- Preview-verified on `/v3/project/mtc/observe`:
  - Arming **Building** surfaces `[Freehand][Dimensions]`; switching to
    Dimensions shows Rect/Circle picker + Width 6.00 / Depth 8.00 /
    rotation inputs.
  - Arming **Fence** surfaces the toggle + `m | ft` + Length × Bearing
    inputs (no shape picker — `allowedShapes={['line']}` collapses it).

## Out of scope

- Point tools (see above).
- Bespoke per-tool default dimensions — the shared store defaults
  (6×8 m rect, 5 m radius, 20 m line) apply uniformly.
- Persisting the steward's last-used mode/shape across sessions — the
  store is in-memory and resets on reload.
