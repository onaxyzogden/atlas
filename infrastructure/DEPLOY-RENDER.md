# OGDEN Atlas — Render Deployment Runbook

Deploy the full Atlas stack (API + SPA + Postgres/PostGIS + Redis + reverse
proxy) to **Render** from the in-repo [`render.yaml`](../render.yaml) Blueprint.
Everything below is operator work that runs in the Render dashboard / DNS — the
repo already carries all the config.

> **Why Render (not GitHub Pages):** Pages ships *only* the static SPA. The
> frontend calls relative `/api/v1/...` URLs, so on Pages every auth call 404s.
> The old `deploy.yml` is disabled (`.yml.disabled`). Render runs the whole
> stack behind one public nginx that serves the SPA and proxies `/api` to a
> **private** API service — so the frontend needs zero changes.

---

## What the Blueprint creates

| Service | Type | Public? | Notes |
|---|---|---|---|
| `atlas-postgres` | Managed Postgres 16 | No (internal) | PostGIS; `basic-256mb` (paid — free DB expires ~30d). |
| `atlas-redis` | Key Value (Redis) | No (internal) | `maxmemoryPolicy: noeviction` for BullMQ. |
| `atlas-api` | Private service (Docker) | **No** | Fastify; reached only as `atlas-api:3001`. Runs DB migrations on each deploy. |
| `atlas-web` | Web service (Docker) | **Yes** | nginx: serves the SPA + proxies `/api`. Custom domain `atlas.ogden.ag`. |

All services pin `region: oregon`. **Keep them in the same region** — internal
networking (`atlas-api:3001`, internal DB/Redis URLs) only resolves within one
region. To move regions, change `region:` on every entry in `render.yaml`.

---

## 1. Prerequisites

- A [Render](https://render.com) account with a payment method (Postgres +
  Redis + non-suspending API are paid).
- Render connected to the **`onaxyzogden/atlas`** GitHub repo.
- Control of DNS for **`ogden.ag`** (to add the `atlas` CNAME).
- Secrets collected up front (next step).

## 2. Collect secrets

You'll paste these into the dashboard after the first apply (they're `sync:false`
in the Blueprint, so they're never committed):

