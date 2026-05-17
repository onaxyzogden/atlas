# 2026-05-17 — Faithful postgres.js test mock + harness fixture correctness + telemetry dual-zod fix

**Status.** Accepted · **Branch.** `claude/hardcore-napier-80b70c` (off `feat/atlas-permaculture` lineage) · commits `f9018650`, `cf61712a`

## Context

Two defects rode in bundled commit `ddb7e0e4` (durable `syncService`
coverage):

1. **Web typecheck (TS18048).** `subscribeVersionedBlobs()` in
   `apps/web/src/lib/syncService.ts` aliased `const d = desc` *after* a
   `!desc.store` guard, widening the value back to optional-`store` so
   `d.store.subscribe(...)` was `possibly 'undefined'`.
2. **`@ogden/api` test suite red (~11 tests).** The bundling brief
   *hypothesised* a blob-sync off-by-one regression. Parent-baseline
   evidence (worktree at `ddb7e0e4~1`) **falsified that premise**: parent
   already had **10** failing api tests; HEAD added exactly **one** new
   failure (the acreage-named boundary test). The "regression" framing was
   wrong — the blob-sync route (`routes/project-state/`) introduced **no**
   api regression (its 4 own tests pass; it has no registration-time or
   request-path DB call). The 10 were pre-existing latent harness rot.

## Decision

### D1 — Carry the narrowing onto the subscribed value (`f9018650`)

`const store = d.store; if (!store) continue; store.subscribe(...)` —
behaviourally identical (the new guard is unreachable past the existing
classification filter), type-correct.

### D2 — The mock DB must be *faithful to postgres.js*, not eager

`apps/api/src/tests/helpers/testApp.ts` modelled a tagged-template call as
an **eager** `Promise.resolve(queue.shift() ?? [])`. postgres.js `sql`…``
is a **lazy `PendingQuery`** that executes only on `await`; sub-fragments
built with `sql`…`` and embedded into an outer query (e.g.
`WHERE ${userFilter}${projectFilter}`, or `locationExpr = db`NULL``
spliced into an INSERT) are **never awaited on their own** and so execute
no query. The eager mock consumed a canned row for every such embedded
fragment, silently shifting every subsequent fixture by one.

The mock is now a **lazy thenable**: `pendingQuery()` shifts the queue only
when `.then` is invoked; helper calls (`db.json`/`db.array`/`db.typed`,
dynamic `db(value)`) return an inert frozen `SQL_FRAGMENT` and never
consume; `db.unsafe` executes; `db.begin(cb)` runs `cb` with the same
handle. It is typed `MockDb` — a structural callable **deliberately not
assignable to `postgres.Sql`** so the `// @ts-expect-error — mock`
directive every test file places before `fastify.decorate('db', mockDb)`
stays "used" (a bare `: any` silently broke `@ogden/api typecheck` with
TS2578 across files — recorded so it is not reintroduced).

### D3 — Fixtures must mirror the *real* query sequence

The pre-existing failures were fixtures written against the eager mock or
never updated when load-bearing guards were added. Corrected, not deleted:

- **boundary** — enqueue the `refuseIfBuiltin` `SELECT is_builtin` row
  (×2). This *also* resolved the single HEAD-new "acreage regression":
  it was never an acreage-code bug — the source was correct; the fixture
  under-enqueued. **The acreage code was not touched.**
- **siteAssessments** — enqueue the Tier-3 **derived-layers race-guard**
  count (`maybeWriteAssessmentIfTier3Complete` gained a load-bearing
  `SELECT count(*) … layer_type IN ('microclimate','watershed_derived',
  'soil_regeneration')` check from the pre-testing hardening; the fixture
  predated it → `derivedPresent=0` → premature `null`).
- **comments** — *drop* the spurious `locationExpr` (`db`NULL``)
  sub-fragment row (embedded, never awaited → consumes nothing).
- **smoke** — use the shared helper + `clearQueue()` (was a `vi.hoisted`
  duplicate).

### D4 — Validation parsing must survive the dual-`zod`-instance trap

`telemetry` route called `PostActInteractionsBody.parse()` on an
`@ogden/shared` schema. Shared can resolve a **different `zod` instance**
than `apps/api`, so the thrown `ZodError` misses `instanceof ZodError` in
the global handler and escaped as a **500**. Adopted the **existing
`routes/relationships/index.ts` precedent**: `safeParse` → rethrow as our
own `ValidationError` (an `AppError`, `statusCode 422`, structured
payload). The two telemetry tests asserting `400` were **outliers** — the
codebase-wide validation contract is **422** (errors.ts `ValidationError`,
gaez/soilgrids/relationships tests); test expectations corrected to 422.

> **Erratum (2026-05-17):** the dual-`zod`-instance *rationale* here is
> superseded — no genuine dual instance exists in the current install (the
> escaped-500 was the handler-ordering bug, fixed in `a481d852`). D4's
> `safeParse`→`ValidationError` is still correct as the 422 contract
> regardless. See
> [2026-05-17 dual-zod non-issue](2026-05-17-atlas-dual-zod-non-issue.md).

## Consequences

- `@ogden/api` **548/548** + typecheck clean; `@ogden/web` **973/973** +
  typecheck clean; `@ogden/shared` **201/201** + typecheck clean. No
  regression. CRLF-only `exportDiagnoseBrief.test.ts.snap` churn reverted
  and excluded.
- **The mock contract is now documented in `testApp.ts`**: embedded
  sub-fragments and helper calls consume nothing; only awaited
  tagged-template / `unsafe` calls shift the queue. New fixtures must be
  written against the *real* query sequence, not against eager-mock
  artefacts.
- **`db.json`/dynamic-fragment off-by-one is no longer possible** — the
  class of bug that produced 10 of the 11 failures cannot recur with the
  faithful mock.
- New per-route schema parsing on `@ogden/shared` schemas should use the
  `safeParse`→`ValidationError` precedent, not bare `.parse()`, until the
  dual-zod root cause is eliminated at the build level.

## Flagged (out of scope — spun off)

`apps/api/src/app.ts` registers `setNotFoundHandler` / `setErrorHandler`
**after** all route plugins, so Fastify's **default** handler serves route
errors (verified: a probe `console.log` in the custom handler never fired;
response body was the default `{statusCode,error,message}` shape, not the
app's `{data:null,error:{…}}` envelope). Status codes are still mostly
correct because `AppError.statusCode` is honoured by the default handler —
but the envelope shape and the non-AppError/non-ZodError path are wrong.
Pre-existing and latent; recorded here, handed to a separate task (move
both handler registrations *before* the route registrations).

## Files

- `apps/web/src/lib/syncService.ts` (D1)
- `apps/api/src/tests/helpers/testApp.ts` (D2 — lazy thenable + `MockDb`)
- `apps/api/src/routes/telemetry/index.ts` (D4 — `parseOrThrow` helper)
- `apps/api/src/tests/{boundary,siteAssessmentsPipeline.integration,comments,smoke,telemetry}.test.ts` (D3, D4)
