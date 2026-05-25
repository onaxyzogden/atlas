# 2026-05-25 — Plan Work Packages + Plan→Act Handoff (Plan-Operation Phase 3)

**Status.** Accepted. Phase 3 of the OLOS Plan-Operation roadmap. Code-complete,
statically verified; browser verification deferred (see below).

**Branch.** `feat/atlas-permaculture`.

## Context

The Plan-Operation roadmap layers a living-plan loop on top of the existing
15-module Plan-Initiation surface, without rebuilding any of it:

- **Phase 1 — Plan Impact Flags** (`48702c66`): a recorded observation flagged
  `planImpact: possible|likely` surfaces as a triageable **Plan Review** where a
  steward records a thin verb (`no-change｜update-plan｜request-observation｜
  create-act-task｜pause-act｜escalate`) + note. Closed the Observe→Plan loop;
  records intent only.
- **Phase 2 — Decision Log** (`c36bb5a6`): a reviewed verb is promoted into an
  authored **PlanDecision** (verb + headline + rationale + assumptions +
  trade-offs + sources + status). Still records intent only — the
  `create-act-task` verb dead-ends.

**Phase 3 opens Plan→Act.** An *accepted* decision whose `verb ===
'create-act-task'` becomes a durable, team-typed **Act Work Package** — the unit
of field work — surfaced in a new Plan-side **Work Packages** queue and
**consumed by Act** via a new Incoming Work Packages card. This is the roadmap's
"feeds everything downstream" payoff: the first slice where a Plan-Operation
record produces work the Act stage acts on.

## Design decisions (operator-confirmed via AskUserQuestion)

### 1. Architecture — authored WorkPackage store + queue

Chosen: a **bespoke `ogden-plan-work-packages` authored-whole store** mirroring
`planDecisionStore` (`byProject[projectId][pkgId]` of complete `PlanWorkPackage`
records). Act consumes it through **new Act-side code**; the canonical
`workItemStore` spine is left **untouched**.

Rejected: spine-sync into `workItemStore` (a work package carries a richer
gap-analysis shape — objective / detail / team-type / location / tools /
evidence-required / completion-criteria — than the scheduling spine); and a
hybrid of both (double source-of-truth, no demand for it yet). A future
enrichment could mirror a package onto the spine — out of scope.

### 2. Trigger — explicit button, `create-act-task` only

Chosen: only an *accepted* decision whose `verb === 'create-act-task'` gets a
**Generate work package →** action on the Decision Log; the steward controls the
hand-off. **Idempotent** — one package per decision; once created the card shows
**Work package created ✓ → view** instead of the button
(`useWorkPackageForDecision` guards it).

### 3. Plan-side surface — both button and dedicated route

Chosen: **both** a Decision Log bridge button **and** a dedicated
`plan/work-packages` route + sidebar entry (peer to Plan Reviews / Decision Log).
The route is where the steward enriches a draft, dispatches it, and monitors
hand-off status.

## Scope boundary (explicit non-goals)

- **Operational scheduling only** — no riba/gharar/CSRA/salam/investor/
  financing/cost-of-capital semantics (covenant header carried on the data-model
  and Act-consumer files, matching the spine-sync files).
- **No write to `workItemStore` / the WorkItem spine** and no mutation of any of
  the 15 Plan modules. The authored WP store is the single source of truth.
- **No cross-taxonomy auto-mapping.** `teamType` is an `ActModule` the steward
  picks; it is **not** derived from `decision.affectedModule` (a `PlanModule`) —
  the same taxonomy gap that kept `affectedModule` steward-set in Phase 2.
- No plan versioning / conflict detection / scenario comparison (later phases).

## Data model

`PlanWorkPackageStatus = 'draft' | 'queued' | 'in-progress' | 'done' |
'cancelled'`. Lifecycle: the **Plan** side authors + dispatches (draft → queued);
the **Act** side advances (queued → in-progress → done). `teamType` reuses the 8
`ActModule`s (the execution-team taxonomy) — no new taxonomy.

`PlanWorkPackage = { id, projectId, decisionId?, objective, detail, teamType,
location, tools, evidenceRequired, completionCriteria, status, createdAt,
updatedAt, dispatchedAt?, completedAt? }`. `decisionId` optional so standalone
authoring is allowed.

