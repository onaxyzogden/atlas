# ADR: Plan Nav v1.1 deferred seams closed -- secondary removal + Deferred status (8.3), greyed gate history, real Observe-stage observe-gap render (section 9)

**Date:** 2026-05-31
**Status:** accepted
**Context:**

The v1.1 merge ([[decisions/2026-05-30-atlas-plan-nav-v1.1-merge]]) shipped the
Stratum Spine functionality but explicitly flagged three seams as out of scope:
secondary **removal** (spec 8.3), the full greyed **previous-gate history**, and
the real **Observe-stage render** of the observe-gap (only a Plan-side banner
shipped). The steward asked for all three this session.

Three product decisions framed the build (steward, this session):
- **Deferred = alternative to removal.** Spec 8.3 permits removal only if none of
  the secondary's delta objectives are active/complete; if any has started,
  removal is blocked, the blocking objectives are named, and the UI offers to
  **mark them Deferred instead**. The steward confirmed Deferred KEEPS the
  secondary and shelves those objectives -- progress preserved, hidden from
  active work, **dependents stay locked** -- so a secondary with any started work
  can only be Deferred, never removed. A `deferred` objective status did not
  exist before this session.
- **Build all three seams this session.**
- **Observe-gap render = re-derived persistent surface**, not a transient echo:
  the Observe stage independently re-derives which objectives still need field
  data and clears each as its mapped domain gains data, mirroring
  `usePlanRevisionFlagSync`.

**Decision:**

Ship three independently tsc-green, explicit-path slice commits on
`feat/atlas-permaculture`.

**Part C -- secondary removal + Deferred status (8.3)** (`0621d9b8`).
- **Schema + status engine.** Added `'deferred'` to `PlanStratumObjectiveStatus`.
  `computeObjectiveStatus` / `computeAllObjectiveStatuses` thread an optional
  `deferredIds?: ReadonlySet<string>`: an id in the set short-circuits to
  `deferred` before prereq/progress logic, and a `deferred` prereq is treated as
  **not complete** in the topological loop so dependents stay `locked`. Signature
  stays backward-compatible (defaults to empty set).
- **Persisted Deferred state.** `planStratumStore` gained a
  `deferredByProject: Record<string, string[]>` slice + `deferObjective` /
  `undeferObjective` (idempotent) + `selectDeferredObjectives` + a `toDeferredSet`
  helper, added to `partialize`, with the store's **own persist version bump +
  additive migration** backfilling `deferredByProject: {}`. (planStratumStore is
  isolated -- projectStore stays v7, no manifest schemaVersion bump.)
- **Removal action + preview.** `projectStore.removeSecondaryType` returns
  `{ ok:true } | { ok:false, blockingObjectiveIds }`. It reuses
  `computeObjectivesDelta(afterRemoval, current)` (swapped args) to find the
  removed objectives; blockers = those whose CURRENT status (incl. `deferredIds`)
  is `active`/`complete`/`deferred`. On a clean remove it filters
  `secondaryTypeIds`, appends one `ProjectTypeVersion { action:'secondary-removed' }`,
  prunes orphaned progress, and writes via `updateProject` (no persist bump).
  `useSecondaryRemovePreview` mirrors the add-preview as a pure read-only
  derivation.
- **UI.** A "Manage project types" surface lists current secondaries with a
  Remove affordance; a blocked remove opens `SecondaryRemoveBlockedModal` (amber)
  naming the blockers as deep-links with a "Mark as Deferred instead" CTA.
  Deferred cards render greyed with a Deferred pill + Restore, excluded from the
  nextUp/parallel/sorted memos (list-only, like the source filter -- the status
  engine is never mutated).

**Part D -- greyed previous-gate history** (`35c958bd`).
- Added optional `completionGateBase?: string` and
  `completionGateAmendments?: { secondaryTypeId, text }[]` to the objective schema
  (additive; resolved objectives are runtime-only, never persisted).
- `resolveProjectObjectives` Pass 2 now, before the existing `concatText` gate
  overwrite, captures `completionGateBase` on the **first** amendment only and
  pushes each `{ secondaryTypeId, text }` onto `completionGateAmendments`. The
  flat `completionGate` concatenation is unchanged (backward-compat for flat-string
  readers).
- `DecisionChecklist` renders a greyed "Previously" history block (base gate +
  per-amendment "<Type> added: <text>") when amendments exist; the existing amber
  "Amended by" badge is kept; unamended objectives render exactly as before.

