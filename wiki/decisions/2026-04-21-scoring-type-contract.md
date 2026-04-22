# 2026-04-21 — Scoring Type Contract: Discriminated Union + DB-Boundary Validator

**Status:** accepted
**Scope:** `packages/shared/src/scoring/`, `apps/api/src/services/assessments/SiteAssessmentWriter.ts`, `apps/web/src/lib/layerFetcher.ts`, `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx`

## Context

`MockLayerResult.summary` was typed as `Record<string, unknown>`. Web-side fetchers were writing sentinel strings (`'N/A'`, `'Unknown'`, narrative buffer descriptions) into numeric slots that downstream consumers (dashboards, scorers) read as `number`. Failure surfaced as `wetland_pct.toFixed is not a function` at runtime in the ecological dashboard, and a latent display bug where `regulated_area_pct` (narrative string) was being coerced to `'N/A'` by a percent-formatter in the UI.

Compile-time was silent because the permissive `Record` type accepted anything. Even after fixing the UI, the contract stayed honest only as long as every fetcher and every persisted `project_layers.summary_data` jsonb blob stayed disciplined — a fragile invariant.

Closes audit issue 5.6 in `ATLAS_DEEP_AUDIT_2026-04-21.md`.

## Decision

### Part A — Compile-time: discriminated union (scope B, 4 Tier-1 layers)

`MockLayerResult` is a mapped type over `LayerType`:

```ts
export type MockLayerResult = {
  [K in LayerType]: MockLayerResultBase & {
    layerType: K;
    summary: LayerSummaryFor<K>;
  }
}[LayerType];
```

`LayerSummaryFor<K>` resolves to a fully-typed interface for the 4 Tier-1 ecological layers (`elevation`, `soils`, `climate`, `wetlands_flood`) and falls back to `Record<string, unknown>` for the remaining 36 `LayerType` variants — incremental tightening path preserved.

Every typed summary interface includes `[key: string]: unknown` as its first member so the rule engine's dynamic key reads still compile; named keys stay strictly typed.

Fetchers normalized to write `null` — never `'N/A'` / `'Unknown'` — into numeric slots at 7 call sites in `apps/web/src/lib/layerFetcher.ts`. Consumer (`EcologicalDashboard.tsx`) shed its local duplicate interfaces, imported shared types, deleted the buggy `formatPct` helper, and replaced `parseFloat(String(...))` gymnastics with direct null checks.

### Part B — Runtime: validator at the API DB boundary

Compile-time types don't constrain what a stale jsonb row contains. `packages/shared/src/scoring/schemas.ts` exports zod schemas mirroring the 4 typed summaries and a dispatcher `validateLayerSummary(layerType, raw)`.

`apps/api/src/services/assessments/SiteAssessmentWriter.ts:layerRowsToMockLayers` runs every DB row's `summary_data` through the validator before handing it to `computeAssessmentScores`. Failure mode is **lenient-and-logged**: per-field `.catch(null)` coerces invalid values (stale `'N/A'` strings in numeric slots) to null, and the set of coercions is logged via pino with `{ projectId, layerType, coercions: [{ path, message, received }] }`. The layer is never dropped — partial data scores better than no data, and the scorer already tolerates nulls.

Unknown/extra keys pass through (`.passthrough()`) because the rule engine reads dynamic keys off every layer. Unmigrated layer types (the 36 without a typed interface) pass through untouched.

## Rationale

- **Scope B over scope A.** Original plan was to type all ~40 `LayerType` variants in one diff. Critical review showed: 88 fetcher literals, 18 consumer files, >2k LOC of CSS/JSX churn. Scope B closes the immediate crash class in one reviewable diff and preserves `Record<string, unknown>` as a graceful fallback for untyped layers.
- **Validator in shared, not API.** Shared already depends on zod; web can consume the same schemas later (e.g., for local pipeline dry-runs) without a duplicate source of truth.
- **Coerce, don't reject.** Rejecting a whole layer on one bad field would tank overall-score confidence on any legacy row; per-field null coercion preserves every valid signal.

## Consequences

- Compile-time discriminated-union errors now flag mismatches at every new fetcher call site or consumer. The next 36 layer variants can be tightened one at a time without breaking existing code.
- DB-boundary validator prevents the class of crash going forward even if a future fetcher regresses. Coercion logs give telemetry: a spike in `coerced to null` events means a fetcher is writing stale sentinels again.
- Audit item 5.6 marked **RESOLVED** as of 2026-04-21.

## Deferred

- 36 remaining `LayerType` variants still carry `'N/A'` / `'Unknown'` strings in their fetchers. Low risk because consumers for those layers already guard with `parseFloat(String(...))` or don't render numerics.
- Pre-existing monorepo TS project-reference + vitest subpath-exports quirks cause `@ogden/shared/scoring` to fail resolution in `apps/api` tsc + vitest. Baseline on main has identical failures; this session did not regress the count. Separate followup.
- Adapter-side test in `apps/api/src/tests/SiteAssessmentWriter.test.ts` was added (3 new cases) but currently can't execute until the vitest resolution fix lands. Validator itself is covered by 5 green tests in `packages/shared/src/tests/scoringSchemas.test.ts`.
