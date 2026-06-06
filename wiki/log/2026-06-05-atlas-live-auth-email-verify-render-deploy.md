# 2026-06-05 — Live-site signup/login: email verification + password reset, and Render full-stack deploy config

**Objective:** "Get live site sign-ups and login sorted" for atlas.ogden.ag.

**Outcome:** Two workstreams landed in one verified commit (`b7388989`, not
pushed). The auth *code* was already complete/tested; the real blockers were that
**nothing was deployed** (GitHub Pages ships a backend-less SPA → relative
`/api/v1/...` calls 404) and **public signup lacked email verification +
forgot/reset**. ADR: [[decisions/2026-06-05-atlas-live-auth-and-render-deploy]].

## Phase 1 — Auth feature (backend)
- **Migration 054**: `users.email_verified` (existing users grandfathered to
  `true`) + hashed-token tables `email_verification_tokens` /
  `password_reset_tokens` (sha256 of `randomBytes(32).base64url`; raw token only
  in the email link).
- **`lib/authTokens.ts`** (`generateToken`/`hashToken`, TTLs verify-24h /
  reset-1h); **`lib/email/`** (console default + Resend `fetch` transport,
  fail-soft fallback, links from `APP_PUBLIC_URL`); **`config.ts`** +4 defaulted
  env vars (`EMAIL_TRANSPORT`/`RESEND_API_KEY`/`EMAIL_FROM`/`APP_PUBLIC_URL`).
- **`routes/auth/index.ts`**: `/register` issues+sends a verify token
  **post-commit** (try/catch, never 500s register); new `verify-email/request`,
  `verify-email/confirm` (auto-signs-in on success), `forgot-password`,
  `reset-password`. `assertTokenUsable()` throws **400 `INVALID_TOKEN`** (never
  401 — a 401 trips the global session-expiry logout at `apiClient.ts:237`).
  Request endpoints **always** return generic `200 { sent: true }`
  (anti-enumeration). Soft gate: login allowed when unverified.
- **22/22** bounded vitest green (`src/tests/auth.test.ts`); API `tsc` clean.

## Phase 2 — Auth feature (frontend)
- **`apiClient.ts`** `ApiAuthUser.emailVerified` + 4 methods;
  **`authStore.ts`** `emailVerified` flowed through login/register/init + 4 thin
  actions (`resendVerification`/`confirmVerification`/`forgotPassword`/`resetPassword`).
- **New public pages** (reuse `LoginPage.module.css`): `VerifyEmailPage`
  (confirms `?token` on mount, StrictMode-guarded, auto-redirects),
  `ForgotPasswordPage` (always "if an account exists…"), `ResetPasswordPage`
  (`?token` + confirm field, no auto-login → routes to /login).
- **`routes/index.tsx`** registered `/verify-email`, `/forgot-password`,
  `/reset-password` as **public** routes under `rootRoute`; `LoginPage` got a
  "Forgot password?" link; `RegisterPage` shows a "we sent a verification link"
  note before landing on /home.
- Three existing test fixtures gained `emailVerified: true` (the only thing the
  web `tsc` flagged after the apiClient change). Web `tsc` exit 0; touched web
  tests **11/11** bounded.

## Phase 3 — Managed deploy config (Render)
- **`render.yaml`** Blueprint: `atlas-postgres` (PG16/PostGIS, `basic-256mb`),
  `atlas-redis` (keyvalue, `noeviction`), private `atlas-api` (Docker,
  `preDeployCommand: node dist/db/migrate.js`, non-suspending), public
  `atlas-web` (Docker nginx, domain `atlas.ogden.ag`). Secrets `sync:false`;
  `JWT_SECRET` generated; `DATABASE_URL`/`REDIS_URL` from service refs.
- **`Dockerfile.nginx`**: builds the SPA with `vite build` **direct** (skips the
  Playwright `postbuild` prerender), `NODE_OPTIONS=--max-old-space-size=7168`,
  bakes `dist` into `nginx:1.27-alpine` (Render has no shared volumes).
- **`Dockerfile.api`**: fixed the migrations COPY to `dist/db/migrations` (the
  compiled runner's path; `tsc` doesn't emit `.sql`).
- **`nginx/render-default.conf.template`** (new, NOT the dual-use compose
  `default.conf`): upstream `atlas-api:3001`, `listen ${PORT}` via envsubst
  (`NGINX_ENVSUBST_FILTER=PORT`), static `/healthz`, `/api` + WS proxy, SPA
  fallback, no certbot/443. Compose `default.conf` left untouched. ⚠ **Deviation
  from the approved plan**, which named the compose file — flagged in the ADR.
- **`deploy.yml` → `deploy.yml.disabled`** (GitHub Pages, backend-less; kept for
  reference with a header explaining the swap).
- `render.yaml` validates as YAML. **Docker image builds NOT run** — Docker
  Desktop daemon down; operator validates on first Render deploy.
  *(Superseded — see the addendum below: both images now build, boot, and serve
  locally.)*

## Phase 4 — Operator runbook
- **`infrastructure/DEPLOY-RENDER.md`**: services table, secrets table (incl.
  the Resend `ogden.ag` sender-domain verification step), Blueprint apply,
  pre-create PostGIS in the Render PSQL shell, watch `preDeployCommand`
  migrations, add the `atlas` CNAME, keep the API non-suspending, end-to-end
  verification, troubleshooting + rollback + a Railway cost-down note.

## Addendum — Docker build gate closed + e2e auth (later, 2026-06-05)
With a live Docker daemon + local Postgres, the two deferred gates are now
**closed** — surfacing 6 latent build defects (none would have built on Render).
Full detail in the ADR amendment ([[decisions/2026-06-05-atlas-live-auth-and-render-deploy]]).
- **e2e auth vs real Postgres:** register→verify→forgot→reset→login + all
  negatives (400 `INVALID_TOKEN`, 422, generic-200) ✓.
- **API image:** fixed `.dockerignore` (node_modules symlink), `@types/geojson`
  + `fastify-plugin` + `@types/ws` phantom deps, `tsconfig.base.json` context
  copy; **adopted esbuild bundling** (`apps/api/esbuild.mjs`) so `node dist`
  resolves `@ogden/shared` (was `ERR_UNKNOWN_FILE_EXTENSION` on its `.ts`
  source). Boots; `node dist/db/migrate.js` vs real DB → exit 0 (preDeploy path).
- **nginx image:** fixed the same `tsconfig.base.json` copy + declared
  `react-router-dom@^7.15.0` (undeclared, hoist-only). Builds (125 MB), serves
  `/healthz` 200, SPA index, deep-link fallback; `/api` proxy wired. ⚠ nginx
  resolves the `atlas-api` upstream at boot — fine on Render, flagged for runbook.

## Deferred / next
- **Operator:** run `DEPLOY-RENDER.md` (provision Render, fill secrets, verify
  Resend domain, point DNS). Claude cannot provision.
- Optional: hard/per-feature verification gate; S3/R2 creds to avoid ephemeral
  upload storage; nginx request-time `resolver` hardening for the upstream
  cold-start hazard.

**Amanah:** auth + transactional email + infra only; no sales/finance
instrument, no CSRA surface — clean.

**Commit `b7388989`** (27 files, +1628/−17), not pushed
([[project-branch-rebase]] caution: current branch
`merge/atlas-permaculture-to-main-2026-06-05`).
