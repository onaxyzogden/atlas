# 2026-05-21 — Plan · Module 5 · WasteVector Dashboard view (visual shell)

**Branch:** `feat/atlas-permaculture`

## What landed

`WasteVectorTool` (Plan Module 5, tab `plan-waste-vectors`) now hosts a
`List | Dashboard` segmented control. The existing form-and-list authoring
surface is preserved verbatim as `WasteVectorListView` (default view); a new
`WasteVectorDashboardView` is a visual bento shell of the user-supplied
"Waste-to-resource vectors" reference design — 6 KPIs, sources→processing→
destinations flow map (curved SVG paths coloured from `MATERIAL_KIND_CONFIG`),
stream inventory + processing methods, risks + recommended interventions,
closed-loop scenarios scroll-snap row, and a three-button footer action bar.
Hardcoded sample data; store wiring deferred.

## Files

- `apps/web/src/features/plan/WasteVectorTool.tsx` (modified)
- `apps/web/src/features/plan/WasteVectorTool.module.css` (new)
- `apps/web/src/features/plan/WasteVectorListView.tsx` (new — lifted body)
- `apps/web/src/features/plan/WasteVectorDashboardView.tsx` (new)
- `apps/web/src/features/plan/WasteVectorDashboardView.module.css` (new)
- `wiki/decisions/2026-05-21-atlas-plan-module5-wastevector-dashboard-view.md`
  (new)

## Verification

- `tsc --noEmit` — clean against the five files; the only error is a
  pre-existing `TS2322` in `StepBoundary.tsx:365`.
- Vite HMR — zero transform errors on the new files (`preview_logs` filter
  for "WasteVector" returns no entries; remaining errors are unrelated
  ECONNREFUSED proxy errors against the absent local API).
- Browser-level visual verification was not possible: the dev preview is
  stuck at `/login` because the `@ogden/api` service is not running locally.

## Decisions taken

- View switcher lives *inside* `WasteVectorTool`, not as a new Module 5 tab
  (no edits to `apps/web/src/v3/plan/types.ts`).
- The mockup's `Understand / Map / Design / Integrate / Optimize` top strip
  is dropped — it conflicts with Atlas's Observe / Plan / Act IA.
- `ClosedLoopGraphCard` is untouched and continues to own the ring / spatial
  network view.
- Scope held to a visual shell on sample data; store wiring deferred.

## Deferred

- Replace sample arrays with `closedLoopStore` / `compostInventoryStore`
  selectors (memoised per 2026-04-26 selector-stability discipline).
- Decide whether the "Run simulations" / "Export closed-loop report" footer
  buttons become real actions or are removed.
- Visual verification in-browser, once the local API service is back up or a
  story / preview route exists that bypasses `/login`.

See decision file: `wiki/decisions/2026-05-21-atlas-plan-module5-wastevector-dashboard-view.md`.
