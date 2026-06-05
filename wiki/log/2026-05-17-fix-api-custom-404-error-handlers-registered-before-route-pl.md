# 2026-05-17 — fix(api): custom 404/error handlers registered before route plugins


Fixed a **latent, pre-existing** Fastify ordering bug in `apps/api/src/app.ts`:
`setNotFoundHandler`/`setErrorHandler` were registered *after* every route
plugin, so Fastify served all route contexts with its **default** handler.
Status codes were still correct (`AppError.statusCode` honored by the default
handler) but the response **body shape** was wrong — Fastify's default
`{statusCode,error,message}` instead of the app envelope
`{data:null,error:{code,message}}` — and non-`AppError`/non-`ZodError`
failures never received the `INTERNAL_ERROR` envelope. Moved both handler
blocks ahead of the route registrations (immediately after
`app.decorate('pipeline')`); handler bodies are byte-for-byte unchanged, only
ordering + a short explanatory comment. Out of scope for the branch's defect
fixes but corrected so error responses are consistently enveloped. Telemetry
validation failures still return **422** (the route throws `ValidationError`,
an `AppError`; status honored by old default *and* new custom handler — only
the envelope changed). Verified: fresh worktree had no `node_modules`/test DB,
so ran `pnpm install --frozen-lockfile` first; `@ogden/api` typecheck exit 0;
full suite 539/550 with **11 DB-environment fails** (project-create 500,
project GET 404, telemetry aggregate 0 rows) — proven **not a regression**:
stashing the change and re-running `smoke`+`telemetry`+`boundary` gives an
identical 9 failed/11 passed; with the change those same files reproduce the
same 9. Net new failures: zero; no previously-passing body-shape assertion
flipped. The telemetry 400↔422 test mismatch is pre-existing (route throws
422, test asserts 400 — independent of this reorder, part of the branch's
separate defect work). Landed in commit `6ac716b4` on
`claude/elated-einstein-16895e`. New ADR
`decisions/2026-05-17-atlas-error-handler-ordering.md` + index pointer +
`entities/api.md` Current State updated.
