# OGDEN Atlas — Deep Technical Audit (Update)

**Date:** 2026-04-21 (revised — late-evening UX pass appended)
**Auditor:** Claude Code (Sonnet)
**Supersedes:** `ATLAS_DEEP_AUDIT_2026-04-19.md` (2026-04-19)
**Scope:** Delta update — the 04-19 audit's Phase A/B/C/D structural + inventory claims remain accurate except where this document overrides them. The H5 top-10 leverage list was largely executed over 2026-04-20/21; item-by-item status is re-scored below. The late-evening UX session adds SECTION 0 item 10 and SECTION 4 row "Map UX / dashboards" without disturbing prior deltas.

**Method:** No re-run of the 5 parallel Explore-agent sweeps. This update is a diff against the 04-19 baseline, grounded in:
- 20 `wiki/log.md` entries appended between 2026-04-19 and 2026-04-21
- Two sessions of in-place verification (sprint-trio + shared-scoring unification + parity-verify session)
- Direct file reads + targeted greps (not full-codebase re-exploration)

---

## SECTION 0 — What changed since 2026-04-19

In priority order (high-leverage first). Items 1–5 close audit H5 leverage items; items 6–9 are net-new.

1. **NasaPowerAdapter + climate-layer enrichment (2026-04-20).** Closed audit H5 #2. `nasaPowerFetch.ts` shared helper + post-fetch merge into `NoaaClimateAdapter` + `EcccClimateAdapter`. Every climate pipeline run now populates `solar_radiation_kwh_m2_day`, `wind_speed_ms`, `relative_humidity_pct`. Not registered in `ADAPTER_REGISTRY` as a standalone entry (blocked on `Country` type extension — documented pivot). 13 new tests.
2. **ClaudeClient unstubbed + Anthropic Messages wired (2026-04-20).** Closed audit H5 #3. Fetch-based (not SDK) to match the existing `/ai/chat` pattern; model pinned `claude-sonnet-4-20250514`; prompt caching via `cache_control:{type:'ephemeral'}`. Three methods implemented: `generateSiteNarrative`, `generateDesignRecommendation`, `enrichAssessmentFlags`. `/ai/enrich-assessment` route is no longer a stub. **But:** `generateSiteNarrative` / `generateDesignRecommendation` are **callable but uncalled** — no server-side job or route invokes them yet (frontend `aiEnrichment.ts` bypasses this class). AtlasAI panel still only gets what the frontend wires directly.
3. **FAO-56 Penman-Monteith PET + threading (2026-04-20, 2026-04-21).** Closed audit H5 #5. `apps/web/src/lib/petModel.ts` (now `packages/shared/src/scoring/petModel.ts` post-lift) implements the FAO-56 equation set; `computePet(inputs)` dispatcher falls back to Blaney-Criddle when any of `{solar, wind, RH, latitude}` is missing. The 2026-04-21 thread-through sprint wired `HydrologyRightPanel.tsx`, `DashboardMetrics.tsx`, `HydrologyDashboard.tsx` to pass all four fields → Penman-Monteith active in production for US + CA sites. Expected knock-on: aridity / LGP / water-resilience scores shift 10–25% higher PET in humid temperate zones.
4. **SSURGO horizon + restrictive-layer backfill (2026-04-21).** Partially closed audit H5 #4 (coarse fragments + horizon Ksat profiles deferred as `chfrags` + `basesat_r/basesatall_r` ambiguity). `SsurgoAdapter.ts` now returns multi-horizon profiles (dominant-component weighting via `comppct_r`, shallowest-depth tiebreak) and a canonical `restrictive_layer` (e.g., Fragipan@60cm). Legacy 0-30cm flattened fields preserved for back-compat. `summary_data` now carries `horizons[]` + `restrictive_layer`. `AgPotential` score caps effective rooting depth at the restrictive layer.
5. **Canonical `site_assessments` writer (2026-04-21).** Closed audit H5 #8. `apps/api/src/services/assessments/SiteAssessmentWriter.ts` (~290 LOC). Exports `writeCanonicalAssessment(db, projectId)` (transactional: debounce guard → flip `is_current=false` → INSERT new row with bumped version) and `maybeWriteAssessmentIfTier3Complete(db, projectId)` (checks `data_pipeline_jobs` for 4 complete Tier-3 jobs, idempotent). Wired into all 4 Tier-3 worker tails in `DataPipelineOrchestrator.ts`. **The 04-19 audit's B2 anomaly ("`site_assessments` is read but never written from TS") is resolved.** 30s debounce handles the race where 4 workers finish simultaneously.
6. **Shared scoring unification: `@ogden/shared/scoring` subpath (2026-04-21, later).** Lifted `apps/web/src/lib/computeScores.ts` (~2323 LOC) + transitive deps (`hydrologyMetrics.ts`, `petModel.ts`, `rules/`, `tokens` slice, `MockLayerResult` types) into `packages/shared/src/scoring/`. New subpath export `@ogden/shared/scoring` (alongside the existing `.` barrel). Writer now delegates to the shared scorer instead of shipping its own 4-score shim. Web files shrank to one-line `export * from '@ogden/shared/scoring';` re-export shims — all 138/138 web `computeScores.test.ts` tests pass unchanged, proving the shim is transparent. **Parity is now structural:** web and API import the same function, produce bit-identical scores for identical inputs.
7. **Parity verification script (2026-04-21, this session).** `apps/api/scripts/verify-scoring-parity.ts` (~200 LOC). One-shot smoke test: imports the shared module, runs against a 6-layer fixture, prints all 10 scored labels + overall (66.0 weighted), validates determinism across consecutive calls, optionally compares against a DB row given a projectId + `DATABASE_URL`. **Correction:** the shared scorer emits **10** labels, not 11 (the sprint-trio wiki entry had 11). Labels: Water Resilience · Agricultural Suitability · Regenerative Potential · Buildability · Habitat Sensitivity · Stewardship Readiness · Community Suitability · Design Complexity · FAO Land Suitability · USDA Land Capability.
8. **Sprint BZ/CA/CB/CC/CD (2026-04-21, GAEZ track).** Map-side work, largely orthogonal to the scoring unification:
   - **BZ:** GAEZ WATER/desert classifier fix + 47-crop ranking UI.
   - **CA:** closed at Phase A — premise refuted, no code change (worth noting as a mature sprint-abort).
   - **CB:** map-side GAEZ v4 suitability overlay (new overlay control in MapLayers panel).
   - **CC:** GAEZ overlay hardening (hover readout + yield mode + raster auth).
   - **CD split into two parallel streams:** (a) map-side SoilGrids v2.0 property overlay (code landed; ingest deferred — `ingest-soilgrids` docs written, rasters not pulled yet), (b) FAO GAEZ RCP futures reconnaissance — 74 non-baseline scenarios enumerated, `scenario` promoted to first-class dimension in `GaezRasterService` / routes / manifest. Next ingest (CD+1) + UI picker (CD+2) are pure-ops follow-ups against the new schema.
