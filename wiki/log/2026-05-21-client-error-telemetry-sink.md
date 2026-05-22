# 2026-05-21 — Client-error telemetry sink (durable, server-side)

**Branch.** `feat/atlas-permaculture`. Direct follow-up to
[persist-rehydrate failure instrumentation](2026-05-21-persist-rehydrate-instrumentation.md),
which closed by naming its own gap:

> **Out of scope.** A telemetry sink (the helper logs to `console.error`
> only; wiring to a real error-reporting backend is a later concern).

This session closes that gap. `rehydrateWithLogging`'s failures — and any
future front-end error — are now captured **server-side in production**,
not only when an engineer happens to have the dev console open.

**Why.** `console.error` is invisible in production. The 2026-05-21 MTC
data loss was silent precisely because nobody was watching the console at
the moment of failure. Logging to the console made the *next* recurrence
diagnosable only for whoever is looking; a durable sink makes it
diagnosable for everyone, after the fact.

**Scope decisions (confirmed with the operator).**
- **Depth = full backend pipeline.** Not a fire-and-forget `fetch`.
  Mirror the existing `act-interactions` telemetry pattern end-to-end:
  buffered front-end queue → authenticated batch endpoint → Postgres
  table. Atlas has **no third-party error SDK** (no Sentry/Datadog); the
  architecturally-correct "real sink" is Atlas's own full-stack telemetry
  pattern.
- **Breadth = general client-error channel.** Not persist-specific. A
  reusable `recordClientError` module with a `source` discriminator;
  `persist_rehydrate` is the first consumer. `api_client`,
  `react_error_boundary`, and `unhandled_rejection` are reserved as
  sources for later wiring.

**What changed.**

- [packages/shared/src/schemas/clientErrorTelemetry.schema.ts](../../packages/shared/src/schemas/clientErrorTelemetry.schema.ts)
  (NEW): shared Zod contract. `CLIENT_ERROR_SOURCES` (the 4-source enum),
  `ClientErrorEventInput` (sessionId, occurredAt, **nullable** projectId,
  source, name, message≤4000, optional stack≤8000, context record, url,
  userAgent, appVersion), and `PostClientErrorsBody`
  (`events` array, **min 1 / max 50**). Exported from
  [packages/shared/src/index.ts](../../packages/shared/src/index.ts).
- [apps/api/src/db/migrations/039_client_error_events.sql](../../apps/api/src/db/migrations/039_client_error_events.sql)
  (NEW): `client_error_events` table. `user_id` NOT NULL (CASCADE),
  **`project_id` NULLABLE** (`ON DELETE SET NULL`) — a persist rehydrate
  failure at boot has no project context. `source` CHECK mirrors the Zod
  enum. Indexes on `(source, occurred_at DESC)` and
  `(user_id, occurred_at DESC)`. Additive, forward-only,
  `CREATE TABLE IF NOT EXISTS` (re-runnable). Approval doc:
  [stages/migration-039-client-error-events-approved.md](../../stages/migration-039-client-error-events-approved.md)
  (data migrations require a `stages/` gate).
- [apps/api/src/routes/telemetry/index.ts](../../apps/api/src/routes/telemetry/index.ts):
  new `POST /api/v1/telemetry/client-errors`, auth-required (no open
  write endpoint), per-event try/catch bulk insert — one bad event (e.g.
  an FK miss on a stale project_id) is dropped and logged, never poisons
  the batch. Mirrors the sibling `act-interactions` handler exactly.
- [apps/web/src/lib/apiClient.ts](../../apps/web/src/lib/apiClient.ts):
  `api.telemetry.postClientErrors(events)`.
- [apps/web/src/lib/clientErrorLog.ts](../../apps/web/src/lib/clientErrorLog.ts)
  (NEW): the front-end buffer, shaped to match `actInteractionLog.ts`
  (queue + 1500ms idle debounce + 50-event ceiling + `sendBeacon` on
  unload/visibilitychange + capped retry + `VITE_ATLAS_TELEMETRY_ENABLED`
  gate + session id + `__test` hooks). Two deliberate departures driven
  by the boot-time/pre-login nature of persist failures:
  - **Queue-until-auth.** A persist rehydrate failure can fire before
    login. A `401` flush does **not** burn a retry — events are retained
    so a later authenticated flush drains them. Non-auth failures are
    capped at `MAX_RETRIES` so the queue cannot leak forever.
  - **Self-protecting.** `recordClientError` never throws into its
    caller and is a no-op when telemetry is disabled — error
    instrumentation must never break the code path it observes.
- [apps/web/src/store/persistRehydrate.ts](../../apps/web/src/store/persistRehydrate.ts):
  the error branch now forwards to `recordClientError` (source
  `persist_rehydrate`, `projectId: null`, `context: { persistKey }`)
  immediately after the existing `console.error`. The console log stays —
  dev ergonomics — and the durable sink is added alongside.

**Design wrinkle worth remembering.** Persist failures have *no project
context* and fire *at boot, pre-login*. That single fact drove three
coupled choices: `project_id` nullable in the schema **and** the table;
the route stays auth-required (no anonymous write surface) **while** the
buffer queues-until-auth so boot-time errors survive to a later flush;
and `sendBeacon` is best-effort only (it cannot carry the Bearer header,
so the authenticated idle/ceiling path is the reliable one).

**Tests.**
- [packages/shared/.../clientErrorTelemetry.schema.test.ts](../../packages/shared/src/schemas/__tests__/clientErrorTelemetry.schema.test.ts)
  (12) — schema validation incl. null vs uuid projectId, source enum,
  message cap, batch min/max.
- [apps/web/src/lib/__tests__/clientErrorLog.test.ts](../../apps/web/src/lib/__tests__/clientErrorLog.test.ts)
  (11) — debounce, ceiling, capped non-auth retry, **queue-until-auth
  (401 retains without burning a retry)**, field stamping, session reuse,
  truncation, projectId default.
- [apps/api/src/tests/telemetry.test.ts](../../apps/api/src/tests/telemetry.test.ts)
  (+6) — 201 happy path, null projectId accepted, 401 no auth, 422
  unknown source / empty batch / >50 cap.
- [apps/api/src/tests/integration/telemetry-client-errors.pgtest.ts](../../apps/api/src/tests/integration/telemetry-client-errors.pgtest.ts)
  (NEW, gated by `INTEGRATION_ENABLED`) — real-Postgres: null projectId
  inserts; FK-violating projectId silently dropped mid-batch.
- [apps/web/src/store/__tests__/persistRehydrate.test.ts](../../apps/web/src/store/__tests__/persistRehydrate.test.ts)
  (+2) — asserts `recordClientError` fires on failure with the right
  source/projectId/context, and does NOT fire on a clean rehydrate.

**Verification.**
- Shared schema vitest → 12/12 green.
- Web vitest (clientErrorLog + persistRehydrate) → 17/17 green.
- API vitest (telemetry) → 13/13 green.
- `tsc --noEmit` web + api → 0 new errors (web carries the same handful of
  pre-existing unrelated errors as the rebase base).
- Note: running the **api** vitest from the worktree needs an
  `apps/api/node_modules/@ogden/shared` junction to the worktree's
  `packages/shared` (pnpm only links it in the main checkout; node_modules
  is gitignored, so this is a local test-env step, not a committed change).

**Out of scope (reserved for later).** Wiring the other three sources
(`api_client` failures, a React error boundary, `unhandled_rejection`)
into `recordClientError` — the channel is built for them but they are not
yet connected. A read/aggregate endpoint or dashboard for
`client_error_events`. Alerting on top of the sink.
