# 2026-04-30 — V3 DesignPage live MapLibre canvas (Phase 5.1 scoping)

**Status:** Accepted — implemented in 4 PRs, commits 7412b03..9937629
(2026-05-02). RULE 2 lifted on Design. Score-delta callout deferred to
v3.2 / Phase 7.3 because `computeAssessmentScores` doesn't yet consume
placement geometry — see PR4 commit message for details.
**Branch:** `feat/atlas-permaculture` (implementation lands on a follow-up branch)
**Phase:** 5.1 (V3 MapboxGL integration — Design Studio canvas)
**Implementing files (proposed):**
- `apps/web/src/v3/components/DesignMap.tsx` (new — mirrors `DiagnoseMap`)
- `apps/web/src/v3/components/overlays/DesignOverlays.tsx` (new — composes existing v2 overlays for v3)
- `apps/web/src/v3/data/useDesignMetrics.ts` (new — derives Area / Perimeter / Water Need from real placements)
- `apps/web/src/v3/pages/DesignPage.tsx` (rewrite of canvas column)

## Context

`DesignPage` currently renders a static SVG diagram (paddocks, yurt cluster,
barn, musalla, paths) with a "Phase 9 placeholder" notice and a toolbox that
fires `setToast("Would place X")` on click. The right-rail "Intelligence
Rail" + the bottom MetricCards (Area / Perimeter / Elev / Water Need /
Project Phase) are wired but consume mock numbers from the brief, not real
placements.

The v2 app already ships a full Design Studio with placement, drag/edit,
snapping (zone/structure/path/utility/livestock/crop stores) on top of
`MapCanvas` (MapLibre + MapboxDraw). Phase 5.3 lifted RULE 2 ("no MapboxGL
in v3.0") on Diagnose by mounting `DiagnoseMap` (a thinner MapLibre wrapper
with a render-prop child API for overlays). Phase 5.1 needs to bring an
equivalent thinner wrapper to Design *without* dragging the v2 page's full
floating-toolbar/spine/popover stack into v3.

## Decision (proposed)

Three deliberate boundaries to keep scope finite:

### 1. Map runtime — reuse `DiagnoseMap` pattern, not `MapCanvas`

Build a new `DesignMap.tsx` modelled directly on `DiagnoseMap`:
- MapLibre instance + `transformRequest` + `NavigationControl`
- Render-prop `children: (ctx: { map, projectId, boundary }) => ReactNode`
- Same boundary-driven `fitBounds` + the same fallback-centroid prop
- **No MapboxDraw runtime.** v3 design placements happen via toolbox
  click-to-drop on the map with a snap pass at draw time, *not* the
  full `MapboxDraw` polygon-edit toolchain. (Editing existing placements
  is a Phase 5.1.x follow-up — see "Out of scope" below.)

This keeps the bundle delta to roughly the cost of one extra
`maplibregl.Map` instance (already paid on Diagnose), avoiding the
`@mapbox/mapbox-gl-draw` runtime and the v2 `LeftToolSpine` /
`DomainFloatingToolbar` weight.

### 2. Persistence — read v2 stores, write through them

The toolbox's 5 groups already correspond 1:1 to existing v2 Zustand
stores:

| Toolbox group | Store | Add action |
|---|---|---|
| Grazing & Land Use | `useLivestockStore`, `useCropStore`, `useZoneStore` | `addPaddock` / `addCropArea` / `addZone` |
| Structures | `useStructureStore` | `addStructure` |
| Water Systems | `useWaterSystemsStore` (earthworks + storageInfra) | `addEarthwork` / `addStorageInfra` |
| Access & Paths | `usePathStore`, `useUtilityStore` | `addPath` / `addUtility` |
| Amenity & Culture | `useStructureStore` (extended types: `musalla`, `garden`, `fire-pit`) | `addStructure` |

**Why reuse v2 stores rather than introducing a v3-specific shadow store:**
each store is already project-keyed, persisted, and consumed by other v2
features (the legacy `/project/:id` page, exports, scoring). A shadow store
would force a sync layer or cause divergence. v3 reads through the same
stores via project-id-filtered selectors (the pattern `MapCanvas` uses).

**Side-effect:** v3 placements are visible immediately to v2 surfaces.
Per the cutover plan in `BACKLOG-v3.1.md`, this is desirable — v3 is
becoming the primary Design surface.

### 3. Snapping — a single deterministic pass at drop time

At drop time, run one snap pass against three target classes in priority
order, returning the snapped point:

1. **Boundary edge** (within 8 px of a boundary polygon edge → project to
   nearest point on segment).
2. **Existing structure footprint corner** (within 8 px → snap to corner).
3. **Path centerline** (within 8 px → snap to nearest point on line).

