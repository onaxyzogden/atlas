# 2026-05-20 — Auth-token regression fix + cold-start GIS-fetch copy reconciliation

**Branch.** `feat/atlas-permaculture`. Closes gaps #1 and #3 from
[[2026-05-20-olos-new-user-journey-walkthrough]]. No commit landed in
this session — code changes are staged in the working tree pending
steward review.

**Trigger.** Yesterday's OLOS new-user walkthrough flagged Step-6
Regeneration + Biodiversity monitors and the AI enrichment fan-out
failing immediately with `ApiError: Invalid or expired token` on
fresh-register and reload paths. Walkthrough also called out the
cold-start "auto-fetch real public GIS data" promise as boundary-gated
in reality (only `POST /api/v1/projects/:id/boundary` enqueues
adapters; create + address text fire zero adapter calls).

## Root cause — auth race (three mechanisms)

1. **Non-blocking boot.** `main.tsx` called `initFromStorage()`
   without `await` before `ReactDOM.createRoot(...).render(...)`.
   Side-effect imports (`siteDataSync`, `projectStore` hydration)
   scheduled fetches before `setAuthToken(stored)` ran.
2. **Mid-flight nullification.** `authStore.initFromStorage()` catch
   block treated every `me()` failure (network blip, slow Redis,
   transient 500) as an auth rejection and called
   `setAuthToken(null)` + `localStorage.removeItem(...)`. Concurrent
   in-flight authed requests lost their header on retry.
3. **Project-not-yet-persisted.** `StepNotes.tsx` fired
   `api.projects.create()` as fire-and-forget and navigated to
   `/v3/project/$projectId/observe` before the POST resolved. Observe
   stage then issued per-project fetches against a `projectId` not
   yet on the server — backend masqueraded the 404→401 because
   [`apps/api/src/plugins/auth.ts:32-38`](../../apps/api/src/plugins/auth.ts)
   maps *any* `jwtVerify` failure (including missing header) to
   `UnauthorizedError('Invalid or expired token')`.

## What changed

- [`apps/web/src/main.tsx`](../../apps/web/src/main.tsx) — `bootAuth()`
  awaits `useAuthStore.getState().initFromStorage()` with a 1500 ms
  timeout race; `import('./store/siteDataSync.js')` moved *after* the
  await. `syncService.start()` gated on `token` after init.
- [`apps/web/src/store/authStore.ts`](../../apps/web/src/store/authStore.ts)
  — `initFromStorage()` catch narrowed. Only `ApiError` with
  `status === 401` / `code === 'INVALID_TOKEN'` / `code === 'UNAUTHORIZED'`
  clears the token. Transient errors keep the token, set
  `{ token: stored, user: null, isLoaded: true }` and let the next
  request retry.
- [`apps/web/src/features/project/wizard/StepNotes.tsx`](../../apps/web/src/features/project/wizard/StepNotes.tsx)
  — `handleCreate` is now `async`; authenticated branch awaits
  `api.projects.create()` + `setBoundary()`, writes `serverId` to the
  local project, and only then navigates. Unauthenticated branch keeps
  the immediate-navigate path. Double-submit guarded by a `creating`
  flag (also wired to `WizardNav` as `nextLabel='Creating…'` +
  `nextDisabled`).
- [`apps/web/src/features/project/wizard/StepLocation.tsx`](../../apps/web/src/features/project/wizard/StepLocation.tsx)
  — banner above the address input: *"Public GIS layers (elevation,
  soils, hydrology, climate, land-cover, zoning) are fetched after you
  draw the property boundary in the next step — not from the address
  alone."*
- [`apps/web/src/features/project/wizard/StepBoundary.tsx`](../../apps/web/src/features/project/wizard/StepBoundary.tsx)
  — sage-tinted confirmation banner (renders when
  `data.parcelBoundaryGeojson` is set): *"Boundary captured. Public
  GIS layers will be fetched in the background as soon as the project
  is created."*
- [`wiki/entities/atlas-platform.md`](../entities/atlas-platform.md)
  — corrected the stale "ALL 14 backend adapters are stubbed" claim.
  Actual: **17 live adapters** under
  `apps/api/src/services/pipeline/adapters/` (SSURGO, USGS Elevation,
  NRCan HRDEM, OMAFRA, NHD, OHN, NWI/FEMA, Conservation Authority,
  NOAA, ECCC, NLCD, AAFC, US County GIS, Ontario Municipal, NWIS,
  PGMN, NASA POWER). `ManualFlagAdapter` is a defensive fallback only.
- [`wiki/decisions/2026-05-20-olos-new-user-journey-walkthrough.md`](../decisions/2026-05-20-olos-new-user-journey-walkthrough.md)
  — appended "Update — 2026-05-20 (late)" footer recording the fix
  landing + adapter correction. Original verdicts preserved.

## Verification (preview)

- Cleared localStorage, registered a fresh account on a clean preview
  (`web` server `5d904734-…`, `api` server `df3bddbc-…`).
- Walked the 4-step wizard (StepProject → StepLocation → StepBoundary
  → StepNotes), imported a polygon via DataTransfer to bypass the
  WebGL synthetic-event hang.
- Confirmed `POST /api/v1/projects` resolved and `serverId` was
  written to the local project before navigation
  (`78ccf2bf-…` → `b433b32e-…`).
- `preview_console_logs level=error` after landing on
  `/v3/project/{uuid}/observe`: **zero** `Invalid or expired token`
  entries.
- `window.location.reload()` mid-session at the Observe URL:
  **zero** errors during the blocking auth-init window.
- Remaining warnings unrelated to this fix:
  `ANTHROPIC_API_KEY not configured` (expected; env var absent),
  `[SYNC] Project create failed, queuing: ApiError: Request validation failed`
  (separate validation issue, tracked separately),
  `role: viewer` (old queued ops from prior session).

## Why the copy path (not address→parcel-snap engineering)

Engineering an address→geocode→parcel-snap pipeline would require a
geocoding contract + a parcel service (multi-sprint, cross-cutting).
The honest fix — make the wizard tell a new user exactly when GIS
fetch happens — closes the trust gap immediately and unblocks the
boundary-draw flow that the adapter pipeline already supports. The
address-snap pipeline can be designed later under its own ADR if
warranted.

## Open items

- Marketing/hero copy that may promise auto-fetch on address (Gamma
  deck, `website/`) — flagged for steward review, outside this
  session's scope.
- Walkthrough gaps #2 (ContextBuilder hydration crash) and #4–#10
  remain open as documented in [[2026-05-20-olos-new-user-journey-walkthrough]].
- No commit issued. Awaiting steward review of staged changes.

## Touched files

- `apps/web/src/main.tsx`
- `apps/web/src/store/authStore.ts`
- `apps/web/src/features/project/wizard/StepNotes.tsx`
- `apps/web/src/features/project/wizard/StepLocation.tsx`
- `apps/web/src/features/project/wizard/StepBoundary.tsx`
- `wiki/entities/atlas-platform.md`
- `wiki/decisions/2026-05-20-olos-new-user-journey-walkthrough.md`
