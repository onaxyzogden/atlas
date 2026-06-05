# 2026-05-27 — Plan Tier Shell (Phase 1: 12 slices, tier-spine + cyclical review + Vision Builder bridge)

**Status.** Implemented on `feat/atlas-permaculture` across 12 explicit-path
commits (Slice 1.1 `94225cb6` → 1.2 `cbc70c5c` → 1.3 `144284a3` →
1.4 `7ce755f9` → 1.5 `4852887a` → 1.6 `5caec8e4` → 1.7 `a05f47f1` →
1.8 `c3e546b9` → 1.9 `fd0c8ecb` → 1.10 `32cb3281` → 1.11 `8497dc92` →
1.12 `4b8bdba0`). Phase 1 of the 7-phase OLOS UX spec implementation
plan (`~/Downloads/olos-proj-delightful-jellyfish.zip`,
plan checked into `~/.claude/plans/c-users-my-own-axis-downloads-olos-proj-delightful-jellyfish.md`).

## Context

The OLOS UX spec suite redesigns the Plan / Act / Observe spiral around a
**7-tier vertical spine for Plan stage** (T0 Project Foundation → T6
Phasing & Resourcing), per-objective detail panels with map activation
overlays, a steward-checked decision list, gated tier unlocks with
celebration, and a 90-day cyclical review prompt that surfaces every
complete objective for periodic reaffirmation or revision. The
substrate already shipped (migrations 043/044, the
`packages/shared/src/constants/olos/objectives.ts` seed of 48
canonical objectives, the `apps/web/src/v3/olos/ObjectiveWorkspace.tsx`
+ `OverlayBundleStrip.tsx` workspace shell). What was missing was the
**spec-shaped UI surfaces** that wrap the substrate.

Three locked decisions framed Phase 1:

1. **Coexist behind a toggle.** The new TierSpine mounts at sibling
   route `plan/tier/$tierId/objective/$objectiveId`. A header
   `PlanNavToggle` switches `tier-spine` (default for new projects) vs
   `module-bar` (legacy MTC seed). Tier objectives are thin shells that
   LINK to existing module cards via `legacyCardSectionId` rather than
   replace them. Preserves [[concepts/local-first-architecture]]'s
   working legacy module shell while the 52 module cards migrate one
   at a time (Phase 7).
2. **Wizard replaces Stage Zero in Phase 2.** Phase 1 keeps the
   existing Stage Zero Vision Builder
   ([[decisions/2026-05-25-atlas-stage-zero-vision-builder]]) by
   shipping a derive-only bridge in Slice 1.12 so projects that
   completed Stage Zero open Tier 0 with the captured vision pre-filled.
3. **Plan-first ordering.** Act and Observe both consume Plan state
   (LaunchAct from objective, Observe-driven cyclical review trigger),
   so Plan ships tier-shaped before the downstream phases.

## Decision

Ship the 12 Phase-1 slices in sequence on `feat/atlas-permaculture`,
each committing the moment its gate verifies per
[[feedback-commit-immediately-on-rebased-branches]]. Branch is rebased
out-of-band; never accumulate uncommitted slices.

### Slice 1.1 — Seed data + status engine
- `packages/shared/src/constants/plan/tierObjectives.ts` — 7 tiers with
  `id`, `tierId`, `title`, `focusedQuestion`, `prerequisiteObjectiveIds`,
  `defaultOverlayBundle`, `checklist`, optional `legacyCardSectionId`.
- `packages/shared/src/schemas/plan/planTierObjective.schema.ts` — Zod.
- `packages/shared/src/relationships/{tierObjectiveStatus,tierState}.ts`
  — pure helpers: `computeObjectiveStatus` returns
  `'locked' | 'available' | 'active' | 'complete'`; `computeTierState`
  rolls objectives up to tier-level.
- `packages/shared/src/relationships/cyclicalReviewTrigger.ts` —
  `isCyclicalReviewDue` predicate; Phase 1 ships behind a feature gate
  so Phase 4 Observe can swap in real revision flags.

### Slice 1.2 — Plan navigation toggle
- `apps/web/src/v3/_shell/HeaderStageSpine.tsx` (or current header
  host) mounts `PlanNavToggle` with two states: `tier-spine` /
  `module-bar`. Per-project persistence via `useProjectStore`
  (`planShellMode` field). New projects default to `tier-spine`;
  existing projects with `MTC_SEED` keep `module-bar` for safety.

### Slice 1.3 — Tier + objective routes
- `/v3/project/$projectId/plan/tier/$tierId`
- `/v3/project/$projectId/plan/tier/$tierId/objective/$objectiveId`
- Legacy `/v3/project/$projectId/plan/module/$module` untouched.

### Slice 1.4 — TierSpine + locked popover
- `apps/web/src/v3/plan/tiers/{TierSpine,TierRow,TierLockedPopover}.tsx`
- Vertical column rendering 7 `TierRow`s with computed states; tapping
  a locked tier opens a popover listing unmet prerequisites + an
  "Acknowledge" CTA that opens the blocking objective.