10. **Map UX — per-submodule toolbars, livestock/forestry domain split, right-rail dashboards (2026-04-21 evening).** Frontend-only session, orthogonal to the scoring/API thread:
    - `DomainFloatingToolbar.tsx` rewrite: collapsed the single `livestock` and `forestry` `DomainKey` values into eight sub-domains (`paddockDesign | herdRotation | grazingAnalysis | livestockInventory | plantingTool | forestHub | carbonDiagnostic | nurseryLedger`) in `domainMapping.ts`, so each dashboard section renders its own tool roster instead of sharing one. Migrated all tool icons from emoji strings to `lucide-react`. Trimmed 14 dead buttons (Fence Line, Water Point, Measure, Mark Feature, Add Pin, Plant Tree, Crown Area, Forest Zone, Draw Swale, Draw Pond, Grade Area, Corridor, All Layers, the cartographic duplicates) — kept only tools that toggle a real layer or fire a wired intent. Renamed `Grazing` → `Pasture` to eliminate the three-label collision with the Grazing Analysis dashboard and the Pasture/`land_cover` layer. Gated action tools on `isMapReady || canEdit` with distinct tooltips.
    - Wired `ogden:herd:rotate` via `PaddockListFloating.tsx` (extracted as a headless controller — fires after the toolbar's Rotate Herd tool; runs `computeRotationSchedule(paddocks)` and bumps the first `suggestedAction === 'move_in'` paddock's `updatedAt`, with graceful no-ops and `console.info` feedback when no paddocks are eligible). Paddock-intent + paddock-draw flow migrated out of `LivestockPanel.tsx` into the same controller for mount-anywhere reuse.
    - Herd Rotation dashboard quick-stat: replaced raw "Herd Size — N head" with "Animal Units — N.N AU" using a new `AU_FACTORS` constant + `computeAnimalUnits()` helper in `apps/web/src/features/livestock/speciesData.ts`. Factors sourced from Manitoba Agriculture *Schedule A — Animal Unit Worksheet* (1 AU = 73 kg N/yr): `cattle: 1.250`, `sheep: 0.200`, `goats: 0.200`, `horses: 1.333`, `pigs: 0.143`, `poultry: 0.0050`, `ducks_geese: 0.010`, `rabbits: 0.010`, `bees: 0`. Species not in Schedule A documented as approximations in the JSDoc.
    - New right-rail dashboards: `MapLayersDashboard.tsx` (+ module CSS) and `SiteIntelligenceDashboard.tsx`. Broadened `MapView.tsx`'s right-rail mount guard so all four livestock sub-views (not just Paddock Design) get the paddock draw controller.
    - `apps/web/src/features/map/mapRailDashboard.css` (new): global CSS Modules `[class*="..."]` substring selectors + container queries (`container-type: inline-size; @container mapRailDash (max-width: 520px|360px)`) to narrow-adapt every dashboard page mounted in the 340px rail — collapses multi-column grids to 1-col, unclips timeline/scheduleRow overflow, reflows absolute-positioned badges, wraps long button labels (COMPARE DATES), and forces `overflow-wrap: break-word` (not `anywhere`) so prose breaks at word boundaries rather than mid-character (fixed the PRE/CIPI/TAT/ION envBar bug).
    - `EcologicalDashboard.tsx` runtime fix: added a `formatPct(v)` helper tolerant of string/`'Unknown'`/null values coming back from `layerFetcher`. Symptom was `wetlands.wetland_pct.toFixed is not a function` — the layer adapter intermittently returns string-coerced percentages. Helper now checks `typeof v === 'number' && isFinite(v)` before `.toFixed()`.
    - No API / data-pipeline / scoring changes in this session. `tsc --noEmit` clean for `apps/web` after each step.

