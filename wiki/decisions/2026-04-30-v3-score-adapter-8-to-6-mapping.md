# 2026-04-30 — v3 ProjectScores: 8→6 score-label adapter

**Status:** Accepted
**Branch:** `feat/atlas-permaculture`
**Phase:** 4.2 (V3 single-seam unlock — scoring reconciliation)
**Files:**
- `apps/web/src/v3/data/adaptScores.ts` (new)
- `apps/web/src/v3/data/adaptLocalProject.ts`
- `apps/web/src/v3/data/useV3Project.ts`

## Context

The shared scoring engine in `packages/shared/src/scoring/computeScores.ts`
emits a fixed roster of `ScoredResult` labels:

- **8 weighted, load-bearing:** Water Resilience, Agricultural
  Suitability, Regenerative Potential, Buildability, Habitat Sensitivity,
  Stewardship Readiness, Community Suitability, Design Complexity.
- **1 weighted-but-unused:** `Ecological Integration` is in the `WEIGHTS`
  table at 0.10 but no `compute*` function emits it (todo in
  `wiki/decisions/2026-04-28-needs-yields-dependency-graph.md`).
- **Diagnostic facets at weight 0:** Water Retention, Drought Resilience,
  Storm Resilience, FAO LCC, USDA LCC, Canada Soil Capability (CA-only).

V3's view-model collapses to **6 plain-language categories** that the
lifecycle pages render: `landFit`, `water`, `regulation`, `access`,
`financial`, `designCompleteness`.

Previously `useV3Project` returned the MTC fixture for any project id
(Phase-1 scaffold). Phase 4.0 swapped that for a `LocalProject` shell
adapter but still emitted `'Insufficient Data'` placeholder scores. This
ADR records the decision for the actual 8→6 mapping that Phase 4.2 ships.

## Decision

| v3 category | Source label(s) | Rationale |
|---|---|---|
| `landFit` | avg(Agricultural Suitability, Regenerative Potential, **Stewardship Readiness**) | Steward readiness reflects "is the steward set up to actually run this land" — same signal Land Fit communicates in the brief. |
| `water` | Water Resilience | 1:1 |
| `regulation` | Habitat Sensitivity | Wetlands / floodplain / critical-habitat are the regulatory constraints today; a dedicated Regulation scorer is on the Phase-7 backlog. |
| `access` | Buildability | Buildability already factors infrastructure + terrain + remediation risk. Closest available proxy for "can we get to and onto this site." |
| `financial` | Community Suitability | Until a Cat-22 economic scorer lands, community suitability is the closest-fit signal (labour pool, demographics, demand catchment). |
| `designCompleteness` | `100 − Design Complexity` | Design Complexity inverts cleanly: a high-complexity site is one where the design is the long pole; we surface that as "completeness gap." |

**Confidence rollup** (per category): weakest-wins across contributing
labels — matches the same rule used by `SiteAssessmentWriter`.

**`ConfidenceTier` mapping**: `high → high`, `medium → good`, `low →
low`. The v3 `mixed` tier is reserved for the explicit "multiple sources
disagree" case the shared scorer does not emit, so it is never produced
by this adapter.

**Verdict synthesis**: 6-tier threshold table on the overall score
(`computeOverallScore`):

| Min score | Status | Label |
|---|---|---|
| 80 | `strong` | Strong |
| 65 | `supported` | Supported |
| 50 | `supported-with-fixes` | Supported with Required Fixes |
| 35 | `conditional` | Conditional |
| 20 | `at-risk` | At Risk |
| 0 | `blocked` | Blocked |

The summary string points at the weakest dimension among categories that
actually carry data, so the verdict is grounded in a real constraint
rather than a generic platitude.

## Why these proxies and not new scorers

- **Regulation = Habitat Sensitivity**: Adding a dedicated regulatory
  scorer is a Phase-7 deliverable (it requires authoring the regulatory
  ontology and threading conservation-authority data into the scorer
  inputs). Habitat Sensitivity is the closest existing signal that
  already aggregates wetlands, critical habitat, and land-cover sensitivity.
- **Financial = Community Suitability**: A real financial scorer needs
  capital intensity, break-even modelling, and market catchment. None of
  those inputs flow through `computeAssessmentScores` today. Community
  Suitability captures the demand-side signal (labour pool, demographics)
  which is the load-bearing constraint for educational/regen enterprises.

When dedicated scorers ship, both proxies move to a 1:1 mapping; the
adapter shape stays stable.

## Site-data dependency

`useV3Project` now selects `useSiteDataStore.dataByProject[id]` and
passes the slice into `adaptLocalProjectToV3`. The adapter only invokes
`computeAssessmentScores` when at least one Tier-1 layer has
`fetchStatus === 'complete'`; otherwise it falls back to the existing
`'Insufficient Data'` placeholder shape. This means /v3 pages render an
honest empty state during the layer-fetch loading window rather than a
fictional verdict.

The `useMemo` is keyed on `(projectId, projects, dataByProject)` so the
hook re-renders when a layer fetch completes.

## Verification

- `tsc --noEmit` clean for `@ogden/web`.
- The adapter is a pure function — fixture-driven unit coverage can land
  in a follow-up. The `MTC_PROJECT` smoke path is unchanged (preserved
  as a deterministic dev sentinel under id `'mtc'`).

## Out of scope (deferred)

- Real `Regulation` and `Financial Reality` scorers — Phase 7.
- `Ecological Integration` emission from `computeScores.ts` — referenced
  in `wiki/decisions/2026-04-28-needs-yields-dependency-graph.md`.
- Brief content adapters (`diagnose` / `prove` / `operate` / `build`) —
  Phase 5 + Phase 6.
- Wiring `dataByProject` lookup by `serverId` — every store action
  threads the local id today; will revisit if v3 routes start being
  reached by server id.
