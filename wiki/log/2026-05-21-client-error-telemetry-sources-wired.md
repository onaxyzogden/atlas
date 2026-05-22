# 2026-05-21 — Client-error telemetry: react_error_boundary + unhandled_rejection wired, migration 039 applied

**Branch.** `feat/atlas-permaculture`. Direct follow-up to
[the client-error telemetry sink](2026-05-21-client-error-telemetry-sink.md),
which shipped `recordClientError` + the buffered POST pipeline + the
`client_error_events` table but left three of its four `source` enum values
unused. The sink reserved `api_client`, `react_error_boundary`, and
`unhandled_rejection` as future consumers; only `persist_rehydrate` was
emitting.

This session wires the **two highest-value remaining sources** and applies
the table migration.

**Why.** A telemetry sink that only one code path feeds is mostly dark. React
render-tree crashes (already caught by our error boundaries) and uncaught
promise rejections are the two largest classes of front-end failure that were
still invisible server-side. Wiring them turns the sink from "persist-rehydrate
only" into a genuine general-purpose client-error channel.

## What changed

### `react_error_boundary`
Both error boundaries in `apps/web/src/components/ErrorBoundary.tsx` (the
generic `ErrorBoundary` and the always-mounted `GlobalErrorBoundary`) now call
a shared `reportBoundaryError(error, info, boundary)` helper from
`componentDidCatch`, in addition to the existing `console.error`. The helper
emits `source: 'react_error_boundary'` with `context.boundary` (the boundary
name, or `'global'`) and a 4000-char-capped `componentStack`.

**Showcase bundle-split constraint.** `GlobalErrorBoundary` is mounted on every
path including `/showcase/*`, and `clientErrorLog` statically imports
`apiClient`. A static import would pull the authed graph into the showcase
initial chunk and regress the split
([ADR 2026-05-21-atlas-showcase-bundle-split](../decisions/2026-05-21-atlas-showcase-bundle-split.md)).
So `reportBoundaryError` uses a **lazy `import('../lib/clientErrorLog.js')`** —
deferred to the catch path, out of the entry graph, and a no-op when telemetry
is disabled.

### `unhandled_rejection`
New `apps/web/src/lib/globalErrorHandlers.ts` — `installGlobalErrorHandlers()`
registers a single idempotent `window.unhandledrejection` listener emitting
`source: 'unhandled_rejection'`. This module statically imports
`clientErrorLog`, so it is imported **only from `bootAuthed.ts`**
(authed-only) — the showcase portal intentionally ships no client-error
telemetry. `window.onerror` (uncaught *synchronous* errors) is deliberately out
of scope: no matching enum source, and React render errors are already covered
by the boundaries.

### projectId resolver
`clientErrorLog.ts` gains `setClientErrorProjectIdResolver(fn)`. Non-React
emitters (boundaries, the rejection handler) have no project context and must
not import `projectStore` directly (same bundle-split reason). `bootAuthed.ts`
registers `() => useProjectStore.getState().activeProjectId ?? null`.
`recordClientError` now uses `input.projectId !== undefined ? input.projectId :
safeResolveProjectId()` — an **explicit** value still wins (including the
explicit `null` the persist helper passes), an **omitted** one falls back to
the resolver. `safeResolveProjectId` swallows resolver throws, preserving the
"never throws into its caller" guarantee.

### bootAuthed wiring
`bootAuthedShell()` registers the resolver and calls
`installGlobalErrorHandlers()` right after `bootAuth()`.

## Migration 039 — applied to the **local dev DB** (no prod exists)

The task framed this as "apply against the live database." Investigation
established there is **no production or staging database**: staging
provisioning was explicitly parked
([log 2026-04-21](2026-04-21-staging-provisioning-decision-parked.md) —
"dev loop is fine on localhost"). The only database is local dev Postgres
(`localhost:5432/ogden_atlas`, per `apps/api/.env.example`). The operator
confirmed: apply to the local dev DB.

- **Inspected first** (read-only): `schema_migrations` was current through
  **038** (037 + 038 already applied); `client_error_events` did not exist.
- **Pending set = 039, 040, 041.** The runner (`apps/api/src/db/migrate.ts`)
  applies *all* pending migrations in order — it cannot target one. 040
  (`showcase_visitor_events`, committed) and 041 (`showcase_feedback`,
  in-flight) are both additive `CREATE TABLE IF NOT EXISTS`; verified
  non-destructive before running.
- **Applied** via `node --env-file=.env --import=tsx src/db/migrate.ts` (the
  `migrate` npm script does **not** load `.env` — only `dev` does — so the flag
  is required). All three applied cleanly.
- **Verified** `client_error_events`: 14 columns, nullable `project_id`/`stack`,
  the 2 indexes (`_source_time_idx`, `_user_time_idx`), and the `source` CHECK
  constraint enumerating all four sources incl. the two newly wired. `039` is
  recorded in `schema_migrations`.

## Tests

- `apps/web/src/lib/__tests__/globalErrorHandlers.test.ts` (new) — synthetic
  `unhandledrejection` dispatch; Error vs non-Error reason coercion;
  install-once idempotency.
- `apps/web/src/components/__tests__/ErrorBoundary.telemetry.test.tsx` (new) —
  invokes `componentDidCatch` on both boundaries, flushes the dynamic-import
  macrotask, asserts the `react_error_boundary` payload + `context.boundary`.
- `apps/web/src/lib/__tests__/clientErrorLog.test.ts` (extended) — resolver
  fills omitted projectId; explicit null overrides the resolver; resolver throw
  → null.

All 20 targeted tests green. `tsc` on `apps/web` shows only the 3 pre-existing
unrelated errors (StepBoundary.tsx:365, two HostUnion test files) — no new
errors introduced. Note: `tsc` needs `--max-old-space-size=8192` on this tree
or it OOMs.

## Commit

`2eb2aa6a feat(telemetry): wire react_error_boundary + unhandled_rejection sources`
(7 files). Pushed to `feat/atlas-permaculture` with `--force-with-lease` after
fetch/divergence check (`0 0`). The unrelated economics/financial/showcase
working-tree changes were kept out of the commit.

## Remaining gap

`api_client` is the last unwired source — apiClient request failures still only
surface as thrown `ApiError`s, not telemetry. Lower value (callers already see
the error) and deferred.
