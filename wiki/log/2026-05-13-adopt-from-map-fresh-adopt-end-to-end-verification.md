# 2026-05-13 — Adopt-from-map: fresh-adopt end-to-end verification


**Follow-up to the diff-race fix above.** After shipping the gate, the
steward reported "fix did not actually work" — read as: a freshly
adopted building still didn't render. Drove the full flow in Chrome MCP
to settle it. Post-reload, in a clean session: clicked the **Adopt from
map** rail button, fired a synthetic map click at a fresh basemap
building (osm_id 6842847921). Result:

- new V2 entity created with `state: 'existing'`, correct `projectId`,
  `existing.adoptedFromBasemapId: 6842847921`;
- `observe-anno-be-buildings` source feature count: 10 → 11 in the same
  tick;
- `queryRenderedFeatures` at the polygon centroid returned the new
  feature on `observe-anno-be-buildings-fill` with matching `annoId`;
- basemap layers' `building`/`building-3d` filter clauses extended to
  include the new id — basemap original now hidden.

So the fix is correct *and* end-to-end sufficient. The "still broken"
report most likely reflected HMR not picking up the change before the
retest (the running bundle now contains `appliedBasemapRef`, confirmed
via `fetch('/src/v3/components/DiagnoseMap.tsx')`).

No further code changes — verification only. `tsc --noEmit` clean.
