# 2026-06-17 -- Threshold 1: The Reality Check (4 stages)

> **Backfilled 2026-06-19** -- shipped 2026-06-17 without a contemporaneous record; this page and its ADR were authored retroactively to Threshold-3 parity.

**Objective:** Build the first Plan-stage readiness review -- a non-tier hinge after `s3-systems-reading` where the steward measures the Tier-0 declaration against the eleven reception surveys, classifies each intent element, and approves a bounded Planning Direction Statement, behind a soft (never-blocking) Mode-4 gate.

**ADR:** [[decisions/2026-06-17-atlas-threshold1-reality-check]]
**Entity:** [[entities/plan-tier-shell]] (hosts the chrome) -- [[entities/act-tier-shell]] byte-identical.

## Completed

- **Stage A (`80c3b903`)** -- the threshold scaffold: `THRESHOLDS` entry after `s3-systems-reading`, `useRealityCheckStore` (`ogden-reality-check`, v1; `idbPersistStorage` + `rehydrateWithLogging`; in `syncManifest` `SYNCED_STORES`), and the `plan/threshold/$thresholdId` route with a `beforeLoad` redirect to `/plan` until `thresholdOpen` (Tier-1 6/6 AND Tier-2 5/5). 12/12.
- **Stage B (`960cf525`)** -- `realityCheckModel.ts`: `REALITY_CHECK_COPY`, `detectCsaLikeText`, `CSA_ADVISORY_COPY`; the six `EVIDENCE_STRANDS` + `STRAND_SURVEY_MAP` (11 surveys -> 6 strands, 1:1); the classification vocabulary `statusOptionsForType` / `releaseNeedsConfirm`; `deriveIntentElements` + `deriveIntentElementsFromProfile` (FNV-1a ids). 56/56.
- **Stage C (`35f2fcf5`)** -- the UI: `RealityCheckSurface` + `ThresholdReviewPhase` (Phase 1 evidence) + `ThresholdDirectionPhase` (Phase 2 classify + `composePlanningDirection`). ~76 cumulative.
- **Stage D (`a8aae2ba`, 6 files +831)** -- the soft Mode-4 gate: `MODE_4_STRATUM_IDS`, `isMode4Stratum`, `realityCheckGateState`, `groupClassifications`, `MODE4_GATE_COPY`, and the Plan-only `RealityCheckGateBanner` (amber when unapproved -- navigates, never locks; calm registers when approved). 82 suite.

## Verification

- 82 tests green in the threshold suite.
- `tsc --noEmit` clean to the standing 6-error foreign baseline (none ours).
- Live preview deferred (headless maplibre/cesium hang) -> DOM/unit is the signal ([[project-screenshot-hang]]). No visual pass claimed.

## Decisions of note

- **Intent is derived, never re-asked** -- `deriveIntentElements` projects the Tier-0 captures; the planned bespoke `IntentElementsCapture` was superseded. Single source of truth, stable ids.
- **Soft Mode-4 gate** -- `realityCheckGateState` is derived/display-only and NEVER blocks; `prerequisiteObjectiveIds` / `STRATUM_PREREQS` untouched. The precedent the later thresholds inherit (T2 keeps it; only T3's Begin-Act deliberately breaks it).
- **Clickable-spine seam** -- additive defaulted props on the shared `ActTierSpine`; Act passes none, stays byte-identical.

## Amanah

Structural. No CSA / advance-sale / subscription / yield-share ever seeded -- the source spec's "Commercial CSA" example was deliberately not transcribed; intent derives only from the steward's own captures. `detectCsaLikeText` raises a non-blocking advisory naming the permitted capital channels (charitable donation, restricted donation, qard hasan, in-kind contribution, sponsorship). No CSA / CSRA / salam authored or stored ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Deferred / owed

- **Push state (verified 2026-06-19):** all four stages (`80c3b903` / `960cf525` / `35f2fcf5` / `a8aae2ba`) are PUSHED -- ancestors of `origin/main` (`56546951`), carried up by the later always-clickable-dividers / rail-header-switcher pushes. The original session memo's "not pushed" note is superseded.
- This wiki record was the owed backfill flagged by [[decisions/2026-06-19-atlas-threshold3-act-mandate]]; now filed.
