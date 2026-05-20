# 2026-05-07 — Atlas OBSERVE sector wedges in GeoJSON / KML exports


Closed the first "Scope deferral" from this morning's symbology / export
ADR. `annotationExport.geometryFor('sector', …)` now synthesises a wedge
`Polygon` (250 m radius, lifted from the renderer's `wedgePolygon` math)
when a project anchor resolves: first household → parcel-boundary
centroid → null fallback (CSV-only, same as before). `toGeoJSON`,
`toKML`, and `toCSV` each compute the anchor once at entry and thread it
through `geometryFor` via a small `ExportContext`.

Two new vitest specs cover the with-anchor (Polygon + WKT) and no-anchor
(skipped from spatial, present-but-empty in CSV) paths; pre-existing 6
specs unchanged. `tsc --noEmit` clean, `vite build` clean (26.81 s),
8 / 8 export specs pass.

ADR amended in place (no new file): see
[2026-05-07 OBSERVE symbology / export ADR](decisions/2026-05-07-atlas-observe-symbology-export.md)
for the full update section.
