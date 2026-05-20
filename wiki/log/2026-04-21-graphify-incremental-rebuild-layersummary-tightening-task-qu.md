# 2026-04-21 — Graphify incremental rebuild + LayerSummary tightening task queued


Ran `/graphify update` on the repo after the day's map UX work. Incremental detect
found 800 changed files (541 code, 38 docs, 221 images). Rejected the 221 images:
213 were Cesium SDK bundled assets (`apps/web/public/cesium/Assets/**`) and 8 were
Istanbul coverage-report favicons — zero meaningful content, large vision-token
cost if extracted. Ran AST on 541 code files + semantic extraction on 38 docs
(2 parallel subagents). Merged into existing graph: **2,867 nodes, 3,812 edges,
666 communities**. Curated labels on the top 30 communities; long tail defaults
to "Community N". Outputs in `graphify-out/` (graph.html, graph.json,
GRAPH_REPORT.md). Total cost: 54.3k input / 8k output tokens.

**Keystone nodes the graph surfaced:** `fetchWithRetry()` (67 edges),
`fetchAllLayersInternal()` (42), `computeAssessmentScores()` (19),
`evaluateRules()` (17). The two fetcher hubs confirmed latent issue 5.6 from
`ATLAS_DEEP_AUDIT_2026-04-21.md`: `layerFetcher.ts` is a ~4,000-line file whose
Community 0 has cohesion 0.04 across 140 nodes — structural grab-bag, not a
module.

**Trace of issue 5.6 root cause.** BFS from the fetcher hubs pulled 147 nodes,
all same-file — the graph can't see cross-file consumers because AST extraction
didn't resolve imports. Switched to grep: only 4 files import `layerFetcher`
directly (siteDataStore, LayerPanel, layerFetcher.test, itself), but 18 files
read `.summary.*` keys downstream. The contract at the boundary
(`packages/shared/src/scoring/types.ts:15`) is
`summary: Record<string, unknown>` — an untyped blob that 88 fetcher literals
write into and 18 consumers read out of with zero type check. That's what lets
`'Unknown'` strings leak into numeric fields and produce runtime errors like
`wetland_pct.toFixed is not a function` (the Ecological dashboard's `formatPct`
guard is treating the symptom).

**Spawned follow-up task** "Tighten LayerSummary into discriminated union":
lift `LayerSummary` into `@ogden/shared/scoring` keyed by `layerType`, migrate
the 88 fetcher summary literals, let TS errors drive the 18 consumer fixes.
Scoring engine passes first (biggest downstream), dashboard guards removed
after. Closes latent issue 5.6.

**Surprising connections the graph flagged:** duplicate setup docs
(`LOCAL_SETUP.md` ≈ `infrastructure/LOCAL_VERIFICATION.md` ≈
`infrastructure/WINDOWS_DEV_NOTES.md` — consolidation candidate);
GAEZ + SoilGrids self-hosting decisions cluster tightly (same pattern applied
twice — justified); Atlas Deep Audit series forms a chain across
2026-04-19/21/undated.

**Known graph limitations.** AST extractor does not resolve cross-file imports,
so Community 0 looks more isolated than it is. Upgrading extraction to link
through `import` statements would collapse the 18 downstream consumer files
into Community 0 and raise cohesion meaningfully.

**Cleanup recommendation logged for graphify:** add
`apps/web/public/cesium/` and `**/coverage/` to the detection ignore list so
future `--update` runs don't re-propose 221 image extractions.