| Secret | Used by | Required? | Where to get it |
|---|---|---|---|
| `RESEND_API_KEY` | atlas-api | **Yes** (email verify + reset) | [resend.com](https://resend.com) → API Keys. Verify the `ogden.ag` sender domain there too. |
| `MAPTILER_KEY` | atlas-api | Yes (map tiles) | [maptiler.com](https://www.maptiler.com) account. |
| `VITE_MAPTILER_KEY` | atlas-web (build) | Yes | Same MapTiler key (inlined into the SPA bundle). |
| `VITE_CESIUM_ION_TOKEN` | atlas-web (build) | Yes (3D terrain) | [cesium.com/ion](https://cesium.com/ion) → Access Tokens. |
| `ANTHROPIC_API_KEY` | atlas-api | Optional (AI features) | console.anthropic.com. |
| `S3_BUCKET` / `S3_REGION` / `S3_ENDPOINT` | atlas-api | Recommended | Any S3-compatible bucket (R2, Supabase, AWS). **If unset, uploaded proof photos/exports write to container disk and vanish on every redeploy.** |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | atlas-api | Optional | Only if using Supabase storage. |

> `JWT_SECRET` is **auto-generated** by Render (`generateValue: true`) — do not
> set it. `EMAIL_TRANSPORT=resend`, `EMAIL_FROM`, `CORS_ORIGIN`, and
> `APP_PUBLIC_URL` are baked into `render.yaml`.

> **Email sender note:** `EMAIL_FROM` is `OGDEN Atlas <noreply@ogden.ag>`.
> Resend will only deliver from a **verified** domain — verify `ogden.ag` in
> Resend (add its DKIM/SPF records to DNS) before expecting real mail. Until
> then, registration still succeeds (mail send is post-commit, fail-soft) but
> the verification email won't arrive.

## 3. Create the Blueprint

1. Push the deploy branch (the one carrying `render.yaml`) to GitHub.
2. Render dashboard → **New** → **Blueprint**.
3. Pick the **`onaxyzogden/atlas`** repo and the **deploy branch**.
4. Render parses `render.yaml` and shows the 1 database + 3 services. **Apply**.
5. When prompted, fill every `sync:false` secret from step 2. (You can also set
   them later under each service → **Environment**.)

## 4. Confirm PostGIS before the first migration

`001_initial.sql` runs `CREATE EXTENSION postgis / uuid-ossp / pg_trgm`. These
are on Render's allowlist, but pre-creating them removes any first-deploy race.

Open **atlas-postgres → Connect → PSQL Command**, run it, then:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
SELECT postgis_full_version();
```

All three are `IF NOT EXISTS`, so this is a safe no-op if they already exist.

## 5. First deploy & migrations

The API service's **`preDeployCommand`** runs the idempotent migration runner
(`node dist/db/migrate.js`) before each deploy goes live.

- Watch **atlas-api → Logs** (or the **Events** tab) for the pre-deploy step.
- Success looks like `N migration(s) applied successfully.` (or `All
  migrations already applied.` on later deploys). Migration `054` adds
  `email_verified` + the verification/reset token tables.
- If pre-deploy fails, the new version does **not** go live — fix and redeploy.

> Managed Postgres has no `docker-entrypoint-initdb.d` hook, so migrations
> **only** run via this `preDeployCommand`. That's expected — don't look for an
> init-script run.

## 6. Custom domain + TLS

1. **atlas-web → Settings → Custom Domains** → add `atlas.ogden.ag`.
2. Render shows a CNAME target like `atlas-web-xxxx.onrender.com`.
3. In `ogden.ag` DNS, add: `atlas` **CNAME** → that target.
4. Wait for DNS to propagate; Render auto-issues a TLS cert (terminated at its
   edge — that's why the nginx config has no certbot/443 block).

## 7. Keep the API non-suspending

`atlas-api` is `plan: starter` (not free) on purpose: BullMQ workers and the
Redis pub/sub WebSocket subscriber start in the app's `onReady`. A suspending
free instance would drop background jobs and live WS updates. Don't downgrade it
to a plan that spins down.

## 8. End-to-end verification

Once `atlas-web` is live with its cert:

1. `https://atlas.ogden.ag/healthz` → `ok` (static nginx health).
2. `https://atlas.ogden.ag/health` → API health JSON (proves the proxy reaches
   `atlas-api`).
3. `https://atlas.ogden.ag/api/v1/health` → `{ data: … }` envelope.
4. **Register** a real account on the site → a verification email arrives (once
   the Resend domain is verified) → click the link → lands on `/verify-email`
   and auto-signs-in as verified.
5. **Forgot password** → reset email → `/reset-password` → set a new password →
   sign in with it. A stale/expired reset link shows an in-page error and does
   **not** force-logout (it returns 400, not 401).
6. Open a project → the map loads (MapTiler tiles + Cesium terrain, both baked
   into the SPA bundle at build time).
7. **atlas-api → Logs** show the BullMQ workers and WS subscriber started
   (confirms Redis is wired).

## 9. Verify per-IP rate limiting (TRUST_PROXY)

The unauthenticated portal routes are capped per **client IP**
(`PORTAL_PUBLIC_RATE_LIMIT_MAX` = 60/min, `PORTAL_PDF_RATE_LIMIT_MAX` = 10/min).
Those caps are only real if Fastify recovers the true client IP from
`X-Forwarded-For` — which depends on `TRUST_PROXY` matching the actual proxy hop
count (`render.yaml` sets it to `"2"` for `client → Render edge → nginx → api`).
**If the hop count is wrong, every visitor collapses into one shared bucket — an
ineffective limit AND a self-DoS vector.** Verify it post-deploy, before relying
on the limit:

1. From **two distinct client IPs** (e.g. your machine + a phone on cellular, or
   two different networks), hit the same public portal endpoint:
   `GET https://atlas.ogden.ag/api/v1/portal/{shareToken}`.
2. Hammer it past 60 requests/min from **one** IP — that IP should start getting
   `429 Too Many Requests` while the **other** IP still succeeds. Two independent
   buckets ⇒ `TRUST_PROXY` is correct.
3. If the second IP is **also** throttled (one shared bucket) the real client IP
   is masked: adjust `TRUST_PROXY` on **atlas-api** (try `"1"` or `"3"`, no code
   change — see the note in `render.yaml`) and redeploy, then re-test.

> Confirm the hop count against live request logs rather than assuming "2": too
> few hops → everyone shares the proxy bucket; too many → a client can spoof
> `X-Forwarded-For` to dodge the limit.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Web build fails OOM | Cesium/MapLibre bundling is heavy. `Dockerfile.nginx` already sets `NODE_OPTIONS=--max-old-space-size=7168`; if it still OOMs, bump the build plan. |
| `preDeployCommand` can't find migrations | The runner resolves `dist/db/migrations`. `Dockerfile.api` copies the `.sql` files there (tsc doesn't emit them). Don't move that COPY. |
| Auth calls 404 on the live site | The `/api` proxy isn't reaching `atlas-api`. Check the nginx upstream is `atlas-api:3001` and both services share a region. |
| `atlas-web` crash-loops with `nginx: [emerg] host not found in upstream "atlas-api:3001"` | nginx resolves the upstream hostname **at boot**; if `atlas-api`'s private DNS isn't registered yet (e.g. web deployed before the API service existed), nginx refuses to start. Normally self-heals once `atlas-api` is up — redeploy `atlas-web`. Permanent fix if it recurs: a request-time `resolver 127.0.0.11;` + variable `proxy_pass` in `render-default.conf.template` (defers resolution to request time). |
| Verification/reset email never arrives | Resend domain not verified, or `RESEND_API_KEY` unset → API falls back to the **console** transport (logs the link to **atlas-api → Logs** instead of sending). Registration still succeeds. |
| Users logged out on a bad reset link | Should not happen — token failures return 400 `INVALID_TOKEN`. A 401 would trip the global session-expiry logout. If seen, the API is mis-returning 401. |
| Uploads disappear after redeploy | `S3_*` not set — storage fell back to ephemeral container disk. Set S3/R2 creds. |
| Can't `CREATE EXTENSION postgis` | Run step 4 in the Render PSQL shell; the migration's `IF NOT EXISTS` then no-ops. |

## Rollback

Render keeps prior deploys: **atlas-web / atlas-api → Deploys → Rollback**. DB
migrations are forward-only (`054` is additive — a new column + two new tables —
so rolling the API back to a pre-054 image is safe; the extra column/tables are
simply unused).

## Cost-down alternative

If the paid Postgres/Redis cost is unwanted, the same Blueprint shape ports to
**Railway** with minimal edits (managed PG+PostGIS and Redis, single public
proxy). Say the word and this runbook can be re-cut for Railway.
