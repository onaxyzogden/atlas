# 2026-05-20 — `precedesAuto` + `'guild-member'` kind-label backfill

Closed 18 of the 19 pre-existing web typecheck errors surfaced by the
earlier divergence-rebase session as follow-up debt. Single
`fix(web): …` commit `ffefe2d6`, explicit-path staging, no push from
this session (divergence not ff-clean and parallel sessions actively
landing intermediate commits on the branch).

## Context

The 2026-05-20 divergence-rebase log entry flagged "5 pre-existing web
typecheck errors" as follow-up debt — `precedesAuto` missing on goal-
Compass `WorkItem` fixtures × 4 and `'guild-member'` missing from
`PlanSelectionFloater`'s kind-record. A fresh
`pnpm --filter @ogden/web typecheck` revealed the gap was broader:
**19 errors total**, of which 18 share two root causes:

- The WorkItem schema added `precedesAuto` as a **required** field
  (sibling to `dependsOnAuto`) without backfilling **13** WorkItem
  literals — 4 production callsites (5 sites across
  `workItemStore.migration.ts`, plus
  `MaintenanceScheduleCard.tsx`/`PlanExecutionTrackerCard.tsx`/
  `RotationScheduleCard.tsx`) and **8** test fixtures.
- `PlanSelectionFloater.tsx`'s `KIND_LABEL: Record<PlanSelectionKind, string>`
  literal was missing the `'guild-member'` key after the
  `PlanSelectionKind` union grew that variant on 2026-05-23.

The 19th error (`StepBoundary.tsx:365` `Type 'unknown' is not assignable
to type 'ReactNode'`) is unrelated to the WorkItem schema and was
explicitly scoped **out** of this slice.

## Plan-mode plan executed

`C:\Users\MY OWN AXIS\.claude\plans\c-users-my-own-axis-downloads-apricot-l-vectorized-cascade.md`
(replaced from the prior divergence-resolution plan; approved this
session) — single explicit-path commit covering all 12 files, no
behavioural test changes, push gated by ff-clean + branch policy.

## Changes

All 13 `precedesAuto`-missing literals received the single line
`precedesAuto: [],` adjacent to the other empty-default auto fields
(`dependsOnAuto`, `materialsAuto`, `equipmentRequiredAuto`). The
empty-array default is correct because none of these literals seeded
precedence edges — they predate the field.

`PlanSelectionFloater.tsx`'s `KIND_LABEL` received one entry
adjacent to `'guild': 'Guild',`:

```ts
'guild-member': 'Guild member',
```

Phrasing follows the existing multi-word convention (`'Crop area'`,
`'Setback ring'`, `'Flow connector'`, etc.).

## Files touched (12)

| Path | Sites |
|---|---|
| `apps/web/src/v3/plan/PlanSelectionFloater.tsx` | +1 `KIND_LABEL` entry |
| `apps/web/src/features/act/MaintenanceScheduleCard.tsx` | +1 |
| `apps/web/src/features/act/PlanExecutionTrackerCard.tsx` | +1 |
| `apps/web/src/features/livestock/RotationScheduleCard.tsx` | +1 |
| `apps/web/src/store/workItemStore.migration.ts` | +5 (phaseTask / field-task / maintenance / scheduled-livestock-move / nursery-batch mappers) |
| `apps/web/src/store/__tests__/workItemStore.migration.test.ts` | +1 |
| `apps/web/src/features/coverCrops/__tests__/coverCropDependencyGraph.test.ts` | +2 |
| `apps/web/src/features/coverCrops/__tests__/coverCropSpineSync.test.ts` | +1 |
| `apps/web/src/v3/plan/engine/goalCompass/__tests__/goalCompassSpineSync.test.ts` | +2 |
| `apps/web/src/v3/plan/engine/goalCompass/__tests__/seedGoalCompassCosts.test.ts` | +1 |
| `apps/web/src/v3/plan/engine/goalCompass/__tests__/seedGoalCompassDependencies.test.ts` | +1 |
| `apps/web/src/v3/plan/engine/goalCompass/__tests__/seedGoalCompassResources.test.ts` | +1 |

## Commit

`ffefe2d6 fix(web): backfill precedesAuto on WorkItem literals + add 'guild-member' kind label`

— 12 files changed, 18 insertions(+), 1 deletion(-).

## Verification

- `pnpm --filter @ogden/web typecheck` → exit 2, **one** remaining
  error: `src/features/project/wizard/StepBoundary.tsx(365,7): error
  TS2322: Type 'unknown' is not assignable to type 'ReactNode'` (out
  of scope; tracked as separate debt).
