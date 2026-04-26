# 2026-04-25 — Pre-Flight Audit (P0 + P1 + Mobile)

**Status:** Accepted · **Scope:** `apps/web/`, `packages/shared/`, `wiki/` · **Branch:** `feat/shared-scoring`

## Context

Before live testing or any external preview link, three parallel read-only Explore sweeps (build/wiring, manifest/content, UX/IA) and the wiki log through 2026-04-24 surfaced a triaged punch-list. Operator decision (plan-mode dialog 2026-04-25): **All P0 + P1 scope, mobile = YES**, executed as a five-phase arc on `feat/shared-scoring` with hard gates between phases.

The objective is **not** "fix everything" — it is to land a defensible pre-test gate, push everything else into the LAUNCH-CHECKLIST, and persist the picture in the wiki.

## Decision — Five-Phase Execution

### Phase 1 — Manifest hygiene (Pivot B: annotate-but-keep)

`packages/shared/src/featureManifest.ts` is **informational metadata, not the routing source-of-truth**. The canonical surface map is `apps/web/src/features/dashboard/taxonomy.ts` (`NAV_ITEMS`). The 2026-04-22 scaffolding pass generated ~28 6-line `[SectionName]Page.tsx` stubs that look orphaned but are intentionally unmounted — the real surface for each section is a corresponding production dashboard already wired into `NAV_ITEMS` (e.g., §6 Climate Analysis stub → `features/climate/SolarClimateDashboard.tsx`).

**Pivot B (chosen over deletion):** keep stubs as orphans, but annotate each via a `<SectionScaffold>` component that records `section`, `slug`, `name`, and `realSurface[]` paths. Reading the file now tells you exactly where the production surface lives. No manifest renaming, no router churn, no risk of deleting a stub that some future tool watches for.

Outcome: `coming soon` literals replaced with `realSurface` pointers across all orphan section pages. Manifest's `status: done` rows are no longer misleading because the stub itself now points at the live dashboard.

### Phase 2 — Typecheck the dirty tree

Working tree on `feat/shared-scoring` had ~12 dirty files (RailPanelShell, IconSidebar, EcologicalDashboard, HydrologyDashboard, layerFetcher, etc.) plus untracked `features/landing/`. Track A's earlier `tsc --noEmit` had timed out at 120 s.

Re-ran with `NODE_OPTIONS=--max-old-space-size=8192` and a 600 s budget across `@ogden/web`, `@ogden/api`, `@ogden/shared`. **All three exit 0** — no errors silenced with `@ts-expect-error`.

### Phase 3 — Mobile breakpoints across 18 dashboard CSS modules

`MASTER.md` mandates breakpoints at 375 / 768 / 1024 / 1440 px. The 18 dashboard modules in `apps/web/src/features/dashboard/pages/*.module.css` had zero (or insufficient) `@media` coverage. Decision: append a tail responsive block to each module **calibrated to the file's actual class structure** rather than blanket rules — `EnergyDashboard` collapses `.scoreHero` flex-row to column at 768 px and tightens padding at 375; `EcologicalDashboard` collapses `.dualScoreRow`, `.wetlandGrid`, `.pollinatorEcoregionStrip`, and `.carbonGrid`; `StewardshipDashboard` hides the action-row chrome at 375 with `display: none`; `PaddockDesignDashboard` already had container queries — supplemented with viewport queries.

Final query counts: 5 modules at 2 queries; 8 modules at 3; 4 modules at 4; `Hydrology` at 8 (it had pre-existing 480/600/800 queries that were tightened, not replaced). Container-query approach (PaddockDesign) is preserved where present; new modules use viewport queries because most live in fixed-width AppShell containers, not container-typed parents.

### Phase 4 — Landing route wire-up + path migration

`apps/web/src/features/landing/` had 8 untracked files (LandingPage, hero, sections, CSS modules) but no router registration. The deploy URL today routed `/` to `HomePage` inside `AppShell`, meaning a stranger landing on the public URL would hit the authed shell instead of the marketing page.

