# 2026-04-24 — Ecological dashboard ecoregion + native species surfacing


**Motive.** [`pollinator_opportunity`](apps/api/src/services/terrain/PollinatorOpportunityProcessor.ts) materialises a CEC Level III ecoregion id + patch-graph `corridorReadiness` alongside the 5x5 patch grid, and `@ogden/shared` already exports a curated native-plant list per ecoregion (`plantsForEcoregion`). Until now none of that surfaced in the UI — the §7 `EcologicalDashboard` stopped at soil / land cover / wetlands, so the ecoregion + species data shipped in `9101393` was effectively invisible to users.

**Change.** [`apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx`](apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx) gains a "NATIVE PLANTING & POLLINATOR HABITAT" section between Wetland & Riparian and Ecological Interventions. Reads `pollinator_opportunity` layer, calls `computePollinatorHabitat({ landCover, wetlands, ecoregionId, corridorReadiness })` from `@ogden/shared`, and renders:

- 3-column ecoregion strip: CEC Level III name + code badge, habitat-suitability score + band, corridor-connectivity band + patch count.
- Curated native species list (common / *scientific* / habit · bloom window) when ecoregion resolves; falls back to habitat-class categories otherwise.
- First caveat from the heuristic surfaced inline as honest-scoping note.

Also adds `'pollinator_opportunity'` to `ECOLOGY_LAYER_SOURCES` so its flags flow through the existing opportunities filter.

**Scoring parity.** Untouched. `computePollinatorHabitat` is read-side only; `computeScores.ts` still does not reference it, so `verify-scoring-parity.ts` stays at delta 0 per the P2 ADR.

**Preview glitch (unrelated).** Mid-session the `web` Vite dev server wedged on a stale HMR snapshot of `RailPanelShell.tsx` and kept emitting `does not provide an export named 'RailPanelShell'` even though the file on disk had the named export intact. Source was not modified this session. Resolved by restarting the Vite server (`preview_stop` + `preview_start web`) — fresh bundle, no server errors.

### Deferred

- Caveat drawer: only the first caveat is rendered inline; the full list (raster-LCP limitation, microsite disclaimer, field-survey prompt) could be exposed behind a "Why this matters" affordance.
- Guild-by-plant badges: `PollinatorPlant.guilds` is in the data but not yet rendered (bees / butterflies / hummingbirds icons).
- Ecoregion coverage expansion beyond the 7 pilot eastern-NA regions — new entries need both an `NA_ECOREGIONS` record and a curated plant list in `pollinatorPlantsByEcoregion.json`.
