# 2026-05-07 — Atlas OBSERVE permacultureZone + ecologyObservation spatial export


Closed the second deferred follow-up from the 2026-05-07 symbology /
export ADR. `permacultureZone` and `ecologyObservation` are no longer
"geometry-less, CSV-only."

[`apps/web/src/store/ecologyStore.ts`](../apps/web/src/store/ecologyStore.ts)
gains one optional field on `EcologyObservation`:
`location?: [number, number]`. Records with `location` set become Point
Features in GeoJSON / KML; records without stay CSV-only. No migration
(persist-backed store).

[`apps/web/src/v3/observe/lib/annotationExport.ts`](../apps/web/src/v3/observe/lib/annotationExport.ts):
the `geometryFor` function is widened to `geometriesFor` returning
`KindGeom[]` (each `{ geom; extraProps? }`). Existing scalar cases
become 0- or 1-element arrays. Two new arms — `permacultureZone` fans
`anchorPoint` + `ringRadiiM` into up to six concentric Polygon Features
(`extraProps: { ring, radiusM }` flows into Feature properties / KML
placemark names like "Permaculture zone — Zone 3 (40 m)");
`ecologyObservation` emits one Point when `location` is set. A new
`geomsToWkt(arr)` helper collapses N geometries into the right WKT
(`POLYGON` → `MULTIPOLYGON`) so the CSV row contract stays 1:1 with
records. `circlePolygon` is lifted verbatim from the renderer.

Six new specs in
[`annotationExport.test.ts`](../apps/web/src/v3/observe/lib/__tests__/annotationExport.test.ts)
cover the GeoJSON six-ring expansion (Ring 5 vertex ∈ [55, 65] m of
anchor), CSV `MULTIPOLYGON` row, six per-folder KML placemarks, located
ecology Point, locationless ecology CSV-only path, and zero/negative
radius skipping.

Verification: `tsc --noEmit` clean, `vite build` clean (✓ built in
34.69s), 16 / 16 export specs pass. ADR addendum appended; deferred
follow-ups slimmed accordingly.

Capture UI for `EcologyObservation.location` (map-pick in the Ecology
detail editor) remains deferred.
