# ADR: Single-pathed idempotent project sync (`syncProjectNow`)

**Date:** 2026-05-31
**Status:** Accepted
**Branch/commit:** `feat/atlas-permaculture` @ `e729365d` (not pushed)

## Context
The original ask was to "stand up the wizard->API project-sync path so the `serverId` gate stops blocking cross-project features." A read-only live diagnosis inverted that premise: project->server sync **already works** (16 of 17 local projects carry a `serverId`; only the public builtins and the `mtc` demo lack one, correctly). There was no missing sync path.

What the diagnosis *did* surface was a **double-create race**. `syncService.subscribeToProjects()` fired `syncProjectCreate(project)` on every added project -- un-awaited, with no `serverId` short-circuit and no in-flight lock -- while both wizard create sites (`WizardStep1Site.tsx`, the non-template branch of `NewProjectPage.tsx`) *also* called `api.projects.create()` inline. A wizard project could therefore mint two server rows. The sync was also invisible (silent best-effort) and un-awaitable, so the steward had no signal when it failed and no way to retry a specific project.

## Decision
Route **all** project creation through one canonical action, `syncProjectNow(localId)`, in `apps/web/src/lib/syncService.ts`:

1. **Idempotent.** Short-circuits when the project already has a `serverId`; returns `{ok:false, error:'builtin'}` for system-owned builtins; `{ok:false}` for not-found.
2. **Race-free.** A module-level `inFlightProjectSync = new Map<string, Promise>()` dedupes concurrent calls for the same localId -- the subscription and any explicit caller cannot double-fire. `syncProjectCreate` is also made idempotent at entry.
3. **Awaitable + visible.** Returns a typed `{ok, serverId?, error?}` so callers can `await` it and toast on failure. The wizard awaits it and surfaces `toast.error` on `!ok`, but **still navigates** (local-first -- the local project exists; `syncQueue` retries).
4. **Manually triggerable.** A per-project "Sync now" button in `PortfolioProjectList` calls it for any `!serverId && !isBuiltin` project; the row flips "Not synced" -> "Synced" on success.

The `prefillTemplate` branch of `NewProjectPage` (its own server seam + showcase event) is left on its existing path.

## Consequences
- **Positive:** the double-create race is closed structurally (short-circuit + in-flight lock make the hot subscription path strictly safer); sync failures are now visible and retryable per project; the action is the single seam every future cross-project feature can depend on for "is this project on the server yet".
- **Neutral:** local-first behaviour preserved -- a sync failure never blocks navigation.
- **Outstanding (separate concern):** server-synced projects are created with `parcelBoundaryGeojson: null` and the Portfolio Map never hydrates it, so server-only projects render no centroid and cannot yet be flow/relationship endpoints. This **boundary-hydration gap** is independent of sync correctness and was spun off as a follow-up task, not resolved here. See [[log/2026-05-31-atlas-project-sync-hardening-poi-flow-verification]].

## Related
- Log: [[log/2026-05-31-atlas-project-sync-hardening-poi-flow-verification]]
- Concept: [[concepts/local-first-architecture]]
- Entity: [[entities/web-app]]
- Builds on the cross-project relationship + POI work: [[decisions/2026-05-31-atlas-portfolio-home-p7]]
