# 2026-04-30 — uiStore `sidebarGrouping` stage3 coercion migration


**Branch:** `feat/atlas-permaculture`

**Trigger:** Steward report — *"ACT stage is not visible in the UI."*

**Root cause:** Returning browsers persisted `sidebarGrouping` at value
`'stage'` (or `'phase'` / `'domain'`) from before the 2026-04-29 IA
restructure flipped the default to `'stage3'`. The persist middleware
faithfully restored the stale value on every boot, leaving ACT items
sprinkled across non-stage3 group labels with no explicit "Act" header.
Every other surface verified correctly wired (taxonomy, DashboardSidebar,
IconSidebar, dashboardOnly filter on `MAP_ITEMS`).

**Fix:** Bumped `apps/web/src/store/uiStore.ts` persist `version` 1→2
and added an exported `migrateUIPersistedState(persistedState,
fromVersion)` that coerces non-`'stage3'` values to `'stage3'` exactly
once on `fromVersion < 2`. Idempotent on subsequent boots; users can
re-pick a different grouping manually after.

**Secondary fix:** Module-load `useUIStore.persist.rehydrate()` now
guards on `typeof window !== 'undefined'` so vitest can import the
module without crashing on the missing persist API.

**Verification:**
- `npx tsc --noEmit` — clean (exit 0).
- `npx vite build` — clean (40.99 s, 565 PWA precache entries).
- `npx vitest run src/tests/uiStoreMigrate.test.ts` — 7/7 green
  (`'stage' | 'phase' | 'domain'` → `'stage3'`; already-stage3
  unchanged; missing key unchanged; `fromVersion >= 2` no-op; null
  defensive).
- Full vitest run: 482 passed; 7 pre-existing failures in
  `computeScores.test.ts` (scoring layer count, predates this change).

**ADR:** [`wiki/decisions/2026-04-30-uistore-stage3-grouping-migration.md`](decisions/2026-04-30-uistore-stage3-grouping-migration.md).
