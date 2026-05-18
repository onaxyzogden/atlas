# 2026-05-17 — Mock DB harness: lazy-thenable upgrade closes the "11 failing" tests

**Status:** Accepted · `claude/elated-einstein-16895e`
**Scope:** [apps/api/src/tests/helpers/testApp.ts](apps/api/src/tests/helpers/testApp.ts) (core), plus `smoke.test.ts`, `boundary.test.ts`, `telemetry.test.ts`, `siteAssessmentsPipeline.integration.test.ts`, `comments.test.ts` (per-file drift)
**Relates to:** `decisions/2026-05-17-atlas-error-handler-ordering.md` (the 400→422 envelope it corrects)

## Context

The recurring "~11 `@ogden/api` tests need a provisioned test database" note
(in prior debriefs and the wiki log) was **factually wrong**. `apps/api`
tests are mock-DB by design: `vitest.config.ts` hardcodes a dummy
`DATABASE_URL` and every test `vi.mock`s the database plugin with an
in-process FIFO queue. No real Postgres/PostGIS is ever consulted.
Provisioning a DB would change nothing. The 11 failures were **mock-harness
deficiencies**, exposed by the co-landed durable-sync/telemetry work and the
error-handler reorder. User decision (2026-05-17): fix the mock harness; do
**not** build a real-DB/testcontainers harness now.

Six precise root causes (all verified by reading routes + tests):
1. Shared `mockDb` had no `.json()` / `.begin()` → `db.json(...)` in the
   projects/telemetry inserts threw → 500 / `ingested:0`.
2. **Eager `Promise.resolve(queue.shift())` drained the queue on
   non-awaited SQL fragments.** Real `postgres` does not execute an
   interpolated `db`...`` fragment independently; the eager mock did,
   corrupting the queue for any fragment-composing route (telemetry
   aggregate's 4 filter fragments; comments' `locationExpr = db`NULL``).
3. Stale `400` assertions where the route now correctly returns `422`
   (ZodError → custom handler envelope, post commit `6ac716b4`).
4. `smoke.test.ts` had no per-test queue reset → count drift cascaded.
5. `boundary.test.ts` under-enqueued by one — missing the `refuseIfBuiltin`
   `SELECT is_builtin` row between `resolveProjectRole` and the `UPDATE`.
6. `siteAssessmentsPipeline` "4 Tier-3 complete" missed the derived-layers
   presence guard: `maybeWriteAssessmentIfTier3Complete` runs **8** awaited
   queries (completion count + `{present}` guard + the writer's 6), not 7.

**Amanah Gate:** Passed — test-correctness fix for a halal land-stewardship
tool. No riba/gharar.

## Decision

Upgrade the shared mock (`testApp.ts`, mirrored in `smoke.test.ts`'s hoisted
copy) to a **lazy thenable**: `db`...`` returns an object whose queue row-set
is shifted only when `.then()`/`.catch()`/`.finally()` is actually invoked
(memoized per query object). Non-awaited fragments never shift — matching real
`postgres` `PendingQuery` semantics. Added `mockDb.json = v => ({__json:v})`
and `mockDb.begin = async cb => cb(mockDb)` (the conventions the
`siteAssessmentsPipeline` private mock already established). Then corrected the
per-file enqueue/assertion drift (causes 3–6).

## Why

The lazy form is the minimal change that makes the mock behave like the real
client without touching any route code. It is behaviorally identical for the
common case (routes that `await` every `db`...`` exactly once = the ~539
already-passing tests) so it carries no regression risk there, while
structurally fixing fragment-composing routes.

## How to apply

- When a test exercises a route that composes SQL fragments
  (`const f = db`...``; later interpolated into `db`...${f}``), enqueue **only**
  for the awaited outer query, not the fragments. A placeholder `enqueue()`
  "for the fragment" is a smell left over from the old eager bug.
- New routes using `db.json(...)` or `db.begin(...)` work against the shared
  mock without per-file mock surgery.
- Recount enqueues against the handler's **awaited** query list, including
  preHandler queries (`resolveProjectRole`, `refuseIfBuiltin`) and guard
  queries inside service functions (`maybeWriteAssessmentIfTier3Complete`'s
  derived-layers check).

## Consequences

- One regression surfaced and was fixed at the test, not by reverting the
  mock: `comments.test.ts` had a placeholder `enqueue()` that only existed to
  feed the old eager-shift bug on `locationExpr = db`NULL``; removed.
- The "needs a test database" framing is retired. Future debriefs must not
  reintroduce it.

## Verification

- `corepack pnpm --filter @ogden/api typecheck` — exit 0, clean.
- `corepack pnpm --filter @ogden/api test` — **550 / 550 passed**, 50 files.
  First post-fix run was 549/550 (the comments regression above); after the
  one-line test fix, full green. Zero previously-passing tests flipped.
