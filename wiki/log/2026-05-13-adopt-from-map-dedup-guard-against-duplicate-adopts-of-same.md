# 2026-05-13 — Adopt-from-map: dedup guard against duplicate adopts of same osm_id


**Symptom:** Steward reported clicking one adopted building selected/edited a
*different* one. Snapshot of project `eadb3223-…` showed **21 building
entities**, **19 of them sharing `existing.adoptedFromBasemapId === 6488308616`** —
all stacked at the same geometry centroid. With 19 polygons piled on top of
each other, MapLibre's `e.features[0]` resolves to an arbitrary one of the
stack on click, so the steward sees their edit land on a "different"
building than the one they clicked.

**Root cause:** `AdoptBasemapBuildingTool` always called `create(...)` on the
V2 store — no check for whether this `osm_id` was already adopted into the
project. Every re-arm + click on the same basemap building piled up
another entity. Stewards naturally re-arm during a workflow (to label/re-edit),
so the failure mode was easy to trigger and accumulate silently.

**Fix:** Added a dedup guard at the top of the click handler in
`apps/web/src/v3/observe/components/draw/AdoptBasemapBuildingTool.tsx`:
when `adoptedFromBasemapId` is resolved, look up
`useBuiltEnvironmentStoreV2.getState().entities` for an existing
`kind === 'building'`, `state === 'existing'` entity in this project with
the same `adoptedFromBasemapId`. If found, open the existing entity's
inline-edit popover (`openBeInlineEditById`) at the click point, toast
"Already adopted — opened the existing entry for editing," clear the
active tool, and return. New adopts proceed unchanged.

**Verification (Chrome MCP, live preview):**
- `localStorage` before: 19 entities adopting osm_id 6488308616.
- Re-armed "Adopt from map," fired a synthetic click at the cluster
  centroid via canvas `MouseEvent`.
- `localStorage` after: still 19 (delta 0 — no new entity).
- Inline-edit popover opened with "Edit building" form.

**Stale state:** the 18 redundant duplicates already in the user's local
state remain. They will not interfere with future edits to the
most-recently-updated entry (which the dedup guard re-opens), but if the
steward wants a clean state, a console one-liner can collapse them by
keeping the most-recently-updated entity per `(projectId, adoptedFromBasemapId)`
key and rewriting `localStorage['ogden-built-environment-v2']`.

`tsc --noEmit` clean. No other files touched.
