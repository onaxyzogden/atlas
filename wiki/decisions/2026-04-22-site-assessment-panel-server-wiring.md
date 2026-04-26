# 2026-04-22 — Site assessment panel wiring: server-primary, local-fallback

**Status:** Accepted
**Audit item:** §6 #14 — "Dispose of the `useAssessment` zombie hook or
wire a fresh one into `SiteAssessmentPanel` to display persisted Tier-3
scores from `site_assessments`."

## Context

The 04-21 audit cited `useAssessment()` as a "zombie hook" at
`apps/web/src/hooks/useProjectQueries.ts:48`. Direct read on 04-22
confirmed the hook **did not exist** — line 48 is now `useCompleteness`.
Either the hook was already cleaned up in a prior bundle without updating
the audit, or the audit's note was premature. Either way: #14 is purely
additive — the hook needs to be created, not deleted.

`SiteAssessmentPanel` was rendering client-side recomputed scores against
`LocalProject` metadata (boundary presence, address presence, zoning
notes, water rights notes). Those scores were preliminary by design —
the real Tier-3 `site_assessments.overall_score` had been persisted for
weeks but never surfaced in the UI.

Bundle #12 (2026-04-22 earlier) proved the writer path at |Δ|=0.000
parity against the scorer on real DB rows, so the persisted value is
trustworthy. This unblocked the wiring.

The `GET /projects/:id/assessment` endpoint at
`apps/api/src/routes/projects/index.ts:146–178` already returned the
right shape: raw `site_assessments` row spread into `{ data, error: null }`
on success, `{ data: null, error: { code: 'NOT_READY' } }` when no
current row exists.

## Decision

**Add `useAssessment(projectId)` to `useProjectQueries.ts`. Wire it into
`SiteAssessmentPanel` as the primary score source. Fall back to the
existing local computation when the server returns `NOT_READY`, when the
fetch errors, or while the initial request is in flight.**

### Hook contract

```ts
function useAssessment(projectId: string): {
  data: AssessmentResponse | null;
  isLoading: boolean;
  isNotReady: boolean;   // NOT_READY code swallowed — expected state
  isError: boolean;
  // … other React Query fields
}
```

`NOT_READY` is a normal not-yet-computed state (Tier-3 writer hasn't fired
yet), not an error. The hook catches `ApiError` with `code === 'NOT_READY'`
and returns `data: null` instead of propagating. Any other failure
propagates through React Query's `isError` channel.

### Panel display

- **Has server row**: headline "Overall 78.0 · computed 2026-04-22 01:08",
  four score cards populated from `site_assessments` columns
  (`suitability_score`, `buildability_score`, `water_resilience_score`,
  `ag_potential_score`), confidence from the server row, sources from
  `data_sources_used`.
- **isNotReady**: banner "Assessment pending Tier-3 completion. Showing
  preview based on project metadata," followed by the existing local scores.
- **isError**: banner "Could not load server-side assessment — showing
  local preview," followed by the existing local scores.
- **isLoading**: brief "Loading latest assessment…" banner while
  `react-query` fetches the first time.

Flags (risks/opportunities/limitations) continue to come from the local
`computeLocalFlags(project)` helper. Server-side enriched flags are in
`site_assessments.flags` but the current flag UI doesn't consume them
yet — follow-up bundle.

### AssessmentResponse schema

Added to `packages/shared/src/schemas/assessment.schema.ts` to give the
api-client method a real return type instead of `unknown`. Fields mirror
the route's raw-row spread: snake_case, jsonb fields typed as `unknown`,
optional `terrainAnalysis` block.

## Consequences

- **Investment-grade scores visible in the UI** for projects where Tier-3
  has run (Rodale 1 shows "Overall 78.0", Rodale 2 shows "Overall 50.0").
  The parity guarantee from bundle #12 means these match the scorer
  exactly; no dual-display needed.
- **Zero regression for brand-new projects** — local preview still shows
  up with a clear "pending Tier-3 completion" notice.
- **Hook + schema become reusable** — any other component needing the
  persisted assessment (future ProjectDashboard cards, PDF export variants,
  investor-summary AI input) now has a typed server-authoritative source.
- **React Query key** `['projects', 'assessment', id]` is distinct from
  `['projects', 'completeness', id]` so cache invalidation stays precise.

## Files

- `packages/shared/src/schemas/assessment.schema.ts` — `AssessmentResponse` schema.
- `apps/web/src/lib/apiClient.ts` — typed return on `api.projects.assessment(id)`.
- `apps/web/src/hooks/useProjectQueries.ts` — `useAssessment` hook + `projectKeys.assessment`.
- `apps/web/src/features/assessment/SiteAssessmentPanel.tsx` — three-state wiring + formatTimestamp helper + buildServerScores helper.
- `apps/web/src/tests/useAssessment.test.tsx` — 3 hook tests (NOT_READY path, data path, empty-id disables).

## Tests

- Web suite: **381/381 green** (was 374 pre-bundle — added 3 useAssessment
  tests; other additions came from shared's Country parse test + registry test).

## Alternatives considered

- **Delete local computation entirely** — rejected; new projects with no
  Tier-3 run would be blank. Keeping the local path as a fallback costs
  nothing.
- **Server-side scores only, spinner while loading** — rejected; first
  paint would be empty for the ~1s of fetch + slower on projects without
  Tier-3 data.
- **Persist local preview to `site_assessments`** — rejected; the table
  is Tier-3 authoritative. Seeding it with metadata-only scores would
  break parity with the scorer.
- **Dual-display (local + server side-by-side)** — rejected; parity was
  proven at |Δ|=0.000 so one value is always correct. Server value wins.

## Follow-up

- Surface `site_assessments.flags` (server-enriched risk/opportunity flags)
  in the panel instead of recomputing locally.
- Surface `terrainAnalysis` block (curvature, viewshed, frost pocket,
  cold-air drainage) that's already on the response but not rendered.
- Hook up query invalidation when Tier-3 pipeline completes so the panel
  refreshes without a manual page reload.
