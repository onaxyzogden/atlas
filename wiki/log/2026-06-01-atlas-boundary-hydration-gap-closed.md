# 2026-06-01 -- Boundary-hydration gap closed: server-synced projects become flow/relationship endpoints

**Branch.** `feat/atlas-permaculture` (rebased out-of-band). The fix landed in
commit `5aa973a4` *feat(portfolio): hydrate parcel geometry for server-synced
projects* (authored 2026-06-01 00:24, 5 files: `syncService.ts`,
`PortfolioMapPage.tsx`, `apiClient.ts`, `apps/api/.../routes/projects/index.ts`,
`projectStore.ts`). **Not pushed.**

## The gap (closed)

Server-synced projects arrive locally with `hasParcelBoundary: true` but
`parcelBoundaryGeojson: null` -- the `GET /projects` list/sync path omits geometry
for performance; only `GET /projects/:id` embeds it via `ST_AsGeoJSON`. Without
geometry, `projectCentroid` (`portfolioModel.ts`) returns null, so the Portfolio
Map draws no pin/boundary and any relationship / POI-flow line targeting that
project cannot draw. This blocked "Halton Hills" from being a flow endpoint during
the 2026-05-31 verification ([[log/2026-05-31-atlas-project-sync-hardening-poi-flow-verification]]),
and was spun off as a follow-up task.

## What the fix does

- **`syncService.ts` -- `hydrateProjectBoundaries()`:** filters candidates
  (`serverId && hasParcelBoundary && parcelBoundaryGeojson == null`), fetches
  `api.projects.get(serverId)` (embeds geometry), normalizes via
  `asFeatureCollection(...)`, and writes back through `updateProject` wrapped in the
  `isSyncing` guard so the project subscription does not echo it back as a
  `POST /boundary` edit. Per-project failures are logged and skipped.
- **`PortfolioMapPage.tsx` -- candidate-key effect:** the hydration effect is keyed
  by a memoized `pendingBoundaryKey` (server ids of the still-un-hydrated
  server-boundary projects), so it re-fires whenever that set changes -- covering
  projects that sync down **after** the map mounts, not just the mount-time set. As
  each candidate hydrates its geojson becomes non-null and it drops out of the key,
  so the key shrinks monotonically and the effect settles; unrelated project
  mutations recompute the same string and do not re-fire it.
- **In-flight dedup:** a module-level `inFlightBoundaryHydration: Set<string>`
  (mirrors the existing `inFlightProjectSync` pattern) guarantees each project is
  fetched at most once across overlapping effect runs -- no fetch storm.
- The **"fall back to `metadata.centerLat/centerLng`"** half of the original ask was
  already native in `projectCentroid` -- no extra code; it engages whenever the
  server sends coordinates in `metadata`.

Net effect: server-only projects (e.g. Halton Hills) gain a centroid and become
valid flow/relationship endpoints; `centroidById` / `relFc` / `poiFlowFc` in
`PortfolioMap.tsx` then resolve them.

## Session shape (honest record)

This session **picked up the spun-off follow-up** and found the base
`hydrateProjectBoundaries` fix already sitting **uncommitted** in the working tree
(from the follow-up task). The user chose (AskUserQuestion) **"Harden, then commit"**:
close the on-mount-only gap (the candidate-key dep + the in-flight Set were this
session's additions), then land it. Both hardening edits were applied and confirmed
present in the committed HEAD (`inFlightBoundaryHydration` Set at `syncService.ts`
declared + `.has`/`.add`/`.delete`; `pendingBoundaryKey` `useMemo` + `[pendingBoundaryKey]`
dep at `PortfolioMapPage.tsx`).

**Commit landed via the out-of-band rebase, not a local `git commit`:** between the
working-tree `git diff` and the intended explicit-path `git add`, the external rebase
that owns this branch ([[project-branch-rebase]]) folded an equivalent commit
(`5aa973a4`, authored by Yousef) into history, so the working tree converged to HEAD
and there was nothing left to stage. Verified `5aa973a4` is an ancestor of HEAD and
carries both hardening markers -- so no duplicate commit was created (an empty commit
would be spurious). This mirrors the 2026-05-31 Slice-A convergence pattern.

## Verification (and its limit -- disclosed)

- **Typecheck:** the 2 boundary files are `tsc`-clean. The project-wide
  `@ogden/web typecheck` failed (exit 2) on 2026-06-01, but **all 6 errors were
  unrelated** -- a half-migrated `sourceFeatureRef` observe-schema WIP
  (`packages/shared/.../observe/dataPoint.schema.ts` + `routeToDataPoint.ts` +
  `ActTierExecutionPanel.tsx` + four observe/relationship tests), none in my files.
  `tsc` checks the whole project, so the absence of any error in my files (incl.
  `noUnusedLocals`) confirms they are type-clean.
- **NOT live-verified.** Per [[project-screenshot-hang]] / CLAUDE.md ("no 'works'
  claim without a screenshot"), no visual proof was taken: the working tree was too
  polluted with unrelated half-migrated WIP to boot a trustworthy preview, and the
  user chose **"Commit now, skip live."** **Recommended next-session check:** boot
  web (5200) + api (3001) on native pg 5432 ([[project-two-postgres-5432]]), confirm
  Halton Hills carries non-null `parcelBoundaryGeojson` + appears in `centroidById`,
  and screenshot a flow/relationship line drawn to it; also confirm exactly one
  `GET /projects/:id` per candidate (the in-flight guard + shrinking key hold).
- **Data edge case:** if Halton Hills has `hasParcelBoundary: false` on the server,
  hydration correctly skips it and it stays locationless -- a *data* gap (set a
  boundary or populate `metadata.centerLat/centerLng`), not a code defect.

Foreign WIP untouched ([[feedback-no-deletion]]); not pushed ([[project-branch-rebase]]);
CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.
Entity [[entities/web-app]]; concept [[concepts/local-first-architecture]];
predecessor [[log/2026-05-31-atlas-project-sync-hardening-poi-flow-verification]].
