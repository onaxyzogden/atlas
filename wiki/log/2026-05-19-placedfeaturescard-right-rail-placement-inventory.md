# 2026-05-19 — PlacedFeaturesCard (right-rail placement inventory)


**Branch.** `feat/atlas-permaculture`. New right-rail card unifying the
three placement stores (`builtEnvironmentStoreV2` / `landDesignStore` /
`zoneStore`) into one stage-scoped inventory — closes the gap where the
canvas had no list-view of placed features.

Files added under `apps/web/src/features/shared/placedFeatures/`:
`usePlacedFeatures.ts` (selector hook + `centroidOf` + `rollupRows`),
`usePlacedFeatures.test.ts` (12 vitest cases), `PlacedFeaturesCard.tsx`
(collapsible card, header rollup, grouped body, Focus + delete row
actions), `PlacedFeaturesCard.module.css`, `CONTEXT.md`. Mounted in
`ObserveChecklistAside.tsx` (`stage="observe"`) and `PlanChecklistAside.tsx`
(`stage="plan"`).

Stage scoping: observe = built `state==='existing'` + zones; plan =
built `state==='proposed'` + non-draft design elements + zones. Geometry
→ centroid computed locally (Point/LineString/Polygon/MultiPolygon) so
Focus can call `useMapFocusStore.focus({ projectId, center, zoom: 17 })`
without map-host access. Delete uses `window.confirm` then a
source-discriminated remover.

Conventions honoured: zustand selector stability (raw arrays in
selectors, derived in `useMemo`); `// @vitest-environment happy-dom`
directive (persist middleware touches `localStorage`); explicit
destructuring + `typeof === 'number'` guards for
`noUncheckedIndexedAccess` on coordinate tuples; `flex: 0 0 auto` on the
card root to survive the right-rail flex-column parent.

Deliberately deferred per CONTEXT.md: per-row visibility toggle (no
per-store flag exists), search/filter, inline edit, drag-reorder,
multi-select, cross-project inventory.

**Gate.** Vitest 12/12 green; tsc clean for the new files (only
unrelated pre-existing `SilvopastureIntegrationCard.tsx` errors remain).
DOM-level preview verification per the 2026-05-17 WebGL ADR — Observe
stage `/v3/project/mtc/observe` shows "8 placed · 8 buildings", expands
60→380 px, 8 rows × {Focus, ×}; Plan stage `/v3/project/mtc/plan` shows
"1 placed · 1 paddocks", expands 60→151 px, "Paddocks (1)" group
renders. Console clean. **Not committed / not pushed** (branch is
rebased/force-pushed externally — wiki + source changes left uncommitted
for the user's commit-and-push decision).

Entity page: [entities/placed-features-card.md](entities/placed-features-card.md).
