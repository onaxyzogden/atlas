# 2026-05-22 — Client-error telemetry: `api_client` source wired (sink complete, all 4 sources emitting)

**Branch.** `feat/atlas-permaculture`. Commit `004e4ad7`. Closes the last gap
left by [the sources-wired session](2026-05-21-client-error-telemetry-sources-wired.md):
the `client_error_events` sink defines **four** `source` enum values, and three
were already emitting (`persist_rehydrate`, `react_error_boundary`,
`unhandled_rejection`). The fourth — **`api_client`** — was still dark: failed
API requests surfaced only as thrown `ApiError`s (and uncaught network
rejections), invisible server-side.

**Why.** API failures are the single largest class of front-end error that was
still unobserved. Wiring this source turns the sink from "three-quarters wired"
into a complete general-purpose client-error channel.

## Scope (operator-confirmed)

- **Report all failures** — every thrown `ApiError` (any status, **including
  401**) **and** network/offline `fetch` rejections. No status filter.
- **Capture network errors** — `fetch()` rejections (offline / DNS / CORS) were
  previously raw `TypeError`s that propagated unreported; they are now caught,
  reported (`status: 0`, `code: 'NETWORK_ERROR'`), and re-thrown unchanged.
- **Always-on loop guard** (not a filter the operator opts out of): the
  telemetry endpoints themselves are excluded so a failed client-errors POST
  cannot report itself into an infinite loop.
- **Aborts excluded** — an `AbortError` is a deliberate cancellation (component
  unmount / debounced refetch), not a failure; skipped.

## What changed

### `apps/web/src/lib/apiClient.ts`
New reporter-injection plumbing mirroring the existing `setSessionExpiredHandler`
pattern (kept apiClient store-agnostic): an exported `ApiClientErrorReport`
interface, a module-global `clientErrorReporter`, `setApiClientErrorReporter(fn)`,
and a private `reportApiFailure(r)` that (a) no-ops when unregistered, (b) drops
any `path` starting `'/api/v1/telemetry/'` (the loop guard), and (c) wraps the
reporter call in try/catch so reporting never breaks the request path.

Inside `request()`:
- the `fetch()` call is now wrapped in try/catch — non-abort rejections are
  reported as `NETWORK_ERROR`/`status 0`, then the **original** error is
  re-thrown (caller behaviour unchanged);
- the `ApiError` throw site builds the error, calls `reportApiFailure` with its
  `code`/`status`/`message`/`method`/`path`, then throws. The existing 401
  `sessionExpiredHandler?.()` call is untouched (401s are now *also* reported).

**Bundle-split constraint preserved.** apiClient does **not** import
`clientErrorLog` — that would create a module cycle (clientErrorLog already
imports `api` from here) and drag the telemetry buffer into always-mounted code,
regressing the showcase split
([ADR 2026-05-21-atlas-showcase-bundle-split](../decisions/2026-05-21-atlas-showcase-bundle-split.md)).
Grep confirms zero `clientErrorLog` import in apiClient.ts (only the explanatory
comment).

### `apps/web/src/app/bootAuthed.ts`
Registers the bridge in the authed-only telemetry block (after
`installGlobalErrorHandlers()`): `setApiClientErrorReporter((r) =>
recordClientError({ source: 'api_client', name, message, context: { code,
status, method, path } }))`. `projectId` is omitted so the active-project
resolver registered just above stamps it. No new bundle edges — both
`clientErrorLog` and `apiClient` were already imported here.

**Deliberately omitted.** `stack` (for `ApiError` it is always the same internal
throw site — uninformative; `method`+`path` already identify the call) and
`details` (avoids leaking response bodies; keeps payloads lean).

## Tests

New `apps/web/src/lib/__tests__/apiClient.clientError.test.ts` (happy-dom,
`fetch` stubbed, spy reporter) — 6 cases, all green:
1. 5xx reported with full `status`/`code`/`method`/`path`;
2. 401 reported (confirms the all-failures policy);
3. network rejection reported (`status 0`, `NETWORK_ERROR`) and original error
   re-thrown (`rejects.toBe(netErr)`);
4. `AbortError` **not** reported, still re-thrown;
5. loop guard — a 500 on `telemetry.postClientErrors` does **not** report;
6. no reporter registered → no second throw.

`tsc` on `apps/web` (8 GB heap) shows only the 3 pre-existing unrelated baseline
errors (StepBoundary.tsx:365, two HostUnion test files) — count unchanged.

## Out of scope / deferred

The two XHR-based throw sites (file upload, `regenerationEvents.uploadMedia`)
are not yet wired — low traffic, separate code paths; `request()` covers the
overwhelming majority. A minor follow-up could route them through the same
`reportApiFailure` helper.

## Push

`004e4ad7` pushed to `feat/atlas-permaculture` with `--force-with-lease` after
fetch/divergence check (`0 1`, clean fast-forward `5418e506..004e4ad7`). The
unrelated economics/financial/showcase working-tree changes were kept out of
the commit (3 files staged by name).

**The client-error telemetry sink is now fully wired — all four `source` values
emit.**
