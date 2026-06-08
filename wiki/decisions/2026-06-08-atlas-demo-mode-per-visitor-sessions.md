# ADR: Live-site login bypass via per-visitor auto-registered demo sessions

**Date:** 2026-06-08
**Status:** accepted

**Context:**
Login on the live site (`atlas.ogden.ag`) is broken, and the operator does not
want a login gate between test users and the app -- both because it blocks
exploration and because a polished sign-in wall makes the product look more
"ready" than it is. The forward goal: a visitor lands already inside a working,
browsable app, while real login stays reachable for the team.

The frontend gate is trivially removable (a `localStorage['ogden-auth-token']`
check in the router `beforeLoad`), but the **backend enforces JWT on nearly
every data route with no env bypass**. Removing only the frontend gate would
drop visitors into an app that 401s everywhere -- *more* broken, not less.

What makes a clean fix possible: registration (`POST /api/v1/auth/register`) is
already open, self-serve, has no hard email-verification gate, and returns a
7-day JWT. A rich sample project ("351 House -- Atlas Sample") is already
auto-hydrated into the store on every boot, so a fresh account immediately has
something to explore.

**Decision:**
Behind a **build-time flag `FEATURE_DEMO_MODE`** (default `false`; `true` only
on the live web build), on app boot, if the flag is on **and** there is no
token, silently **auto-register a unique throwaway account**
(`guest-<uuid>@demo.ogden.ag`, random >=8-char password) via the existing
`authStore.register()`. The persisted JWT makes the router redirect the visitor
straight into the app. **No change to the hardened auth middleware.**

Three operator-confirmed sub-decisions:
- **Auto demo session** -- visitor lands straight in a working app (no demo
  button or special URL; demo access *is* the default front door when the flag
  is on).
- **Keep login reachable** -- in demo mode the shell account control is replaced
  by a visible **"DEMO MODE"** badge + a **"Sign in"** link to `/login`; signing
  in there overwrites the demo token with a real one.
- **Per-visitor throwaway accounts** -- isolated sandboxes, not a shared account.
  Token persists in `localStorage`, so the same browser keeps the same demo
  account across reloads; a fresh browser / incognito / cleared storage gets a
  new one.

Implementation is entirely flag-gated: `DEMO_MODE_ENABLED` (=
`process.env.FEATURE_DEMO_MODE === 'true'`) guards both `maybeBootDemoSession`
(early-returns when off) and the AppShell badge branch. With the flag off,
terser folds the constant to `false` and dead-code-eliminates the demo path, so
**OFF == original landing/login behavior by construction**. The flag is threaded
build-time only (live IS production): `render.yaml` env -> Dockerfile build-arg
-> Vite `define` static replacement -> bundle.

**Consequences:**
- Visitors explore a real, authed app with live data and zero friction; the
  "DEMO MODE" badge signals it is not "ready".
- Throwaway `@demo.ogden.ag` user + personal-org rows accumulate in the DB, one
  per fresh visit. Acceptable for a test deployment; a periodic cleanup job is
  *deferred*.
- Best-effort verification emails are sent to non-existent `@demo.ogden.ag`
  addresses on each registration (mail failure never blocks registration). A
  tiny backend guard to skip the email for the demo domain is *deferred,
  optional*.
- The underlying **real-login bug is sidestepped, not fixed** -- a separate
  follow-up. The team's path is `/login` (auto-register only fires when no token
  exists).
- Amanah: this is an access/onboarding mechanism only -- no sale, advance
  purchase, financing, or CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]]).
