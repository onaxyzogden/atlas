# 2026-05-25 — Planning Workspace + Scenario Comparison (Plan-Operation Phase 4)

**Status.** Accepted. Phase 4 of the OLOS Plan-Operation roadmap. Code-complete,
statically verified; browser verification deferred (see below). Commit `6bdbb31b`
on `feat/atlas-permaculture`.

## Context

The Plan-Operation roadmap layers a living-plan loop on the existing 15-module
Plan-Initiation surface. Phases 1–3 built the linear Observe→Plan→Act spine:

- **Phase 1 — Plan Impact Flags** (`48702c66`): a recorded observation flagged
  `planImpact: possible|likely` surfaces as a triageable **Plan Review** with a
  thin verb + note.
- **Phase 2 — Decision Log** (`c36bb5a6`): a reviewed verb becomes an authored
  **PlanDecision** (verb + headline + rationale + assumptions + trade-offs +
  sources + status).
- **Phase 3 — Work Packages + Plan→Act Handoff** (`ab445034`): an accepted
  `create-act-task` decision becomes a team-typed **Act Work Package**, surfaced
  in a Plan queue and consumed by Act.

**Phase 4 adds the 4th IA surface — the Planning Workspace.** Until now a decision
is authored as a flat form; there is **no surface for weighing alternative
*responses*** ("move livestock" vs "add a water point") before committing. The
financial cards (`BestBaseWorstCaseCard`, `LayoutOptionABCComparisonCard`) compare
*money envelopes*, not planning responses — read-verified as a different concept.
Phase 4 fills the gap with a focused, per-decision page hosting a **qualitative**
scenario comparison.

## Design decisions (operator-confirmed via AskUserQuestion)

### 1. Scenario storage — on the decision (no new store)

Chosen: extend `PlanDecision` with **optional** `scenarioOptions?:
PlanScenarioOption[]` + `chosenScenarioId?: string`, persisted through the existing
`planDecisionStore.update()`. Optional fields ⇒ existing persisted decisions
rehydrate unchanged, **no `schemaVersion` bump, no new `ogden-*` store, no
`syncManifest.ts` edit** (so the coverage guard is unaffected).

Rejected: a bespoke `ogden-plan-scenarios` store (no demand — a scenario set only
ever belongs to one decision); a hybrid.

### 2. Workspace entry — from the Decision Log only

Chosen: a dedicated route `plan/workspace/$decisionId`, reached via an **Open
workspace →** link on **both** Decision Log card types. **No standalone sidebar
entry** — the workspace is always *about a specific decision*, so
`V3LifecycleSidebar.tsx` is **not** touched.

### 3. Comparison shape — structured axes + adopt

Chosen: each option = label + summary + pros + cons + three qualitative axes
(effort / reversibility / time-to-effect), rendered side-by-side. An **Adopt into
decision** action writes headline ← label, rationale ← summary, trade-offs ← a
labelled pros/cons block, and sets `chosenScenarioId`. Strictly qualitative — no
cost/revenue fields.

## Scope boundary (explicit non-goals)

- **Qualitative only** — no riba/gharar/CSRA/salam/investor/financing/
  cost-of-capital semantics; no link to `financialStore`/`FinancialModel`.
  Covenant header carried on the data-model + page files.
- **No new store, no spine writes.** Scenario data lives on the existing
  `PlanDecision` only; no mutation of `workItemStore`, `scenarioStore`, or the 15
  Plan modules.
- **No auto-mapping.** Options are steward-authored; nothing derived from
  `affectedModule` or the source observations.
- **Adopt overwrites by design** (copies option text into the decision's authored
  fields; the steward can still edit afterward in the Decision Log). No merge/diff
  UI, no plan versioning (Phase 5).
- Editing scenarios is gated on `status === 'draft'`; accepted/superseded/rejected
  decisions render the workspace **read-only** (monitor view).

## Data model

`PlanScenarioEffort = 'low'|'medium'|'high'`,
`PlanScenarioReversibility = 'easy'|'moderate'|'hard'`,
`PlanScenarioHorizon = 'immediate'|'season'|'multi-season'` (+ label maps +
display-order arrays). `PlanScenarioOption = { id, label, summary, pros, cons,
effort, reversibility, horizon }`. `PlanDecision` gains optional `scenarioOptions?`
+ `chosenScenarioId?`.

Pure helpers (unit-testable, no store access): `emptyScenarioOption()` (blank,
mid-point axis defaults medium/moderate/season) and
`adoptScenarioIntoDecision(decision, optionId): Partial<PlanDecision>` (maps the
option to a patch; pure/no-mutation; returns `{}` for an unknown id so a stale
adopt is a no-op).

## Files

| File | Change |
|---|---|
| `apps/web/src/v3/plan/decisions/planDecision.ts` | Add scenario axis types + labels + arrays, `PlanScenarioOption`, optional `scenarioOptions?`/`chosenScenarioId?` on `PlanDecision`, `emptyScenarioOption` + `adoptScenarioIntoDecision`. |
| `apps/web/src/v3/plan/decisions/usePlanDecisions.ts` | Add `usePlanDecision(projectId, id)` reactive selector. |
| `apps/web/src/v3/plan/workspace/PlanningWorkspacePage.tsx` + `.module.css` (NEW) | The per-decision surface: context read-only, source/WP chips, scenario comparison grid (editable when draft, read-only otherwise), adopt. |
| `apps/web/src/v3/plan/decisions/PlanDecisionLogPage.tsx` | **Open workspace →** Link on DraftCard actions + RecordedCard footActions. |
| `apps/web/src/routes/index.tsx` | `v3PlanWorkspaceRoute` (path `plan/workspace/$decisionId`, static before the `plan/$module` param route). |
| `apps/web/src/v3/plan/workspace/__tests__/planScenario.test.ts` (NEW) | `emptyScenarioOption` defaults, `adoptScenarioIntoDecision` (patch + pros/cons block + no-mutation + unknown-id + missing-line), axis-label completeness. |

## Tests

- `npx vitest run src/v3/plan/workspace/__tests__/planScenario.test.ts
  src/lib/__tests__/syncManifest.test.ts` → **21/21 passing** (11 new scenario
  helper tests + the 10-test syncManifest coverage guard).
- `tsc --noEmit` — clean for the Phase 4 changeset; only the 4 documented
  pre-existing unrelated errors remain (StepBoundary.tsx, planImpactFlag.test.ts,
  HostUnionContextMenu.test.tsx, HostUnionDrilldownCard.test.tsx).

## Verification deferrals

- **Browser/preview visual check — deferred.** Needs a logged-in operator session
  to screenshot: the Decision Log "Open workspace →" bridge, the Planning
  Workspace context + scenario comparison grid, the Adopt round-trip writing back
  to the decision, and read-only mode on an accepted decision. Re-establishing a
  session via token injection / account creation is forbidden (auth bypass). The
  data-model + adopt contract are fully unit-test covered; the page/route are
  static-typed clean. Committed on operator-approved plan with this deferral
  stated.

## Roadmap status

Phases 1 (Plan Impact Flags) + 2 (Decision Log) + 3 (Work Packages + Plan→Act
Handoff) + 4 (Planning Workspace + Scenario Comparison) shipped. Next: **Phase 5 —
Conflict Detection + Plan Versioning + Synthesis/Approval** (the final roadmap
slice).
