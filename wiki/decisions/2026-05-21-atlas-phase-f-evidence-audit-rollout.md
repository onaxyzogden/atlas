# 2026-05-21 — Atlas Phase F evidence-audit rollout (F.6 + F.7)

**Branch:** `feat/atlas-permaculture`
**Status:** Landed
**Continues:** [[2026-05-21-atlas-phase-f-post-protocol-followups]] (F.1–F.5)

---

## Context

F.4 (commit `e0443b8b`) shipped the `evidence_audit_log` ledger end-to-end:
migration 033, `POST /api/v1/projects/:projectId/evidence-audit/log` route,
`lib/evidence/hashInputs.ts` (stable-stringify + SHA-256 via
`crypto.subtle.digest`), `lib/evidence/auditEmit.ts` fire-and-forget helper,
and `api.evidenceAudit.log(...)` apiClient binding. **Only `LandVerdictCard`
was instrumented in F.4** — the other seven Evidence panels using
`selectEvidenceFor(...)` still emitted Evidence without persisting to the
audit log.

After ~24 hours of dev observation the F.4 emit path is stable (no
runaway re-emits, no apiClient errors, no console churn). This phase
rolls the same memo+effect pattern to every remaining live consumer so
the audit log covers the full Evidence surface.

## Decisions

### F.6 — `DecisionTriad` (commit `8e6d856c`)

**File:** `apps/web/src/features/dashboard/DecisionTriad.tsx`
**Selector:** `selectEvidenceFor('decision-triad')`
**panelKey:** `'DecisionTriad'`

`FlagCard` and `BucketColumn` props extended with `projectId: string`;
`projectId={project.id}` threaded from the `DecisionTriad` root down
through the three `BucketColumn` instances into each `FlagCard`. The
emit hook lives on `FlagCard` (one row per rendered flag), keyed on the
memoised `{ flag, bucket }` input. `IntelligenceSummaryCard` was
considered but proved orphaned — its selector exists but the component
was decommissioned in Phase A.1, so no consumer remains. F.6 ships
`DecisionTriad` only.

### F.7.1 — `SiteSummaryNarrativeSection` (commit `233307ae`)

**File:** `apps/web/src/components/panels/sections/SiteSummaryNarrativeSection.tsx`
**Selector:** `selectEvidenceFor('site-narrative')`
**panelKey:** `'SiteSummaryNarrativeSection'`

Props extended with `projectId: string`; `SiteIntelligencePanel.tsx`
threads `projectId={project.id}` into the section JSX. Inputs memoised
as `{ acreage, layerCount, liveCount, modelVersion: undefined,
hasAiNarrative, caveat: enrichment?.aiNarrative?.caveat }`. Deps
`[acreage, layerCount, liveCount, enrichment?.aiNarrative]` — the
derived booleans + caveat are stable functions of those four primitives.

### F.7.2 — `WaterStorageCard` (commit `28fa5edc`)

**File:** `apps/web/src/v3/plan/cards/water-management/WaterStorageCard.tsx`
**Selector:** `selectEvidenceFor('water-storage')`
**panelKey:** `'WaterStorageCard'`

The pre-existing `useMemo` wrapping `selectEvidenceFor(...)` was split:
`evidenceInputs` returns `{ totalStorageM3, nodesByKind, overflowWarnings }`;
`evidenceItem` wraps the selector; `useEffect` emits. `projectId =
project.id` from the existing prop; no parent threading required.

### F.7.3 — `ThreeEthicsRollupCard` (commit `abd9cac1`)

**File:** `apps/web/src/v3/plan/cards/principle-verification/ThreeEthicsRollupCard.tsx`
**Selector:** `selectEvidenceFor('three-ethics')`
**panelKey:** `'ThreeEthicsRollupCard'`

Same pattern. Inputs `{ perEthicStatus, perEthicFeatureCount,
perEthicRationale, principleCheckCount }`. `projectId = project.id`.

### F.7.4 — `WaterRouterCard` (commit `ee81f06c`)

**File:** `apps/web/src/v3/plan/cards/water-management/WaterRouterCard.tsx`
**Selector:** `selectEvidenceFor('water-router')`
**panelKey:** `'WaterRouterCard'`

Same pattern + a side fix: the original code listed a per-render
`missing` array in the `useMemo` dep list, which would have invalidated
the memo every render and flooded the audit log. The fix lists only
primitives (`[scoredCount, flaggedCount, gated, parcelReady,
elevationReady, aspectReady]`) and rebuilds `missing` + `warnings`
inside the memo. Inputs `{ routedEdgeCount, meanRoutingConfidence,
hadDem, hadAspect, headLossBudgetM: 2.0, warnings }`.

### F.7.5 — `CapitalPartnerSummaryExport` (commit `a1cf0426`)

**File:** `apps/web/src/features/export/CapitalPartnerSummaryExport.tsx`
**Selector:** `selectEvidenceFor('capital-partner')`
**panelKey:** `'CapitalPartnerSummaryExport'`

