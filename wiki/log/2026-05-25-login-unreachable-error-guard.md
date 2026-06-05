# 2026-05-25 — feat(web): clearer login error when the backend is unreachable

**Type:** source change (presentation-layer guard)
**Branch:** feat/atlas-permaculture
**Commit:** `daa0d62a` (2 files, +97/−2)

## Why
Closes the deferred hardening item flagged by the operational fix
[[log/2026-05-25-fix-olos-login-failed-to-fetch]]: when the backend is genuinely
unreachable (API down, still starting, or the browser tab is on a **dead origin** /
stale offline-PWA shell), the login form rendered the raw browser string
`TypeError: Failed to fetch` (Chrome) / `NetworkError when attempting to fetch
resource` (Firefox) / `Load failed` (Safari) — opaque and non-actionable.

## Root-cause path (unchanged by this fix)
A network-level fetch rejection (no response at all) is re-thrown **unchanged** from
`apiClient.request()`'s fetch catch (`apps/web/src/lib/apiClient.ts:156-170`). That
raw re-throw is a deliberate contract: an existing test asserts it
(`apiClient.clientError.test.ts:59-69`, `rejects.toBe(netErr)`), and several stores
depend on catching the raw network error to fall back to local data (`projectStore`
"using local fallback", `ArchivePage` "server unreachable", `commentStore`,
`memberStore`). The error flows through `authStore.login/register` (`msg = err.message`)
into `LoginPage.tsx`, which renders `{error}` verbatim.

## Decision on placement
Map the message at the **auth boundary**, not centrally in apiClient — wrapping
centrally would break the raw-rethrow contract and ripple through every fallback
caller. The login message is a presentation concern specific to the auth flow.
`reportApiFailure` already classifies these as `code:'NETWORK_ERROR', status:0`, so
telemetry/observability is unaffected. (No ADR — contained presentation fix, no
architectural change.)

## Change
`apps/web/src/store/authStore.ts`: added module-level `authErrorMessage(err, fallback)`
used by both `login()` and `register()` catch blocks (`ApiError` was already imported):
- `err instanceof ApiError` → return `err.message` (real 401/429/etc. server message
  preserved verbatim, e.g. "Invalid email or password").
- `err instanceof TypeError` → network-level rejection; branch on `navigator.onLine`
  (the same connectivity signal `connectivityStore` trusts):
  - offline → "You appear to be offline. Reconnect to the internet and try again."
  - online but server unreachable (the real dead-origin case — network is fine,
    only localhost is down) → "Can't reach the server. It may be offline or still
    starting up — try reloading the page, or check back shortly."
- else → `err.message` / fallback.

`LoginPage.tsx` unchanged — it already renders `{error}` verbatim, so the friendlier
string flows through automatically.

## Verification
- New test `apps/web/src/store/__tests__/authStore.networkError.test.ts` (4 cases):
  TypeError online → "Can't reach the server" (not "Failed to fetch"); TypeError
  offline → offline message; 401 ApiError → server message preserved; register()
  TypeError → unreachable message. **14/14 pass** (4 new + the 10 existing
  apiClient.clientError contract tests still green — contract unchanged).
- Typecheck: my two files clean. (Three pre-existing `tsc` errors remain in
  unrelated foreign-WIP test files — `planImpactFlag.test.ts`,
  `HostUnionContextMenu.test.tsx`, `HostUnionDrilldownCard.test.tsx` — not touched.)
- Live UI on :5200: stubbed only the login `fetch` to reject with a `TypeError`
  (live API untouched) → the form's `role="alert"` rendered the exact friendly
  message. `preview_screenshot` timed out twice (the known MapLibre/WebGL hang) —
  evidence is the accessibility-tree text read, **not** a visual screenshot.

## Notes
- Scope: login + register only. `initFromStorage()` (silent token restore) untouched —
  its transient-failure path preserves the token and isn't user-facing the same way.
- No central apiClient change (raw-rethrow contract preserved for fallback callers).
- Foreign WIP untouched per [[feedback-no-deletion]]; explicit-path commit + immediate
  commit on the rebase-prone branch per [[feedback-commit-immediately-on-rebased-branches]].
