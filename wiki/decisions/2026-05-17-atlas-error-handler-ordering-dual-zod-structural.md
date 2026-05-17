# 2026-05-17 — Error/404 handler ordering fix + structural dual-zod ZodError detection

**Status.** Accepted · **Branch.** `claude/hardcore-napier-80b70c` · commit `a481d852`

Resolves the **Flagged (out of scope — spun off)** item from
[2026-05-17 Faithful postgres.js test mock](2026-05-17-atlas-faithful-postgres-test-mock.md).

## Context

`apps/api/src/app.ts` registered `setNotFoundHandler` / `setErrorHandler`
**after** `await app.register(routePlugin)` for every route. Fastify
resolves a route's error/notFound handler from the encapsulated context
that was current **when that route was registered**; handlers attached to
`app` afterwards are never inherited by those already-booted child
contexts. Net effect: Fastify's **default** handler served every route
error — wrong envelope (`{statusCode,error,message}` instead of the app's
`{data:null,error:{…}}`), and a thrown `ZodError` (no `statusCode`) became
a generic **500** instead of the codebase-wide **422**. Status codes
mostly survived only because `AppError.statusCode` is honoured by the
default handler.

Independently, the dual-`zod`-instance trap (ADR D4): a
`SharedSchema.parse(req.body)` on an `@ogden/shared` schema throws a
`ZodError` from *shared's* zod instance, which fails `error instanceof
ZodError` against `@ogden/api`'s zod — so even with the handler correctly
wired it would still fall through to 500. ADR D4 patched this **per-route**
(`telemetry` `parseOrThrow`, `relationships` `parseEdge`); ~15 other
bare-`.parse()` `@ogden/shared` routes remained exposed.

## Decision

### D1 — Relocate both handler registrations before the route block

Moved `setNotFoundHandler` + `setErrorHandler` to immediately after
`app.decorate('pipeline', …)` and **before** the `// ─── Routes` section,
with a comment recording *why* ordering is load-bearing. Verified by a
temporary `console.log` probe inside the handler: it fired
(`UnauthorizedError`, `ValidationError`) for thrown route errors — before
the move the probe never fired (the original flagged diagnosis). Probe
reverted.

### D2 — Structural ZodError detection in the global handler (root-cause, not per-route)

The `instanceof ZodError` branch now first tries `instanceof`, then falls
back to a structural check: `error.name === 'ZodError' &&
Array.isArray(error.issues)`. A ZodError from *any* zod instance matches,
so the dual-zod 500 is neutralised for **every bare-`.parse()` route at
once** — present and future — rather than requiring a `safeParse`
conversion in each of ~15 routes. The existing per-route `parseOrThrow` /
`parseEdge` mitigations remain valid (they raise an `AppError`/422, hitting
the `AppError` branch first) — belt-and-suspenders, not removed.

This is the deliberate scope call: the audit confirmed most
request-validation schemas (`CreateCommentInput`, `CreateProjectInput`,
`InviteMemberInput`, `CreateOrganizationInput`, …) are `@ogden/shared`
imports, so a one-line structural predicate at the single error seam is
strictly better than 15 mechanical per-route edits.

## Consequences

- `apps/api`: **549/549** (one new test added) green; `tsc --noEmit`
  exit 0. No regression.
- New regression test `comments.test.ts › returns 422 with the standard
  envelope when the body fails CreateCommentInput (dual-zod safe)` —
  exercises a real bare-`.parse()` `@ogden/shared` route end-to-end and
  asserts `422` + `{data:null,error:{code:'VALIDATION_ERROR',details:[]}}`.
  Locks in both D1 and D2.
- `XxxResponse.parse({…})` / `Summary.parse(toCamelCase(row))` calls are
  **server-constructed data**, not client input — a failure there is
  correctly a 500 (server bug). Not in scope; intentionally left as bare
  `.parse()`.
- The "Known latent issue" note in `entities/api.md` is now resolved.

## Files

- `apps/api/src/app.ts` (D1 relocation + D2 structural predicate)
- `apps/api/src/tests/comments.test.ts` (regression lock-in)

## Erratum (2026-05-17)

D2's framing — "neutralises the dual-zod 500 for every route" — describes
a *defensive* property, not a bug that was occurring. Subsequent read-only
investigation established that **no genuine dual-zod instance exists**
between `@ogden/shared` and `@ogden/api` in the current install (single
root-hoisted `zod@3.25.76`; the only second copy is `@scalar/types`'
private v4, never on the request path). The original telemetry-500 was
D1's handler-ordering bug, not a dual-zod `instanceof` miss. D1 and D2's
*behaviour* (relocation + structural 422) remain correct and are kept as
intentional defense-in-depth; only the dual-zod *rationale* is superseded.
See [2026-05-17 dual-zod non-issue](2026-05-17-atlas-dual-zod-non-issue.md).
