# ADR — Atlas B5.2.x: per-CropArea cover-crop plan editor (CoverCropPlannerCard)

**Date:** 2026-05-20
**Branch:** `feat/atlas-permaculture`
**Sub-project:** B5.2.x (closes the last write-side gap on the B5.1
+ B5.2 cover-crop / living-roots stack — schema and data shipped,
nothing in the UI wrote `CropArea.coverCropPlan` until now)
**Status:** Accepted — shipped in commits `492ecbaa`, `4f838b0f`,
plus the mount edits squashed into out-of-band commit `242494bf`
**Related:** [[2026-05-19-atlas-b5-1-cover-crop-living-roots]],
[[2026-05-19-atlas-b5-2-plant-catalog-cover-crop-backfill]]

---

## Context

B5.1 shipped the `CropArea.coverCropPlan?: CropCoverWindow[]` schema
(persist v2→v3) and the read-only `LivingRootsCard` audit. B5.2
expanded `COVER_CROP_CATALOG` from 6 → 14 cited entries (8
conventional annuals + the 6 perennial / herbaceous-understory
species). **Nothing in the UI wrote `coverCropPlan`** — the schema
and data were in place, but `coverCropPlan` could only be populated
by hand-editing localStorage. The audit therefore read "No
cover-crop plans yet" on every parcel; B5.1+B5.2 was symbolically
complete but practically unusable.

B5.2.x closes that gap with one new card.

## Decision

Ship a single new card — `CoverCropPlannerCard` — under the
`plant-systems` Plan module that lets a steward, per `CropArea`,
add / edit / remove `CropCoverWindow` rows against the 14-entry
`COVER_CROP_CATALOG`. The card writes through the existing
single-writer `updateCropArea(id, { coverCropPlan })` action;
`LivingRootsCard` (cross-registered into `plant-systems` +
`soil-fertility`) picks up the writes through Zustand with zero
further wiring.

**Strictly UI-only.** No schema bump, no persist version bump, no
new store action, no `PlanModule` member added, no goal-tree
criterion added, no migration written. Restores the strictly-
additive-no-schema-bump posture B5.2 already restored after B5.1's
one-time schema exception.

### Card structure

