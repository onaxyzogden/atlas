# 2026-05-20 — Gap #6 closed: app-wide 401 interceptor + built-in monitor guard

**Branch:** `feat/atlas-permaculture` (not committed; staged for steward review)
**Scope:** Walkthrough Step 6 — Plan-stage Regeneration/Biodiversity monitor cards leaked raw `"Couldn't load samples: Invalid or expired token."` on built-in projects.

## Root cause (two structural issues)

1. **No app-wide 401 handling.** [apiClient.ts](../../apps/web/src/lib/apiClient.ts) mapped server 401 → `ApiError('UNAUTHORIZED', 'Invalid or expired token', 401)` and let every caller surface it however. The two monitor cards rendered the raw `error` string verbatim.
2. **Built-in projects have no DB row.** `mtc` / `351-house` come from `GET /api/v1/projects/builtins` (display-only). Fetching `/api/v1/projects/mtc/regeneration-events` against them legitimately 401s for an authenticated user — but the cards fired the fetch unconditionally on mount.

## Layers shipped

| Layer | File | Change |
|---|---|---|
| 1 — apiClient interceptor | [apps/web/src/lib/apiClient.ts](../../apps/web/src/lib/apiClient.ts) | `setSessionExpiredHandler(fn)` export + 401 check in `request()` error branch (only fires on `code in ('UNAUTHORIZED','INVALID_TOKEN')` — leaves 403/FORBIDDEN role-denials alone). |
| 2 — global signal store | [apps/web/src/store/sessionExpiredStore.ts](../../apps/web/src/store/sessionExpiredStore.ts) | Tiny Zustand slice — `{isExpired, trigger(), dismiss()}`. `trigger()` is idempotent while expired; calls `useAuthStore.logout()` then flips the flag. |
| 3 — banner component | [apps/web/src/components/SessionExpiredBanner.tsx](../../apps/web/src/components/SessionExpiredBanner.tsx) + `.module.css` | Sticky top-of-viewport banner with "Sign in again" (preserves `?return=<path>`) + Dismiss. Token-cascaded CSS. |
| 4 — boot wire | [apps/web/src/main.tsx](../../apps/web/src/main.tsx) | `setSessionExpiredHandler(() => useSessionExpiredStore.getState().trigger())` after `bootAuth()`, banner mounted as sibling of `RouterProvider`. |
| 5 — built-in guards | [RegenerationMonitorCard.tsx](../../apps/web/src/features/plan/RegenerationMonitorCard.tsx) + [BiodiversityMonitorCard.tsx](../../apps/web/src/features/plan/BiodiversityMonitorCard.tsx) | Outer component early-returns "Sample project — monitoring is read-only" banner when `!project.serverId`; inner component (which calls the hook) is reached only for real DB projects. |

Both layers chosen at Q1/Q2 user gate in plan mode: **App-wide 401 interceptor** + **built-in projects are read-only banner**.

## Tests

- `sessionExpiredStore.test.ts` — 3/3 passing (idempotent trigger, dismiss re-arms, trigger clears `authStore.token`).
- `SessionExpiredBanner.test.tsx` — 3/3 passing (renders-nothing-when-not-expired, banner with return-URL link, Dismiss hides).
- `tsc --noEmit` on touched files: clean (pre-existing errors in `StepBoundary.tsx` + `ArchivePage.tsx` unrelated).

## Preview verification

- **Built-in path (`/v3/project/mtc/plan` → Regeneration + Biodiversity slide-ups):** both cards render the "Sample project — monitoring is read-only…" banner. Zero `/regeneration-events` requests fired in the network log across both renders.
- **Expired-token flow:** `localStorage['ogden-auth-token'] = 'invalid.jwt.xyz'; location.reload()` → global `SessionExpiredBanner` rendered once at the top of the viewport, `localStorage['ogden-auth-token']` cleared to `null`, "Sign in again" href = `/login?return=%2Fv3%2Fproject%2Fmtc%2Fplan%2Fbiodiversity-monitor` (return URL preserved).
- **Dismiss:** banner hides; subsequent 401 re-arms and re-shows it.
- `preview_console_logs level=error`: empty across all flows.

## Non-goals (explicit)

- **No refresh-token flow.** Backend issues bare JWTs with a fixed lifetime.
- **No retry-after-reauth.** User re-navigates; fetches re-fire naturally.
- **No 403 handling.** Interceptor narrowly matches 401 + `UNAUTHORIZED|INVALID_TOKEN`. `requireRole` role denials throw `ForbiddenError` → 403/FORBIDDEN and don't touch the banner.
- **No commit.** Staged for steward review like gaps #1, #2, #4, #5.

## Files

- New: `apps/web/src/store/sessionExpiredStore.ts` + test
- New: `apps/web/src/components/SessionExpiredBanner.tsx` + `.module.css` + test
- Modified: `apps/web/src/lib/apiClient.ts`, `apps/web/src/main.tsx`
- Modified: `apps/web/src/features/plan/RegenerationMonitorCard.tsx`, `apps/web/src/features/plan/BiodiversityMonitorCard.tsx`
