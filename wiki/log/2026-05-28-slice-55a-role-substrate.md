# 2026-05-28 - Slice 5.5a implementation (role substrate + access foundation)

**Branch.** `feat/atlas-permaculture`. First implementation slice of the
scoped-views epic. ADR: [[decisions/2026-05-28-slice-55a-role-substrate]].
Design: [[decisions/2026-05-28-atlas-scoped-views-epic-design]].

## Shipped

Role substrate end to end: bulk `GET /projects/my-roles` ->
`memberStore.fetchMyRoles` -> `useMyProjectRoles` (ReadonlyMap keyed by server
id, empty offline). That one map drives the Per-Project Home access gate
(contractor / landowner on a synced project get an honest empty state) and the
Portfolio role badge (non-steward roles, never hides). Enforcement spine: the
contractor -> designer alias was flipped to null, so contractor now gets 403 at
every Plan/Observe/Act gate; scoped Act access returns in 5.5c with
assignment-scoping.

## Notable choices

- Gate reads the bulk map (keyed by serverId), not the singular
  `useProjectRole` slot, to avoid a stale-role flash on cross-project nav.
- Two-axis design preserved: capability map untouched, only the legacy alias
  moved.
- API integration test for the new route deferred with rationale (mirrors the
  shipping list query; verified by 401 smoke + the web hook/store tests).

## Verification

shared/web vitest green; shared/web/api tsc clean; my-roles 401 smoke;
offline-portfolio screenshot (no badges). Per-commit `git diff --cached
--name-only` confirmed only slice files staged - no foreign WIP. Divergence
check before push per [[feedback-commit-immediately-on-rebased-branches]].

## Carry-over

5.5b (team_member scoping) is next; 5.5c / 5.5d follow. Each ships as its own
commit + implementation ADR.
