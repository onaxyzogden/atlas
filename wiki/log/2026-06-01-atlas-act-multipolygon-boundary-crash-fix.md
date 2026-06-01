# 2026-06-01 -- Act page crash fix: "Invalid LngLat object: (NaN, NaN)"

**Branch.** `feat/atlas-permaculture` (one explicit-path commit `02e26dce`, 4 files,
+291/-25; rebased out-of-band; **not pushed**, commit-only). Defensive UI hardening of
the Act map mount. Amanah gate: land-stewardship planning page, no riba / gharar. Clean.

## Problem

The Act page fell back to its error boundary ("Something went wrong!") with maplibre
throwing **"Invalid LngLat object: (NaN, NaN)"** on map mount.

**Root cause (traced read-only).** `extractBoundaryGeometry` (`apps/web/src/lib/geo.ts`)
is documented to return a **Polygon OR a MultiPolygon**, but BOTH Act shells took its
result and cast it `as GeoJSON.Polygon`, then handed it to `DiagnoseMap` and to
`polygonBounds`. `polygonBounds` assumes a single Polygon -- it reads `coordinates[0]`
as a *ring of positions*. For a **MultiPolygon**, `coordinates[0]` is a whole polygon
(an array of rings), so the bounds were poisoned and `bounds.getCenter()` returned
`{lng: NaN, lat: NaN}`. A Polygon carrying a non-finite vertex hit the same path
(`polygonBounds` and `polygonCentroid` guarded only `=== undefined` / `typeof ===
'number'`, and `typeof NaN === 'number'` is true, so NaN passed through). That NaN center
flowed into `new maplibregl.Map({ center })` -- an unconditional call that threw on mount.

The other coordinate inputs were already safe and not the cause: objective markers
finiteness-guard every vertex (`objectiveMarkerGeometry.ts`), and the coords-only
`fallbackCenter` is finite-guarded (`adaptLocalProject.metadataCenter` uses
`Number.isFinite`; `FALLBACK_CENTROID` is the literal `[-78.2, 44.5]`).

## Constraint

`DiagnoseMap.tsx` is on the foreign-WIP never-edit list. It already falls back to its
`centroid` prop when no `boundary` is given and correctly handles a *true* single
Polygon. So the fix sanitizes DiagnoseMap's INPUTS from the Act-shell side plus a
reusable geo helper -- DiagnoseMap is untouched.

## What shipped

1. `apps/web/src/lib/geo.ts` (the real fix, pure + reusable): two helpers next to
   `polygonCentroid` / `extractBoundaryGeometry`, plus private `isFiniteCoord` /
   `outerRings`:
   - `boundaryCentroid(geom: Polygon | MultiPolygon | undefined): [number, number] |
     null` -- vertex-average over every outer ring, guarding each vertex with
     `Number.isFinite` (hardens `polygonCentroid`, whose `typeof` check lets NaN
     through); handles MultiPolygon; accepts `undefined` (returns `null`) so callers can
     chain `?? fallbackCenter`; returns `null` when no finite vertex exists.
   - `renderablePolygon(geom: Polygon | MultiPolygon | undefined): Polygon | undefined`
     -- normalize to ONE Polygon whose outer ring has `>= 4` ALL-finite positions; for a
     MultiPolygon pick the first polygon; return `undefined` when nothing valid (so
     DiagnoseMap draws no outline and centers on its finite centroid prop).
2. `apps/web/src/v3/act/tier-shell/ActTierShell.tsx` (the promoted default shell):
   dropped the `as GeoJSON.Polygon` cast (`boundaryGeom`); `safeBoundary =
   useMemo(renderablePolygon(boundaryGeom))`; `baseCentroid` memo now
   `boundaryCentroid(boundaryGeom) ?? fallbackCenter` (always finite, no longer routes
   through `polygonBounds().getCenter()`); `boundary={safeBoundary}` on `<DiagnoseMap>`
   and `parcelBoundary={safeBoundary}` on `<PlanDrawHost>`; removed the now-unused
   `polygonBounds` import.
3. `apps/web/src/v3/act/ActLayout.tsx` (legacy StageShell shell, same latent bug):
   same `boundaryGeom` + `safeBoundary`; new `mapCenter = boundaryCentroid(boundaryGeom)
   ?? fallbackCenter` so a MultiPolygon parcel still centers sensibly even when its
   outline cannot render; `centroid={mapCenter}` / `boundary={safeBoundary}` on
   `<DiagnoseMap>` and `boundary={safeBoundary ?? null}` on `<MapToolbar>`.
4. `apps/web/src/lib/__tests__/geo.test.ts` (extended): `boundaryCentroid` (Polygon mean;
   MultiPolygon stays finite; NaN vertex skipped; all-NaN -> null; empty ring -> null) and
   `renderablePolygon` (valid Polygon; MultiPolygon -> first polygon; NaN vertex ->
   undefined; degenerate <4-position ring -> undefined; undefined -> undefined).

## Verification

- `apps/web` `tsc --noEmit`: the 3 errors introduced mid-edit (an `outerRings` type
  predicate, two `boundaryCentroid(undefined)` call sites) were fixed; the touched files
  now typecheck clean. One UNRELATED pre-existing error remains in
  `src/v3/protocols/__tests__/ProtocolsDashboardPage.test.tsx` (missing module) -- both
  that test and its `ProtocolsDashboardPage.tsx` are **untracked foreign WIP** (`??`),
  arrived via the out-of-band rebase, and have no import path to geo/Act. Out of scope.
- Vitest `src/lib/__tests__/geo.test.ts`: 23/23 green. `src/v3/act/tier-shell`: 8 files,
  62 tests green (the network-bound `ActTierExecutionPanel.protocols` suite logs an
  expected ECONNREFUSED for dead `localhost:3000` but still passes).
- **Verification honesty note.** NOT live-verified on localhost. The fix is pure-helper +
  prop-rewiring logic, directly unit-covered (both helpers asserted against Polygon /
  MultiPolygon / NaN / degenerate / undefined inputs) and typecheck-verified at the call
  sites. A live repro -- open the Act page for a project whose `parcelBoundaryGeojson` is
  a MultiPolygon (or inject one) and confirm the map renders without the error boundary,
  and that a normal single-Polygon project still fits its bounds -- was NOT driven: the
  full dev stack is heavyweight and the tree carries extensive uncommitted foreign WIP.
  Per the standing honesty gate this is recorded as unit/typecheck-verified, NOT
  live-verified -- no fabricated status. A live MultiPolygon round-trip remains the
  recommended next-session check.

## Discipline

Explicit-path commit (`git add --` per file), `Compare-Object` confirmed staged ==
intended (4-file set, empty diff). Foreign-WIP never-edit list untouched -- `DiagnoseMap.tsx`
NOT staged (the fix only sanitizes its inputs); financial/maps/tokens/graphify list clean.
Committed immediately on the rebased branch, commit-only (no push). ASCII-only; JS/JSON
apostrophes double-quoted (commit message authored via a `_commitmsg.txt` temp file --
removed after, matches the untracked `_*.txt` scratch convention). No legacy component
deleted.
