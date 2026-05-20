# 2026-04-23 — En-dash rendering fix + formatRange helper extraction


Two-commit pass on `main` closing a UI bug in the Economics panel and
Investor Summary export where literal `\u2013` escapes were rendering as
six raw characters instead of an en-dash.

**Root cause.** JSX text does not process JavaScript string escapes — only
string/template literals do. The offending lines mixed `{...}` JSX
expressions with bare `$` signs and `\u2013` in raw JSX text, which looked
template-literal-shaped but wasn't.

**Commits:**
- `5ac0ee6` `fix(web): render en-dash in Economics + Investor Summary ranges`
  — Replaced seven `\u2013` JSX-text occurrences with literal U+2013 across
  `apps/web/src/features/economics/EconomicsPanel.tsx` (L146, 350, 416, 453,
  478) and `apps/web/src/features/export/InvestorSummaryExport.tsx` (L252,
  281). Template-literal sites and `{'\u2013'}` JSX-expression sites were
  intentionally left untouched.
- `aea6de5` `refactor(web): extract shared formatKRange / formatUsdRange /
  fmtK helpers` — New `apps/web/src/lib/formatRange.ts` as the single
  source of truth for dollar-range formatting. Refactored 9 range sites
  across EconomicsPanel, InvestorSummaryExport, and ScenarioPanel to
  consume it; deleted the local `fmtK` in `ScenarioPanel.tsx`.

**Verification.** Static grep of `apps/web/src` confirmed no surviving
`\u2013` in JSX text (remaining matches all inside `.ts` string/template
literals or the `{'\u2013'}` expression at
`StructurePropertiesModal.tsx:108`). Browser check via preview MCP confirmed
real en-dashes across Economics Overview / Costs / Revenue tabs and the
Investor Summary export modal.

**Triage pass alongside.** Six prior uncommitted buckets sitting in the
working tree were reviewed and landed:
- `main`: NASA POWER adapter (`0f9a845`), SSURGO multi-horizon soil profile
  (`7edb12e`), docs + wiki + `.gitignore` hygiene (`94b2085`).
- `feat/shared-scoring` → PR #1 merged as `7708af8`: shared scoring lift
  (`adf2068`), `SiteAssessmentWriter` + pipeline orchestrator (`d63e06f`),
  Penman-Monteith PET dispatcher + Hydrology UI thread-through (`3cd44dc`).

**Deferred.** ClaudeClient prompt-caching rewrite + tests held back per
operator direction — "not ready for live yet."
