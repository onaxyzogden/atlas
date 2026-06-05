# ADR — Atlas B5.2.x.c: cover-crop spine completion (terminate-before edges + scheduled dates + map-entry popover + multi-area bulk apply)

**Date:** 2026-05-20
**Branch:** `feat/atlas-permaculture`
**Sub-project:** B5.2.x.c (closes the four explicit non-goals
deferred by [[2026-05-20-atlas-b5-2-x-b-cover-crop-seed-cost-labor-rollup]])
**Status:** Accepted — shipped in commits `1fb9ccc5`, `440f4970`,
`cbd41ba2`, `6bb97a2a`, `3bc237d3`, `6f03597f` (this commit pending)
**Related:** [[2026-05-20-atlas-b5-2-x-b-cover-crop-seed-cost-labor-rollup]],
[[2026-05-20-atlas-b5-2-x-cover-crop-planner-editor]],
[[2026-05-19-atlas-b5-1-cover-crop-living-roots]],
[[2026-05-18-atlas-d1-critical-path]]

---

## Context

B5.2.x.b shipped `pushCoverCropPlanToSpine` — each `CropCoverWindow`
seeded a `source: 'cover-crop'` WorkItem with `costRangeAuto` +
`materialsAuto` + composite provenance `${cropAreaId}__${windowIndex}`.
That ADR explicitly deferred four non-goals. B5.2.x.c bundles all
four into one slice per user direction.

The four deferred items:

1. **No prerequisite seeding.** Cover-crop rows had empty
   `dependsOnAuto`; no terminate-before edge into the D1 critical
   path. Stewards saw a cover-crop WorkItem next to a cash-crop
   planting WorkItem on the same `CropArea` with no temporal link.
2. **No scheduled-date seeding.** Cover-crop rows omitted
   `scheduledStart` / `scheduledEnd`; Gantt-style views and any
   date-filtered rollup dropped these rows.
3. **No map-drawn editor entry.** Planner was form-only inside the
   Plan slide-up; stewards couldn't click a parcel on the map and
   land in the cover-crop editor for that area.
4. **No multi-area bulk apply.** Each window was per-area; stewards
   planting winter rye across six fields typed it six times.

## Decision

### Cross-source ordering via `precedesAuto` (denormalized inverse)

The terminate-before edge crosses sources: a `source: 'cover-crop'`
row must precede a `source: 'goal-compass'` cash-crop row. Mutating
the goal-compass row's `dependsOnAuto` from the cover-crop sync
would collide with `replaceGoalCompassDependencies` on the next
goal-compass regen.

Resolution — denormalize the edge **on the cover-crop side** as a
new optional field `WorkItem.precedesAuto: string[]`. Only
`replaceCoverCropDependencies` writes it, and only on cover-crop
rows. Single-writer preserved.

Graph readers compute effective dependencies via
`buildEffectiveGraph(items)` (already in `packages/shared/src/lib/workItemGraph.ts`),
which now does an inverse pass: for every row's `precedesAuto`
entry, the listed downstream row gets an implicit upstream edge
from the cover-crop row. `dependsOn ∪ dependsOnAuto ∪ inverse(precedesAuto)`.

### Scheduled-date inference (`coverCropDateInference`)

Pure `inferCoverCropDates(window, projectStartYear): { start, end }`:
- `start = ${year}-${MM(startMonth)}-01`
- `end = ${endYear}-${MM(endMonth)}-28` (day-clamped to 28; safe
  for all months including February non-leap)
- Wrap-aware: when `endMonth < startMonth` ⇒ `endYear = year + 1`

Project year resolved via
`resolveProjectStartYear(LocalProject.startDate ?? null)` —
parses ISO `YYYY-MM-DD`; falls back to `new Date().getFullYear()`
when null/invalid. Mirrors the `rebaseToYear` shape from
`schedulePlantingFromAreas`.

### Dependency-graph join (`coverCropDependencyGraph`)

Pure `seedCoverCropDependencies({ coverCropItems, cashCropItems }): Map<itemId, string[]>`.

Join on shared `cropAreaId`:
- cover-crop side: `generatedFromCoverCropWindow = '${cropAreaId}__${idx}'`
- cash-crop side: `generatedFromPlantingCalendar = '${species}:${cropAreaId}:${year}'`

For each cover-crop WorkItem, returns the ids of all cash-crop
WorkItems sharing the same `cropAreaId`. Orphan case (cropArea has
no planting-calendar WorkItems): silent — emits empty array,
mirroring B4/B5 omitted-not-stubbed. The editor surfaces the
warning (next section).

### Forks ratified (verbatim from AskUserQuestion)

- **Scope:** "All four in one B5.2.x.c."
- **Orphan cash-crop case:** "Warn in the editor." — when a
  `CropArea` has no planting-calendar WorkItems, the spine writes
  no edge (silent) AND the planner surfaces a banner: *"No cash
  crop scheduled on this area yet — a terminate-before edge will
  be created when one is added."*

### CoverCropPlannerCard UX additions

1. **Orphan warning banner** above `AddWindowForm` when the area
   has no cash-crop WorkItems (resolved via `cashCropAreaIds` memo
   over `useWorkItemStore.items` filtered by
   `generatedFromPlantingCalendar`).