**Part E -- real Observe-stage observe-gap render (re-derived, persistent)**
(`9a540d33`).
- **Shared predicate (no drift).** New `relationships/observeGap.ts`:
  `isObserveGapObjective` / `objectiveHasInjectedItems` /
  `collectObserveGapObjectives`. A gap = `outputKind === 'observation-record'`,
  OR injected items AND a non-empty `defaultOverlayBundle`. The "injected items"
  signal is caller-supplied -- a delta for the Plan add-preview, the persistent
  `expandedBySecondaryId` checklist marker for the Observe re-derivation.
  `useSecondaryAddPreview` was refactored to consume it (behaviour-preserving).
- **Observe-side hook.** `useObserveGapObjectives` is a pure derivation over
  resolved objectives + captured `ObserveDataPoint`s (like
  `usePlanRevisionFlagSync`): an OPEN gap = a gap objective whose primary Observe
  domain (`getPrimaryDomainForObjective`) has no **active** (non-superseded) data
  point; it clears on next render once that domain gains data. Grouped by domain.
- **Render.** `ObserveStageGapBanner` (persistent teal/info banner) mounts in the
  `ObserveLayout` overlay slot beside `TrueNorthAdvisoryBanner`, deep-linking to
  each mapped domain card. No dismiss control -- a still-open gap is not hideable.

**Consequences:**

- A steward can now remove a secondary whose delta objectives are all unstarted
  (recorded append-only as `secondary-removed`, orphaned progress pruned); when
  blocked, see the blockers named and choose "Mark as Deferred", which greys them,
  preserves progress, keeps dependents locked, keeps the secondary, and offers
  Restore; read the full greyed previous-gate history beneath any amended gate;
  and -- inside the Observe stage -- see a persistent re-derived banner naming the
  objectives/domains that still need field observations, which clears as data is
  captured.
- **LATENT-FEATURE (Part E).** Current catalogues carry **zero** objectives with
  an `observation-record` outputKind and **zero** with a non-empty
  `defaultOverlayBundle`, so no real project resolves a persistent observe-gap
  yet (`regenerative_farm` + `residential` -> empty). Part E is therefore a
  forward-looking seam that activates only once such catalogue data ships; the
  predicate and the hook are exercised against synthetic data in the suites. The
  Plan-side add-preview banner from v1.1 is subject to the same data reality.
- **Persist discipline.** Only `planStratumStore`'s persist version bumped (Part
  C, additive migration). `projectStore` stays v7; no `ogden-projects` manifest
  schemaVersion bump. Parts D + E add no persisted state (resolved objectives are
  runtime-only; the Observe hook is a pure derivation).
- **Barrel routing (Part E).** `collectObserveGapObjectives` is exported from
  `relationships/index.ts` (`export *`) and reached via the
  `@ogden/shared/relationships` subpath. `packages/shared/src/index.ts` was
  deliberately **not** edited -- it carries uncommitted foreign Act-tools exports;
  routing through the clean subpath barrel avoids staging foreign hunks. A
  documented deviation from the plan's literal "re-point src/index.ts barrel".
- **Verification.** `@ogden/shared` tsc exit 0. Web tsc: all Part E files clean;
  the 6 remaining `apps/web` tsc errors are **pre-existing foreign
  parallel-session WIP** (`plan/spine/DesignDetailPanel`, the incomplete
  `DecisionChecklist` decisionGroups render whose `GroupedChecklist`/`ItemRow`
  are not yet defined, and `portfolio/observe-compare/observeCompareModel`) --
  none in this session's surface. Scoped vitest green: `observeGap` 9/9 (shared),
  `useObserveGapObjectives` 6/6 (web), plus Parts C/D suites from their commits.
  Preview DOM-exercise of (C)(D)(E) on a live `regenerative_farm` project is the
  one remaining verification item, deferred to the steward's presence (Part E in
  particular cannot render on current catalogue data per the latent-feature note).
- Commits explicit-path, foreign parallel-session dirty set untouched per
  [[feedback-no-deletion]]; ASCII-only; co-authored. Not pushed -- `git fetch` +
  divergence check before any push ([[project-branch-rebase]]), awaiting steward
  "go".
- CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); covenant framing intact.

Closes the three deferred seams from
[[decisions/2026-05-30-atlas-plan-nav-v1.1-merge]]. Builds on the resolution
engine + status engine ([[decisions/2026-05-29-atlas-per-type-objective-model]])
and the Observe freshness / `observeDataPointStore` surface.

Log: [[log/2026-05-31-plan-nav-v1.1-deferred-seams]]