- Reuses the `BentoBox` primitive
  ([[decisions/2026-05-27-atlas-bento-box-canonical-surface]]).

### Slice 1.5 — ObjectiveColumn
- `ObjectiveColumn.tsx`, `NextUpCard.tsx`, `ParallelCallout.tsx`,
  `ObjectiveCard.tsx` — the middle column that surfaces the active
  tier's objectives: Next Up card pinned at top, parallel-callout
  banner when two or more objectives are simultaneously available with
  no prerequisite order, then compact cards per objective.

### Slice 1.6 — ObjectiveDetailPanel: OBJECTIVE + MAP ACTIVATION
- `ObjectiveDetailPanel.tsx` (right column / mobile slide-up),
  `ObjectiveHeader.tsx`, `MapActivationStrip.tsx`.
- Wraps the existing
  [`apps/web/src/v3/olos/map/OverlayBundleStrip.tsx`](../../apps/web/src/v3/olos/map/OverlayBundleStrip.tsx);
  tapping an overlay toggles it on the embedded `DiagnoseMap`.
- `activeOverlayIds` owned in the panel so strip + map stay in lockstep;
  reset is keyed to `objective.id` at the parent via
  `<ObjectiveDetailPanel key={objective.id} ... />` — clean reset, no
  `useEffect`.

### Slice 1.7 — YOUR DECISIONS (DecisionChecklist + planTierStore)
- `apps/web/src/store/planTierStore.ts` — Zustand + persist, key
  `ogden-plan-tier-progress`. Per-project, per-objective checklist
  completion. **Separate** from `planVersionStore` — different concern.
- `DecisionChecklist.tsx` renders `objective.checklist` items with
  checkbox + `feedsInto` chips so the steward sees the causal chain.
- Completion drives `objective.status` via `tierObjectiveStatus.ts`.

### Slice 1.8 — REFERENCE (legacy card embed)
- `DetailsExpander.tsx` — collapsible REFERENCE section that
  lazy-mounts the matching legacy module card when
  `objective.legacyCardSectionId` is set. Lookup via the existing
  `planSectionIdModule` map in
  [`apps/web/src/v3/plan/planSectionMap.ts`](../../apps/web/src/v3/plan/planSectionMap.ts).
- T0 + T1 objectives seeded with real legacy card mappings.

### Slice 1.9 — LaunchActButton
- Bottom-anchored CTA, visible only when
  `objective.outputKind === 'plan-decision-record'` and status is
  `active` or `complete`. Phase 1 navigates to the existing
  `ActCommandCentrePage`; Phase 3 will rewire to the new Act state
  machine.

### Slice 1.10 — TierUnlockCelebration
- Modal/overlay matching the spec screenshot ("Tier 1 Unlocked");
  fires when the last objective in a tier completes AND the next tier
  transitions `locked → available`. Dedup via a per-project
  `celebratedByProject` log persisted in `planTierStore` (version 2
  migrate). Same tier never celebrates twice.

### Slice 1.11 — Cyclical review mode
- `apps/web/src/store/cyclicalReviewStore.ts` — Zustand + persist,
  key `ogden-cyclical-review`, version 1.
  `byProject[projectId][objectiveId] = { lastReviewedAt,
  lastDecisionConfirmedAt, forcedTrigger }`.
- `CyclicalReviewBanner.tsx` mounts on `ObjectiveDetailPanel` when
  `isCyclicalReviewDue` returns true (objective complete AND >90 days
  since `lastReviewedAt`, or a forced trigger from
  `window.cyclicalReviewStore.forceTrigger(...)` in DEV).
- Confirm → writes `lastDecisionConfirmedAt` + opens
  `CyclicalReviewModal` ("Decision confirmed"). Revise → clears the
  trigger without a modal.
- Phase 4 will replace `forceTrigger` with real Observe-driven
  `observeRevisionFlag` (the predicate already accepts an optional
  flag-fn, so the swap is non-breaking).

### Slice 1.12 — Vision Builder bridge
- `apps/web/src/v3/plan/tiers/visionProfileToChecklist.ts` — pure
  `deriveTier0EvidenceMap(profile)` + `mergeDerivedIntoProgress`.
  Maps `project.metadata.visionProfile` (the Stage Zero output) onto
  the three `t0-vision-*` checklist items:
  - `t0-vision-c1` (Articulate the land vision) — satisfied when
    `primaryOutcomes.length > 0` OR `landIdentity.length > 0`.
  - `t0-vision-c2` (Primary land-use goals) — satisfied when
    `systemsInScope` has any group with entries OR `primaryOutcomes`.
  - `t0-vision-c3` (Time + budget capacity bands) — satisfied **only**
    when BOTH `budgetRange` AND `timelineProgress` are set.
- `PlanTierShell` reads the visionProfile from `useProjectStore` (NOT
  `useV3Project` — the lightweight v3 type has no `metadata`) and
  feeds the merged progress map into the status engine, so the spine
  + tier states reflect Stage Zero progress without writing to
  `planTierStore`.
- `DecisionChecklist` renders derived items as **checked + disabled**
  with a "From Stage Zero Vision" badge and the evidence text beneath.