2. **Bulk-apply multi-select** — a collapsible "Apply to other
   areas" chip list (component-local `useState<Set<string>>`, not
   persisted). Selection survives only while the card is mounted.
3. **Single spine push** — Save loops `updateCropArea(otherId, { coverCropPlan: mergeWindows(...) })`
   per selected id, then calls `pushCoverCropPlanToSpine(projectId)`
   exactly once. `mergeWindows` is a pure structural-dedup append
   (same `speciesId + role + startMonth + endMonth` ⇒ no
   duplicate), preserving any existing plans on the target areas.

### MonthBandPicker + CoverCropPopoverEditor

`MonthBandPicker` — 12-segment horizontal band. Controlled
`startMonth` / `endMonth` props, `aria-pressed` per cell, internal
toggle: first click sets start, second sets end. ~120 LOC, zero
deps beyond React. Wrap-aware visual highlight (Oct→Mar lights 6
cells, not 6 negative).

`CoverCropPopoverEditor` — standalone, screen-anchored fixed-
position popover. Renders a read-only list of existing windows +
add-form (uses MonthBandPicker) + Save. Save funnels through the
same single-writer path: `updateCropArea` + `pushCoverCropPlanToSpine`
+ `popover.close()`. State carried by a new
`useCoverCropPopoverStore` zustand store with `{ open, projectId,
cropAreaId, anchor?, openFor(...), close() }`.

### Schema deltas

- `WorkItem.precedesAuto: z.array(z.string()).default([])` —
  optional via default-empty (additive at the Zod layer).
- `syncManifest['ogden-work-items'].schemaVersion` 2 → 3 — records
  the field addition.
- `packages/shared/src/lib/workItemGraph.ts:buildEffectiveGraph`
  extended with an inverse pass; the helper was already the union
  point.

Posture: **not strictly-additive** (the `precedesAuto` field + the
`buildEffectiveGraph` inverse pass + the `syncManifest` bump). The
scoped exception was pre-ratified by the user via the "all four in
one slice" answer.

## Explicit deferred follow-up

**CropAreaTool map-entry hookup parked.** The plan called for a
map context-menu action ("Edit cover crops") on `CropAreaTool` that
opens `CoverCropPopoverEditor` via the existing `useInlineFormStore`.
On inspection, `useInlineFormStore`'s field-spec API can't host the
rich multi-window editor — its primitive is single-field text/
numeric input, not arbitrary React content. Rather than warp the
field-spec API or invent a parallel popover surface inside
`inlineFormStore`, this slice ships the editor with its own
`useCoverCropPopoverStore` and **defers** the map click-handler
wire-up to a follow-up:

- **What's parked:** the actual `CropAreaTool` ↔ popover
  click-binding. The popover and its store are fully shipped and
  callable; what's missing is the map-side `onSelectExistingFeature`
  ↔ `useCoverCropPopoverStore.getState().openFor(...)` wiring.
- **Why:** the design conversation needs to settle whether
  `inlineFormStore` should generalize to host rich popover content
  (architectural change touching every map tool) or whether the
  map should learn to route per-feature-type into different popover
  stores. Either is a larger design discussion than a 7-commit
  slice can carry.
- **Entry surfaces today:** the Plan slide-up `plant-systems`
  `CoverCropPlannerCard` (existing, with the new orphan warning +
  bulk apply additions). The popover is reachable
  programmatically by anyone holding `useCoverCropPopoverStore`.

## Files touched

**New (10):**
- `apps/web/src/features/coverCrops/coverCropDateInference.ts`
- `apps/web/src/features/coverCrops/coverCropDependencyGraph.ts`
- `apps/web/src/features/coverCrops/MonthBandPicker.tsx` + `.module.css`
- `apps/web/src/features/coverCrops/CoverCropPopoverEditor.tsx` + `.module.css`
- `apps/web/src/features/coverCrops/__tests__/coverCropDateInference.test.ts`
- `apps/web/src/features/coverCrops/__tests__/coverCropDependencyGraph.test.ts`
- `apps/web/src/features/coverCrops/__tests__/MonthBandPicker.test.tsx`
- `apps/web/src/features/coverCrops/__tests__/CoverCropPopoverEditor.test.tsx`

**Edited (7):**
- `packages/shared/src/schemas/workItem.schema.ts` — `precedesAuto` added
- `packages/shared/src/lib/workItemGraph.ts` — inverse pass over `precedesAuto`
- `apps/web/src/store/syncManifest.ts` — workItemStore schemaVersion 2→3
- `apps/web/src/store/workItemStore.ts` — `replaceCoverCropDependencies` action
- `apps/web/src/features/coverCrops/coverCropSpineSync.ts` — scheduled dates + dependency seeding
- `apps/web/src/features/coverCrops/CoverCropPlannerCard.tsx` + `.module.css` — orphan warning + bulk apply
- `apps/web/src/features/coverCrops/__tests__/coverCropSpineSync.test.ts`, `CoverCropPlannerCard.test.tsx` — new cases

