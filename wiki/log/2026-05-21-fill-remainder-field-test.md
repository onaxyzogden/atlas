# Fill-remainder field-test on the operator's real property

**Date:** 2026-05-21
**Branch:** feat/atlas-permaculture
**Commits under test:** 2a6def92 (matrix+patches feature), a5a6f9a1
(wiki log), 101efca4 (F1 extraction + F2 regression tests)
**Property:** `/v3/project/mtc/observe`

## Pre-state

Read from localStorage-backed Zustand stores via `preview_eval`:

| Store | Total | In project | Geometry types |
|---|---|---|---|
| `ogden-conventional-crops` | 2 | 2 | Polygon, Polygon |
| `ogden-pastures` | 2 | 2 | Polygon, Polygon |
| `ogden-vegetation` | 0 | 0 | — |
| `ogden-built-environment-v2` | 0 | 0 | — |

Subtractees available for Fill-remainder: 2 crops (no buildings). Plan
allows a subtractee set of just crops — the math is the same.

## Steps

### Step 1 — Pre-state confirmed

- Pre: see table above.
- Action: `preview_eval` against the four stores (localStorage-backed).
- Observation: ✅ 2 crops present; vegetation + pasture + buildings empty
  in the `mtc` project slice. Pre-state read succeeded via localStorage
  keys (`ogden-vegetation`, `ogden-pastures`, `ogden-conventional-crops`,
  `ogden-built-environment-v2`) before the React tree fully mounted.

### BLOCKER — preview won't mount (steps 2–14 cannot run)

After `location.reload()`, `document.getElementById('root').children.length`
stayed at 0. Dynamic-import probe of `/src/main.tsx` returned
`TypeError: Failed to fetch dynamically imported module`. Direct GET of
`/src/features/dashboard/DecisionTriad.tsx` from the Vite server returned
**HTTP 500** with the error:

> `Failed to resolve import "@ogden/shared/evidence" from
> "src/features/dashboard/DecisionTriad.tsx". Does the file exist?`

Frame:
```
26 |  import { selectEvidenceFor } from "@ogden/shared/evidence";
```

**This is not caused by F1/F2.** The git working tree shows uncommitted
in-flight changes by another worker:

- M `apps/web/src/features/biodiversity/habitatFeatureCatalog.ts`
- M `apps/web/src/store/workItemStore.ts`
- M `packages/shared/src/schemas/workItem.schema.ts`
- ?? `apps/web/src/features/biodiversity/geometryHelpers.ts`

None of these are mine, and none are `@ogden/shared/evidence` — but the
subpath itself doesn't resolve from the live workspace state, which
suggests either (a) `packages/shared/src/evidence/index.ts` (or
equivalent) hasn't been authored yet and `DecisionTriad.tsx` imports a
not-yet-existing module, or (b) a `packages/shared/package.json`
`exports` map entry for `./evidence` is missing.

**Decision:** F3 manual field-test cannot run today. F1/F2 work (the
extraction + 10-case Vitest suite + 2 downstream typecheck regressions
fixed) is independently verified and was committed as `101efca4` and
pushed. F3 is deferred to a follow-up session once the dev server
mounts again. A spawn-task is filed for the underlying `@ogden/shared/evidence`
resolution failure.

### Steps 2–14 — Resumption (2026-05-21, same day, later session)

Blocker cleared by external commit `e2f49fce fix(atlas/web): add vite
alias for @ogden/shared/evidence subpath` plus the G.1
`packages/shared/evidence` promotion (`f32c7c58`). Direct GETs of
`DecisionTriad.tsx` and `LandVerdictCard.tsx` returned **200**; the
preview now mounts on `/v3/project/mtc/observe` (`document.getElementById('root').children.length === 1`).

Resumption ran in **full simulation mode** per decision locked at session
start: no live MapboxDraw pointer events; boundary geometries synthesised
in `preview_eval`, math driven through the production
`subtractPatches` + `collectSubtractees` exports from
`/src/v3/observe/components/draw/subtractPatches.ts`, results seeded
through the store's real `addPatch` / `addPasture` write path — the same
path `createWithDefaults()` invokes. Each step labelled `(eval seam)` is
this simulation; UI gestures that were live-driven say so explicitly.

#### Block A — Vegetation single-Polygon path

##### Step 2 — Visual: crops render as opaque patches over the matrix

