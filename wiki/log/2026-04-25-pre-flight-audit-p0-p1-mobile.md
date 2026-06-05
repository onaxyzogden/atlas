# 2026-04-25 — Pre-Flight Audit (P0 + P1 + Mobile)


Five-phase pre-test gate on `feat/shared-scoring`, executed against the
2026-04-25 plan-mode triage of three Explore sweeps. Decision file:
[2026-04-25-pre-flight-audit.md](decisions/2026-04-25-pre-flight-audit.md).

### What landed

1. **Manifest hygiene (Pivot B).** ~28 orphan `[SectionName]Page.tsx` stubs
   from the 2026-04-22 scaffolding pass were re-annotated with
   `<SectionScaffold realSurface={[…]}/>` pointing at the production
   dashboards already wired into `taxonomy.ts:NAV_ITEMS`. Manifest's
   `status: done` rows are no longer misleading because the stub itself
   now records where the live surface lives. No router churn.
2. **Typecheck the dirty tree.** `tsc --noEmit` × `@ogden/web` /
   `@ogden/api` / `@ogden/shared` all exit 0 with
   `NODE_OPTIONS=--max-old-space-size=8192` and a 600 s budget. Earlier
   120 s timeout on `@ogden/web` resolved.
3. **Mobile breakpoints across 18 dashboard CSS modules.** Each module
   in `apps/web/src/features/dashboard/pages/*.module.css` now carries
   `@media` rules calibrated to its own class structure (e.g.,
   `EnergyDashboard` collapses `.scoreHero`, `EcologicalDashboard`
   collapses `.dualScoreRow`/`.wetlandGrid`/`.pollinatorEcoregionStrip`/
   `.carbonGrid`, `StewardshipDashboard` hides chrome at 375 px,
   `PaddockDesignDashboard` keeps its container queries and adds
   viewport queries). `Hydrology` retained its 480/600/800 queries.
4. **Landing route + `/home` migration.** `landingRoute` registered at
   `/` outside AppShell with `beforeLoad: () => isAuthenticated() &&
   throw redirect({ to: '/home' })` reading
   `localStorage.getItem('ogden-auth-token')` directly so the redirect
   fires before AppShell mounts. `homeRoute` moved `/` → `/home`. Eight
   call-sites migrated: `AppShell.tsx` (×3 — `isHome` predicate, logo,
   back-link), `CommandPalette.tsx`, `ProjectTabBar.tsx`,
   `CompareCandidatesPage.tsx` (×2 via `replace_all`),
   `useKeyboardShortcuts.ts` (Ctrl+H), `LoginPage.tsx` (post-auth
   default), `ProjectPage.tsx` (×2 — not-found link, post-delete
   navigate). §6 Climate verified — `apiClient.climateAnalysis.*` →
   `features/climate/SolarClimateDashboard.tsx` chain already wired;
   the orphan stub at `features/climate-analysis/ClimateAnalysisPage.tsx`
   correctly points at it via `realSurface[]`.
5. **Wiki + LAUNCH-CHECKLIST persistence.** This entry, the decision
   file, four new Operational rows in `LAUNCH-CHECKLIST.md` (caveat
   plumbing, citation backfill, map-overlay chrome migration,
   focus-trap audit), and an `index.md` row.

### Verification

- `pnpm --filter @ogden/web exec tsc --noEmit` → exit 0
- `grep "to:\s*['\"]\/['\"]" apps/web/src` → no matches
- `grep "to=[\"']\/[\"']" apps/web/src` → no matches
- 18 dashboard modules each carry ≥2 `@media` queries
- `landingRoute` unauth serves `LandingPage`; authed redirects to
  `/home` without flash

### Deferred to LAUNCH-CHECKLIST

Caveat-disclosure plumbing across scoring panels; citation backfill on
~20 regional cost rows; map-overlay chrome migration to
`MapControlPopover` (10 overlays remaining); `SlideUpPanel` /
`RailPanelShell` focus-trap audit; scoring → UI parity script for the
41-variant `LayerSummary` union; 3 residual `title=` sites; `MASTER.md`
reference to `design-system/pages/` (does not exist); livestock module
`@ts-expect-error` / `eslint-disable` concentration.