- All `precedesAuto`-related TS2322 / TS2345 / TS2352 errors gone.
- TS2741 on `KIND_LABEL` gone.

## Recovery note: pre-staged foreign files swept into first commit

First commit attempt (`c9f56185`) accidentally absorbed two files that
were already pre-staged by a parallel session before this session
started — `DesignMapGeneratorModal.tsx` (247 lines new) +
`apiClient.ts` (26 lines diff). Recovered non-destructively:
`git reset --soft HEAD^` to undo the commit while keeping all changes
staged, then `git restore --staged` on the two foreign paths, then
re-committed as `ffefe2d6` with the intended 12 files. The two foreign
files remained intact in the working tree.

**Lesson:** `git status --short` shows pre-staged foreign files with
an uppercase letter in column 1 (`A `, `M `, `MM`). Even when staging
explicit paths, **anything already in the index gets included** unless
explicitly unstaged first. Future explicit-path commits on a branch
with active parallel-session work should preflight with
`git restore --staged <foreign paths>` before staging the intended
files.

## Push deferred (parallel-session reconciliation)

State at session close:

```
$ git fetch origin feat/atlas-permaculture
$ git rev-list --left-right --count origin/feat/atlas-permaculture...HEAD
7    9
```

- **Origin (7 commits):** B4 union-tooltip stack — tooltip component
  + edge-clamp test + ADR, then pinned-state styling + click-to-pin
  + label + pinned-state test + ADR.
- **Local (9 commits):** 5 parallel-session commits below this
  session's fix (rotation-spine readiness evaluators, livestock-
  enterprise criteria, CriteriaForecastTab dispatch, B3.x ADR,
  B.5.1 designMap POST endpoint), then `ffefe2d6` (this session's
  fix), then 3 more parallel-session commits above
  (designMap B.5.2 web apiClient + modal + toolbar + WS handler +
  unused-@ts-expect-error fix).

Rebase attempt aborted because of a `wiki/log.md` conflict between
parallel-session commit `940d4150 docs(wiki): B3.x rotation promotion-
criteria` and origin's `7f9d0e21 docs(wiki): ADR + log for host-union
hover tooltip` — both prepend to the reverse-chronological index. The
conflict belongs to two other authors (a parallel B3.x session and a
parallel B4 host-union session), not to this session's fix, so
resolution was deferred per the 2026-05-20 divergence-rebase lesson:
"Parallel-session activity during a paused turn can resolve divergence
*for* you. Always re-fetch and re-confirm `0 0` before acting on stale
assumptions about who still has unpushed work."

This session's commit `ffefe2d6` sits safely on local. Whichever
session next does the reconciliation rebase (or a steward-initiated
ff-only push after parallel sessions catch up) will carry it forward.

## State left behind

- `ffefe2d6` (this fix) — unpushed, committed locally on
  `feat/atlas-permaculture`.
- Working tree: 4 modified + 6 untracked files from parallel sessions
  (`ConfirmDestructiveDialog.tsx`, `_shared/PhotoAttachField.{tsx,test.tsx,module.css}`,
  `DesignMapGeneratorModal.tsx`, `ArchivePage.tsx`,
  `field-proof-photo-upload` wiki log,
  `scorecard-13-to-8-partition` wiki log, plus several modified
  `FieldProofPanel.tsx` / `fieldProofActions.ts` / `MapView.tsx` /
  `wsService.ts` / `proofEvent.schema.ts` files). All foreign,
  none touched by this session.

## Follow-up debt surfaced

- `apps/web/src/features/project/wizard/StepBoundary.tsx:365` —
  `Type 'unknown' is not assignable to type 'ReactNode'`. Unrelated to
  the WorkItem schema or `PlanSelectionKind` union; needs its own
  small-slice plan to narrow the `unknown` at the source.

## Lessons

- The "5 pre-existing typecheck errors" follow-up flag from the prior
  divergence-rebase log was an under-count by ~14. A fresh full-output
  `pnpm typecheck` is the only reliable scope-sizer for inherited debt
  — never trust a prior session's by-eye error count.
- Pre-staged foreign files are silent: they ride along on the next
  `git commit` unless explicitly unstaged. Always preflight the
  staging area with `git status --short` and `git restore --staged`
  foreign paths before committing on a branch with active parallel-
  session work.
- The reverse-chronological wiki-index prepend pattern produces a
  predictable `wiki/log.md` conflict on every rebase across
  divergent sessions. Conflict resolution is mechanical (keep both
  prepends), but if neither side of the conflict belongs to the
  current session, defer to the parallel session that owns it.
