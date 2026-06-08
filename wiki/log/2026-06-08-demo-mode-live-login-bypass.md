# 2026-06-08 -- Live-site login bypass via per-visitor demo sessions

**Branch.** `feat/structured-capture-forms`.

## Problem

Login on the live site (`atlas.ogden.ag`) is broken, and the operator does not
want a login gate stopping test users from exploring (nor a polished sign-in
wall that overstates readiness). The frontend gate is a trivial
`localStorage['ogden-auth-token']` check, but the **backend enforces JWT on
nearly every data route with no env bypass** -- so removing the frontend gate
alone would drop visitors into an app that 401s everywhere.

## Approach

Behind a build-time flag `FEATURE_DEMO_MODE` (default off; on only for the live
web build), auto-register a unique throwaway account on boot when no token
exists -- reusing the already-open `register` endpoint, so **zero backend
changes**. Operator-confirmed: **auto demo session** (land straight in the app),
**keep login reachable** (`/login` still works for the team), **per-visitor
throwaway accounts** (`guest-<uuid>@demo.ogden.ag`). Full rationale +
deferred items in the ADR.

## Changes

- **NEW `apps/web/src/app/demoSession.ts`** -- `DEMO_MODE_ENABLED`
  (`process.env.FEATURE_DEMO_MODE === 'true'`), `DEMO_EMAIL_DOMAIN`
  (`demo.ogden.ag`), `makeGuestCredentials()` (`crypto.randomUUID()` email +
  random >=8-char password + "Guest Explorer"), `isDemoUser(user)`,
  `maybeBootDemoSession(deps)` (flag-on + no-token -> `register` raced against a
  1500 ms timeout; swallows errors so a down API never blocks boot).
- **`app/bootAuthed.ts`** -- after the existing init/timeout race, calls
  `maybeBootDemoSession` with `getToken`/`register` bound to `useAuthStore`.
- **`app/AppShell.tsx` + `.module.css`** -- three-way header control: demo user
  -> **"DEMO MODE"** badge + **"Sign in"** -> `/login`; real token -> account
  button; else Sign In link. `.demoBadge` warning pill (CSS uppercases).
- **`vite.config.ts`** -- `define` adds
  `'process.env.FEATURE_DEMO_MODE': JSON.stringify(process.env.FEATURE_DEMO_MODE ?? 'false')`.
- **`.env.example`** -- documents `FEATURE_DEMO_MODE=false`.
- **`infrastructure/Dockerfile.nginx`** -- `ARG FEATURE_DEMO_MODE=false` +
  `ENV` in the build stage (threads the flag into `vite build`).
- **`render.yaml`** -- `atlas-web` envVars `FEATURE_DEMO_MODE: "true"` -- **the
  live toggle**.
- **`.claude/launch.json`** -- "web-demo" config (port 5206, flag on).
- **NEW `app/__tests__/demoSession.test.ts`** -- 11 tests
  (`makeGuestCredentials` format/uniqueness, `isDemoUser`,
  `maybeBootDemoSession` flag/token/error paths).

The change is entirely flag-gated, so **OFF == original landing/login behavior
by construction** (terser dead-code-eliminates the demo path when the constant
folds false).

## Verification

Two fresh production builds (`vite build`, 8 GB heap), previewed with a
**temporary** `preview.proxy` (`/api` + `/uploads` -> `:3001`, reverted after).

- **Bundle fold:** ON build -> `DEMO_MODE_ENABLED` = `!0` (true) beside
  `ld="demo.ogden.ag"`; OFF build -> `qe=!1` (false); 0 unreplaced
  `process.env.FEATURE_DEMO_MODE` survivals in either.
- **Demo ON E2E** (clear token, reload): auto-registered, JWT
  `guest-1751947b-...@demo.ogden.ag` (exp 2026-06-15, 7-day), landed
  `/v3/portfolio` (no login wall), header **DEMO MODE** badge + **Sign in**,
  4 projects incl. **351 House -- Atlas Sample (12 ha)** with map markers (no
  401s) -- **screenshot captured**.
- **Demo OFF regression** (dedicated OFF build, clear token, reload):
  `token=false` (no auto-register), landed on the public landing page
  ("Know the land before you buy it."), no DEMO MODE badge -- **screenshot
  captured**; original gate intact.
- 11 unit tests pass (bounded `--pool=forks --test-timeout=15000`,
  [[feedback-vitest-bounded-runs]]); web `tsc --noEmit` clean (8 GB heap; atlas
  `lint` == typecheck, no ESLint).

Note: the heavy Cesium **dev** server remains too flaky to screenshot reliably
([[project-screenshot-hang]]); both screenshots are off the lighter
`vite preview` of the prod build.

## Deferred

DB cleanup job for accumulating `@demo.ogden.ag` users; optional backend guard
to skip verification email to the demo domain; the underlying real-login fix.

## Amanah

Access/onboarding mechanism only -- no sale, advance purchase, financing, or
CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]]).

## ADR

[[decisions/2026-06-08-atlas-demo-mode-per-visitor-sessions]]; entity
[[entities/web-app]].