**Reused, not modified:** `BudgetCard`, `ResourcingCard`,
`analyzeBudget`, `analyzeResourcing`, `CoverCropEconomicsCard`,
all Goal-Compass cards, `LivingRootsCard`, `livingRootsMath`,
`replaceGoalCompass*` family.

## Posture & covenant

- Single-writer preserved. Cover-crop edges only written to
  cover-crop rows; goal-compass edges only to goal-compass rows.
- Preservation gate hard-locked across all four `replace*` actions
  for `source: 'cover-crop'`.
- No `WorkItem.status` mutation. D1 single-writer discipline holds.
- Bulk-apply selection lives in component state — no new store.
- Covenant clean: `/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital|yield|payback|investment|roi|return\s+on)\b/i`
  matches only negative declarations in docstrings.

## Verification

- **Targeted vitest** (apps/web, B5.2.x.c slice): coverCropDateInference + coverCropDependencyGraph + MonthBandPicker + CoverCropPopoverEditor + coverCropSpineSync + CoverCropPlannerCard + coverCropEconomicsMath + coverCropEconomicsCard + workItemStore — **98/98 green** (13 files).
- **Shared vitest** (`packages/shared` — workItemGraph + schemas): **269/269 green** (19 files).
- **Typecheck:** `apps/web` exit 0; `packages/shared` exit 0.
- **Covenant grep:** all matches are negative declarations in `*Catalog.ts` / `*Card.tsx` / `*Math.ts` / `*Sync.ts` / `CoverCropPopoverEditor.tsx` docstrings + the two existing covenant-grep tests. No live framing.
- **Vite build:** deferred — typecheck + targeted vitest are authoritative for the slice; full `vite build` previously green on B5.2.x.b HEAD and no compile-affecting changes since.

## Commit posture

Per-task explicit-path commits on `feat/atlas-permaculture`
(never `git add -A` / `.`):

1. `1fb9ccc5` — schema: `WorkItem.precedesAuto` + `buildEffectiveGraph` inverse pass + syncManifest bump
2. `440f4970` — `coverCropDateInference` + tests
3. `cbd41ba2` — `coverCropDependencyGraph` + tests
4. `6bb97a2a` — `coverCropSpineSync` schedule dates + precedesAuto edges + `replaceCoverCropDependencies`
5. `3bc237d3` — `CoverCropPlannerCard` orphan warning + multi-area bulk apply + tests
6. `6f03597f` — `CoverCropPopoverEditor` + `MonthBandPicker` + tests (standalone popover; map-entry wire-up deferred)
7. *this commit* — wiki ADR + index + log

**No push** without `git fetch && git rev-list --left-right --count
HEAD...@{u}` divergence check on `feat/atlas-permaculture` (rebased
out-of-band; never force-push).

---

## Addendum (2026-05-20) — Map-entry wire-up closed

The parked sub-item from §"Map entry" / "Explicit deferred follow-up"
landed in a follow-up slice. `PlanCropAreaSelectionHandler` listens for
`mousedown` on the Plan-stage map, queries live `crop-fill-*` layers,
and routes a hit into `useCoverCropPopoverStore.openFor({ projectId,
cropAreaId, anchor: { x, y } })`. Resolution chain:
`properties.id` → `properties.cropAreaId` → strip `crop-fill-`
prefix off `top.layer.id`. `e.preventDefault()` +
`e.originalEvent.stopPropagation()` keep the click from also reaching
draw-tool handlers.

Mount: `apps/web/src/v3/plan/PlanLayout.tsx` — the new handler sits
adjacent to `<PlanObserveSelectionHandler map={map} />` (mousedown
peer), and `<CoverCropPopoverEditor />` mounts adjacent to
`<InlineFeaturePopover map={map} />`. Append-only.

**Resolved fork.** Chose per-feature-type store routing (Fork B from
the parked discussion) over generalizing `useInlineFormStore` (Fork A).
Reason: the field-spec API
(`text|number|select|textarea|disclosure` at
`apps/web/src/v3/plan/draw/inlineFormStore.ts:19-126`) cannot host
arbitrary React content like the MonthBandPicker editor; generalizing
it would ripple through 23 active map tools. Left-click → direct
popover (vs. right-click context-menu or select-then-chip) — matches
the `PlanObserveSelectionHandler` precedent (`mousedown` + live-layer
query + `e.preventDefault()`) and is the smallest surface.

**Posture.** Strictly-additive. No new store (the popover store
already shipped in C6), no schema bump, no `inlineFormStore` change,
no impact on the other 23 map tools. Single-writer preserved: Save
still funnels through `updateCropArea` + `pushCoverCropPlanToSpine`
(C4 behaviour).

**Gate.** Targeted vitest **7/7 green** (`PlanCropAreaSelectionHandler`
4-case suite + existing `CoverCropPopoverEditor` 3-case suite). Full
apps/web vitest sweep **1536/1536** (150 files). `apps/web` tsc exit 0;
`packages/shared` tsc exit 0. Covenant grep clean on the two new
files. Map-canvas golden path not exercised under harness (MapLibre
WebGL hang disclosure rule) — vitest + tsc are authoritative for this
slice.