- **Header** — title "Cover-crop planner", one-sentence hint
  ("Schedule cover-crop windows per crop area against the cited
  catalog. Coverage flows into the living-roots audit below."), a
  "Writes to cover-crop plan" badge (parallel to LivingRootsCard's
  "Read-only" badge).
- **Empty state** — no crop areas in this project → "draw a row
  crop, garden bed, or orchard in the plant-systems module to
  begin planning cover crops."
- **Per-area block** —
  - Area name + type chip + areaM2.
  - Existing-windows list — species common name (resolved via
    `CATALOG_BY_ID`), role chip, year-wrap-aware month-range pill
    (`Oct–Mar`), ✕ remove button.
  - "+ Add cover-crop window" disclosure → form with:
    - Species `<select>` grouped by primary role
      (`winter_cover` / `smother` / `green_manure` / `scavenger` /
      `biofumigant` / `living_mulch`), label "Common name · Latin
      name".
    - Role `<select>` constrained to the picked entry's `roles[]`.
    - `startMonth` / `endMonth` number inputs (1..12).
    - Live season-tag hint from `livingRootMonthsFor(window)`.
  - On species pick: pre-fill role to entry's first `roles[]`,
    pre-fill window via `defaultWindowFor(entry)` (planting start
    → catalog's last living-roots-season tail).
  - **Save changes** / **Discard** per-area buttons; Save disabled
    when draft equals stored.

### Pure helpers — `coverCropPlannerMath.ts` (new module)

- `addWindow / removeWindow / updateWindow` — fresh-array
  mutation helpers (no in-place mutation).
- `windowsEqual` — shallow per-field array equality for the Save-
  enabled check.
- `defaultWindowFor(entry)` — derives the default window from
  `entry.plantingMonthWindow[0]` extended through the last month
  the entry's `livingRootSeasons` covers
  (`fall=11`, `winter=2`, `spring=5`, `summer=8`).
- `formatMonthRange(start, end)` — year-wrap-aware chip label
  formatter ("Jun", "Mar–Jul", "Oct–Mar", "—" for invalid input).
- `isValidMonth(m)` — guard for 1..12 integer inputs.

All functions are pure (no React, no store import, no side
effects). Mirrors the `livingRootsMath.ts` ↔ `LivingRootsCard.tsx`
split B5.1 established — keeps the component a thin shell over
testable math.

### Card placement

- **New sectionId:** `plan-cover-crop-planner`.
- **Mount:** `plant-systems` only — **not cross-registered**.
  Rationale: `LivingRootsCard` (the read-only audit) already
  cross-registers under `soil-fertility`. Cross-registering the
  heavy editor too would duplicate-mount on a tab whose intent is
  audit-only. Stewards reach the editor from the same
  `plant-systems` tab where they drew the crop area in the first
  place — the natural author surface. Audit-only viewing remains
  the `soil-fertility` posture.
- Inserted into the `plant-systems` `MODULE_CARDS` list
  **immediately above** the B5.1 `Living-roots audit` entry so the
  write-card sits directly above the read-card in the same tab.

## Posture — strictly-additive, no-schema-bump

- **No schema move.** No `cropStore.ts` edit, no persist version
  bump, no new field, no migration.
- **No new store action.** Writes flow through
  `updateCropArea(id, Partial<CropArea>)` (atomic array
  replacement); the editor's draft array is component state,
  never a parallel store.
- **No `PlanModule` member added.** One sectionId, one
  `MODULE_CARDS` slot, one `renderPlanCard` switch arm.
- **No catalog touched.** `coverCropCatalog.ts` and
  `plantCatalog.ts` unchanged.
- **No audit-side edit.** `LivingRootsCard`, `livingRootsMath.ts`,
  `CriteriaForecastTab.tsx` all read the same store; they light up
  for the new windows with zero edits.

**Covenant lock** (`/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i`)
holds — copy is agronomic only ("Schedule cover-crop windows",
"Living roots: Fall, Winter, Spring"). "Yield" language avoided
(these are soil-vitality plans, not cash-yield plans). The grep
over the three new files finds only the docstring negative
declarations in `CoverCropPlannerCard.tsx` lines 17–18 and
`coverCropPlannerMath.ts` lines 11–12.

## Scope decisions (explicit non-goals)

- **No map-drawn editing.** The editor is row-based per `CropArea`.
  Map-drawn UX (click polygon → add window) is a future slice if
  real-world usage proves the row UX too cramped.
- **No multi-area bulk apply.** Each area edited independently;
  "seed the same winter-rye plan across these 6 row-crop areas" is
  a future B5.2.x affordance if requested.
- **No seed-cost / labor rollup.** That is the **other** B5.2.x
  slice (cover-crop seed-cost / labor rollup into
  `phasing-budgeting`) — deferred to its own brainstorm → spec →
  plan cycle.
- **No off-catalog species.** The picker shows only the 14 cited
  `COVER_CROP_CATALOG` entries. Adding an off-catalog species is
  intentionally unsupported — preserves the "catalog grows
  organically" rule honored across B5.1 / B5.2.
- **No undo button.** `cropStore` is already wrapped by
  `temporal()` (limit 200) — global undo continues to cover
  these writes.
- **No coverage rollup inline.** Coverage % belongs to
  `LivingRootsCard`. The planner shows raw windows; the audit
  shows the rollup. Keeps each card single-purpose.

## Files

**New (3):**
- [apps/web/src/features/coverCrops/coverCropPlannerMath.ts](apps/web/src/features/coverCrops/coverCropPlannerMath.ts)
  — pure helpers (~155 lines).
- [apps/web/src/features/coverCrops/CoverCropPlannerCard.tsx](apps/web/src/features/coverCrops/CoverCropPlannerCard.tsx)
  — card + per-area editor + add-window form (~340 lines).
- [apps/web/src/features/coverCrops/CoverCropPlannerCard.module.css](apps/web/src/features/coverCrops/CoverCropPlannerCard.module.css)
  — scoped styles (~250 lines).

**New tests (2):**
- [apps/web/src/features/coverCrops/__tests__/coverCropPlannerMath.test.ts](apps/web/src/features/coverCrops/__tests__/coverCropPlannerMath.test.ts)
  — 18 cases across every helper, including year-wrap +
  invalid-input edges.
- [apps/web/src/features/coverCrops/__tests__/CoverCropPlannerCard.test.tsx](apps/web/src/features/coverCrops/__tests__/CoverCropPlannerCard.test.tsx)
  — 4 RTL cases: empty-state copy, winter_rye add → Save commits
  `{ speciesId: winter_rye, role: winter_cover, startMonth: 9,
  endMonth: 5 }`, remove path, Save-disabled-when-clean.

**Edited (2 — single-block additions each):**
- [apps/web/src/v3/plan/types.ts](apps/web/src/v3/plan/types.ts)
  — one sectionId entry above the B5.1 `Living-roots audit` line
  in the `plant-systems` `MODULE_CARDS` array.
- [apps/web/src/v3/plan/PlanModuleSlideUp.tsx](apps/web/src/v3/plan/PlanModuleSlideUp.tsx)
  — one `lazy()` import + one `case 'plan-cover-crop-planner':`
  switch arm.

**Reuse, do not modify:**
- `cropStore.ts` — no new action, no schema change.
- `coverCropCatalog.ts` — no new entries, no helper change.
- `plantCatalog.ts` — no entry change.
- `LivingRootsCard.tsx` / `livingRootsMath.ts` — read the same
  store; light up automatically.
- `CriteriaForecastTab.tsx` — projection recomputes on writes.

## Verification

- **Targeted vitest:** `coverCropPlannerMath` (18) +
  `CoverCropPlannerCard` (4) + `livingRootsMath` (12) +
  `coverCropCatalog` (14) + `plantCatalog` (10) — **58/58 green**.
  The RTL happy-path asserts exact `updateCropArea` argument
  shape; the catalog ratchet test confirms all 14
  `COVER_CROP_CATALOG` species still resolve in `PLANT_CATALOG`.
- **Typecheck:** `tsc --noEmit` exit 0.
- **Covenant grep** over the 3 new files: only the docstring
  negative declarations in `CoverCropPlannerCard.tsx` lines 17–18
  and `coverCropPlannerMath.ts` lines 11–12. PASS.
- **Per-commit isolation (anomaly noted):**
  - `492ecbaa` → only `coverCropPlannerMath.ts` + test.
  - `4f838b0f` → only `CoverCropPlannerCard.tsx` + CSS module +
    test.
  - **Mount edits squashed into out-of-band commit `242494bf`**
    ("feat(b3.1): register plan-livestock-rotation-adherence-
    actions section") — the B3.1 author registered their card
    against the same two files (`PlanModuleSlideUp.tsx`,
    `types.ts`) and the out-of-band rebase bundled my B5.2.x
    mount edits into that commit. The change-set is correct (a
    later `grep` confirmed both `plan-cover-crop-planner` and the
    B3.1 `plan-livestock-rotation-adherence-actions` registrations
    are present); the per-task explicit-path-commit posture
    didn't survive the rebase. Documented here; no remediation.
- **Branch divergence:** `git rev-list --left-right --count
  HEAD...@{u}` = `15 0` locally (no `git fetch` performed —
  sandbox; no push attempted per standing rule).
- **Live preview:** card sits behind the `plant-systems` Plan
  slide-up; the known MapLibre/WebGL hang may recur. Per the
  screenshot-honesty rule, no live screenshot claimed. Targeted
  vitest + tsc + RTL happy-path are the authoritative proof
  (B-series precedent).

## Consequences

- **B5.1 + B5.2 + B5.2.x is now end-to-end usable.** A steward
  draws a `CropArea`, opens `plant-systems`, picks "Cover-crop
  planner", adds (e.g.) a `winter_rye` window in the
  pre-filled Sep–May default, hits Save, and the `Living-roots
  audit` tab next door lights up the month strip and lifts the
  parcel coverage % off zero — feeding the
  `living-roots-coverage-pct` goal-tree criterion's projection
  automatically.
- **Forward queue narrows to one B5.2.x candidate:** cover-crop
  seed-cost / labor rollup into `phasing-budgeting`. Map-drawn
  editor and multi-area bulk apply remain on the "if real usage
  asks for it" backlog.
- **The data-only-vs-UI-only split B5.2 set up holds:** B5.2
  shipped the cited rows; B5.2.x shipped the editor against
  them; no schema move on either slice.
- The strictly-additive-no-schema-bump posture continues to be
  the B-series default; the B5.1 schema-bump exception remains
  the documented one-time deviation.

## Notes (session-close)

Wiki tree had two uncommitted-but-noted files at session-close —
`apps/web/src/features/livestock/RotationAdherenceActionsCard.tsx`,
`apps/web/src/features/livestock/RotationAdherenceCard.tsx`, and
the new untracked `apps/web/src/hooks/useNow.ts` — left
**untouched** (out-of-band B3.1 follow-up captured by the
2026-05-20 useNow log entry). The B5.2.x ADR + `wiki/index.md`
decision entry + `wiki/log.md` session line are the only files in
the closing wiki commit.
