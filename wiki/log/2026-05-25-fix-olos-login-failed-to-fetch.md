# 2026-05-25 — fix(ops): OLOS login "Failed to fetch" — API down + DB behind

**Type:** operational / debugging (no source changes)
**Branch:** feat/atlas-permaculture

## Symptom
Login to OLOS failed in the browser with `TypeError: Failed to fetch`.

## Root cause
The Fastify **API was not running on port 3001** (`ECONNREFUSED`, `/health` timed out). The frontend calls the relative path `/api/v1/auth/login`, which Vite's dev proxy forwards to `http://localhost:3001` (`apps/web/vite.config.ts`). With no backend listening, the request got no response.

Why the wording was the raw `Failed to fetch` rather than the proxy's friendly `503 API_OFFLINE`: the user's browser tab was on a **dead origin**. The standard web port **5200 was also down** (the only live web instance was a `web-5201` parallel session). A request to a dead origin returns nothing → `apiClient` re-throws the raw fetch error (`apps/web/src/lib/apiClient.ts:156-170`). Verified: hitting the *live* 5201 proxy with the API down returns a clean `503 API_OFFLINE`, confirming the user was not on 5201.

Contributing factor: the live DB (`localhost:5432`) was 4–5 migrations behind during diagnosis; `apps/api/src/index.ts` does **not** migrate on boot and the `api` launch profile runs plain `npm run dev`, so it won't self-heal.

## Red herring — two Postgres on 5432
`docker exec ogden-postgres psql` reported the DB at migration 037, but `pnpm migrate` (over `DATABASE_URL` → `localhost:5432`) showed 038–041 already applied and applied 042. Cause: a **native Windows `postgresql-x64-17` service** is bound to `localhost:5432` and is the DB the API actually uses; the docker `ogden-postgres` container is stale and shadowed. Documented in [[entities/database]] (Local dev gotcha). Future DB-state checks must go over TCP via `DATABASE_URL`, not `docker exec`.

## Fix (operational)
1. Applied pending migrations via `node --env-file=.env --import=tsx src/db/migrate.ts` — `042_fix_farm_project_type` applied cleanly; real DB now at 042.
2. Started the API (`node --env-file=.env --import=tsx --watch src/index.ts`) — clean boot, PostgreSQL + Redis connected, `OGDEN API running on port 3001`, `/health` → 200.
3. Started the web dev server on 5200 (`vite --port 5200 --strictPort`).

## Verification
- API direct: `GET /health` → 200; `POST /api/v1/auth/login` (bad creds) → 401.
- Proxy on 5200: login request reaches the API (401/429 app responses, no more `API_OFFLINE`).
- Browser (preview on 5200): login page renders; an in-page `fetch('/api/v1/auth/login')` with bad creds returns a real `401 {"code":"UNAUTHORIZED","message":"Invalid email or password"}` — i.e. **no more "Failed to fetch"**; the backend is reachable and authenticating.

## Notes / deferred
- No source code changed — the bug was purely operational (stack not up + DB behind).
- The proxy's `API_OFFLINE` 503 only protects users on a *live* web origin; a stale tab / offline-PWA cache (`FEATURE_OFFLINE=true`) on a dead origin still shows raw `Failed to fetch`. Not changed; flagged for awareness.