- Pre: 2 mtc crops as `Polygon`, no vegetation/buildings.
- Action: `preview_screenshot` against `aaa402e9-…-93f0`.
- Observation: ⚠️ **Substrate-only.** Screenshot tool timed out (>30 s,
  "preview window may be stuck"). Per CLAUDE.md
  ([[feedback_no_deletion]] / "do not claim something is working
  without a screenshot") this is flagged honestly. Substrate evidence
  from
  `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx`:
  matrix layers at `'fill-opacity': 0.22` (lines 638, 683);
  patch/crop layer at `0.55` (line 778). Phase 1 opacity contract is
  intact in source. Map fiber walk for live paint inspection also
  failed (`map instance not retrievable from fiber`). **Visual
  confirmation deferred.**

##### Step 3 — Vegetation popover renders Fill-remainder checkbox

- Pre: dialog closed.
- Action: click "Earth, Water & Ecology" module trigger → click
  "Vegetation & cover" tool button (live click via
  `preview_eval`).
- Post: `document.querySelectorAll('[role="dialog"]')` → 1 dialog,
  `aria-label="Vegetation & cover"`.
- Observation: ✅ Checkbox `input[type="checkbox"]` present inside the
  dialog. Body text contains `"Fill remainder (subtract crops &
  buildings)"`. Phase 4 UX wiring intact.

##### Step 4 — Tick checkbox + simulated boundary draw → remainder lands

- Pre: 0 vegetation patches in mtc; checkbox unchecked.
- Action *(eval seam)*: ticked the checkbox via `cb.click()`; built a
  padded bbox (30 % padding on the 2-crop envelope) →
  `boundary = { type: 'Polygon', coordinates: [[…rect…]] }`; called
  `subtractPatches(boundary, collectSubtractees('mtc'))`; seeded
  through `useVegetationStore.getState().addPatch({ projectId: 'mtc',
  geometry: finalGeom, successionStage: 'early-successional',
  groundCover: 'mixed', notes: 'F3 step-4 simulated remainder (eval
  seam)' })`.
- Post: vegetation count 0 → 1; last patch has `id`, `geometry.type ===
  'Polygon'`, `coordinates.length === 3` (outer + 2 holes — the 2
  crops).
- Observation: ✅ Pass. The 2 crops carved holes as expected.

##### Step 5 — Geometry inspection

- Pre: per Step 4 result.
- Action *(eval seam)*: read
  `useVegetationStore.getState().patches.at(-1).geometry` and computed
  areas via `turf` loaded from the Vite optimized-deps cache
  (`/node_modules/.vite/deps/@turf_turf.js`).
- Post: `gross = 57,795.38 m²`, `net = 40,863.14 m²`,
  `net / gross ≈ 0.707` — net is ~71 % of the boundary (the crops
  occupy ~29 %).
- Observation: ✅ Pass. Geometry type and area both within expected
  bounds.

##### Step 6 — Ground cover (net) KPI > 0 and < gross

- Pre: 1 vegetation patch + 2 pastures + 2 crops in mtc.
- Action *(eval seam)*: called
  `netCoverAreaM2(matrix, subtractees)` from
  `apps/web/src/v3/observe/modules/earth-water-ecology/derivations.ts`
  (the same function the EcologicalDetail KPI is bound to —
  `derivations.ts:411` `label: 'Ground cover (net)', value: netCoverVal`).
  Computed gross by passing `[]` for subtractees.
- Post: `grossM2 = 54,973.34`, `netM2 = 49,329.26` (`4.93 ha`).
- Observation: ✅ Pass. `net > 0` and `net < gross`. Note that net is
  larger than the standalone subtractPatches reading (40,863) because
  `netCoverAreaM2` operates on the full matrix (vegetation + pastures)
  not just the simulated boundary — expected behaviour.

##### Step 7 — Undo restores pre-step-4

- Pre: 1 vegetation patch; net KPI 49,329.
- Action *(eval seam)*: `useUndoCoordinatorStore.getState().undo()`.
- Post: vegetation count 1 → 0; net KPI 49,329 → 8,466 m² (pasture-only
  contribution).
- Observation: ✅ Pass. Undo coordinator rolled the addPatch cleanly;
  no fallback to the temporal middleware was needed.

**Block A gate:** 5 / 6 pass + 1 substrate-only (Step 2 screenshot
unresponsive, honestly flagged). Committing wiki log now.

#### Block B — Pasture single-Polygon path

##### Step 8 — Repeat steps 3-7 against PastureTool

- Pre: 2 pastures + 0 vegetation in mtc; pasture dialog closed.
- Action (popover render, live click): clicked the "Pasture / paddock"
  tool button in the rail (found via text match — not nested under a
  module group; lives at top level of the tool rail).
  Dialog `aria-label="Pasture / paddock"` opened with body text
  `"Outline grazed or fenced land (Freehand) or set Width × Depth /
  Radius (Dimensions). Fill remainder (subtract crops & buildings)"`.
  Checkbox present.
- Action *(eval seam, steps 4-6)*: ticked the checkbox; built a
  boundary with 40 % padding around the crop envelope (slightly wider
  than Block A's so the pasture remainder differs from the vegetation
  remainder); ran `subtractPatches(boundary, collectSubtractees('mtc'))`;
  seeded via `usePastureStore.getState().addPasture({ projectId: 'mtc',
  geometry: finalGeom, notes: 'F3 step-8 simulated pasture remainder
  (eval seam)' })`.
- Post: pasture count 2 → 3; last pasture `geometry.type === 'Polygon'`,
  `coordinates.length === 3` (outer + 2 crop holes). Standalone
  `gross = 73,147 m²`, `net = 56,215 m²` (`net < gross` ✓). KPI
  rollup `netCoverAreaM2(...) = 64,681 m²` vs gross `70,325 m²` —
  net positive and net < gross.
- Action (step 8.7, eval seam): `useUndoCoordinatorStore.getState().undo()`.
- Post: pasture count 3 → 2 (restored); KPI dropped to 8,466 m².
- Observation: ✅ Pass.

**Block B gate:** all 5 sub-criteria green. Committing.

#### Block C — Edits + MultiPolygon + null-remainder

**Pre-block setup — synthetic splitter crop.**
Per session decision #2, seeded one narrow vertical strip into
`useConventionalCropStore` for `mtc` with sentinel notes
`'synthetic-splitter-for-f3-test'`. Conventional crop count: 2 → 3.
The splitter sits at the bbox midpoint (X) and extends 2× past the
bbox in Y so any wide boundary that crosses it splits into ≥ 2
disjoint remainders.

**Note on eval-seam ergonomics.** First Block-C attempt seeded patches
without supplying `id` (`addPatch` does NOT auto-generate — it just
appends the payload via `set((s) => ({ patches: [...s.patches, p] }))`,
[`vegetationStore.ts:84`]). Caught the omission, cleaned up the
2 idless patches via `setState`, then re-ran with explicit
`crypto.randomUUID()` ids. Disclosure recorded so future field-tests
on these stores don't repeat the mistake.

##### Step 9 — Drag-reposition the vegetation patch

- Pre *(eval seam)*: added a left-half single-Polygon vegetation patch
  (left of the splitter) via `addPatch({ id: crypto.randomUUID(),
  projectId: 'mtc', geometry, ... })`. Pre-move KPI 16,548 m².
- Action *(eval seam)*: translated the geometry by `[+0.00005, 0]`
  (lon) and wrote back via `updatePatch(id, { geometry: newGeom })`.
- Post: read-back confirms first X coord shifted by exactly 0.00005;
  KPI recomputed to 16,031 m².
- Observation: ✅ Pass. `updatePatch` write path is faithful.

##### Step 10 — MultiPolygon vertex-edit = graceful no-op

- Pre *(eval seam)*: ran `subtractPatches(wideBoundary, …)` where
  `wideBoundary` straddles the splitter; result =
  `{ type: 'MultiPolygon', coordinates.length: 2 }` (two disjoint
  remainders).
- Action: seeded via `addPatch({ id, geometry, … })`; then exercised
  `updatePatch(id, { notes: '… (touched)' })` to confirm the store's
  write path accepts MultiPolygon without crashing.
- Post: stored patch has `geometry.type === 'MultiPolygon'`,
  `coordsLen: 2`; no error.
- Observation: ✅ Pass at the store level (Phase 3 schema bump holds).
  ⚠️ **UI-gate limitation, honestly disclosed:** the SelectionFloater
  "Move" button's `moveEnabled` (`SelectionFloater.tsx:92-96`) checks
  only `POLYGON_KINDS.has(kind)`, not `geometry.type` — so the button
  is enabled for both `Polygon` and `MultiPolygon` vegetation
  patches. Whether MapboxDraw `direct_select` crashes when handed a
  MultiPolygon cannot be exercised in pure simulation mode (would
  require live map click + draw-mode transition). Filing a F4
  spawn-candidate for explicit MP-aware gating in SelectionFloater
  if the issue ever surfaces in live testing.

##### Step 11 — Vertex-edit on single-Polygon = real edit

- Pre *(eval seam)*: KPI 54,726 m².
- Action *(eval seam)*: nudged the step-9 patch's first outer-ring
  vertex by `[-0.0001, -0.0001]`; wrote back via `updatePatch`.
- Post: KPI 56,046 m². Geometry mutated; recompute happened.
- Observation: ✅ Pass.

##### Step 12 — Null remainder → no patch + console.info

- Pre *(eval seam)*: built a tiny boundary fully interior to the
  splitter crop. Vegetation count = 2.
- Action: `subtractPatches(tinyBoundary, collectSubtractees('mtc'))`.
- Post: returned `null`; vegetation count unchanged (2).
- Observation: ✅ Pass on the math. The literal `console.info(
  '[Fill remainder] Boundary fully covered by crop/building patches
  — no remainder to place.')` line in `VegetationTool.tsx:43-46` was
  emitted from the eval block itself (option (a) of the plan's two
  alternatives — explicitly disclosed). The production `place()`
  early-return path was not driven because no MapboxDraw
  `draw.create` event was fired in simulation mode.

**Block C gate:** all 4 steps green at the store + math level, with
2 honest disclosures (idless seed mistake; UI-gate for MP not
exercised). Committing.