Null-guarded variant: `evidenceInputs` returns `null` when `!model`,
`evidenceItem` is null-guarded, the `useEffect` short-circuits when
either is null. Inputs (verbatim, no new fields): `{ totalCapitalUsd,
enterpriseCount, costLineItemCount, revenueStreamCount, natCapUsdYr,
natCapUsdPerTc, troughYear, troughValueUsd, breakevenYear,
somHasTrajectory, somHorizonYears, missionScore, pdfAssumptionCount }`.

**Covenant check:** the audit payload persists `totalCapitalUsd` and
`natCapUsdYr` numerically. No new labels were added and no public-facing
copy changed. Capital framing remains "capital partners & allies" /
"appreciation of stewarded land value" per
[[fiqh-csra-erased-2026-05-04]]. The audit ledger is a private
reproducibility surface, not a customer-facing artefact.

## IntelligenceSummaryCard orphan note

The `intelligence-summary` selector at `apps/web/src/lib/evidence/selectors/`
remains live in source but has no consumer — `IntelligenceSummaryCard`
itself was decommissioned in Phase A.1 in favour of `LandVerdictCard` +
`ObserveChecklistAside` as the Observe top-of-view (see
[[2026-05-20-atlas-phase-a-apricot-lane-decision-layer]]). It is
explicitly out of scope for F.7. Removing the orphan selector is a
separate clean-up slice; leaving it allows the (currently dormant)
panel to be revived without re-deriving the selector.

After F.6 + F.7, **all 7 live Evidence consumers** (`LandVerdictCard`,
`DecisionTriad`, `SiteSummaryNarrativeSection`, `WaterStorageCard`,
`ThreeEthicsRollupCard`, `WaterRouterCard`, `CapitalPartnerSummaryExport`)
persist to `evidence_audit_log` on every distinct input set. The 8th
selector is the orphan.

## Verification

- `pnpm --filter @ogden/web run lint` after each sub-phase: no new
  errors on any of the six touched files
  (`DecisionTriad.tsx`, `SiteSummaryNarrativeSection.tsx`,
  `SiteIntelligencePanel.tsx`, `WaterStorageCard.tsx`,
  `ThreeEthicsRollupCard.tsx`, `WaterRouterCard.tsx`,
  `CapitalPartnerSummaryExport.tsx`). Pre-existing foreign-WIP errors
  in `StepBoundary.tsx`, `ObserveAnnotationLayers.tsx`,
  `vegetationResolver.ts`, `HostUnion*Test` unchanged (documented in
  F.4 + F.5 ADRs).
- `pnpm --filter @ogden/web run test` — 1825 prior pass count holds.
  No new test files added; F.4's `hashInputs` + route-path coverage
  exercises the shared emit path.
- Branch hygiene: `git fetch origin && git status -sb` before each
  push. Branch was force-pushed externally between F.7.4 and F.7.5
  ([[project-branch-rebase]]); the F.7.1–F.7.4 commits survived the
  rebase intact, F.7.5 was re-applied on top.

## Commits

| Sub | Commit | Title |
|---|---|---|
| F.6 | `8e6d856c` | `feat(evidence): F.6 — emitEvidenceAudit rollout to DecisionTriad` |
| F.7.1 | `233307ae` | `feat(evidence): F.7.1 — emitEvidenceAudit rollout to SiteSummaryNarrativeSection` |
| F.7.2 | `28fa5edc` | `feat(evidence): F.7.2 — emitEvidenceAudit rollout to WaterStorageCard` |
| F.7.3 | `abd9cac1` | `feat(evidence): F.7.3 — emitEvidenceAudit rollout to ThreeEthicsRollupCard` |
| F.7.4 | `ee81f06c` | `feat(evidence): F.7.4 — emitEvidenceAudit rollout to WaterRouterCard` |
| F.7.5 | `a1cf0426` | `feat(evidence): F.7.5 — emitEvidenceAudit rollout to CapitalPartnerSummaryExport` |
| F.7.6 | (this) | `docs(wiki): F.7.6 — Phase F evidence-audit rollout ADR + log + index` |

## Out of scope

- Server-side replay tool — given an `input_hash`, recompute the
  selector and assert byte-identical output. Durability test, deferred.
- Playwright CI integration — F.1's snapshot script is a manual `pnpm`
  invocation today.
- Tooltip Evidence retrofit (`HostCanopyUnionTooltip` B4 Slice M
  drill-down) — keeps its own surface.
- PDF Evidence surface — static PDF assumption list still truncated to 15.
- i18n on Evidence strings — English-only today.
- Per-fragment confidence ranges (low/mid/high band).
- `intelligence-summary` orphan-selector cleanup — separate slice.

## Covenant restatement

No capital framing changes. The Capital Partner panel audit payload
persists existing numeric inputs only (`totalCapitalUsd`, `natCapUsdYr`,
`missionScore`). Public-facing labels and surface language remain
"capital partners & allies" / "appreciation of stewarded land value"
per [[fiqh-csra-erased-2026-05-04]]. No CSRA / *bayʿ mā laysa ʿindak* /
salam framing reintroduced. 3-item Observe/Plan/Act IA unchanged.
Mobile Overview stack stays flat ([[feedback-mobile-overview-stack]]).