- T0 stewardship items have no VisionProfile equivalent — Phase 2
  wizard Step 3 ("Team") will provide that source, and the same
  bridge contract carries forward without change.

## Architecture pins

- **No deletion of legacy components** ([[feedback-no-deletion]]).
  Module shell, `LifecycleProgressRing`, `DiscoverRail`, current
  `PlanModule*` files, OLOS `ObjectiveWorkspace` all preserved behind
  the toggle.
- **3-item nav is the forward IA**
  ([[project-lifecycle-retirement]]). The 7-tier shell is internal to
  the Plan stage; the top-level nav remains Plan / Act / Observe.
- **CSRA model erased**; no salam-style advance-purchase capital
  flows referenced anywhere in the tier shell. Capital partner copy
  matches the global covenant
  ([`packages/shared/src/evidence/selectors/capitalPartner.ts`](../../packages/shared/src/evidence/selectors/capitalPartner.ts)
  unaffected by Phase 1).
- **Slice = commit on `feat/atlas-permaculture`**
  ([[feedback-commit-immediately-on-rebased-branches]]). Branch is
  rebased out-of-band; every slice committed the moment its gate
  verified.
- **Typecheck** per slice via
  `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  (8GB Node, monorepo root prints help only).
- **`git diff --cached --name-only` before every commit** — parallel
  sessions leave foreign staged files. Did this in practice; foreign
  wiki files unstaged via `git reset HEAD <files>` before Slice 1.10
  staged its 4 files explicitly.
- **ASCII-only user copy.** CostRange `{low, mid, high}` for any
  financial values (none in Phase 1 surfaces).
- **Pre-flight protocol** ([[feedback-preflight-protocol]]) — read
  current mounted state of every legacy module card touched, not just
  the manifest line.

## Consequences

- **Producer-first ordering verified.** Plan tier state is now the
  authoritative source for Phase 3's Act state machine handoff and
  Phase 4's Observe-driven plan-revision flagging. Both can plug into
  `tierObjectiveStatus` + `cyclicalReviewTrigger` without refactor.
- **Stage Zero compatibility maintained** through Phase 2's wizard
  swap. The `visionProfileToChecklist` bridge accepts the same
  `VisionProfile` shape the Phase 2 wizard Step 2 will emit.
- **Migration path for the 52 module cards is incremental.** Phase 7
  toggles each existing card into a tier objective by setting
  `legacyCardSectionId`. Once all are migrated, the toggle retires
  and `PlanPhaseTabs` / `PlanModuleBar` / `PlanModuleSlideUp` delete.
- **Cyclical review is testable in isolation.** Without Observe data
  the steward can `window.cyclicalReviewStore.getState().forceTrigger('mtc', 't0-vision')`
  in DevTools and exercise both the banner and the "Decision
  confirmed" modal end-to-end.
- **Phase 1 ships zero financial / capital flows**, so the CSRA
  erasure remains intact.

## Verification

Each slice typechecked (apps/web tsc --noEmit, exit 0) and verified
via `preview_eval` + `preview_screenshot` against the spec
screenshots:

- **Screenshots 1 + 2** — TierSpine initial state + locked-tier
  popover: Slice 1.4 gate.
- **Screenshot 4** — TierUnlockCelebration: Slice 1.10 gate;
  reproduced by completing all T0 objectives, T1 unlocks with
  celebration modal.
- **Screenshot 3** — Cyclical review "Decision confirmed":
  Slice 1.11 gate; reproduced via `forceTrigger` → Confirm → modal
  with gold checkmark, focuses Done, role=dialog, body
  `Your decision for <strong>{objective.title}</strong> still holds.
  We will check in again in 90 days.`
- **Screenshot 5** — Observe-updated banner: UI shell built in
  Slice 1.11; the real trigger predicate wires in Phase 4.
- **Slice 1.12 gate** — mtc visionProfile enriched to populate
  primaryOutcomes / landIdentity / systemsInScope / budgetRange /
  timelineProgress; all three t0-vision items rendered checked +
  disabled with "From Stage Zero Vision" badge + evidence text; meta
  `3 / 3 required`; T0 spine row reaches COMPLETE without any
  `planTierStore` toggle. Cleared the `planTierStore` entry to
  confirm the bridge alone (not stored progress) drives the checks.

End-of-phase smoke test (10 steps, see plan file §Verification) all
pass against the live preview at port 5200.

## Carry-over to Phase 2

- Phase 2 wizard Step 2 output MUST satisfy the `VisionProfile`
  contract the bridge expects; Step 3 outputs feed the same bridge
  for the t0-stewardship items.
- Retire `StageZeroVisionPage`, `useVisionBuilder`,
  `visionBuilderQuestions`, `deriveActivatedModules` only AFTER
  Phase 2 lands.
- Boundary capture moves from Observe's `MapToolbar` into Wizard
  Step 1 (preserves `MapToolbar` itself per [[feedback-no-deletion]]).

Log: [[log/2026-05-27-plan-tier-shell-phase1]].
