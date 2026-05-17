# 2026-05-17 — Register custom 404 / error handlers before route plugins

**Status:** Accepted · `claude/elated-einstein-16895e` · landed in commit `6ac716b4`
**Scope:** [apps/api/src/app.ts](apps/api/src/app.ts) (handler blocks moved; bodies unchanged)
**Relates to:** dual-zod-instance note in [apps/api/src/routes/relationships/index.ts](apps/api/src/routes/relationships/index.ts) (lines 16-29); telemetry route now throwing `ValidationError` via `safeParse`

## Context

`app.setNotFoundHandler(...)` and `app.setErrorHandler(...)` were registered at the
**end** of `buildApp`, *after* every route plugin (`app.register(..., { prefix })`)
had already been registered. Fastify binds the not-found / error handler that is in
scope **at route-registration time**; handlers added after the routes never apply to
those route contexts. Empirically confirmed: a `console.log` inside the custom
`setErrorHandler` never fired for `POST /api/v1/telemetry/act-interactions`, and the
response body was Fastify's default `{statusCode,error,message}` rather than the app
envelope `{data:null,error:{code,message}}`.

The bug was **latent and partially masked**: `AppError` subclasses carry a numeric
`.statusCode` which Fastify's default handler honors, so status codes were still
correct. Only the response **body shape** was wrong, and non-`AppError`/non-`ZodError`
failures never received the intended `INTERNAL_ERROR` envelope.

Pre-existing and out of scope for the branch's defect fixes — corrected here so error
responses are consistently enveloped.

**Amanah Gate:** Passed — correctness/consistency fix for a halal land-stewardship
tool. No riba/gharar.

## Decision

Moved both the `setNotFoundHandler` and `setErrorHandler` blocks from after the route
registrations to **before** them — immediately after the `app.decorate('pipeline', …)`
call and before the `// ─── Routes ───` section. Handler bodies are byte-for-byte
unchanged; only ordering changed. A short comment explains why the position matters.

## Why

Fastify resolves the not-found / error handler in scope when each route is registered.
Registering the custom handlers before the route plugins is the minimal change that
makes them apply to all route contexts without touching handler logic or route code.

## How to apply

Any future Fastify handler registered via `setErrorHandler` / `setNotFoundHandler`
(or analogous scope-sensitive hooks) must be registered **before** the route plugins
it is meant to cover. Adding it after the routes silently leaves them on the default
handler.

## Consequences

- All route contexts now return the app envelope `{data:null,error:{code,message}}`
  for `AppError` (with `details`), the `VALIDATION_ERROR` 422 envelope for `ZodError`,
  and the `INTERNAL_ERROR` envelope for everything else. Status codes are unchanged
  (they were already correct via `AppError.statusCode`).
- The telemetry route's validation failures still return **422** — it throws
  `ValidationError` (an `AppError`, `statusCode` 422) via `safeParse`; both the old
  default handler and the new custom handler honor that status. The reorder only
  corrects the body envelope, not the status.

## Verification

- `corepack pnpm --filter @ogden/api typecheck` — exit 0, clean.
- `corepack pnpm --filter @ogden/api test` — 539 passed / 11 failed (550). The 11
  failures are **DB-environment** failures in a fresh worktree with no provisioned
  test database (project-create returns 500, project GETs 404, telemetry aggregate
  0 rows). Confirmed not a regression: stashing this change and re-running the
  affected files (`smoke` + `telemetry` + `boundary`) gives an **identical** 9
  failed / 11 passed; with the change those same files produce the same 9 failures.
  Net new failures from the reorder: **zero**; no previously-passing body-shape
  assertion flipped.
- The telemetry 400↔422 test mismatch is pre-existing (the route throws
  `ValidationError` 422; the test asserts 400) — fails identically on baseline with
  this change stashed, because `AppError.statusCode` is honored by both handlers.
  Independent of this reorder; part of the branch's separate defect work.
