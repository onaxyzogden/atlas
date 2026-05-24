# 2026-05-24 — feat(true-north): Stage 0 "True North / Fit Gate" + goal-tailored Observe

**Branch.** `feat/atlas-permaculture` (shared with a parallel process running
the same plan — external rebases/force-pushes occurred mid-effort). Full
rationale in
[2026-05-24 ADR](../decisions/2026-05-24-atlas-true-north-fit-gate-stage-0.md).

**What shipped (6-phase plan, all phases landed).**

- **Phase 1 — data foundation.** `store/trueNorthStore.ts` (Zustand + persist,
  per-project, 8-segment questionnaire) + `v3/true-north/data/trueNorthTypes.ts`;
  `store/siteProfileStore.ts` extended with four Fit-Gate facets (`zoningFit`,
  `legalAccess`, `conservationOverlay`, `floodplainExtent`) behind a v3 idempotent
  migration.
- **Phase 2 — engine.** `v3/true-north/fit-gate/engine/fitGate.ts` — pure
  deterministic severity→verdict mapping (the `visionFit.ts` idiom). Unit test
  `tests/fitGate.test.ts`, **10/10 green** (clean Proceed, moderate-GIS Caution,
  deal-breaker Black→Reject, advisory-proceed path).
- **Phase 3 — Stage 0 UI.** `TrueNorthCompassPage` + wheel + 8 segment intake
  panels + `FitGatePage` verdict surface; `true-north` / `true-north/fit-gate`
  routes (full-screen, bypass `LandOsShell`); default project-entry + post-create
  redirect moved to True North; dismissible Observe advisory banner.
- **Phase 4 — absorb Plan Goal Compass.** Goal Tree + Site Profile *capture* UI
  relocated to Stage 0; Plan Goal Compass slimmed to generation-only (commit
  `6ed79b4f`), now reading Stage-0-captured stores. Import-path fix `18403923`.
  Downstream Plan consumers read the stores, not the tabs → unaffected.
- **Phase 5 — tailor Observe by goal.** `v3/observe/observeGoalAffinity.ts`
  (`getObserveModulesForGoal(archetype)`) wired at the two existing call sites:
  `observeCompassConfig.objectivesForArchetype` → `useCompassData` (reads
  archetype from `goalTreeStore`) — landed via `a1d2b516`; and
  `command/ModuleDashboardsPanel.tsx` — landed via `0aa74efc`. Also fixed three
  `noUncheckedIndexedAccess` errors in `siteProfileStore.countFilledFacets`
  (same commit).
- **Phase 6 — verify + document.** This entry + ADR.

**Invariants (goal-affinity).** `topography`, `earth-water-ecology`,
`swot-synthesis` always present; `swot-synthesis` always last; null archetype →
full `OBSERVE_MODULES` (pre-Stage-0 unchanged). `compassGating.ts` is
goal-agnostic and auto-adapts.

**Verification.** Typecheck clean for all Stage-0 files
(`node --max-old-space-size=8192 tsc --noEmit`; the web `lint` script *is*
`tsc --noEmit` — no separate eslint in this workspace). `fitGate.test.ts` 10/10.
Phase 5 preview walkthrough: homestead → 7 modules (tailored order),
conservation → 5 modules (human-context + built-environment dropped) — both the
compass wheel and Command-Centre dashboards respond; 5-segment conservation wheel
screenshot captured; original homestead state restored after testing.

**Covenant.** Financial Fit segment carries no CSRA/salam/advance-purchase
framing; capital channels limited to charitable/restricted donation, qard ḥasan,
in-kind, sponsorship; label "capital partners & allies"; verdict copy
riba/gharar-free. Gate is advisory (steward-sovereign, never auto-blocks).

**Branch-safety note.** Per
[[feedback-commit-immediately-on-rebased-branches]], each verified slice was
committed immediately; `git add -A` was avoided throughout because the working
tree carries heavy parallel-process changes. HEAD confirmed at `0aa74efc` (not
rebased) before the final commit.
