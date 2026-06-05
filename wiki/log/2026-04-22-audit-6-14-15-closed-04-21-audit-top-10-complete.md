# 2026-04-22 — Audit §6 #14 + #15 closed; 04-21 audit top-10 complete


Two-bundle session closing the last substantive items from the 04-21 deep audit.

**#14 — `SiteAssessmentPanel` wired to persisted Tier-3 scores.**
- New `useAssessment(projectId)` hook in `useProjectQueries.ts` with
  explicit `isNotReady` state for the `NOT_READY` route response.
- New `AssessmentResponse` Zod schema in `@ogden/shared`;
  `api.projects.assessment(id)` now returns a typed envelope.
- `SiteAssessmentPanel` three-state display: server row primary (headline
  "Overall X.X · computed at …" + 4 cards from `site_assessments`),
  NOT_READY banner + local preview, error banner + local preview.
- 3 new web tests. Bundle #12 parity (|Δ|=0.000) means no dual-display.
- ADR: `wiki/decisions/2026-04-22-site-assessment-panel-server-wiring.md`.

**#15 — `Country` extended to 'INTL'; NasaPowerAdapter registered.**
- `Country` enum: `['US', 'CA']` → `['US', 'CA', 'INTL']`.
- `ADAPTER_REGISTRY` type relaxed: `Record<Country, …>` →
  `Partial<Record<Country, …>>`. Orchestrator's existing
  `ManualFlagAdapter` fallback already handled missing slots.
- `climate.INTL` registered to `NasaPowerAdapter` (globally valid,
  grid-interpolated climatology). Other seven Tier-1 layers leave
  `INTL` undefined — documented gap with inline comments naming future
  global sources (SRTM/ALOS, SoilGrids, HydroSHEDS, etc.).
- DB migration 011: `CHECK (country IN ('US','CA','INTL'))` on
  `projects`. No data rewrite.
- `AssessmentFlag.country` local enum deduped to reuse shared `Country`.
- `NewProjectPage` wizard gains "International" option; financial engine
  `SiteContext.country` widened; two dashboards cleaned up unsafe casts.
- 4 new api INTL-routing tests + 1 shared Country parse test.
- ADR: `wiki/decisions/2026-04-22-country-intl-and-nasapower-registration.md`.

**Verification (all green):**
- `tsc --noEmit` clean across `packages/shared`, `apps/api`, `apps/web`.
- Shared: 68/68 (was 67). API: **490/490** (was 486). Web: **381/381** (was 374 — gains include useAssessment + layerFetcher + syncService).

**Audit state:** 04-21 top-10 critical path fully resolved. Items #1–#15
all marked DONE. `fetchNasaPowerSummary` enrichment layer stays intact
and untouched — orthogonal to the INTL registration.

**Post-landing follow-ups (same day):**
- Migration 011 applied to dev DB. First draft of the migration was
  incorrect — `projects.country` was `character(2)` (fixed-width), so a
  CHECK against `'INTL'` would attach cleanly but every
  `UPDATE country = 'INTL'` would fail with `value too long for type
  character(2)`. Fix: widen column to `text` first (`USING rtrim(country)`
  strips trailing-space padding from existing `'US '`/`'CA '` values so
  the CHECK compares against literal `'US'`/`'CA'`), re-set default to
  `'US'`, then attach CHECK. Verified at runtime: `INTL` update succeeds;
  `MX` rejected by the constraint. ADR updated with the "Gotcha caught
  during apply" paragraph.
- `DOMAIN_ORDER` in `features/navigation/taxonomy.ts` reordered:
  `'energy-infrastructure'` moved to index 1 per operator request.
  DashboardSidebar now renders Energy & Infrastructure as the second
  domain group directly after Site Overview. One-line constant change;
  `groupByDomain` output object is unchanged.
