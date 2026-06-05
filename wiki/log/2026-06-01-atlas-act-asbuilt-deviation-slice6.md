# 2026-06-01 -- Act as-built deviation loop: Slice 6 (geometry capture-and-apply)

**Branch.** `feat/atlas-permaculture` (one explicit-path commit `6ff06b0e`, 12 files,
+550/-26; rebased out-of-band; **not pushed**, commit-only). Extends the closed-loop
**as-built deviation** feature ([[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]])
with the deferred shape-reconciliation half -- all 6 slices now shipped.

## What shipped

Slice 5 recorded shape divergence as **read-only evidence** (note + optional approximate
area; Plan showed an area delta with NO Apply). Slice 6 makes shape **reconcilable**: a
steward redraws the REAL as-built polygon in Act, it rides in the diff's existing
`asBuilt.capturedGeometry` slot, and Plan "Apply to design" writes that polygon to the
feature store (recomputing area). Two operator forks settled the design this session:
capture path = "capture-in-Act then Apply" (over reuse-the-Plan-vertex-editor / full
redraw); kinds = all four (cropArea / paddock / zone / structure).

**Invariant preserved.** This adds Act *geometry authoring* but NOT Act *Plan-mutation*:
Act writes only an Observe data point (evidence). The sole Plan-store mutation remains the
explicit Plan-side "Apply to design" click -- identical in spirit to the attribute Apply
path. "Act adds, it does not edit Plan decisions" holds in letter and intent. Amanah gate:
land-stewardship reconciliation, no riba / gharar. Clean.

## Changes (build order)

1. `act/asBuilt/geometryDiff.ts`: optional 4th param `capturedGeometry?: Polygon`. When
   present, stamps `asBuilt.capturedGeometry` and -- if no explicit area was typed -- derives
   `asBuilt.areaM2` via `parcelAreaM2`. Slice-5 3-arg callers unchanged. The slot was ALREADY
   `z.unknown().optional()` in the schema -- NO schema change.
2. `act/asBuilt/actAsBuiltPopoverStore.ts`: transient `capture` sub-state
   `{ drawing, geometry, areaM2 }` + `startDrawing` / `cancelDrawing` / `setCaptured` /
   `clearCaptured`; `open`/`close` reset it (capture is per-open-session). Same store-bridge
   pattern as `planVertexEditStore`.
3. `act/asBuilt/ActAsBuiltDrawHandler.tsx` (NEW): thin `map`-prop shell (returns null) calling
   `useMapboxDrawTool<Polygon>({ map, mode:'draw_polygon', enabled: capture.drawing,
   onComplete })`, `onComplete(poly) = setCaptured(poly, parcelAreaM2(poly))`. Hook is always
   called and gated by `enabled` (Rules-of-Hooks safe; `enabled:false` mounts no control).
4. Mounted after `<ActAsBuiltPopover>` in BOTH Act shells (`ActTierShell` ~403, `ActLayout`
   ~252; grep-verified -- missing one would silently no-op redraw in that shell).
5. `act/asBuilt/ActAsBuiltPopover.tsx`: subscribes to `capture` + actions; a "Redraw shape on
   map" button (`startDrawing`) + a "Shape captured - N m2 / Clear" readout (`clearCaptured`)
   in the `shapeDiffers` block; while `capture.drawing` renders null (yields the canvas) after
   all hooks; Esc -> `cancelDrawing` (else `close`); click-outside early-returns while drawing.
   `geometryArmed = shapeDiffers && (note || areaInput || capture.geometry != null)`; `onSave`
   passes `capture.geometry` into `buildGeometryDiff`. Plus `.module.css` `.captureRow` /
   `.captureReadout` / `.clearBtn`.
6. `plan/strata/applyAsBuiltDiff.ts`: `asCapturedPolygon(v): Polygon | null` runtime guard
   (`type==='Polygon'`, `coordinates[0]` ring length >= 4). `canApplyDiff` lights a geometry
   diff IFF `asCapturedPolygon(diff.asBuilt.capturedGeometry) !== null` (all four kinds;
   note/area-only geometry stays read-only). `applyGeometryDiff` writes geometry + recomputed
   `areaM2` (guarded spread -- omit if `parcelAreaM2` null) via `updateCropArea` /
   `updatePaddock` / `updateZone`; structure routes through `updateStructure(id, { geometry })`
   (feeds `updateGeometry`; `widthM`/`depthM`/`rotationDeg` go stale by design, same as the
   Plan vertex editor).
7. `plan/strata/AsBuiltReconciliationCard.tsx`: Apply lights for free (already renders off
   `canApply`); read-only label swaps to "As-built shape captured -- Apply redraws the design
   polygon"; structure adds a caution that apply replaces the parametric footprint.

## Verification

- `apps/web` + `@ogden/shared` `tsc --noEmit` exit 0.
- Vitest: `geometryDiff` 9 (+3), `applyAsBuiltDiff` 20 (+ all-4-kinds captured apply, malformed
  reject, per-kind geometry+areaM2 store writes, structure `updateGeometry` spy),
  `asBuiltReconciliationCard` 19 (+ captured-polygon Apply + "As-built shape captured" copy +
  crop-store polygon write with numeric areaM2 + structure caution). The `act/asBuilt` +
  `plan/strata` directories run clean as a whole (144 tests, 18 files). The full vitest run hung
  on unrelated network-bound suites (dead `localhost:3000`) and was stopped after ~20 min; the
  directly-affected directories were run clean instead.
- **Verification honesty note.** NOT live-verified on localhost. The genuinely new and risky
  logic -- `applyGeometryDiff`, the `canApplyDiff` geometry branch, the card label -- is
  comprehensively unit-covered (the `applyAsBuiltDiff` suite injects a captured polygon and
  asserts the per-kind geometry+areaM2 store write; the card suite asserts the Apply button +
  store write + structure caution). A live round-trip was not driven: the Act capture side
  requires drawing a polygon on the maplibre canvas, which (like the layer clicks documented in
  Slices 4-5) is unreachable from preview automation, and the dev API was down this session. Per
  the standing honesty gate this is recorded as unit/typecheck-verified, NOT live-verified -- no
  fabricated status. A live capture->Apply round-trip (crop/paddock/zone/structure) remains the
  recommended next-session check, driven via the dev store-injection hook used in Slice 5.

## Discipline

Explicit-path commit (`git add --` per file), `Compare-Object` confirmed staged == intended
(12-file set, empty diff). Foreign-WIP never-edit list untouched -- the tree carries substantial
uncommitted foreign WIP (financial files, DesignMap/DiagnoseMap/OperateMap, graphify-out, many
plan/strata CSS modules, phasing-budgeting) -- none staged. Both Act shell diffs confirmed to
contain only the import + mount lines (no foreign bleed). Committed immediately on the rebased
branch, commit-only (no push). ASCII-only; JS/JSON apostrophes double-quoted. No legacy
components deleted.
