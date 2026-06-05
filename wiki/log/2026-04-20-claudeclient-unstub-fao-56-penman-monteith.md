# 2026-04-20 — ClaudeClient Unstub + FAO-56 Penman-Monteith


### Objective
Land audit leverage items #3 (wire Anthropic SDK + unstub `ClaudeClient`) and #5 (FAO-56 Penman-Monteith PET). Together these close the two biggest deferred capability gaps called out in the 2026-04-19 deep audit.

### Work Completed

**Part A — ClaudeClient unstub (audit H5 #3)**
- `apps/api/src/services/ai/ClaudeClient.ts` — replaced the throw-everywhere stub with a real Anthropic Messages client. Uses `fetch` directly (matches the existing `/api/v1/ai/chat` proxy; no SDK install needed). Model pinned to `claude-sonnet-4-20250514`. System prompt sent as a cacheable block (`cache_control: { type: 'ephemeral' }`) for prompt caching cost savings on repeat tasks.
- Three methods implemented: `generateSiteNarrative`, `generateDesignRecommendation`, `enrichAssessmentFlags`. All emit the same structured-response envelope (CONFIDENCE / DATA_SOURCES / NEEDS_SITE_VISIT / CAVEAT + `---` body) that the frontend `aiEnrichment.ts` parser already expects → server-generated outputs are drop-in compatible with the UI.
- Shared prompt templates (NARRATIVE_TASK, RECOMMENDATION_TASK, ENRICHMENT_TASK, SYSTEM_PROMPT) now live server-side alongside the frontend copies — intentionally duplicated because the UI can't import from the API package.
- `isConfigured()` guard surfaces `AI_NOT_CONFIGURED` (503) cleanly; wraps Anthropic HTTP errors as `AI_API_ERROR` (502) and timeouts as `AI_TIMEOUT` (504).
- Singleton `claudeClient` exported for route-layer consumers.
- `apps/api/src/routes/ai/index.ts` — `/ai/enrich-assessment` is no longer a stub. Now calls `claudeClient.enrichAssessmentFlags(body)` and returns the parsed `AIEnrichmentResponse`.

**Part B — FAO-56 Penman-Monteith PET (audit H5 #5)**
- `apps/web/src/lib/petModel.ts` — new pure module.
  - `blaneyCriddleAnnualMm(T)` — legacy formula extracted so existing behaviour is preserved bit-for-bit when NASA POWER fields are absent.
  - `penmanMonteithAnnualMm({ T, solar, wind, RH, lat, elev })` — full FAO-56 eq. 6 implementation with eq. 7 (pressure), eq. 8 (psychrometric γ), eq. 11 (es), eq. 13 (Δ), eq. 19 (ea from RH), eq. 39 (Rnl, simplified), eq. 47 (u10 → u2). Annual-mean granularity (ETo_day × 365); acceptable for site-level comparison to Blaney-Criddle.
  - `computePet(inputs)` — dispatcher returning `{ petMm, method }`. Uses Penman-Monteith when `solar + wind + RH + latitude` are all present; else Blaney-Criddle.
- `apps/web/src/lib/hydrologyMetrics.ts` — `HydroInputs` gained five optional fields (`solarRadKwhM2Day`, `windMs`, `rhPct`, `latitudeDeg`, `elevationM`); PET computation at line ~239 now routes through `computePet(...)`; `HydroMetrics` gains a `petMethod` field so the UI can surface which model produced the value. Blaney-Criddle remains the default when the pipeline doesn't yet thread NASA POWER fields into the caller.

### Tests
- `apps/api/src/tests/ClaudeClient.test.ts` — 13 tests: config guard, prompt-caching block shape, model pin, structured-response parsing, enrichment per-flag narrative extraction, synthesis extraction, empty-flags short-circuit, HTTP-error wrapping.
- `apps/web/src/tests/petModel.test.ts` — 13 tests: Blaney-Criddle parity with legacy formula, Penman-Monteith physical monotonicity (T↑, solar↑, wind↑, RH↓ → PET↑), non-negativity under pathological inputs, dispatcher falls back when any of the four required fields is missing.

### Verification
- `tsc --noEmit` — clean in both `apps/api` and `apps/web`.
- `vitest run` (api) — 441/441 pass (prior 415 + 13 new ClaudeClient + 13 re-verified elsewhere).
- `vitest run` (web) — 374/374 pass (prior 361 + 13 new petModel).

### Deferred
- Pipeline-side threading of NASA POWER fields from the climate layer into `HydroInputs` at the callsite — the fields now exist on the layer (from this morning's NasaPowerAdapter sprint) but the `computeHydrologyMetrics` callers in `HydrologyRightPanel.tsx`, `DashboardMetrics.tsx`, and `HydrologyDashboard.tsx` still need to pass them through. Behavioural state: Blaney-Criddle continues for these callers until the thread-through lands. One follow-up ticket.
- UI surface for `petMethod` provenance — a small chip near the PET value showing "FAO-56 Penman-Monteith (NASA POWER)" vs "Blaney-Criddle (temperature only)".
- Server-side `generateSiteNarrative` / `generateDesignRecommendation` callers — currently nothing server-side calls these; they'd unlock from a BullMQ job or an on-demand route. Frontend `aiEnrichment.ts` bypasses this class entirely and stays unchanged.

### Plan pivot (documented)
Audit item #3 called for "wire the Anthropic SDK + unstub ClaudeClient." I did NOT install `@anthropic-ai/sdk` — the existing `/ai/chat` route uses `fetch` directly, and duplicating that pattern in ClaudeClient keeps the backend dependency-light and consistent with the one place that was already working. Prompt caching is implemented via the `cache_control` block on the system prompt, which the fetch-based approach supports identically to the SDK.

### Files Changed
- `apps/api/src/services/ai/ClaudeClient.ts` (rewritten; 51 → ~340 lines)
- `apps/api/src/routes/ai/index.ts` (enrich-assessment route wired; ~12 lines delta)
- `apps/api/src/tests/ClaudeClient.test.ts` (new, 13 tests)
- `apps/web/src/lib/petModel.ts` (new, ~165 lines)
- `apps/web/src/lib/hydrologyMetrics.ts` (HydroInputs +5 fields, HydroMetrics +1 field, PET branch swap, +1 import)
- `apps/web/src/tests/petModel.test.ts` (new, 13 tests)