Decision:
1. Register `landingRoute` at `/` **outside** AppShell with a `beforeLoad` guard: `if (isAuthenticated()) throw redirect({ to: '/home' })`. Auth state is read directly from `localStorage.getItem('ogden-auth-token')` so the redirect fires before AppShell mounts (no flash).
2. Move `homeRoute` from `/` → `/home`.
3. Migrate **8 hard-coded `/` references** across the app to `/home`: `AppShell.tsx` (×3 — link logo, back-link, `isHome` conditional), `CommandPalette.tsx` (nav-home command), `ProjectTabBar.tsx` (back-arrow), `CompareCandidatesPage.tsx` (×2 back-link via `replace_all`), `useKeyboardShortcuts.ts` (Ctrl+H), `ProjectPage.tsx` (×2 — not-found link + post-delete navigate), `LoginPage.tsx` (post-auth redirect default).
4. §6 Climate verification: `apiClient.climateAnalysis.*` is already consumed by `features/climate/SolarClimateDashboard.tsx`, which is the `realSurface` pointer in the orphan stub. No additional UI build needed — the API ships and the surface ships; only the manifest's `done` claim needed reconciling, which Phase 1 handled.

`tsc --noEmit` re-run on `@ogden/web` after migration: **exit 0**.

### Phase 5 — Wiki + LAUNCH-CHECKLIST persistence

This decision file. Plus a session entry in `log.md`, four new rows in `LAUNCH-CHECKLIST.md` (Operational section: caveat plumbing P2, citation backfill P2, map-overlay chrome migration P2, focus-trap audit P2), and an index update.

## Out of Scope This Arc (deferred to LAUNCH-CHECKLIST)

- Caveat-disclosure plumbing — `EcologicalDashboard.tsx:200-250` renders only the first `caveats[]` entry; `HydrologyPanel` / `EconomicsPanel` / `RegulatoryPanel` likely mirror this and were not audited.
- Citation backfill on `regionalCosts/US_MIDWEST.ts` and `CA_ONTARIO.ts` — ~10 rows each carry `citation: null, confidence: 'low'` (habitation, food_production, commons, spiritual, education, retreat, water_retention, infrastructure zones, post_rail fencing).
- Map-overlay chrome migration — 10 overlays still ship hand-rolled `backdropFilter` chrome instead of `MapControlPopover` (`AgroforestryOverlay`, `BiodiversityCorridorOverlay`, `CrossSectionTool`, `MeasureTools`, `MicroclimateOverlay`, `MulchCompostCovercropOverlay`, `RestorationPriorityOverlay`, `ViewshedOverlay`, `HistoricalImageryControl`, `OsmVectorOverlay`, `SplitScreenCompare`, `WindbreakOverlay`).
- `SlideUpPanel.tsx` and `RailPanelShell.tsx` focus-trap behavior unverified (Modal.tsx is correct).
- Scoring → UI parity script for the 41-variant `LayerSummary` discriminated union.
- Residual `title=` cleanup (3 sites) post-`DelayedTooltip` retrofit.
- `MASTER.md` references a `design-system/pages/` directory that does not exist.
- 24 layer-adapter `metadata.source` URLs unaudited.
- Livestock module's 25-ish `@ts-expect-error` / `eslint-disable` concentration.

## Verification

- `tsc --noEmit` × `@ogden/web`, `@ogden/api`, `@ogden/shared` — all exit 0.
- `grep "to:\s*['\"]\/['\"]" apps/web/src` — no matches (path migration complete).
- `grep "to=[\"']\/[\"']" apps/web/src` — no matches.
- 18 dashboard modules: each has ≥2 `@media` queries with at least one of (1024 / 768 / 375).
- `landingRoute` unauth: serves `LandingPage`. Authed: redirects to `/home` before `AppShell` mounts.
- §6 Climate API → `apiClient.climateAnalysis.*` → `SolarClimateDashboard.tsx` chain confirmed via grep.

## Files Touched

- `apps/web/src/routes/index.tsx` — landing route + `/home` rename + `isAuthenticated` guard.
- `apps/web/src/app/AppShell.tsx` — `isHome` predicate + 2 link migrations.
- `apps/web/src/components/CommandPalette.tsx`, `ProjectTabBar.tsx`, `useKeyboardShortcuts.ts`, `pages/LoginPage.tsx`, `pages/ProjectPage.tsx`, `features/project/compare/CompareCandidatesPage.tsx` — `/` → `/home` migrations.
- 18 × `apps/web/src/features/dashboard/pages/*.module.css` — responsive breakpoints.
- `wiki/decisions/2026-04-25-pre-flight-audit.md` (this file).
- `wiki/log.md`, `wiki/LAUNCH-CHECKLIST.md`, `wiki/index.md` — persistence.

Section orphan-stub annotations from Phase 1 land via the existing `<SectionScaffold>` primitive — already documented in the 2026-04-22 manifest scaffolding decision; this arc only added `realSurface[]` pointers to the surfaced stubs.
