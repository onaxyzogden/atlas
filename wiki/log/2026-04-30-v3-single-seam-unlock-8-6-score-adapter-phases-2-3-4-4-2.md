# 2026-04-30 — V3 single-seam unlock + 8→6 score adapter (Phases 2/3/4/4.2)


### Done

Closed four phases of the in-flight-work plan in one push:

**Phase 2 — Authenticated layer fetch parity.** `apps/web/src/lib/layerFetcher.ts` now tries the authenticated `/layers/project/:id` endpoint *before* the offline mock path when a `projectId` is threaded through. New helpers `apiRowToMockLayer` + `tryFetchFromApi` mirror the server-side `layerRowsToMockLayers` pattern from `SiteAssessmentWriter`. `useSiteDataStore.fetchForProject` and `refreshProject` thread the local id through. Non-builtin projects with real boundaries now hydrate Module 2/3 from the DB rather than the offline mock fallback. Migration `019_builtin_layer_summary_remaining.sql` rekeys the remaining four jsonb blobs (soils / watershed / wetlands_flood / land_cover) to canonical snake_case ahead of any authenticated reader.

**Phase 3 — OBSERVE Module 3 + 5 stale-comment closures.** `CrossSectionTool` (hub side) gains a "⌗ Pick on map →" hand-off button that switches to the design-map flow (which already implements draw + save). `SectorCompassCard` header comment rewritten to point at `features/map/SectorOverlay` (already mounted via `SectorOverlayToggle`). No new components — the previously-deferred work was already shipped on the map side; this closes the comment debt.

**Phase 4 — V3 single-seam unlock.** New adapter `apps/web/src/v3/data/adaptLocalProject.ts` converts a `LocalProject` into the v3 `Project` view-model. `useV3Project` now consults `useProjectStore` for any non-MTC id, with the MTC fixture preserved as a deterministic dev sentinel under id `'mtc'`. Rich briefs (`diagnose`/`prove`/`operate`/`build`) intentionally remain undefined for real projects — Phase 5 + 6 populate them.

**Phase 4.2 — 8→6 score adapter.** New `apps/web/src/v3/data/adaptScores.ts` reconciles the shared scorer's 8 weighted labels with v3's 6 plain-language categories: `landFit ← avg(Ag Suitability, Regen Potential, Stewardship Readiness)`, `water ← Water Resilience`, `regulation ← Habitat Sensitivity`, `access ← Buildability`, `financial ← Community Suitability`, `designCompleteness ← 100 − Design Complexity`. Confidence rolls up weakest-wins; verdict synthesizes from `computeOverallScore` against a 6-tier threshold table and points at the weakest non-placeholder dimension. The adapter only fires when at least one Tier-1 layer has `fetchStatus === 'complete'`; otherwise v3 pages render an honest "Awaiting site data" empty state rather than a fictional verdict. `useV3Project`'s `useMemo` is keyed on `(projectId, projects, dataByProject)` so the hook re-renders when a layer fetch completes.

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean for `@ogden/web` and `@ogden/api`. Adapter is a pure function — fixture-driven unit coverage is a follow-up. The MTC smoke path under id `'mtc'` is unchanged.

### Risks accepted
- `Regulation = Habitat Sensitivity` and `Financial = Community Suitability` are proxies until dedicated scorers ship in Phase 7. Adapter shape stays stable when the 1:1 scorers land.
- `dataByProject` lookup uses local id only; no `serverId` fallback today. Every store action threads the local id, so this is theoretically reachable but not in practice.

ADR: [`wiki/decisions/2026-04-30-v3-score-adapter-8-to-6-mapping.md`](decisions/2026-04-30-v3-score-adapter-8-to-6-mapping.md). Closes Phases 2/3/4/4.2 of the in-flight closure plan; Phases 5–8 remain.