Snap radius is in screen px (not metres) to keep behaviour consistent
across zooms. No grid snap — designers should be able to drop freely on
empty parcel.

### 4. Live scoring callouts — recompute on placement, throttled

After every successful drop, the canvas calls
`computeAssessmentScores(layers, acreage, country)` from `@ogden/shared`
*plus* `computeOverallScore`. To avoid recomputing on every cursor jiggle:

- Recompute is keyed off the *count + last-modified-time* of placements
  per store (selector returns a stable `[count, lastMutationMs]` pair).
- Recompute is `requestIdleCallback`-scheduled with a 250ms minimum
  spacing.
- Result feeds:
  - The bottom MetricCards (Area / Perimeter from boundary + zones,
    Water Need from livestock + crop water demand, Phase from `phaseStore`).
  - A new `DesignScoreCallout` strip below the canvas that surfaces the
    **delta** vs. the project's pre-design score, not the absolute number.
    Designers want "you just made Water Resilience worse by −4" feedback,
    not the verdict ring (which lives on Diagnose).

### 5. Overlays toolbar — wire the existing 5 chips to real layers

The current `BASE_MAPS` selector + 5 overlay chips (Contours / Hydrology /
Soils / Property / Wetlands) are visual stubs. Wire them to:

- `BASE_MAPS` → `MAP_STYLES[<key>]` style swap (already supported by
  MapLibre instance via `setStyle`).
- `Property` → boundary outline (always-on visually, chip toggles label
  rendering).
- `Hydrology` → `siteData.layers` watershed/streams already fetched.
- `Contours` → `CONTOUR_TILES_URL` raster source.
- `Soils` → soils jsonb summary from migration 018/019 (rendered as a
  legend, not a tile — soils data is point-sample, not coverage).
- `Wetlands` → `siteData.layers` wetlands_flood, drawn as a polygon overlay.

## Out of scope (explicit deferrals)

- **Drag-edit / vertex-edit existing placements.** v3.1 ships *placement*;
  v3.2 ships *editing*. Current v2 surfaces remain available for editing
  during the overlap.
- **Snap to grid.** No designer requested it; would conflict with the
  permaculture "read the land" philosophy.
- **Multi-select / group operations.** Out of scope for Phase 5.1.
- **Right-rail "Intelligence Rail" rewrite.** It already consumes
  `useV3Project()`. The score-delta callout is *additional*, not a
  replacement.
- **Score-aware undo.** Undo is a separate ADR — affects every store.

## Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| v2 store schema drift breaks v3 reads | Med | Med | Lock the read-shape via TS selector return types; vitest covers MTC fixture round-trip |
| Recompute throttling masks a real score regression | Low | Med | Force a recompute on save; visual "score is stale" indicator if last recompute > 5s ago |
| Mounting MapLibre on Design + Diagnose pages doubles GPU usage | Low | Low | Both share style cache via maplibre's internal cache; no two pages mount simultaneously (router unmounts on navigate) |
| Snap targets feel surprising at low zoom | Med | Low | 8 px screen-space radius scales naturally; user-test at z14 (typical parcel zoom) |

## Verification (proposed acceptance criteria)

- `npx tsc --noEmit` clean for `@ogden/web`.
- `/v3/project/mtc/design` renders MapLibre canvas centred on MTC
  boundary, with paddocks/structures/paths from the existing fixture
  rendering as map features (not the static SVG).
- Click "Paddock" in toolbox → cursor enters drop mode → click on map
  drops a paddock; it appears in `useLivestockStore.paddocks`; the
  bottom-strip Area MetricCard updates within 250ms.
- Score-delta callout shows non-zero delta after first placement.
- Toggle each overlay chip — corresponding layer appears/disappears.

## Migration / cutover

- Phase 5.1 implementation is additive — the static SVG is replaced
  in-place but no v2 surface is removed. The `BACKLOG-v3.1.md` "RULE 2"
  line gets struck through.
- No data migration. All placements continue to live in their existing
  v2 stores.

## Sequence of implementation (proposed)

1. Build `DesignMap.tsx` mirroring `DiagnoseMap` (1 PR, ~250 LOC).
2. Build the 5 overlay components, mostly thin wrappers over existing
   v2 overlays (1 PR, ~400 LOC across 5 files).
3. Wire toolbox → drop mode → store `add*` actions with the snap pass
   (1 PR, ~300 LOC).
4. Wire `useDesignMetrics` + the score-delta callout (1 PR, ~200 LOC).
5. Strike RULE 2 from `BACKLOG-v3.1.md`; update Phase 5.1 in
   `wiki/decisions/2026-04-30-v3-design-canvas-scoping.md` Status to
   Accepted; log entry.

Total estimated scope: ~1,200 LOC across 4 PRs.
