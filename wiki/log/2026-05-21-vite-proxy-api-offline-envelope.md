# 2026-05-21 — fix(web): Vite dev proxy translates ECONNREFUSED into API_OFFLINE envelope

**Branch.** `feat/atlas-permaculture`.

**Symptom.** Operator on `http://localhost:5200/login` saw `Response not JSON
(500)` on Create Account. That string is produced by `apiClient.ts:115` when
`response.json()` throws — i.e. body wasn't JSON.

**Diagnosis.** API's global error handler at `apps/api/src/app.ts:157-194`
*always* sends `Content-Type: application/json` + the
`{ data, error }` envelope, so a non-JSON 500 cannot come from the API.
Direct probes confirmed nothing was listening on port 3001
(`Test-NetConnection` empty, `Invoke-RestMethod http://localhost:3001/health`
→ "Unable to connect to the remote server"). The 500 was being produced by
**Vite's dev proxy** in `apps/web/vite.config.ts` returning a plain-text
`500 Internal Server Error` body for the `ECONNREFUSED` it got from the dead
upstream.

**Fix.** Added a `configure` callback to the `/api` proxy entry that listens
for `proxy.on('error', ...)` and writes a `503` carrying the API's own
envelope shape:

```json
{ "data": null, "error": { "code": "API_OFFLINE",
  "message": "API server unreachable at http://localhost:3001 (<errno>). Start it with:  pnpm --filter @ogden/api dev" } }
```

`apiClient.ts` flows that through unchanged, the auth store sets `error`, and
the LoginPage `[role="alert"]` banner shows the actionable instruction.

**Iteration.** First draft of the message used backticks (`` `pnpm …` ``)
around the command. The operator copy-pasted the banner text into PowerShell;
backticks were parsed as line-continuation and `(ECONNREFUSED)` as a
sub-expression call. Removed the backticks; message is now plain-text
copy-paste safe.

**Verified end-to-end in the live preview.**
- With API stopped: `POST /api/v1/auth/register` from in-page `fetch()` →
  `503` + `API_OFFLINE` envelope; LoginPage banner DOM contained the exact
  string `API server unreachable at http://localhost:3001 (ECONNREFUSED).
  Start it with:  pnpm --filter @ogden/api dev`.
- Console error feed showed the cutover at the moment Vite picked up the
  config change: prior `ApiError: Response not JSON (500)` lines stopped,
  subsequent `[SYNC] Initial sync failed` errors carried the new actionable
  message.
- With API started: same register call → `201` + `{ token, user }`. No
  behavior change to the auth handlers themselves.

**Out of scope.** No edits to `apps/api/src/routes/auth/index.ts`, no new
migrations, no dev-seed-user script (explicitly declined by operator —
permanent fix only).

**Files.**
- `apps/web/vite.config.ts` — proxy `configure` + `onError` handler.
- `wiki/decisions/2026-05-21-atlas-vite-proxy-api-offline-envelope.md` — ADR.

**Plan.** `~/.claude/plans/need-credentials-to-login-compressed-bentley.md`.
