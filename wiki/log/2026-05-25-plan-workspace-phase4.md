# 2026-05-25 — Planning Workspace + Scenario Comparison (Plan-Operation Phase 4)

**Branch.** `feat/atlas-permaculture`. Commit `6bdbb31b` (7 files, +1095). The 4th
Plan-Operation IA surface — the first that lets a steward *weigh alternatives*
before committing a decision.

## What shipped

A focused, per-decision **Planning Workspace** (`/v3/project/$id/plan/workspace/
$decisionId`), reached from the Decision Log via **Open workspace →** on both card
types. It restates the decision context read-only (verb / rationale / assumptions /
trade-offs, affected module, source-observation chips → Observe, downstream
work-package status via `useWorkPackageForDecision`) and hosts a **qualitative
scenario comparison**: side-by-side response options scored on three axes (effort /
reversibility / time-to-effect), each with label / summary / pros / cons. An
**Adopt into decision** action writes the chosen option back into the decision's
headline / rationale / trade-offs and records `chosenScenarioId`.

Storage, entry-point, and comparison-shape forks were operator-confirmed:
scenario data lives on the existing `PlanDecision` (new optional fields, persisted
via `planDecisionStore.update()` — **no new store, no syncManifest edit, no
schemaVersion bump**); workspace reached from the Decision Log only (no sidebar
entry); structured-axes + adopt, strictly qualitative. Editing is gated on
`status === 'draft'`; accepted/superseded/rejected decisions render read-only.
Full rationale + file list in ADR
[[decisions/2026-05-25-atlas-plan-workspace-phase4]].

## Verification

- `npx vitest run src/v3/plan/workspace/__tests__/planScenario.test.ts
  src/lib/__tests__/syncManifest.test.ts` → **21/21 passing** (11 new pure-helper
  tests + the syncManifest coverage guard, unaffected since no store was added).
- `tsc --noEmit` clean for the changeset; only the 4 documented pre-existing
  unrelated errors remain.
- **Browser visual check deferred** — needs a logged-in operator session;
  auth-bypass (token injection / account creation) remains forbidden. Screenshots
  of the Decision Log bridge, the workspace comparison grid, the adopt round-trip,
  and read-only mode still want an operator session.

## Process

Plan-mode Phase 4, executed after operator plan approval. Only the Phase 4 slice
was staged (7 files by name) — the working tree carries unrelated foreign WIP
(economics/map/financial edits, ZoneSomSidebar, MapCoordinateReadout,
materialSubstitution, api/pdf) left untouched per [[feedback-no-deletion]]. The
shared modified files (`routes/index.tsx`, `PlanDecisionLogPage.tsx`,
`planDecision.ts`, `usePlanDecisions.ts`) were diff-verified to contain
Phase-4-only additive hunks before staging. The branch had been externally
rebased again (tip moved to `34c146e4`); committed the slice the moment it
verified, then fetched + divergence-checked (0 behind) before a fast-forward push
per [[feedback-commit-immediately-on-rebased-branches]]. Continues the
Plan-Operation roadmap thread (Phases 1–3). Updates entity [[entities/web-app]].
Next: Phase 5 — Conflict Detection + Plan Versioning + Synthesis/Approval.
