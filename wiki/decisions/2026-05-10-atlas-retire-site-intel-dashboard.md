# 2026-05-10 — Retire SiteIntelligencePanel from Dashboard route

## Context

`apps/web/src/components/panels/SiteIntelligencePanel.tsx` is a heavy
legacy surface (~1.14 MB pre-split, 25 sections + dedicated metrics
hook + chunk-split rules + perf profiler). It is wired into three
call-sites:

1. **Dashboard route** via `DashboardRouter` → `SiteIntelligenceDashboard`
   wrapper, exposed on `DashboardSidebar` as a NavItem.
2. **Map rail** via `MapView.tsx`'s `'intelligence'` branch.
3. **v3 Observe stage** via `DecisionRail.tsx`.

Users hit a runtime `Failed to fetch dynamically imported module` on
the dashboard load path. Compounding the breakage, the dashboard
default `activeDashboardSection` was `'site-intelligence'`, so the
broken panel was the *first* surface a returning user hit. The panel's
content is now subsumed by the v3 Observe rail and the map-rail
"Site Assessment" affordance.

## Decision

Retire the **dashboard route** to `SiteIntelligencePanel` only. Leave
the panel file, sections, hook, CSS, and chunk-split rules in place —
they remain consumed by `MapView` and the v3 `DecisionRail`. Repoint
the dashboard default to `map-layers` (same Site Overview group, S1
stage), with a persisted-state migration for returning users.

## Changes

- **Removed `'site-intelligence'` NavItem** from `taxonomy.ts` — sidebar
  is taxonomy-driven, so this single deletion drops it from
  `DashboardSidebar` automatically.
- **Removed `case 'site-intelligence'` branch** from `DashboardRouter`
  + the lazy import. Unknown routes fall through to
  `DashboardPlaceholder`.
- **`uiStore`**: bumped persist `version` 2→3; default
  `activeDashboardSection` now `'map-layers'`; added `< 3` migration
  that swaps stale `'site-intelligence'` to `'map-layers'` on rehydrate.
- **`lifecycle.ts`**: `discover` lifecycle entry now points at
  `'map-layers'`.
- **`AdaptiveDecisionRail.tsx`**: `openCompare` now navigates to
  `'map-layers'`.
- **`DashboardView` / `DashboardMetrics`**: dropped the verdict-hero
  and next-actions render branches (both were site-intelligence-only
  predicates). `onGenerateBrief?` prop kept optional for caller
  compatibility.
- **`DashboardSidebar`**: removed orphan `case 'site-intelligence'`
  icon branch.
- **Deleted** `features/dashboard/pages/SiteIntelligenceDashboard.tsx`
  (route wrapper with no remaining importer).

## Explicitly NOT touched

- `components/panels/SiteIntelligencePanel.tsx` — still lazy-loaded by
  `MapView.tsx` and `v3/components/DecisionRail.tsx`.
- `components/panels/sections/*` and `SiteIntelligencePanel.module.css`
  (still imported by `StickyMiniScore.tsx`, `LayerLegendPopover.tsx`).
- `hooks/useSiteIntelligenceMetrics.ts` + test.
- `vite.config.ts` chunk-split rule (panel still ships).
- `lib/computeScores.ts`, `designIntelligence.ts`, `perfProfiler.tsx`.

## Verification

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` from
  `apps/web` → exit 0.
- ESLint clean on touched files.
- Preview console: zero `Failed to fetch dynamically imported module:
  SiteIntelligencePanel.tsx` errors on dashboard load.
- localStorage migration v2→v3 manually exercised: stale
  `activeDashboardSection: 'site-intelligence'` rehydrates to
  `'map-layers'`.
- Map rail "Site Assessment" still mounts the panel via
  `MapView.tsx`'s `'intelligence'` branch — confirms scope discipline.

## Rationale for default-section choice

`map-layers` was selected over alternatives because it (a) lives in the
same S1 / Site Overview taxonomic group, (b) has a working dashboard
page, (c) is a sensible "first paint" surface for a fresh project, and
(d) avoids surfacing a deeper-stage view to users still orienting.
