# 2026-05-31 — Act Stratum-1 progress: single source of truth + dead `t0→s1` bridge fix

**Branch.** `feat/atlas-permaculture`. Commit `0e028508` (commit-only, no push;
branch is externally rebased).

**Reported bug.** On a freshly wizard-completed project, the Stratum-1 ("Project
Foundation") vision/stewardship checklist items show as DONE on the **Plan**
screen but EMPTY on the **Act** screen. The operator's directive: fix Act "but
we need to maintain a single source of truth."

**Root cause (two layers).**
1. *Duplicated merge.* Wizard-derived S1 completion is not written to the
   `planStratumStore`; instead `deriveStratum1EvidenceMap` /
   `deriveStratum1StewardshipMap` derive it on the fly from
   `project.metadata.visionProfile` + `.team`, and Plan unions that into stored
   progress **inline in `PlanStratumShell.tsx` only**. Act, Portfolio cards
   (`usePortfolioPlanProgress`), Home urgency (`useProjectUrgency`) and Act
   View A (`ViewAObjectiveExecution`) all read raw store progress and skipped
   the merge — so they disagreed with Plan.
2. *Dead bridge ids (pre-existing latent defect, surfaced during live verify).*
   The bridge still emitted pre-renumber `t0-vision-*` / `t0-stewardship-*`
   keys after the `t0→s1` stratum renumber (`constants/plan/remapSlug.ts`)
   renamed the live catalogue checklist ids to `s1-vision-*` / `s1-stewardship-*`.
   So the derivation matched **nothing** — Plan AND Act AND Portfolio AND Home
   all showed 0/N with no "From Stage Zero Vision" badge. The earlier plan
   assumption ("merge works in Plan, just share it") was disproven live; the
   operator approved folding in the id-namespace fix.

**Fix.** One shared, surface-neutral source of truth that every surface consumes:
- `apps/web/src/v3/strata/effectiveProgress.ts` (NEW) — pure
  `computeEffectiveProgress(stored, visionProfile, team, objectives)` →
  `{ byObjective, flatMap }`. Store-free; safe in batch loops.
- `apps/web/src/v3/strata/useEffectiveChecklistProgress.ts` (NEW) — React hook
  wrapping the pure fn for single-project surfaces (Plan, Act tier shell,
  Act View A).
- `apps/web/src/v3/strata/visionProfileToChecklist.ts` (MOVED from
  `v3/plan/strata/`, git rename R082) — so Act no longer imports from Plan
  (layering fix). Five derived map keys + docstring migrated `t0-* → s1-*`.
- Routed surfaces through it: Act `ActTierExecutionPanel` /
  `ViewAObjectiveExecution`; Plan already consumed the hook in HEAD; batch
  readers `usePortfolioPlanProgress` + `useProjectUrgency` call the pure fn
  per project; import-path + test updates (`DecisionChecklist.test.tsx`,
  `WizardCompletionScreen.tsx`).

Single-project surfaces use the hook; batch readers (Portfolio, Home — loop many
projects) call the pure function. One implementation, two entry points. Contract
pinned by `packages/shared/src/constants/plan/__tests__/catalogues.test.ts`
("preserves the 3 visionProfileToChecklist bridge ids on s1-vision"). Unit test
`v3/strata/__tests__/computeEffectiveProgress.test.ts` pins the union behaviour
on the live `s1-vision-*` namespace.

**Verification.** Typecheck (`tsc --noEmit`, web) exit 0; vitest 11 files /
82 tests pass. Live on project `d2708c91`: Plan `3/7 required`; Act execution
panel `3/7 steps` / `43% ready`; Act left-rail `s1-vision` card `3/7 DONE`;
sibling S1 cards correctly `0/7`, `0/6`, `0/8`. `preview_screenshot` was
intermittently unresponsive (transient dead-API + open-modal, per memory) — the
DOM "N/7" text counts were the definitive proof; no screenshot success was
fabricated.

**Incidental.** `ActTierExecutionPanel` also completes a pre-existing helper
dedup — `readNote` / `formatActyTimestamp` now imported from the
already-committed `v3/observe/dashboard/observationDisplay.ts` instead of defined
locally. No foreign-WIP files (DesignMap/DiagnoseMap/OperateMap, financial,
graphify-out, CSS modules, the foreign `PlanStratumShell` font-size hunk) were
staged.

**Deferred — Issue 2 (own session).** "Edit placed sectors/features/elements in
Act" is NOT buildable as first scoped: Act tools only log events (harvest /
livestock move / maintenance) and cannot place Structures/Crops/Zones/Paddocks,
and no `createdInStage` provenance field exists — so "Act-placed elements" is
currently an empty set. Needs an architectural decision before code: **Option A**
reverse ADR-7 to let Act edit Plan-authored geometry (superseding ADR + an
Act-scoped `inlineFormStore` instance), or **Option B** add Act draw-new tools +
a `createdInStage: 'plan' | 'act'` schema field on all four types and edit only
Act-created ones. Carry forward as a brainstorming/design session.
