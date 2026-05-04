# ADR: One-time `uiStore.sidebarGrouping` coercion to `'stage3'` for returning users

**Date:** 2026-04-30
**Status:** accepted
**Branch:** `feat/atlas-permaculture`
**Predecessors:**
- [`2026-04-29-observe-stage-ia-restructure.md`](2026-04-29-observe-stage-ia-restructure.md)
- [`2026-04-29-plan-stage-ia-restructure.md`](2026-04-29-plan-stage-ia-restructure.md)
- [`2026-04-29-act-stage-ia-restructure.md`](2026-04-29-act-stage-ia-restructure.md)
  — landed the 3-stage Observe/Plan/Act IA and flipped
  `useUIStore.sidebarGrouping`'s default to `'stage3'`.

## Context

Steward report: **"ACT stage is not visible in the UI."** Investigation
confirmed every wired surface is correct:

- `taxonomy.ts` — `STAGE3_META.act` defined, `STAGE3_ORDER` includes
  `'act'`, `groupByStage3` returns all three stages, the 14 ACT spec
  surfaces (lines 422-501) are `dashboardOnly: true`, and 11 legacy ACT
  items still expose `panel:` so they appear in `MAP_ITEMS`.
- `DashboardSidebar.tsx` — 4-way switch on `sidebarGrouping` renders
  ACT correctly when grouping === `'stage3'`.
- `IconSidebar.tsx` — uses `MAP_ITEMS` (excludes `dashboardOnly`); shows
  only the 11 legacy ACT items by design.
- `uiStore.ts` — default `sidebarGrouping: 'stage3'` (correct), but the
  value persists into the `ogden-ui` localStorage blob via the persist
  middleware.

The actual cause: **returning users whose browsers cached
`sidebarGrouping: 'stage'` (or `'phase'` / `'domain'`) from before the
2026-04-29 default flip retain their old grouping**. None of the
non-stage3 groupings expose an explicit "Act" header — ACT items get
sprinkled across other group labels and appear lost.

## Decision

Bump the `uiStore` persist `version` from `1` to `2` and add a `migrate`
function that coerces any stale non-`'stage3'` `sidebarGrouping` to
`'stage3'` exactly once. Migrate is exported as a named function for
direct unit testing.

```ts
export function migrateUIPersistedState(
  persistedState: unknown,
  fromVersion: number,
): unknown {
  if (fromVersion < 2) {
    const s = persistedState as { sidebarGrouping?: SidebarGrouping } | null;
    if (s && s.sidebarGrouping !== undefined && s.sidebarGrouping !== 'stage3') {
      return { ...s, sidebarGrouping: 'stage3' as SidebarGrouping };
    }
  }
  return persistedState;
}

// in persist({...}, { name: 'ogden-ui', version: 2, migrate: migrateUIPersistedState, ... })
```

Idempotent: only runs against persisted states whose stored `version`
is below `2`. After migration, the user can re-pick a different grouping
manually and it sticks (subsequent boots have `fromVersion === 2`, so
the migrator is a no-op).

A secondary fix lands in the same file: the bare
`useUIStore.persist.rehydrate()` call at module load now guards on
`typeof window !== 'undefined'` so vitest can import the module without
crashing on the missing `localStorage` persist API.

## Consequences

**Positive**
- Returning users see the OBSERVE / PLAN / ACT stage headers on the
  dashboard sidebar without manually re-picking the grouping. ACT
  becomes visible at the first boot post-deploy.
- The migration runs exactly once per browser. Future grouping
  preference changes are not overridden.
- The 7-test vitest spec covers all six declared cases plus a
  null-defensive case, ratcheting the contract.

**Risks accepted**
- A user who *intentionally* picked `'stage'` / `'phase'` / `'domain'`
  after 2026-04-29 (between the IA restructure and this ADR) will be
  reset to `'stage3'` once. They can re-pick after — one click of
  inconvenience for a narrow cohort.
- If the steward's `ogden-ui` blob carries a non-canonical
  `sidebarGrouping` value (e.g. corrupted), the migrator coerces it to
  `'stage3'` rather than passing through; this is intentional.

**Out of scope**
- Whether `dashboardOnly` ACT spec surfaces should also surface in the
  map's `IconSidebar`. The 11 legacy ACT items already appear there;
  the 14 new ones were filed `dashboardOnly: true` deliberately. A
  separate IA decision if needed.
- A broader uiStore audit for other persisted preferences with stale
  defaults from prior restructures. File a follow-up if a second
  symptom surfaces.

## Verification

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — clean
  (exit 0).
- `npx vite build` — clean (built in 40.99 s).
- `npx vitest run src/tests/uiStoreMigrate.test.ts` — 7/7 green:
  - `'stage'` → `'stage3'` on `fromVersion < 2`
  - `'phase'` → `'stage3'`
  - `'domain'` → `'stage3'`
  - `'stage3'` unchanged (returns same object reference)
  - state without `sidebarGrouping` unchanged (returns same reference)
  - `fromVersion >= 2` is a no-op (returns same reference)
  - `null` persistedState handled defensively
- Full vitest run: 482 passed / 7 pre-existing failures in
  `computeScores.test.ts` (unrelated — scoring layer count, predates
  this change).

## Files touched

**Modified (1):**
- `apps/web/src/store/uiStore.ts` — added exported
  `migrateUIPersistedState(persistedState, fromVersion)`, wired it
  through `persist({..., version: 2, migrate})`, guarded the
  module-load `rehydrate()` on `typeof window`.

**New (1):**
- `apps/web/src/tests/uiStoreMigrate.test.ts` — 7 specs.

**Wiki:**
- `wiki/decisions/2026-04-30-uistore-stage3-grouping-migration.md` — this ADR.
- `wiki/index.md` — ADR row added.
- `wiki/log.md` — session entry filed.

## Rollback plan

Revert this commit. `version` returns to `1`, the migrator is no longer
called, and persisted `sidebarGrouping` values stay as they are. No
data loss either way — the field is a UI preference, not user data.
