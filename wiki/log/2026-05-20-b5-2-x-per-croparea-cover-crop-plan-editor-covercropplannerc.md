# 2026-05-20 — B5.2.x: Per-CropArea cover-crop plan editor (`CoverCropPlannerCard`)


**Branch.** `feat/atlas-permaculture`. Closes the last write-side gap on
the B5.1 (schema) + B5.2 (data) cover-crop stack. Before this slice
nothing in the UI wrote `CropArea.coverCropPlan` — the field existed,
the catalog existed, the audit existed, but `LivingRootsCard` read
"No cover-crop plans yet" on every parcel because the only way to
populate the plan was hand-editing localStorage. B5.2.x ships a single
new presentational card that lets a steward add / remove
`CropCoverWindow` entries per `CropArea` against the 14-row
`COVER_CROP_CATALOG`; writes flow through the existing single-writer
`updateCropArea(id, { coverCropPlan: nextArray })` atomic-array
commit; `LivingRootsCard` and the `living-roots-coverage-pct`
goal-tree projection light up live with zero further wiring.

**Files.** New: `apps/web/src/features/coverCrops/CoverCropPlannerCard.tsx`,
`.module.css`, `coverCropPlannerMath.ts`, plus
`__tests__/coverCropPlannerMath.test.ts` (18 cases) and
`__tests__/CoverCropPlannerCard.test.tsx` (4 RTL cases).
Edited: `apps/web/src/v3/plan/types.ts` (one `MODULE_CARDS` entry in
`plant-systems`, immediately above the B5.1 Living-roots audit entry)
and `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` (one lazy import + one
`case 'plan-cover-crop-planner'` arm in `renderPlanCard`).

**Posture.** Strictly-additive — no schema bump, no persist version
bump, no new store action, no `PlanModule` member added, no goal-tree
criterion added, no migration. `cropStore.ts`, `coverCropCatalog.ts`,
`plantCatalog.ts`, `LivingRootsCard.tsx`, `livingRootsMath.ts`,
`CriteriaForecastTab.tsx` untouched. Mounted **only** under
`plant-systems` (not cross-registered to `soil-fertility`) to avoid
duplicate-mounting the heavy editor beside the audit-only posture
LivingRootsCard already maintains there.

**Verification.** Targeted vitest **58/58** green
(`coverCropPlannerMath` 18 + `CoverCropPlannerCard` RTL 4 +
`livingRootsMath` 12 + `coverCropCatalog` 14 + `plantCatalog` 10);
full web vitest exit 0; `tsc --noEmit` exit 0; `vite build` exit 0;
covenant grep over the three new files PASS (only docstring negative
declarations match). RTL happy-path asserts that picking `winter_rye`
then clicking Add → Save commits `{ speciesId: 'winter_rye',
role: 'winter_cover', startMonth: 9, endMonth: 5 }` (May, not the
plan's tentative March — derived from the species' `livingRootSeasons`
spring tail by `defaultWindowFor`). Live preview not exercised
(MapLibre/WebGL hang behind the Plan slide-up disclosed per
screenshot-honesty rule — pure-math + RTL + tsc are authoritative).

**Commits & anomaly.** Per-task explicit-path commits on
`feat/atlas-permaculture`: `492ecbaa` math + tests → `4f838b0f`
card + CSS + RTL test. The mount edits (`types.ts` +
`PlanModuleSlideUp.tsx`) were unintentionally bundled into an
out-of-band commit `242494bf` ("feat(b3.1): register
plan-livestock-rotation-adherence-actions section") that landed
between my Part-2 commit and my Part-3 staging — `git show 242494bf`
contains both `plan-cover-crop-planner` (mine) and
`plan-livestock-rotation-adherence-actions` (theirs). Documented in
the ADR as a per-commit-isolation anomaly; no remediation attempted
(no force-push to a rebased branch). Branch divergence checked
`15 0` (ahead/behind locally) — **not pushed**.

**Covenant.** Strictly agronomic — copy is "Schedule cover-crop
windows", "Living roots: Fall, Winter, Spring", "Writes to cover-crop
plan". No riba/gharar/CSRA/salam/investor/financing/cost-of-capital
framing; "yield" deliberately avoided ("cover-crop plan", not
"cover-crop yield plan"). Covenant grep clean.

**ADR.** [decisions/2026-05-20-atlas-b5-2-x-cover-crop-planner-editor.md](decisions/2026-05-20-atlas-b5-2-x-cover-crop-planner-editor.md).
