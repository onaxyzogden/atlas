# 2026-05-07 — Atlas OBSERVE Lucide point symbology + project-scope GeoJSON / KML / CSV export

**Status:** Adopted
**Branch:** `feat/atlas-permaculture`
**Predecessor:** [2026-05-07 Atlas OBSERVE Touch-First Drag + Multi-Item Batch Edit + Per-Store Undo Specs](2026-05-07-atlas-observe-batch-edit-touch-drag.md)
**Related:** [2026-05-06 Atlas OBSERVE Tools Functional + Scholar Right Rail](2026-05-06-atlas-observe-tools-functional.md), [2026-04-30 Site-Annotations 7-Namespace Consolidation](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md)

## Context

Two follow-ups carried over from the same-day batch-edit ADR were now actionable:

1. **Lucide point symbology.** Five OBSERVE point kinds (`neighbourPin`,
   `household`, `highPoint`, `soilSample`, `swotTag`) rendered as plain
   MapLibre `circle` layers in `ObserveAnnotationLayers.tsx`. Stewards
   could not tell kinds apart at a glance once more than two were on the
   map; the SWOT bucket colour-coding was the only visual differentiator.
2. **Project-level annotation export.** No way for a steward to take
   OBSERVE data off the device. All seven namespace stores already carry
   typed records with explicit GeoJSON geometry (Point / LineString /
   Polygon) plus three geometry-less kinds (`sector`, `permacultureZone`,
   `ecologyObservation`).

This ADR closes both items.

## Decision

### 1. Lucide sprite registry ([lucideSprite.ts](../../apps/web/src/v3/observe/lib/lucideSprite.ts))

A new module renders eight Lucide icons to MapLibre sprite images at module
load time:

- `observe-neighbourPin` — `User`, sandstone bg
- `observe-household` — `Home`, sandstone bg
- `observe-highPoint` — `Mountain`, mid-brown bg
- `observe-soilSample` — `TestTube2`, dark-brown bg
- `observe-swotTag-S | W | O | T` — `Tag` glyph in four bucket colours

Each icon is rendered to an SVG string via
`renderToStaticMarkup(<Icon size={22} stroke={fg} strokeWidth={2.25}
fill="none" />)`, wrapped inside a 40 × 40 SVG with a circular backdrop
(`<circle r="18" fill="${bg}" stroke="#0a0e22" stroke-width="1.5" />`),
encoded as `data:image/svg+xml;base64,...`, decoded via
`Image.decode()`, and registered with `map.addImage(id, img,
{ pixelRatio: 2 })`. Idempotent — re-registering over an existing image
is a no-op (`map.hasImage` guard before and after `decode()`).

`registerObserveIcons(map)` is awaited at the top of `apply()` in
`ObserveAnnotationLayers` and re-runs on every `style.load`. A defensive
`styleimagemissing` listener calls `tryRegisterMissingObserveIcon(map,
id)` so a basemap swap that fires `styleimagemissing` for any of the
eight ids gets backfilled on demand.

### 2. Symbol-layer swap in ObserveAnnotationLayers ([ObserveAnnotationLayers.tsx](../../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx))

Four MapLibre `circle` layers became `symbol` layers:

- `human-points` — mixed `neighbourPin` / `household`. Uses
  `'icon-image': ['concat', 'observe-', ['get', 'annoKind']]` so a single
  layer dispatches the correct image per feature. Both record kinds
  already write `annoKind` in their feature properties.
- `topography-points` — single-kind `'icon-image': 'observe-highPoint'`.
- `soil-points` — single-kind `'icon-image': 'observe-soilSample'`.
- `swot-points` — `'icon-image': ['concat', 'observe-swotTag-', ['get',
  'bucket']]` so the existing S/W/O/T colour-coding persists through the
  icon backdrop.

Layout for all four: `'icon-size': 1.0`, `'icon-allow-overlap': true`,
`'icon-ignore-placement': true`, `'icon-anchor': 'center'`.

The selection halo at lines 869-924 is unaffected: its filter keys off
`['==', ['geometry-type'], 'Point']` (geometry-type, not layer-type), and
the drag handler's `POINT_LAYER_IDS` is symbol-friendly.

### 3. Export library ([annotationExport.ts](../../apps/web/src/v3/observe/lib/annotationExport.ts))

A pure module (no React, no MapLibre) that rolls the seven namespace
stores up into a project-scoped collection and serialises three formats.

**Public surface:**

- `type ExportKind` — 17-kind union covering every record across the
  seven stores.
- `interface ProjectAnnotations { projectId; exportedAt; totalCount;
  byKind: Partial<Record<ExportKind, Array<Record<string, unknown>>>> }`.
- `collectProjectAnnotations(projectId): ProjectAnnotations` —
  synchronous read of `useStore.getState()` for all seven stores,
  filtered by `projectId`.
- `toGeoJSON(p): GeoJSON.FeatureCollection` — RFC 7946. One Feature per
  record with geometry; properties include `kind`, `id`, `createdAt`, and
  every kind-specific scalar field (geometry/projectId stripped).
  Geometry-less kinds (`sector`, `permacultureZone`, `ecologyObservation`)
  are silently skipped.
- `toKML(p): string` — KML 2.2 hand-rolled XML. `<Folder>` per kind,
  `<Placemark>` per record with `<Point>`/`<LineString>`/`<Polygon>`.
  Custom `escapeXml` covers `& < > " '`.
