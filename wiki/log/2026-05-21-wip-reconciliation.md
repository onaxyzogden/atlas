# WIP reconciliation — half-landed Phase-4.5 / width-aware companions

**Date:** 2026-05-21 (later session)
**Branch:** `feat/atlas-permaculture`
**Commits:** `c4e5ed6c`, `f568fb42`, `6fb588fb`, `a30fbd8a`

## Problem

`feat/atlas-permaculture` is force-rebased out-of-band. A recurring
side-effect: a feature's *headline* commit lands but its **companion
files get dropped** by the next external rebase, surviving only as
uncommitted working-tree edits. Three such half-landed features were
sitting in the working tree, and one **broke the web typecheck at HEAD**:
the committed consumers `NewProjectPage.tsx:115` and
`OrganizationSwitcherModal.tsx:42` read `user.defaultOrgId`, but the
committed `ApiAuthUser` type had no such field.

## What landed

### Group A1 — P4.5 org-creation, server (`c4e5ed6c`)

`apps/api/src/routes/auth/index.ts` + `organizations/index.ts` +
`packages/shared/src/schemas/collaboration.schema.ts`. Register now
wraps user + personal-org + owner-membership in a single `db.begin` tx
(every user owns ≥1 org from register); `login` + `me` SELECT the
earliest owner-role org and return it as `defaultOrgId`. Organizations
route gains `PATCH /:id` (owner-only) + `jurisdiction`/`registry_id` on
SELECT/RETURNING; shared schema gains `UpdateOrganizationInput` +
`jurisdiction`/`registryId` on `OrganizationRecord`.

**Test-fixture gap found + fixed.** The plan assumed the api tests
already expected the default-org SELECT. They did **not**:
`auth.test.ts` and `smoke.test.ts` failed (register **500**, login/me
**401**) because the mock-DB is an ordered queue and the new handlers
issue extra queries (org INSERT, member INSERT, owner-org SELECT) that
drained past the enqueued fixtures → `newOrg` undefined → throw.
Verified by stashing A1 and re-running: base = 18/18 green, with-A1 =
6 failures, proving the regression was the change, not pre-existing.
Updated both test files' `enqueue(...)` sequences (added org INSERT +
member INSERT + owner-org SELECT rows, asserted `defaultOrgId` on the
responses). Full `@ogden/api` suite: **680 passed / 3 skipped**.

### Group A2 — P4.5 org-creation, client (`f568fb42`)

`apps/web/src/lib/apiClient.ts` (+`defaultOrgId` on `ApiAuthUser` and
the `me()` response type) + `apps/web/src/store/authStore.ts` (populate
on rehydrate). **This pair fixes the broken tsc** — all `defaultOrgId`
typecheck errors gone. Two consuming test fixtures
(`sessionExpiredStore.test.ts`, `SessionExpiredBanner.test.tsx`) build
`user` objects typed `ApiAuthUser`; completed them with `defaultOrgId`
so the now-required field type-checks. 6/6 of those vitest pass.

### Contamination + recovery (`6fb588fb`)

`f568fb42` unintentionally carried **two pre-staged deletions** from
in-flight foreign habitat work
(`features/plan/habitatAllocation/FeatureInventoryPanel.tsx`,
`store/habitatFeatureStore.ts`). Cause: the staged-deletion entries
showed as `D ` in `git status --short`, and the "staged" filter used
(`grep "^M "`) matched only modifications, missing staged deletions, so
the `git commit` swept them in. Recovered by `git checkout c4e5ed6c --`
on both paths and committing the restoration. Lesson reinforced: the
pre-commit staging check must catch **all** index states (`A `, `D `,
`R `, `M `), not just `M `.

### Group B — width-aware BE lines, store side (`a30fbd8a`)

`apps/web/src/store/builtEnvironmentStore.ts`: optional `widthM` on the
4 line interfaces (PowerLine, BuriedUtility, Fence, ExistingDriveway),
threaded through the 4 projection functions + the V2-facade add/update
passthrough into `existing` metadata. Companion types
(`DesignElement.widthM`, `ExistingMetadata.widthM`, shared
`builtEnvironment.ts` widthM, `LINE_KIND_DEFAULT_WIDTH_M`) and the
**inline-edit schema half** were already committed, so this closed the
store gap alone. Web typecheck adds no new errors; 181 store vitest pass.

### Group C — Import/Export dock CSS

**Already re-landed externally** as `b5932b2d` before this session
reached it — no action needed.

## Notes / deferred

- **8 pre-existing web typecheck errors remain on the branch baseline**,
  none caused by this session: `StepBoundary.tsx:365`,
  `HostUnionContextMenu.test.tsx:58`, `HostUnionDrilldownCard.test.tsx:25`
  (foreign), and **4 in `SelectionFloater.test.tsx`** (lines 115/116/238/
  239/247) — that file is *this author's* from last session's `55e803d1`,
  whose verification ran vitest only (esbuild, no type-check), so the
  `SuccessionStage`/`GroundCoverState`/`SoilSample` fixture type errors
  slipped through. Flagged for a follow-up fix (spawn task).
- **The 21-stash pile** remains out of scope (do not pop/drop) — a
  dedicated session per the plan.
- The external operator committed the foreign `buildLineFeatureEditSchema`
  hedgerow/path/road work as `b2450691` + `e51e644f` on top of the
  restoration; correctly left untouched here.
- **Deferred Phase-2 live MP-selection preview check** (from the F4
  close-out plan) is now unblocked by the defaultOrgId fix — recommended
  next session as a ~10-min eval-seam exercise on `localhost:5200`.

## Branch governance

Each slice committed immediately on green and pushed
`--force-with-lease` after a fetch + divergence check, per
`commit_immediately_on_rebased_branches`. History stayed coherent
across two external force-pushes during the session (`6fb588fb` →
rewritten base `e51e644f`); no commits orphaned.

## Covenant

Re-landing dropped companion files on an ecological-mapping app. No
riba / gharar / CSRA / salam / investor / financing framing. Org plan
labels stay neutral; capital language remains "capital partners &
allies."
