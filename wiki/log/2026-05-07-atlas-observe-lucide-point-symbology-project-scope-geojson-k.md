# 2026-05-07 — Atlas OBSERVE Lucide point symbology + project-scope GeoJSON / KML / CSV export


Closed two more items from the deferred list: at-a-glance symbology for
the five OBSERVE point kinds and an off-device export path covering all
seven namespace stores.

### Symbology

NEW [`lucideSprite.ts`](../apps/web/src/v3/observe/lib/lucideSprite.ts)
registers eight images on the MapLibre sprite registry —
`observe-{neighbourPin,household,highPoint,soilSample}` plus four SWOT
bucket variants `observe-swotTag-{S,W,O,T}`. Each icon is rendered to an
SVG string via `renderToStaticMarkup(<LucideIcon size=22 stroke=… />)`,
wrapped inside a 40 × 40 SVG with a circular backdrop, encoded as
`data:image/svg+xml;base64,…`, decoded via `Image.decode()`, and
registered with `map.addImage(id, img, { pixelRatio: 2 })`. Idempotent
(`map.hasImage` guard before and after `decode()`).

[`ObserveAnnotationLayers`](../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx)
swaps four `circle` layers to `symbol`. `human-points` (mixed
neighbour / household) and `swot-points` (mixed S/W/O/T) use a
`['concat', 'observe-', ['get', 'annoKind' | 'bucket']]` icon-image
expression so a single layer dispatches the correct image per feature;
`topography-points` and `soil-points` are single-kind. All four use
`'icon-allow-overlap': true`, `'icon-ignore-placement': true`,
`'icon-anchor': 'center'`. The selection halo at lines 869-924 keeps
working — its filter keys off `['==', ['geometry-type'], 'Point']`, not
layer type.

`registerObserveIcons(map)` is awaited at the top of `apply()` and
re-runs on every `style.load`. A defensive `'styleimagemissing'`
listener calls `tryRegisterMissingObserveIcon(map, id)` so a basemap
swap that fires the event for any of the eight ids gets backfilled on
demand.

### Export library

NEW [`annotationExport.ts`](../apps/web/src/v3/observe/lib/annotationExport.ts)
— pure module (no React, no MapLibre) covering all 17 ExportKinds across
the seven stores.

- `collectProjectAnnotations(projectId)` — synchronous read of
  `useStore.getState()` filtered by projectId, returning
  `{ projectId, exportedAt, totalCount, byKind }`.
- `toGeoJSON(p)` — RFC 7946 FeatureCollection, one Feature per
  geometry-bearing record. Geometry-less kinds (`sector`,
  `permacultureZone`, `ecologyObservation`) silently skipped.
- `toKML(p)` — KML 2.2 hand-rolled XML, `<Folder>` per kind with
  `<Placemark>`s using `<Point>`/`<LineString>`/`<Polygon>`. Custom
  `escapeXml` covers `& < > " '`.
- `toCSV(p)` — multi-section CSV: `# atlas-observe-export` header
  block, then one section per kind with `# kind: <name>` separator,
  union-of-columns header row, and a trailing `geometryWkt` column
  (Well-Known Text). Geometry-less records appear in CSV with empty
  `geometryWkt`.
- `exportFilename(projectId, ext, now?)` — formats as
  `atlas-observe-{shortId8}-{YYYYMMDD}.{ext}`.

Per-kind geometry resolver handles the field heterogeneity: most points
use `position`, soilSample uses `location`, storageInfra uses `center`,
transect synthesises `LineString` from `pointA`/`pointB`, and
LineString/Polygon kinds use the literal `geometry` property.

### ExportButton UI

NEW [`ExportButton.tsx`](../apps/web/src/v3/observe/components/ExportButton.tsx)
— bottom-right floater on the OBSERVE map (mirrors bottom-left
`MapToolbar`). Click → popover with three rows
(`GeoJSON .geojson`, `KML .kml`, `CSV .csv`, each with a Lucide file
icon). Picking builds a Blob, calls `URL.createObjectURL`, clicks an
anchor with `download`, defers `revokeObjectURL` by 1 s for Safari.
Disabled when `projectId === null`; popover closes on Esc /
outside-click.

Mounted from
[`ObserveLayout`](../apps/web/src/v3/observe/ObserveLayout.tsx) next to
`<SelectionFloater>` inside the `<DiagnoseMap>` render-prop.

### Verification

- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` clean (exit 0).
- `npx vite build` clean — ✓ built in 34.62s, 626 PWA precache entries.
- `npx vitest run src/v3/observe/lib/__tests__/annotationExport.test.ts`
  — **6 tests pass**: project-scoped collection, cross-store collection
  (8 records, one per store), `toGeoJSON` skips geometry-less kinds,
  `toKML` is well-formed, `toCSV` carries `# kind:` separators and a
  literal `POINT(...)` for the neighbour record, `exportFilename`
  matches the `atlas-observe-{8}-YYYYMMDD.{ext}` pattern.
- Pre-existing test failures across 5 unrelated files unchanged.

**ADR.** [`wiki/decisions/2026-05-07-atlas-observe-symbology-export.md`](decisions/2026-05-07-atlas-observe-symbology-export.md).

### Deferred

- Sector-as-wedge geometry synthesis for spatial exports.
- KML `<IconStyle>` with hosted icon PNGs for Google Earth parity.
- Per-kind sub-toggles in the export popover.
- Worker offload for very large projects (sync builds are fine for
  ≤ ~5,000 records).
- PLAN / ACT stage tool symbology refresh (separate turn).

### Recommended next session

- Manual preview pass at `/v3/project/<id>/observe` — confirm icon
  recognition under each basemap, verify GeoJSON loads in QGIS / Google
  My Maps and KML in Google Earth at the right coordinates.
- Or: pick up Plan-stage tool palette / sector-wedge geometry now that
  the OBSERVE field-data path is closed end-to-end.
