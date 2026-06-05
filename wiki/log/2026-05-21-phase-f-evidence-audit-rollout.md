# 2026-05-21 — Phase F evidence-audit rollout (F.6 + F.7)

**Branch:** `feat/atlas-permaculture`
**ADR:** [[decisions/2026-05-21-atlas-phase-f-evidence-audit-rollout]]

Completes the deferred follow-up on F.4: `emitEvidenceAudit` now fires
from every live Evidence panel, not just `LandVerdictCard`. Six
sub-phase commits (one per panel) plus this wiki commit.

## Commit roster

- **F.6 `8e6d856c`** — `DecisionTriad` (+ `FlagCard`, `BucketColumn`
  prop threading for `projectId`). Selector `decision-triad`, panelKey
  `DecisionTriad`. `IntelligenceSummaryCard` confirmed orphan; F.6
  ships `DecisionTriad` only.
- **F.7.1 `233307ae`** — `SiteSummaryNarrativeSection` (+ parent
  threading in `SiteIntelligencePanel.tsx`). Selector `site-narrative`,
  panelKey `SiteSummaryNarrativeSection`.
- **F.7.2 `28fa5edc`** — `WaterStorageCard`. Selector `water-storage`,
  panelKey `WaterStorageCard`.
- **F.7.3 `abd9cac1`** — `ThreeEthicsRollupCard`. Selector
  `three-ethics`, panelKey `ThreeEthicsRollupCard`.
- **F.7.4 `ee81f06c`** — `WaterRouterCard`. Selector `water-router`,
  panelKey `WaterRouterCard`. Includes side-fix removing a per-render
  `missing` array from the `useMemo` dep list (would have flooded the
  audit log every render); `missing` + `warnings` now derived inside the
  memo from primitives.
- **F.7.5 `a1cf0426`** — `CapitalPartnerSummaryExport`. Selector
  `capital-partner`, panelKey `CapitalPartnerSummaryExport`. Null-guarded
  variant (returns null when `!model`).
- **F.7.6 (this commit)** — ADR + log + index + LAUNCH-CHECKLIST strike.

## Verification

- Web lint per sub-phase: no new errors on the six touched files;
  pre-existing foreign-WIP errors in `StepBoundary.tsx`,
  `ObserveAnnotationLayers.tsx`, `vegetationResolver.ts`,
  `HostUnion*Test` unchanged.
- Web tests: 1825 baseline holds (no test files added).
- Branch hygiene: `git fetch origin && git status -sb` before each push.
  External rebase between F.7.4 and F.7.5 was survived; F.7.1–F.7.4
  landed in origin intact, F.7.5 re-applied on top.

## Surface coverage after F.7

All 7 live Evidence consumers persist to `evidence_audit_log`:
`LandVerdictCard`, `DecisionTriad`, `SiteSummaryNarrativeSection`,
`WaterStorageCard`, `ThreeEthicsRollupCard`, `WaterRouterCard`,
`CapitalPartnerSummaryExport`. The 8th selector
(`intelligence-summary`) is orphaned and explicitly out of scope.

## Out of scope (carried forward)

Server-side replay tool, Playwright CI, tooltip Evidence retrofit, PDF
Evidence surface, i18n, per-fragment confidence bands, orphan-selector
cleanup. See LAUNCH-CHECKLIST Post-Protocol Aspirations.
