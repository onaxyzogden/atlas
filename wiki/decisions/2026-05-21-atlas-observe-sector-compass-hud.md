# 2026-05-21 — Observe: replace sector wedge layers with SectorCompass HUD

**Status.** Implemented on `feat/atlas-permaculture` (commit `7f036f5a`,
plus a rebase-absorbed cleanup of
`apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx`).

## Context

Sector data — solar / wind / hazard / view — surfaced in the Observe
stage in two places:

1. **Slideup detail page.** The Sectors & Zones module renders
   [SectorCompassDiagram](../../apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDiagram.tsx)
   — a pure-SVG compass rose that layers **computed wind petals**
   (`computeWindSectors`), **computed solar arcs** (`computeSolarSectors`),
   and the steward's **manual sector arrows** in a single coherent
   diagram around the project centroid.
2. **Map view.** `ObserveAnnotationLayers` partitioned the manual
   arrows into four MapLibre layer groups (`sectors-solar/wind/hazard/view`),
   each a turf wedge polygon anchored at the homestead, with
   wind-only mid-wedge symbol labels and intensity-proportional
   radii.

The slideup widget is the superior summary. The map wedges
double-encoded only the *manual* portion of the data, did so as four
overlapping translucent fills, and never showed the climatology layer
the steward needs to interpret the arrows.

## Decision

Delete the four map sector layer groups and mount the existing
`SectorCompassDiagram` (in `compact` mode) as a fixed bottom-right
HUD on the Observe map.

- **Anchor.** Fixed UI corner overlay (`position: absolute; bottom:
  92px; right: 12px`), sibling to `ExportButton` /
  `ImportSiteIntelButton`. NOT geo-anchored at the centroid.
- **Layer relation.** Replace the wedges entirely (no coexistence,
  no toggle).
- **Interactivity.** Read-only. Editing continues via the Sectors &
  Zones dashboard list and via `AnnotationSectorHandles` (drag
  handles for the actively-edited sector).
- **Visibility gating.** Gated by the existing `sectors` matrix
  toggle. Returns `null` when there is neither a centroid nor any
  manual sector — same empty-state policy as the slideup.

## Alternatives considered (and rejected)

- **Geo-anchored compass at centroid.** Would re-introduce the
  terrain-scale clutter the change is removing; the compass is a
  *summary*, not an annotation.
- **Coexist with wedges.** Doubles the same data on the map.
- **Toggle between wedge view and compass view.** Adds a control
  for two visualisations of the same data, which inverts the
  steward's stated preference (the slideup compass is superior).
- **Click-to-edit on the HUD.** Editing already has two stable
  paths (dashboard + active-sector drag handles); a third path on
  a small overlay would compete with the underlying map's click
  surface.

## Consequences

- Sector wedges no longer carry `annoKind: 'sector'` features; the
  shared selection / click-to-edit machinery in
  `ObserveAnnotationLayers` no longer dispatches for sectors.
  Editing path narrows to the dashboard + drag-handle pairing.
- Matrix legend keys `wind` / `hazards` / `views` become orphans
  for sector data (only `sectors` now drives a sector surface).
  Left in place; consolidation deferred.
- `useProjectStore`, `DEFAULT_SECTOR_RADIUS_M`, `useHomesteadStore`,
  the `SectorType` / `SectorIntensity` type imports, and the
  helpers `wedgePolygon` / `SECTOR_GROUP` / `GROUP_TOGGLE` /
  `SECTOR_TYPE_COLOR` / `INTENSITY_RADIUS_MULT` / `INTENSITY_LABEL` /
  `compassFromBearing` removed from `ObserveAnnotationLayers.tsx`.
- The `compact` prop on `SectorCompassDiagram` is now consumed at
  two call sites (Sectors & Zones dashboard tool-card preview, new
  Observe HUD); the component remains unchanged.
  - **Superseded 2026-05-22:** `SectorCompassDiagram`'s Layer 3 (manual
    sectors) was modified so manual solar types (`sun_summer` /
    `sun_winter`) render as an outer rim band instead of an interior
    wedge — see [2026-05-22 log entry](../log/2026-05-22-observe-solar-sector-rim-band.md).
    The "component remains unchanged" claim above no longer holds for
    Layer 3.

## References

- Log entry:
  [2026-05-21 — Observe SectorCompass HUD replaces wedges](../log/2026-05-21-observe-sector-compass-hud-replaces-wedges.md)
- Plan: `~/.claude/plans/the-sector-compass-in-memoized-sphinx.md`
- Component reused:
  [apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDiagram.tsx](../../apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDiagram.tsx)
- Detail-page consumer (centroid resolution pattern):
  [apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDetail.tsx](../../apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDetail.tsx)
- New overlay:
  [apps/web/src/v3/observe/components/overlays/SectorCompassOverlay.tsx](../../apps/web/src/v3/observe/components/overlays/SectorCompassOverlay.tsx)
- Mount site:
  [apps/web/src/v3/observe/ObserveLayout.tsx](../../apps/web/src/v3/observe/ObserveLayout.tsx)
- Layer file (sector block removed):
  [apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx](../../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx)
