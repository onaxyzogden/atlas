# 2026-04-29 — Feasibility Brief exporter + Planting Tool cockpit


**Branch:** `feat/atlas-permaculture` · **Commits:** `4549397`, `846aaf5`

### Done

**Feasibility Brief exporter (`4549397`)**
- `apps/web/src/features/decision/lib/exportFeasibilityBrief.ts` — `renderFeasibilityBriefMarkdown({ project, verdict, ranking, triage })` mirrors the v3 Land-Brief pattern. Sections: Header, Verdict + interpretation paragraph, Snapshot table, Readiness, Blocking Issues (grouped by triage tier), Vision Fit Detail (per-requirement table from `currentFit.results`), Best-Use Ranking (top 8, ★ for current direction), Footer + methodology.
- `useFeasibilityBriefDownloader(project)` composes `useFeasibilityVerdict` + `useTypeFitRanking` + triage and returns a memoized download callback.
- `FeasibilityCommandCenter.tsx` now falls back to this downloader when no `onGenerateBrief` prop is passed, so the hero + rail "Generate Feasibility Brief" button is no longer a placeholder.

**Planting Tool Command Center (`846aaf5`)**
- Templated the same Verdict → Blockers → Fit/Execution → Methodology + sticky Decision Rail recipe onto `apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx` (1,597 → 1,953 lines).
- In-file `derivePlantingVerdict` + `derivePlantingBlockers` re-present existing `orchardSafety` / `proximity` / `access` / `validations` / `waterDemand` memos. **No new analysis math** — only re-presentation.
- Verdict band derives from `orchardSafety.overallSite` + blocker counts → `good | caution | risk | unknown`. Mini metrics: suitable-species ratio, orchard count, total trees, water demand (gal/yr), blocker count.
- Blocking Issues strip flattens orchard placement risks, missing nursery/compost/irrigation/path banners, proximity/access risk rows, and placement-validation warnings into severity-ranked rows with "Fix on Map" CTAs.
- 2-col body: **Fit & Suitability** (Suitable Species) | **Execution Reality** (Design Metrics, Water Demand, Orchard Safety, Nursery & Compost Proximity, Access & Irrigation Tie-In). Full-width **Design Detail** section: Frost Windows, Spacing Logic, Placement Validation, Companion Planting, Yield Estimates. Closed-by-default **Methodology drawer**: §12+ long-form cards (SeasonalProductivity, TreeSpacingCalculator, CompanionRotationPlanner, AllelopathyWarning, OrchardGuildSuggestions, AgroforestryPatternAudit, CanopyMaturity, ClimateShiftScenario, ShadeSuccessionForecast) + AI Siting + VIEW ON MAP.
- Sticky Decision Rail: verdict, top blocker, next 3 actions, readiness chips (site / supply / logistics / species), Open Design Map + Jump to Blockers CTAs.
- CSS module gained ~270 lines for cockpit shell (`.cockpit*`, `.verdictHero*`, `.blockersStrip*`, `.rail*`, `.methodology*`, 2-col grid + sticky behavior, ≤1100px and ≤960px collapse breakpoints).

### Verified

- Typecheck: zero errors in new code (the 49 pre-existing errors all live in `src/v3/...` rails — unchanged from session start).
- Lint: clean for the touched files.
- Build, browser preview: deferred — earlier dev server in this session showed v3 lifecycle UI, not the Dashboard sidebar that mounts the legacy `'planting-tool'` and `'feasibility'` routes; needs a project that hits the Dashboard route to physically click through.

### Files

- `apps/web/src/features/decision/lib/exportFeasibilityBrief.ts` (new, 192 lines)
- `apps/web/src/features/decision/FeasibilityCommandCenter.tsx` (wired downloader)
- `apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx` (cockpit refactor)
- `apps/web/src/features/dashboard/pages/PlantingToolDashboard.module.css` (cockpit shell classes)

### Recommended next session

- Visual verification of both the brief CTA (download triggers, markdown matches expected sections) and the Planting cockpit (band rendering, blocker rows, sticky rail).
- Template the cockpit recipe onto a third Dashboard page — Hydrology and Ecological are next-most-cluttered candidates.
- Pre-existing `src/v3/...` typecheck errors remain — separate cleanup task.
