# 2026-06-18 -- Threshold 2: The Coherence Check (5 stages)

> **Backfilled 2026-06-19** -- shipped 2026-06-18 without a contemporaneous record; this page and its ADR were authored retroactively to Threshold-3 parity.

**Objective:** Build the second Plan-stage readiness review -- a Plan-only audit hinge after `s5-system-design` that runs a single-pass three-section coherence audit (System Integration / Closed Loops / monitoringProtocol coverage), seals a Coherence Record on a clean pass, and surfaces a soft (never-blocking) seal banner on s6 + s7.

**ADR:** [[decisions/2026-06-18-atlas-threshold2-coherence-check]]
**Entity:** [[entities/plan-tier-shell]] (hosts the chrome) -- [[entities/act-tier-shell]] byte-identical.

## Completed

- **Stage 1 (`fdb87fb3`)** -- `monitoringProtocol` schema TIGHTEN (`indicators` >= 2 with structured frequency, `feeds` from the UniversalDomain enum) + the ~130-protocol migration + initial chrome.
- **Stage 2 (`486733e5`)** -- `coherenceCheckModel.ts` (pure A/B/C engine): `evaluateCoherenceAudit`, `coherenceVerdict`, `coherenceGateState`, `deriveCoherenceOpen`, `SECTION_A_CHECKS` (A1-A5), `SECTION_B_LOOPS` (B3 `designedGap: true` = residential kitchen-waste -> compost-bay -> kitchen-garden), `SECTION_AB_REGISTRY`, `COHERENCE_COPY`; re-exports `detectCsaLikeText` / `CSA_ADVISORY_COPY`.
- **Stage 3 (`e83faf17`)** -- `coherenceCheckStore.ts` (`ogden-coherence-check`, v1, byProject, IndexedDB): `ProjectCoherenceCheck { itemResolutions, amendments (append-only), sealedAt? }`; `resolveItem` APPEND-ONLY + REFUSES `detectCsaLikeText` text (persistence-boundary guard); idempotent seal, unseal strips `sealedAt`. Registered in `syncManifest`.
- **Stage 4 (`b1c67907`)** -- `CoherenceCheckSurface` + `CoherenceCheckReferenceRail` + `Coherence.module.css` (mauve `COHERENCE_PALETTE #9B7EC8`) + route gate + `'threshold-2'` spine clickability.
- **Stage 5 (`795f638a`, 9 files +673)** -- `CoherenceGateBanner` (s6 + s7, navigates never locks) + Coherence Record display + `CoherenceObjectiveAmendments` (self-gating Plan-only overlay; catalogue never mutated); helpers `auditItemObjectiveIds`, `amendmentsForObjective`.

## Verification

- Threshold suite 141/141 green.
- `tsc --noEmit` clean to the standing 6-error foreign baseline.
- The documented-foreign red set (`completionPathAudit.ratchet`, `secondaryReopen`, `VisionLayoutCanvas.surveyLayers`, `BoundaryCaptureLegacy`) remains causally isolated -- none import a Coherence symbol.
- Live preview deferred -> DOM/unit is the signal ([[project-screenshot-hang]]). No visual pass claimed.

## Decisions of note

- **Stratum 6 kept intact** -- Section B overlays the existing s6 integration design as narrative; s6 still gates s7 exactly as before.
- **Soft seal** -- the seal banner on s6 + s7 navigates and advises but NEVER blocks; `STRATUM_PREREQS` untouched (the Threshold-1 soft-gate precedent).
- **CSA guard at the persistence boundary** -- `resolveItem` refuses `detectCsaLikeText` text, so the covenant is enforced at the store, not just the UI. (This surface's CSA-like regex does NOT include `salam`; the broader covenant still forbids it everywhere.)

## Amanah

Load-bearing, defence-in-depth. Seal is soft (no covenant-breaking gate); amendments append-only, catalogue never mutated. `detectCsaLikeText` / `CSA_ADVISORY_COPY` re-exported and reused as BOTH a UI advisory AND a hard persist-reject. No CSA / CSRA / advance-sale / subscription / yield-share authored or stored ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Deferred / owed

- **Push state (verified 2026-06-19):** all five stages (`fdb87fb3` / `486733e5` / `e83faf17` / `b1c67907` / `795f638a`) are PUSHED -- ancestors of `origin/main` (`56546951`). The original session memo's "not pushed" note is superseded.
- This wiki record was the owed backfill flagged by [[decisions/2026-06-19-atlas-threshold3-act-mandate]]; now filed.
