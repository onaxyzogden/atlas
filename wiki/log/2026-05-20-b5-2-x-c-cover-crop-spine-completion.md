# 2026-05-20 — B5.2.x.c: Cover-crop spine completion (terminate-before edges + scheduled dates + map-entry popover + multi-area bulk apply)


**Branch.** `feat/atlas-permaculture`. Seven commits closing the four
explicit non-goals deferred by [[2026-05-20-atlas-b5-2-x-b-cover-crop-seed-cost-labor-rollup]]:
(1) terminate-before-cash-crop prerequisite seeding, (2)
scheduled-date seeding, (3) map-drawn editor entry, (4) multi-area
bulk apply. Forks ratified up-front (AskUserQuestion): "All four in
one B5.2.x.c" + orphan-cash-crop case = "Warn in the editor."

**Cross-source ordering** resolved by denormalized inverse edge
`WorkItem.precedesAuto: string[]` written only on cover-crop rows by
new `replaceCoverCropDependencies` (mirrors
`replaceGoalCompassDependencies` 1:1, preservation gate hard-locked
on `source: 'cover-crop' && !overridden`). Chosen over mutating the
cash-crop side's `dependsOnAuto` because any cover-crop write into a
`source: 'goal-compass'` row would collide with
`replaceGoalCompassDependencies` on the next goal-compass regen —
single-writer preserved. `packages/shared/src/lib/workItemGraph.ts:buildEffectiveGraph`
extended with an inverse pass; readers compute
`dependsOn ∪ dependsOnAuto ∪ inverse(precedesAuto)`. Schema delta is
**not strictly-additive** (`precedesAuto` field + `buildEffectiveGraph`
extension + `syncManifest['ogden-work-items'].schemaVersion` 2→3) —
scoped exception pre-ratified by the bundled-slice answer.

**Scheduled-date seeding** via new pure `inferCoverCropDates(window,
projectStartYear): { start, end }` — `start = YYYY-MM-01`, `end =
YYYY-MM-28` (day-clamped to 28; safe for all months including Feb
non-leap), wrap-aware year+1 when `endMonth < startMonth`. Project
year resolved by `resolveProjectStartYear(LocalProject.startDate ??
null)` with `new Date().getFullYear()` fallback. `seedCoverCropWorkItems`
gained an optional `projectStartYear` arg (default = current year);
`pushCoverCropPlanToSpine` reads project start year from
`useProjectStore` and threads it through.

**Dependency-graph join** via pure `seedCoverCropDependencies({
coverCropItems, cashCropItems }): Map<itemId, string[]>` on shared
`cropAreaId` parsed from the two provenance formats
(`generatedFromCoverCropWindow` = `${cropAreaId}__${idx}` vs
`generatedFromPlantingCalendar` = `${species}:${cropAreaId}:${year}`).
Orphan area (cropArea has no planting-calendar items) emits empty
array — silent, per B4/B5 omitted-not-stubbed precedent.

**`CoverCropPlannerCard` UX**: orphan warning banner above
`AddWindowForm` *"No cash crop scheduled on this area yet — a
terminate-before edge will be created when one is added"* resolved
via new `cashCropAreaIds` memo over `useWorkItemStore.items` filtered
by `generatedFromPlantingCalendar`. Collapsible "Apply to other
areas" chip multi-select (component-local `useState<Set<string>>`,
not persisted, no new store) — Save loops `updateCropArea(otherId,
{ coverCropPlan: mergeWindows(existing, draft) })` per selected id,
then calls `pushCoverCropPlanToSpine(projectId)` exactly once. Pure
`mergeWindows` does structural-dedup append (same
speciesId+role+startMonth+endMonth ⇒ no duplicate) so other areas'
existing plans survive.

**`MonthBandPicker`** (~120 LOC, zero deps beyond React) — 12-segment
horizontal band, controlled `startMonth`/`endMonth` props, internal
toggle: first click sets start, second sets end. Wrap-aware
`aria-pressed` highlight (Oct→Mar lights 6 cells). **`CoverCropPopoverEditor`**
— standalone screen-anchored fixed-position popover wrapping a
read-only window list + add-form (uses MonthBandPicker) + Save.
Single-writer Save: `updateCropArea` + `pushCoverCropPlanToSpine` +
`popover.close()`. State in new `useCoverCropPopoverStore` zustand
store with `{ open, projectId, cropAreaId, anchor?, openFor, close }`.

**Explicit deferred follow-up:** the planned `CropAreaTool` map
context-menu wire-up ("Edit cover crops" → `useCoverCropPopoverStore.openFor(...)`)
is parked. `useInlineFormStore`'s field-spec API can't host the rich
multi-window editor — its primitive is single-field text/numeric
input, not arbitrary React content. Rather than warp the field-spec
API or invent a parallel popover surface inside `inlineFormStore`,
this slice ships the popover with its own store. The actual map-side
`onSelectExistingFeature` ↔ popover-store binding awaits a larger
design discussion (generalize `inlineFormStore` to host rich popover
content vs. route per-feature-type into different popover stores).
Today's entry surface: Plan slide-up `plant-systems`
`CoverCropPlannerCard` (existing, now with orphan warning + bulk
apply) and anyone holding the popover store programmatically.

**Covenant clean** (`/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital|yield|payback|investment|roi|return\s+on)\b/i`
matches only docstring negative declarations + the two existing
covenant-grep tests). Gate: targeted vitest **98/98 green** (13
files: coverCropDateInference + coverCropDependencyGraph +
MonthBandPicker + CoverCropPopoverEditor + coverCropSpineSync +
CoverCropPlannerCard + coverCropEconomicsMath + coverCropEconomicsCard
+ workItemStore), shared vitest **269/269** (19 files, includes
workItemGraph precedesAuto cases), tsc exit 0 on both packages.

Per-task explicit-path commits on `feat/atlas-permaculture` (no
`-A`/`.`, 7 commits total): `1fb9ccc5` schema (precedesAuto +
buildEffectiveGraph inverse pass + syncManifest bump) → `440f4970`
coverCropDateInference + tests → `cbd41ba2` coverCropDependencyGraph
+ tests → `6bb97a2a` coverCropSpineSync schedule dates + precedesAuto
edges + replaceCoverCropDependencies → `3bc237d3` CoverCropPlannerCard
orphan warning + multi-area bulk apply + tests → `6f03597f`
MonthBandPicker + CoverCropPopoverEditor (standalone popover) + tests
→ wiki commit. **Not pushed** (branch rebased out-of-band; divergence
check pending before any push per standing rule).

ADR: [[decisions/2026-05-20-atlas-b5-2-x-c-cover-crop-spine-completion]].
Continues [[2026-05-20-atlas-b5-2-x-b-cover-crop-seed-cost-labor-rollup]]
and the D1 critical-path plumbing from
[[2026-05-18-atlas-d1-critical-path]].