- `toCSV(p): string` — multi-section CSV. Each kind gets a `# kind:
  <name> (<Label>)` separator line, a header row that is the union of
  scalar columns across rows for that kind plus a trailing `geometryWkt`
  column (Well-Known Text), then one line per record. Geometry-less
  records still appear in their kind's section so the CSV is the only
  fully-lossless export format.
- `exportFilename(projectId, ext, now?): string` — formats as
  `atlas-observe-${shortId8}-${YYYYMMDD}.${ext}`.

**Per-kind geometry resolver.** A switch on `kind` reads the right field
on each record because the seven stores are not uniform: most points use
`position`, soilSample uses `location`, storageInfra uses `center`,
transect synthesises `LineString` from `pointA`/`pointB`, and
LineString/Polygon kinds (`accessRoad`, `contour`, `drainageLine`,
`watercourse`, `earthwork`, `hazard`, `ecologyZone`) use the literal
`geometry` property.

### 4. ExportButton UI ([ExportButton.tsx](../../apps/web/src/v3/observe/components/ExportButton.tsx))

A bottom-right floater on the map (mirrors the bottom-left
`MapToolbar`). Click → popover with three rows (`GeoJSON .geojson`, `KML
.kml`, `CSV .csv`, each with a Lucide file icon). Picking a row builds a
Blob, calls `URL.createObjectURL`, programmatically clicks an anchor with
`download` set, then defers `revokeObjectURL` by 1 s for Safari. The
button is `disabled` when `projectId === null` and the popover closes on
Esc or outside-click.

Mounted from `ObserveLayout` next to `SelectionFloater` inside the
`<DiagnoseMap>` render-prop.

### 5. Geometry-less kinds in the export contract

`sector`, `permacultureZone`, and `ecologyObservation` cannot round-trip
through GeoJSON or KML because the stores carry no point/line/polygon
geometry for them (sectors are wedge-rendered from `bearingDeg`/`arcDeg`
and the other two are synthesised from parent geometry at render time).
The contract:

- **GeoJSON / KML:** silently skipped.
- **CSV:** included with their full scalar payload, `geometryWkt` empty.

A future iteration could synthesise sector wedges as polygons (the
renderer already does the math) and include them in the spatial exports.

## Verification

- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` clean (exit 0).
- `npx vite build` clean (✓ built in 34.62s, 626 PWA precache entries).
- `npx vitest run src/v3/observe/lib/__tests__/annotationExport.test.ts`
  — **6 tests pass**: collection respects projectId; collection covers
  all seven stores (8 records, one per store); `toGeoJSON` emits one
  feature per geometry-bearing record (skipping geometry-less ones);
  `toKML` is well-formed (XML decl, KML 2.2 namespace, `<Document>`,
  `<Folder>`, `<Placemark>`, closing `</kml>`); `toCSV` emits the
  expected `# atlas-observe-export` and per-kind `# kind:` separators
  plus the `geometryWkt` column with a literal `POINT(...)` for the
  neighbour record; `exportFilename` matches the
  `atlas-observe-{8char}-YYYYMMDD.{ext}` pattern.
- Pre-existing test failures across 5 unrelated files unchanged.

## Scope deferrals

- **Sector wedge synthesis.** Sectors carry `bearingDeg`/`arcDeg`/
  `radiusM` already used by the map renderer; could be rolled into
  `geometryFor('sector', r)` to emit a Polygon. CSV-only this turn.
- **KML `<IconStyle>`.** Hosted icon PNGs would let Google Earth render
  the same Lucide iconography. Out of scope (requires a public URL).
- **Per-kind sub-toggles in the popover.** v1 contract is
  export-everything; if usage shows stewards routinely want per-module
  exports we add a checkbox row.
- **Streaming for very large projects.** All three serialisers are
  synchronous string builds. Empirically fine for projects under ~5,000
  records; refactor to a worker only if a steward hits a noticeable
  pause.
- **PLAN / ACT stage tool symbology refresh.** This ADR only touches
  OBSERVE.

## Files

**Created:**

- `apps/web/src/v3/observe/lib/lucideSprite.ts` — eight icon registry, idempotent register + missing-image fallback.
- `apps/web/src/v3/observe/lib/annotationExport.ts` — pure collect-and-serialise library (collect / GeoJSON / KML / CSV / filename).
- `apps/web/src/v3/observe/lib/__tests__/annotationExport.test.ts` — 6 vitest specs under happy-dom.
- `apps/web/src/v3/observe/components/ExportButton.tsx` — bottom-right floater + 3-format popover with Blob / anchor download.
- `apps/web/src/v3/observe/components/ExportButton.module.css` — popover + dock styles, mirrors MapToolbar token usage.

**Modified:**

- `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx` — four `circle` → `symbol` swaps, `registerObserveIcons` wire-up, `styleimagemissing` listener.
- `apps/web/src/v3/observe/ObserveLayout.tsx` — mounts `<ExportButton>` next to `<SelectionFloater>`.

## References

- Predecessor ADR: [2026-05-07 Atlas OBSERVE Touch-First Drag + Multi-Item Batch Edit + Per-Store Undo Specs](2026-05-07-atlas-observe-batch-edit-touch-drag.md)
- 7-namespace stores: [2026-04-30 Site-Annotations Scholar-aligned namespaces](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md)
- KML 2.2 reference: https://developers.google.com/kml/documentation/kmlreference
- GeoJSON RFC 7946: https://datatracker.ietf.org/doc/html/rfc7946
