# 2026-05-21 — Atlas Vite dev proxy translates upstream failures into the API envelope

**Status:** accepted
**Branch:** `feat/atlas-permaculture`
**Owner:** Claude (verification with @yousef)

## Context

`POST /api/v1/auth/register` from the login page on `http://localhost:5200`
surfaced the error string `Response not JSON (500)` — produced by
[apps/web/src/lib/apiClient.ts](../../apps/web/src/lib/apiClient.ts) when
`response.json()` throws. The API's global error handler in
[apps/api/src/app.ts](../../apps/api/src/app.ts) *always* sends
`Content-Type: application/json` and the
`{ data: null, error: { code, message } }` envelope, so a non-JSON 500 is
impossible from the API itself.

The actual producer was Vite's dev proxy in
[apps/web/vite.config.ts](../../apps/web/vite.config.ts), which forwards
`/api/*` and `/uploads/*` to `http://localhost:3001`. When the API process
isn't listening (`ECONNREFUSED`), `http-proxy` emits a plain-text/HTML
`500 Internal Server Error`, which `apiClient.ts` cannot parse.

The misleading symptom routinely confused operators into looking for an auth
bug when the real problem was an offline API process.

## Decision

Add an `onError` translator to the `/api` proxy entry in
[apps/web/vite.config.ts](../../apps/web/vite.config.ts) that intercepts
upstream connection failures and emits a `503` response carrying the **same
envelope shape the API itself uses** for errors:

```json
{
  "data": null,
  "error": {
    "code": "API_OFFLINE",
    "message": "API server unreachable at http://localhost:3001 (<errno>). Start it with:  pnpm --filter @ogden/api dev"
  }
}
```

`apiClient.ts` parses this without special-casing, surfaces it as a normal
`ApiError(code='API_OFFLINE', status=503)`, and the LoginPage's
`role="alert"` banner renders the actionable instruction verbatim.

## Why not other layers

- **Fix in apiClient.ts** — wrong seam; would baked the "API down" diagnosis
  into client code for a problem that is purely a *dev-environment* concern.
  Proxy onError is the smallest correct cut.
- **Retry/backoff** — masks the real problem (operator forgot to start the
  API); slows feedback.
- **Block the Vite server from booting without an API** — too coupling;
  developers sometimes run the web app alone against a remote API.

## Out of scope / not changed

- No edits to the register/login routes
  ([apps/api/src/routes/auth/index.ts](../../apps/api/src/routes/auth/index.ts))
  — they were never the defect.
- No new migrations, no schema changes, no seed scripts.
- `/uploads` proxy entry left untouched (low value; same fallback could be
  added in a future pass if a similar miscue ever appears).

## Verification

1. Stopped API. `POST /api/v1/auth/register` via in-page `fetch()` →
   `503` + the `API_OFFLINE` envelope above.
2. Submitted the Create Account form. LoginPage `[role="alert"]` rendered
   the exact instruction string.
3. Started the API. Same call → `201` + `{ token, user }` envelope.
4. Console error stream flipped from `ApiError: Response not JSON (500)` to
   `ApiError: API server unreachable at http://localhost:3001 (ECONNREFUSED).
   Start it with:  pnpm --filter @ogden/api dev` at the moment Vite picked
   up the config change.

## Note on message format

First iteration of the message used backticks around the command
(`` `pnpm --filter @ogden/api dev` ``). When the operator copy-pasted the
banner text into PowerShell, the backticks were parsed as PowerShell's
line-continuation/escape character and the parenthesized `(ECONNREFUSED)`
as a sub-expression call, producing
`The term 'ECONNREFUSED' is not recognized…`. Removed the backticks; message
now reads `Start it with:  pnpm --filter @ogden/api dev` — copy-paste-safe.

## References

- [apps/web/vite.config.ts](../../apps/web/vite.config.ts) — `server.proxy['/api'].configure`
- [apps/web/src/lib/apiClient.ts](../../apps/web/src/lib/apiClient.ts) — JSON parser that surfaces the envelope
- [apps/api/src/app.ts](../../apps/api/src/app.ts) — `setErrorHandler` envelope shape (mirrored)
- [apps/web/src/pages/LoginPage.tsx](../../apps/web/src/pages/LoginPage.tsx) — `role="alert"` banner