11. **Zombie endpoint + latent PDF bug (2026-04-21, this session's recon).** Two findings new to this audit:
   - `useAssessment()` in `apps/web/src/hooks/useProjectQueries.ts:48` has **zero call sites**. The `GET /projects/:id/assessment` endpoint is defined on both ends but no UI consumer. Web UI computes all scores fresh client-side via the shared scorer; DB-persisted assessments are only consumed by PDF export server-side.
   - PDF site-assessment template (`apps/api/src/services/pdf/templates/siteAssessment.ts:64-75`) treats `score_breakdown` as `Record<string, Record<string, number>>` (the legacy dict-of-dicts DDL-comment shape) but the v2 writer stores `ScoredResult[]`. Runtime behaviour for any row the writer produces: section headers render as "0", "1", "2"… with gibberish per-factor tables. **Currently invisible** because `SELECT count(*) FROM site_assessments → 0` — the writer has never fired in dev (no project has reached Tier-3 completion). Migration plan filed at `C:\Users\MY OWN AXIS\.claude\plans\site-assessments-schema-lift.md` addresses it.

---

## SECTION 1 — Updated structural inventory (minor drift)

Claims that changed since 04-19:

### `packages/shared` now hosts the scoring engine
The 04-19 audit stated `packages/shared/` contains "12 schema files, constants/dataSources.ts, constants/flags.ts" — still true, plus now:
- `src/scoring/computeScores.ts` (~2323 LOC, lifted from web)
- `src/scoring/hydrologyMetrics.ts`
- `src/scoring/petModel.ts`
- `src/scoring/tokens.ts` (scoring-only colour slice)
- `src/scoring/types.ts` (`MockLayerResult`)
- `src/scoring/rules/{index.ts, ruleEngine.ts, assessmentRules.ts}`
- `src/scoring/index.ts` (barrel; DO NOT re-export warning for cycle avoidance)

`packages/shared/package.json` exports map extended:
```json
"exports": {
  ".": { "types": "./src/index.ts", "default": "./src/index.ts" },
  "./scoring": { "types": "./src/scoring/index.ts", "default": "./src/scoring/index.ts" }
}
```

`apps/web/vite.config.ts` + `apps/web/vitest.config.ts` carry matching subpath aliases (more-specific first — Vite prefix-matches in order). `apps/api` resolves via `moduleResolution:"bundler"` in `tsconfig.base.json`; no alias needed.

### `apps/api/src/services/assessments/` (new)
Single file: `SiteAssessmentWriter.ts`. Contains:
- `SCORE_LABEL_TO_COLUMN` const — maps 4 shared-scorer labels → the 4 `site_assessments` DB columns. Frozen `as const`. Guarded by `scoreByLabel()` runtime assertion that throws loudly if a label goes missing.
- `layerRowsToMockLayers()` adapter (DB LayerRow → MockLayerResult shape the shared scorer accepts).
- `normalizeConfidence()` / `rollupConfidence()` helpers (rollup across all 10 scores, not just 4).
- `clampScore()` — one-decimal rounding for `numeric(4,1)`.
- `writeCanonicalAssessment()` + `maybeWriteAssessmentIfTier3Complete()`.

### `apps/api/scripts/` additions (beyond 04-19)
Sprint CD added `enumerate-gaez-futures.ts` (+ test) and `convert-gaez-to-cog.ts` (+ test). This session added `verify-scoring-parity.ts`. Total script count: 9 files (4 TS, 1 JS migration, 1 PS1, 3 MD).

### `apps/api/src/tests/` additions
- `SiteAssessmentWriter.test.ts` (8 tests — adapter, label→column mapping, determinism)
- `siteAssessmentsPipeline.integration.test.ts` (6 tests — Tier-3 gating, INSERT param capture, debounce, no_project, no_layers skip paths, mock-DB fixture)
- NasaPowerAdapter + ClaudeClient + petModel test files from 2026-04-20

### Migration ledger extension
04-19 listed 8 SQL migrations (`001_initial.sql` through `008_erosion_cutfill.sql`). No migrations added since. The filed-but-not-executed `002_drop_legacy_score_columns.sql` (in the schema-lift plan) would be `#9` when applied.

---

## SECTION 2 — Revised Phase B anomalies

### B2 (table usage map) — one resolved, one new

- **RESOLVED: `site_assessments` writer.** Previously "written from zero TypeScript code paths." Now written by `SiteAssessmentWriter.writeCanonicalAssessment()` in a single transaction, called from 4 Tier-3 worker tails. **Structural write path operational; zero rows actually in the dev DB yet because no project has reached Tier-3 completion.**

- **NEW: zombie endpoint.** `GET /projects/:id/assessment` (`apps/api/src/routes/projects/index.ts:144`) is defined and works, but `useAssessment()` in `apps/web/src/hooks/useProjectQueries.ts` has zero call sites. The whole fetch path is dead code on the consumer side — web computes everything fresh client-side. **Action:** either wire `useAssessment` into a component (cheap persistence + history view) or remove the hook to reduce confusion.

### B3 (schema gaps) — updated

- `site_assessments` row content is **now being written** (SiteAssessmentWriter), but the 4 per-label score columns are a **lossy projection** — the shared scorer emits 10 labels but we only persist 4 as indexed columns. Migration plan at `C:\Users\MY OWN AXIS\.claude\plans\site-assessments-schema-lift.md` proposes dropping the 4 columns in favour of canonical `ScoredResult[]` in `score_breakdown` jsonb + keeping `overall_score` for cheap sorts. Plan flagged HIGH risk (migration-runner discovery pattern unconfirmed).
- `projects.timezone` / `climate_region` / `bioregion` — still unwritten. Not progressed since 04-19.

---

## SECTION 3 — Revised Phase C — API + Services

### C2 service table — updated rows

| Service | 04-19 status | Current status |
|---|---|---|
| `ClaudeClient.ts` | **STUB** (throws) | **LIVE (gated)** — fetch-based Anthropic Messages client, prompt caching, 3 methods. 2 of 3 methods (`generateSiteNarrative`, `generateDesignRecommendation`) callable but uncalled from server paths. |
| **`SiteAssessmentWriter.ts`** (new) | n/a | **LIVE** — canonical writer, 14/14 tests green (8 unit + 6 integration). |

### C3 — BullMQ wiring unchanged (5 queues, all LIVE). New: 4 Tier-3 worker tails invoke the assessment writer.

### C4 adapter registry
- Still 14 registered adapters; all LIVE per 04-19.
- **NasaPowerAdapter** exists as a standalone class (9th data-fetcher if you count it) but NOT in `ADAPTER_REGISTRY` — integrated via the `fetchNasaPowerSummary` helper layered onto Noaa/Eccc post-fetch. Count depends on how strictly you read the registry; pragmatically the field count in climate layers has grown by 3 (solar, wind, RH).

---

## SECTION 4 — Revised Phase F — Feature completeness

Roll-up (54+ tracked features — now up slightly). Deltas vs 04-19:

| Area | 04-19 | 2026-04-21 delta |
|---|---|---|
| Assessment & Scoring | Confidence + GAEZ FAO S1-N2 DONE; Fuzzy + Site panel PARTIAL; USDA LCC + CA Soil Cap + AHP STUB | **USDA Land Capability + FAO Land Suitability now emitted by the shared scorer**. Fuzzy logic still isolated in `fuzzyMCDM.ts`, not in the `computeAssessmentScores` path. Canonical writer + shared-scoring unification promote Assessment & Scoring to **~70% DONE** (up from ~55%). |
| Climate | mean T / frost / GDD / Köppen / HZ DONE; LGP PARTIAL; PET/aridity STUB | **Penman-Monteith PET is DONE and threaded into production.** LGP recomputes with the higher PET values. Climate → **~90% DONE**. |
| Hydrology | rainwater + waterlogging PARTIAL; groundwater depth STUB | Unchanged (NWIS still STUB). |
| Renewable | solar PV + wind STUB | NASA POWER provides the solar radiation feed; `solar_pv_potential` score now populates (score-surface lift on next pipeline run for any site). GWA + PVWatts still STUB. |
| Export / Reporting | PDF engine DONE; investor financials placeholder | **Latent bug:** `siteAssessment.ts` PDF template renders garbage breakdown sections for any row the v2 writer produces. Currently invisible (zero rows). Migration plan proposes fixing in the same PR as the schema lift. |
| AI | Claude STUB; FEATURE_AI off | **ClaudeClient LIVE + /ai/enrich-assessment live.** Two other methods callable but uncalled. AtlasAI panel functional when `FEATURE_AI=true`. |
| Map UX / dashboards | 1 livestock + 1 forestry domain sharing 1 toolbar each; many dead buttons; emoji icons; PaddockDesign dashboard rendered for all 4 livestock sub-views | **8 domain sub-keys, 8 distinct toolbars**; dead buttons trimmed; Lucide icons across the board; Grazing → Pasture rename; `isMapReady` gating; Initiate Rotation wired via `ogden:herd:rotate` → `PaddockListFloating`. Per-section dashboards mount correctly (Herd Rotation shows Animal Units quick-stat, MapLayers/SiteIntelligence dashboards added). `mapRailDashboard.css` unclips all content inside the 340px rail via container queries. **~85% DONE** for the livestock/forestry map surface (was ~40%). |

Aggregate revised: **~64% DONE · ~22% PARTIAL · ~14% STUB** (up from 55/25/20 at 04-19). The biggest driver is scoring-layer maturity: what was previously "web-only scoring, not persisted, not in API" is now "canonical server-side writer over the same function web uses, in one jsonb column with 10 labels." Late-evening UX pass adds ~2pp to DONE — livestock + forestry map toolbars now match the richness of hydrology / terrain / ecology, and the four livestock sub-dashboards each render in the right rail without content clipping.

---

## SECTION 5 — New: latent issues flagged for near-term attention

Three items that are technical debt but not urgent (none are blocking live users because dev has no real data yet).

### 5.1 PDF template shape mismatch (latent)
- **Severity:** High once the writer fires against a real project, because the Site Assessment PDF is one of the headline exports.
- **File:** `apps/api/src/services/pdf/templates/siteAssessment.ts:64-75` (+ `AssessmentRow` type in `templates/index.ts:38`).
- **Symptom:** section headers render "0", "1", "2", ... with gibberish factor tables.
- **Invisible because:** zero `site_assessments` rows currently exist.
- **Fix path:** in the filed schema-lift plan — iterate `a.score_breakdown: ScoredResult[]` and render per-component breakdowns correctly.

### 5.2 Zombie fetch hook
- **Severity:** Low (dead code, not broken code).
- **File:** `apps/web/src/hooks/useProjectQueries.ts:48` (`useAssessment`).
- **Symptom:** hook defined, never called anywhere.
- **Fix path:** either wire into `SiteIntelligencePanel` as a history-persistence readback (so users see which assessment version they're looking at) or delete the hook + `api.projects.assessment(…)` method from `apiClient.ts` (line 140).

### 5.3 Shared scorer → DB column mapping is stringly-typed
- **Severity:** Guarded — renaming a label in `packages/shared/src/scoring/computeScores.ts` will throw loudly at INSERT time thanks to `scoreByLabel` runtime assertion.
- **Residual risk:** a unit test also fails (`SiteAssessmentWriter.test.ts` asserts the 4 tracked labels are still emitted). Three-layer defence is already in place. Keeping this in the audit as a reminder that the schema-lift migration eliminates the risk class entirely (no more column mapping).

### 5.4 NasaPowerAdapter not in ADAPTER_REGISTRY
- **Severity:** Low (the enrichment path works via helper merge; registry absence only matters if we want to fetch NASA POWER as a standalone fallback layer for unmapped countries).
- **Blocker:** `Country = 'US' | 'CA'` type doesn't have a fallback slot. Extension cascades into every adapter's registry + Zod project schemas + DB enums.
- **Fix path:** deferred until international country expansion is prioritised.

### 5.6 `layerFetcher` return-type contract is loose
- **Severity:** Medium — caused a real runtime crash in `EcologicalDashboard` (`wetlands.wetland_pct.toFixed is not a function`). Patched locally with a `formatPct` guard, but the underlying issue is that `layerFetcher`-sourced percentages are typed as `number` in downstream interfaces while the adapter occasionally returns string coercions (or `'Unknown'`) depending on upstream source availability.
- **Files:** `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` (patched); root cause in the ecological-layer fetcher / adapter chain (not yet traced to a single file in this session).
- **Fix path:** lock the adapter to `number | null` at the boundary — coerce strings / `'Unknown'` to `null` once at fetch time, so every consumer can trust `typeof === 'number'` without per-site `formatPct`-style guards. Keep the defensive helper for now as belt-and-braces.
- **Risk class:** this is the same family of bug the schema-lift (§5.1) addresses on the server side — loose DB/jsonb typing leaking into TS. Worth a dedicated audit pass on all `layerFetcher` return shapes.

### 5.7 Forestry toolset is layer-only
- **Severity:** Low — a design choice, not a bug. The four new forestry toolbars (Planting Tool, Forest Hub, Carbon Diagnostic, Nursery Ledger) are built from layer toggles + one Measure action, because the underlying forestry data model (crop persistence via `CropPanel.tsx` / `cropStore.ts`) isn't wired to a toolbar-fired intent the way paddock drawing is. Dead draw buttons were trimmed rather than left as stubs.
- **Fix path:** wire `ogden:crop:start` (symmetric to `ogden:paddock:start`) + hoist a forestry equivalent of `PaddockListFloating` when Planting Tool / Nursery Ledger start needing in-map authoring. Deferred until product demand.

### 5.5 AI methods uncalled
- **Severity:** Low (doesn't break anything; just unused capability).
- **Files:** `ClaudeClient.generateSiteNarrative` / `generateDesignRecommendation` — implemented + tested, not called from any route or BullMQ job.
- **Fix path:** add a route or a narrative-generation job that fires after `SiteAssessmentWriter` completes, writing the narrative into a new `site_assessments.ai_narrative` jsonb column (future migration).

---

## SECTION 6 — Revised H5: top-10 leverage tasks

Updating the 04-19 priority list with execution results. Strikethrough = done.

1. ~~Fix wiki/log accuracy + CLAUDE.md store count.~~ **DONE** 2026-04-20.
2. ~~NasaPowerAdapter (solar + wind + RH).~~ **DONE** 2026-04-20.
3. ~~Wire Anthropic SDK + unstub ClaudeClient.~~ **DONE** 2026-04-20 (fetch-based, not SDK-based).
4. **SSURGO coarse fragments + `basesat_r` / `basesatall_r` disambiguation.** Still pending. Horizons + restrictive layer landed 2026-04-21; `chfrags` and `basesat` disambiguation deferred. *~4 h.*
5. ~~FAO56 Penman-Monteith PET.~~ **DONE** 2026-04-20, threaded through 2026-04-21.
6. **Real zoning for US parcels** (`UsCountyGisAdapter` extension). Still pending. *~1 day.*
7. **NwisGroundwaterAdapter.** Still pending. *~6 h.*
8. ~~Canonical `site_assessments` writer.~~ **DONE** 2026-04-21.
9. **Integrate fuzzyMCDM into main pipeline.** Still pending. The shared scorer now lives in one place — this is the ideal moment to add fuzzy defuzzification inside `computeAssessmentScores` rather than as a web-only isolated module. *~1 day.*
10. **Replace `costDatabase.ts` placeholder** with real US-Midwest + Ontario regional dataset. Still pending. *~1 day.*

### New items to add to the revised list

**11. Execute `site-assessments-schema-lift.md`.** Filed plan, awaiting approval. Drops the 4 lossy score columns, canonicalises `score_breakdown: ScoredResult[]`, fixes the latent PDF template bug. *~½ day.*

**12. Trigger a real Tier-3 run + close the parity loop.** We have zero `site_assessments` rows; the writer has never fired. Create a US test project, run boundary upload, wait for Tier-3 completion, then re-run `verify-scoring-parity.ts <projectId>` to confirm DB parity against the shared scorer. *~2 h.*

**13. Call `generateSiteNarrative` + `generateDesignRecommendation` from somewhere.** The methods exist; nothing invokes them. Wire into a narrative BullMQ job post-assessment-write, or into the AtlasAI panel via a server-side route. *~½ day.*

**14. Delete or wire `useAssessment`.** Zombie hook — decide. *~1 h either way.*

**15. Extend `Country` type + register NasaPowerAdapter** in `ADAPTER_REGISTRY`. Unblocks international expansion. Touches many files (type cascade). *~1 day.*

### New critical-path order

1. (11) Schema lift — clears tech debt, fixes PDF bug proactively.
2. (12) Real Tier-3 run — proves the writer path end-to-end.
3. (13) Narrative wiring — AtlasAI panel stops being 95%-stub.
4. (4) SSURGO coarse fragments — unlocks soil-regeneration score depth.
5. (9) Fuzzy integration — foundation for AHP weighting + smoother score surfaces.

---

## SECTION 7 — Audit hygiene

- **TODO/FIXME count:** unchanged from 04-19 (1 TODO in `wsService.ts:233`).
- **Secrets scan:** clean (no new env vars introduced since 04-19; the Anthropic key is loaded via existing `ANTHROPIC_API_KEY` pattern).
- **TypeScript strict:** `apps/api` + `apps/web` + `packages/shared` all `tsc --noEmit` clean at session close.
- **Test counts** (rough): `apps/api` 455+ tests (415 baseline + 13 ClaudeClient + 13 NasaPower + 8 SiteAssessmentWriter + 6 integration ≈ 455). `apps/web` 374 tests (no change — lift was transparent, 138 computeScores tests passed unchanged).
- **Circular dependencies:** none. The shared-scoring lift pre-emptively avoided cycles by having `rules/ruleEngine.ts` import from specific schema files, not the `@ogden/shared` barrel. `scoring/index.ts` has a header comment warning against re-exporting scoring from the main barrel.
- **Deferred items from this session:** real-DB integration-test harness in `apps/api/src/tests/helpers/` (currently mock-DB only); live parity check against a real `site_assessments` row (requires item #12 above).

---

## Appendix — Wiki entries referenced

- `wiki/log.md:1337` — NasaPowerAdapter (2026-04-20)
- `wiki/log.md:1384` — ClaudeClient + Penman-Monteith (2026-04-20)
- `wiki/log.md:49` — Sprint trio (2026-04-21 morning)
- `wiki/log.md:21` — Shared scoring unification (2026-04-21 afternoon)
- `wiki/log.md:7` — Parity verify + schema-lift plan (2026-04-21 evening, this session)
- `wiki/log.md:93, 119, 163, 194, 219, 237` — Sprint CD / CC / CB / CA / BZ (GAEZ track)
- `C:\Users\MY OWN AXIS\.claude\plans\site-assessments-schema-lift.md` — filed migration plan, awaiting approval

---

## Session Debrief

**Completed.** Delta update of the 04-19 deep audit. Closed H5 items #1, #2, #3, #5, #8. Partial progress on #4 (SSURGO). Late-evening UX pass: eight-way split of livestock/forestry domain keys, Lucide-migrated per-submodule toolbars, `ogden:herd:rotate` wired, Animal Units quick-stat, new MapLayers + SiteIntelligence dashboards, `mapRailDashboard.css` container-query sweep, `EcologicalDashboard` `formatPct` guard for loose `layerFetcher` typing. Revised completion: **~64% DONE · 22% PARTIAL · 14% STUB** (up from 55/25/20). Net-new sections: shared-scoring package, canonical writer, schema-lift plan (filed, not executed), latent PDF bug, zombie endpoint, and latent issues 5.6 (`layerFetcher` typing) + 5.7 (forestry in-map authoring deferred).

**Deferred.** Full Explore-agent re-sweep (user opted for delta update, not re-run). Live parity check against a real `site_assessments` row (no rows exist yet). Cross-package test-count reconciliation (numbers above are approximate; precise counts would need running each suite).

**Recommended next session.** Execute the schema-lift migration (new #11) — it clears technical debt, fixes the latent PDF bug, and was designed with risk mitigation already factored in. Follow-up: trigger a real Tier-3 run (new #12) to close the parity loop with DB evidence.