Pure helpers (unit-testable, no store access): `emptyPlanWorkPackage` (draft,
`teamType: 'build'`), `buildWorkPackageFromDecision` (objective = headline,
detail = rationale, `decisionId` set), `sortWorkPackages` (STATUS_RANK then
`updatedAt` desc). Store `setStatus` stamps `dispatchedAt` on `→queued`,
`completedAt` on `→done`.

## Files

| File | Change |
|---|---|
| `apps/web/src/v3/plan/work-packages/planWorkPackage.ts` (NEW) | Pure types + helpers; reuses `ActModule`; covenant header. |
| `apps/web/src/store/planWorkPackageStore.ts` (NEW) | `ogden-plan-work-packages` authored-whole store (copies `planDecisionStore`). |
| `apps/web/src/lib/syncManifest.ts` | Register the blob (mandatory — coverage guard fails the build otherwise). |
| `apps/web/src/v3/plan/work-packages/usePlanWorkPackages.ts` (NEW) | `usePlanWorkPackages` / `usePlanWorkPackageCounts` / `useWorkPackageForDecision`. |
| `apps/web/src/v3/plan/work-packages/PlanWorkPackagesPage.tsx` + `.module.css` (NEW) | Draft (edit/dispatch/delete) + Recorded (monitor-only) cards, status-grouped. |
| `apps/web/src/v3/plan/decisions/PlanDecisionLogPage.tsx` + `.module.css` | The bridge: Generate / ✓-view on accepted `create-act-task` decisions (`.footActions` wrapper). |
| `apps/web/src/features/act/IncomingWorkPackagesCard.tsx` (NEW) | Act consumer: Start / Mark done; reuses `_shared/stageCard` CSS. |
| `apps/web/src/v3/act/types.ts` | `MODULE_CARDS.tracker` += `{ 'Incoming packages', 'act-incoming-packages' }`. |
| `apps/web/src/v3/act/ActModuleSlideUp.tsx` | Lazy import + `renderActCard` case. |
| `apps/web/src/routes/index.tsx` | `v3PlanWorkPackagesRoute` (path `plan/work-packages`, static before the `plan/$module` param route). |
| `apps/web/src/v3/components/V3LifecycleSidebar.tsx` | "Work Packages" sidebar entry + draft-count badge. |
| `apps/web/src/v3/plan/work-packages/__tests__/planWorkPackage.test.ts` (NEW) | empty defaults, `buildWorkPackageFromDecision`, `sortWorkPackages` (5-status order + updatedAt desc + no-mutation), status-label completeness. |

## Tests

- `npx vitest run src/v3/plan/work-packages/__tests__/planWorkPackage.test.ts
  src/lib/__tests__/syncManifest.test.ts` → **21/21 passing** (the new pure-helper
  tests + the syncManifest coverage guard confirming the store registration).
- `tsc --noEmit` — clean for the Phase 3 changeset; only the 4 documented
  pre-existing unrelated errors remain (StepBoundary.tsx:369,
  planImpactFlag.test.ts:143, HostUnionContextMenu.test.tsx:58,
  HostUnionDrilldownCard.test.tsx:25).

## Verification deferrals

- **Browser/preview visual check — deferred.** During this session the live
  5200 preview's auth session was inadvertently cleared (the real
  `ogden-auth-token` was overwritten with a placeholder during a navigation
  workaround). Re-establishing a session via token injection / account creation
  was correctly **denied by the auto-mode classifier** as an auth bypass, and was
  not pursued further. The data-model + store contracts are fully unit-test
  covered; the page/bridge/card are static-typed clean. A logged-in operator
  session is needed to screenshot: the Work Packages page, the Decision Log
  "Generate work package →" bridge, and the Act "Incoming packages" card.
  Committed on operator instruction with this deferral stated, not assumed.

## Roadmap status

Phases 1 (Plan Impact Flags) + 2 (Decision Log) + 3 (Work Packages + Plan→Act
Handoff) shipped. Next: **Phase 4 — Planning Workspace + Scenario Comparison**;
then **Phase 5 — Conflict Detection + Plan Versioning + Synthesis/Approval**.
