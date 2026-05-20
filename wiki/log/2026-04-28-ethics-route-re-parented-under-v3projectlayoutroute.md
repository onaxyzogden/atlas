# 2026-04-28 — Ethics route re-parented under v3ProjectLayoutRoute


### Done

`/v3/reference/ethics` previously sat as a sibling of `v3ProjectLayoutRoute` under `appShellRoute`, so clicking the sidebar's "Ethics & Principles" footer link unmounted the lifecycle shell — the user lost the project context and the sidebar itself. Re-nested the route under the project layout so the sidebar persists.

- [`apps/web/src/routes/index.tsx`](../apps/web/src/routes/index.tsx): moved `v3EthicsReferenceRoute` definition below `v3ProjectLayoutRoute`; changed `getParentRoute: () => appShellRoute` to `() => v3ProjectLayoutRoute`; relative path `reference/ethics`. Added to the layout's `addChildren([…])` array.
- [`V3LifecycleSidebar.tsx`](../apps/web/src/v3/components/V3LifecycleSidebar.tsx): footer Link `to="/v3/project/$projectId/reference/ethics"` with `params={{ projectId }}` (was unparameterized).
- [`V3LifecycleSidebar.test.tsx`](../apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx): assertion updated to the nested href; description string updated.

### Verification

- `tsc --noEmit` — clean.
- `vite build` — clean (1m1s, 493 PWA precache entries).
- 6/6 sidebar tests pass.
- Preview at `/v3/project/mtc/reference/ethics`: Ethics page heading renders alongside the full lifecycle sidebar (Project Home, Understand/Design/Live phase groups, all 7 stages, Reference footer with "Ethics & Principles" link active).

Commit: `c0499c1`.
