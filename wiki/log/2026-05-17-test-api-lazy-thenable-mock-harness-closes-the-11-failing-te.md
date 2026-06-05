# 2026-05-17 — test(api): lazy-thenable mock harness closes the "11 failing" tests (550/550)


Resolved the long-recurring "~11 `@ogden/api` tests need a provisioned test
database" item — by proving the premise **false**. The suite is mock-DB by
design: `vitest.config.ts` hardcodes a dummy `DATABASE_URL` and every test
`vi.mock`s the database plugin with an in-process FIFO queue; no real
Postgres/PostGIS is ever consulted, so provisioning a DB would change nothing.
The 11 were mock-harness deficiencies, exposed by the co-landed
durable-sync/telemetry work and the error-handler reorder (`6ac716b4`). User
decision (2026-05-17): fix the harness; do **not** build a real-DB harness.

Core fix — `apps/api/src/tests/helpers/testApp.ts` (mirrored in
`smoke.test.ts`'s hoisted copy): replaced the eager
`Promise.resolve(queue.shift())` with a **lazy thenable** that shifts the
queue only when `.then()`/`.catch()`/`.finally()` is invoked (memoized per
query object), matching real `postgres` `PendingQuery` — a non-awaited SQL
fragment interpolated into another `db`...`` no longer drains a row-set. Added
`mockDb.json = v => ({__json:v})` and `mockDb.begin = async cb => cb(mockDb)`.
Per-file drift: `smoke` got `beforeEach(clear)`; `boundary` got the missing
`refuseIfBuiltin` `{is_builtin:false}` row in 2 tests; `telemetry` 400→422 on
2 validation tests (now asserts the `VALIDATION_ERROR` envelope);
`siteAssessmentsPipeline` got the missing derived-layers `{present:'3'}`
guard row — `maybeWriteAssessmentIfTier3Complete` runs **8** awaited queries
(completion count + derived-layers guard + the writer's 6), not 7. One
regression surfaced and was fixed at the test (`comments.test.ts` had a
placeholder `enqueue()` that only existed to feed the old eager-shift bug on
`locationExpr = db`NULL``; removed). Verified: `corepack pnpm --filter
@ogden/api typecheck` exit 0; full suite **550/550** (50 files) — first
post-fix run 549/550 (the comments regression), green after the one-line test
fix; zero previously-passing tests flipped. New ADR
`decisions/2026-05-17-atlas-mock-db-lazy-thenable.md` + index pointer (with a
correction appended to the error-handler ADR pointer that had repeated the
debunked "needs a test DB" claim) + `entities/api.md` Current State rewritten
(now "550/550, mock-DB by design"). Real-DB/testcontainers harness explicitly
deferred.
