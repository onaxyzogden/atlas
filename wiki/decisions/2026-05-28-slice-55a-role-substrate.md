# 2026-05-28 - Slice 5.5a: Role substrate + access foundation

**Status.** Implemented. Branch `feat/atlas-permaculture`. First slice of the
scoped-views epic ([[decisions/2026-05-28-atlas-scoped-views-epic-design]]).

## Context

The epic design fixed 5.5a as the security spine that 5.5b-d depend on. Three
walls from the design pass had to be cleared before any scoped surface: there
was no per-project role map (only `memberStore.myRole`, a single slot), role
fetching only ran when logged in, and the contractor role aliased to designer
so a contractor satisfied every Plan/Observe/Act gate.

## Decisions

1. **Roles are an authenticated + synced capability.** The bulk role map is
   keyed by SERVER project id. Local-only projects (no `serverId`) never
   appear; signed-out sessions get an empty map. Offline/demo therefore always
   renders the full single-owner view - no gate, no badge.

2. **One bulk endpoint, one map, one role source.** `GET /projects/my-roles`
   returns the caller's role per non-builtin project (mirrors the `GET
   /projects` list query). `memberStore.fetchMyRoles` caches it;
   `useMyProjectRoles` exposes a `ReadonlyMap<serverId, role>`. Both the Home
   access gate and the Portfolio badge read that one map.

3. **Gate reads the bulk map, not the singular `useProjectRole` slot.** The
   singular slot is one value, so navigating contractor-project -> owned-project
   would flash the owned home as denied using the stale role. The bulk map
   keyed by serverId returns the right role or undefined (not-loaded), so the
   worst case is a brief steward home, never a wrongly-denied owned project.
   `useProjectRole` (singular) is untouched and still serves the editing
   surfaces.

4. **Enforcement lever: `ROLE_ALIAS.contractor` flips `'designer'` -> `null`.**
   Every Plan/Observe/Act mutation gate shares `requireRole('owner',
   'designer')`, so the alias is the only single-point lever. With it null, a
   contractor satisfies no legacy gate (literal match only) and gets 403
   everywhere. The fine-grained capability map is deliberately left unchanged
   (two-axis design). Re-granting SCOPED Act access (contractor editing only
   assigned field actions) is 5.5c's job - granting it here without
   assignment-scoping would itself be a confidentiality hole. Between 5.5a and
   5.5c a contractor has no functional surface, which is correct: the
   contractor surface ships in 5.5c.

5. **Portfolio badges are additive, never filtering.** Local-first: the user
   always sees their own project cards. Owner / primary_steward carry no
   badge.

## What shipped

- `packages/shared`: `ROLE_ALIAS.contractor = null` + 4 flipped test
  assertions + a focused contractor-no-gate test.
- `apps/api`: `GET /projects/my-roles`.
- `apps/web`: `api.members.myRoles`; `memberStore.myRoles` + `fetchMyRoles` +
  `reset`; `useMyProjectRoles`; Per-Project Home access gate; Portfolio role
  badge (`ProjectUrgencyCard` `role` prop + `.roleBadge`).

## Verification

- shared / web vitest green (alias contract, store transform, hook contract,
  home gate, card badge).
- shared / web / api `tsc --noEmit` clean.
- `GET /projects/my-roles` smoke: 401 unauthenticated (route registered +
  gated). A Postgres-backed integration test for the route is deferred (the
  api route-test DB harness is out of scope for this frontend-substrate slice;
  the query mirrors the shipping list query).
- Offline portfolio screenshot confirms no badges in the signed-out flow.

## Deferred

- 5.5b: team_member scoping.
- 5.5c: contractor task-only view + field-action query scoping + re-grant
  scoped Act access + read-confidentiality on the no-requireRole Observe batch
  routes.
- 5.5d: landowner portal view + contractor access expiry.

### Code-quality carry-overs

Surfaced in per-task code-quality reviews; revisit during 5.5b
implementation.

- `useMyProjectRoles` effect dep is `[!!user]` (mirrors `useProjectRole`);
  `[user?.id ?? null, fetchMyRoles]` would refetch correctly on user-switch.
  Same precedent in `useProjectRole`; consider fixing both together.
- `memberStore.reset()` exists but `authStore.logout()` does not call it.
  Wire the hookup so a signed-out -> signed-in -> signed-out cycle does not
  leak a prior account's role map.
- Per-Project Home gate is implemented as a denial-list
  (`contractor | landowner`); the ADR's Decision 3 framing implies an
  allowlist (`owner | primary_steward`). Same behavior today; diverges when
  5.5b adds `team_member`. Pick a side as the first 5.5b move.
- `ROLE_BADGE_LABEL` lives in `ProjectUrgencyCard`; hoist to `@ogden/shared`
  once a second consumer (likely a 5.5b Per-Project Home header badge)
  arrives.
- Per-Project Home denial copy uses the jargon "the home view"; reconsider
  user-facing wording when 5.5d's landowner portal copy is written.
- Add `team_member` / `primary_steward` / undefined-on-synced-project test
  cases to the Per-Project Home gate test file in 5.5b.
- Add `primary_steward` parity test case to the Portfolio role badge test
  file.
- Tighten `useMyProjectRoles` test mock typing from
  `Record<string, string>` to `Record<string, ProjectRole>`.
