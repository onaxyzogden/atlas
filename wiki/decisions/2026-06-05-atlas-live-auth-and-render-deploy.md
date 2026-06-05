# ADR: Live-site auth (email verification + password reset) on a Render full-stack deploy

**Date:** 2026-06-05
**Status:** accepted

**Context:**
The operator asked to "get live site sign-ups and login sorted" for
atlas.ogden.ag. Investigation found the auth *code* (register / login / `GET
/me` / JWT / bcrypt / session-expiry) already complete and tested, but two gaps
blocked real users:

1. **Nothing was deployed.** The only wired deploy path was
   `.github/workflows/deploy.yml` → GitHub Pages, which ships *only* the static
   SPA with no backend. The frontend calls **relative** `/api/v1/...` URLs
   (`apiClient.ts`), so on Pages every auth call 404s. A full-stack VPS blueprint
   (`infrastructure/DEPLOY.md` + `docker-compose.prod.yml`) existed but was never
   stood up.
2. **Public signup was incomplete** — no email verification, no forgot/reset
   password.

Operator decisions captured up front (AskUserQuestion): deploy the **whole stack
to a managed platform**; **nothing is provisioned yet** (prepare in-repo config +
an operator runbook — Claude cannot provision cloud infra); "sorted" **includes**
email verification + password reset.

**Decision:**

1. **Platform: Render, via an in-repo `render.yaml` Blueprint.** Maps ~1:1 onto
   `docker-compose.prod.yml`: managed `atlas-postgres` (PG16/PostGIS, paid
   `basic-256mb`), managed `atlas-redis` (keyvalue, `maxmemoryPolicy:
   noeviction` for BullMQ), private `atlas-api` (Docker, non-suspending so the
   BullMQ workers + WS pub/sub subscriber that start in `onReady` keep running),
   public `atlas-web`. Render chosen because it is the only candidate giving a
   managed Postgres the app role can `CREATE EXTENSION postgis` on **and** a
   managed Redis with an internal URL. **Fly.io rejected** —
   `apps/api/src/plugins/redis.ts` hardcodes `family: 4` (IPv4) and Fly's
   internal net is IPv6-only.

2. **Single public nginx front door.** `atlas-web` serves the baked SPA **and**
   reverse-proxies `/api` to the private `atlas-api`. This preserves the
   relative-URL frontend with **zero frontend change** (also keeps the PWA
   `/^\/api\/.*/` SW cache and `/api/v1/ws/*` WebSockets same-origin). A
   `VITE_API_URL` base is the documented fallback only, not used.

3. **Email: a transport abstraction, console default.** `lib/email/` selects
   `console` (logs links to stdout — fully verifiable locally, no account) or
   `resend` (plain `fetch`, no new dependency). All new env vars are
   **defaulted**, so existing `.env`/CI boot unchanged; if `resend` is selected
   but the key is missing it **falls back to console with a warning** (fail-soft,
   mirroring the GAEZ/SoilGrids absent-disabled pattern). Mail send on register
   is **post-commit + try/catch** so a mail failure never 500s registration.

4. **Soft verification gate.** Login is allowed for unverified users;
   `email_verified` is surfaced as a *flag*, not a wall. Migration 054
   grandfathers all existing users (`email_verified = true WHERE created_at <
   now()`); only new signups start unverified. This preserves the deliberate
   anti-enumeration login posture and the local-first/offline design. A
   hard/per-feature gate can layer on later with no schema change.

5. **Hard constraint — token failures are 400 `INVALID_TOKEN`, never 401.** A
   401 with code `UNAUTHORIZED`/`INVALID_TOKEN` triggers the global
   session-expiry logout at `apiClient.ts:237`, which would log a user out on a
   bad/expired verify or reset link. `assertTokenUsable()` throws
   `AppError('INVALID_TOKEN', …, 400)`.

6. **Anti-enumeration on request endpoints.** `verify-email/request` and
   `forgot-password` **always** return generic `200 { sent: true }` regardless of
   whether the address exists.

**Implementation notes / gotchas resolved:**

- **Migrations path.** `migrate.ts` resolves `MIGRATIONS_DIR =
  resolve(__dirname, 'migrations')`, i.e. `dist/db/migrations` once compiled, but
  `tsc` does not emit `.sql` files. `Dockerfile.api` previously copied them to
  `src/db/migrations`. Fixed: copy to `dist/db/migrations` so the Render
  `preDeployCommand: node dist/db/migrate.js` (run in the image WORKDIR
  `/app/apps/api`) finds them. Managed Postgres has no
  `docker-entrypoint-initdb.d` hook, so migrations run **only** via this
  idempotent `preDeployCommand` each deploy.

- **SPA build in Docker.** `Dockerfile.nginx` runs `vite build` **directly**
  (`pnpm --filter @ogden/web exec vite build`), bypassing the package `build`
  script's `postbuild` showcase prerender, which launches Playwright/Chromium
  (uninstallable in the slim image). Sets `NODE_OPTIONS=--max-old-space-size=7168`
  (Cesium/MapLibre bundling is memory-hungry). The SPA is **baked into the nginx
  image** because Render has no cross-service shared volumes (folds the compose
  `web`+`nginx` two-step into one image).

- **Deviation from plan: nginx config.** The plan said modify
  `infrastructure/nginx/conf.d/default.conf` (upstream `atlas-api:3001`, listen
  on Render `$PORT`, drop certbot/443). That file is **dual-use** — compose
  mounts it verbatim with upstream `api:3001` on `:80`/`:443`. Mutating it would
  break the (deprecated-but-kept) compose path and can't carry a `${PORT}`
  placeholder (compose runs no envsubst). Instead created a **dedicated**
  `infrastructure/nginx/render-default.conf.template`, copied into
  `/etc/nginx/templates/default.conf.template` so the nginx:alpine entrypoint
  runs envsubst (only `${PORT}`, via `NGINX_ENVSUBST_FILTER=PORT`). Render edge
  health check hits a static `/healthz` (decoupled from API health); `/health`
  still proxies to the API for the runbook's end-to-end check. Compose's
  `default.conf` left untouched.

- **GitHub Pages disabled, not deleted.** `deploy.yml` → `deploy.yml.disabled`
  (GitHub ignores non-`.yml` files) with a header explaining why and how to
  re-enable.

**Consequences:**
- A real person can register → receive a verify link → confirm (auto-signs in) →
  forgot → reset → log in, all on managed infra, once the operator runs the
  `infrastructure/DEPLOY-RENDER.md` runbook (sign up, connect repo, fill
  `sync:false` secrets, confirm PostGIS, first deploy, add CNAME).
- Object-storage (`S3_*`) remains optional but **recommended** — unset means
  proof photos/exports write to ephemeral container disk and vanish on redeploy.
- Email only delivers once the `ogden.ag` sender domain is verified in Resend;
  until then registration still succeeds (fail-soft) and links log to API stdout.

**Amanah:** authentication + transactional email + infra config only. No
sales/finance instrument, no riba/gharar, no CSRA/advance-purchase surface. Clean.

**Verification at decision time:** API auth suite 22/22, touched web tests 11/11
(bounded `--pool=forks`), web `tsc` exit 0, API `tsc` clean, `render.yaml` valid
YAML. Docker image builds NOT run locally (Docker Desktop daemon down) — operator
validates on Render's first deploy. Local end-to-end auth walkthrough deferred
(needs a running Postgres + both dev servers).

Related: [[2026-06-05-olos-watermark-and-record-rev-parity]] (same-day sync work,
unrelated surface).
