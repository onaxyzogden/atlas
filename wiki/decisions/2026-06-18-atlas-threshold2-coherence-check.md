# ADR: Threshold 2 -- The Coherence Check (Plan-stage design audit: A/B/C sections -> sealable Coherence Record, soft seal)

- **Date:** 2026-06-18 (shipped)
- **Backfilled:** 2026-06-19 (record authored retroactively to full Threshold-3 parity; the surface shipped on 2026-06-18 without a contemporaneous wiki record)
- **Status:** Accepted
- **Branch:** `main` (Stage 1 `fdb87fb3`, 2 `486733e5`, 3 `e83faf17`, 4 `b1c67907`, 5 `795f638a`). At ship time all five were local-only; they have since been **pushed** -- all are ancestors of `origin/main` (`56546951`), carried up by the later always-clickable-dividers / rail-header-switcher pushes.
- **Entity:** [[entities/plan-tier-shell]] (all chrome mounts here) -- [[entities/act-tier-shell]] confirmed byte-identical
- **Relates to:** the second of three Plan-stage thresholds; sequel to [[decisions/2026-06-17-atlas-threshold1-reality-check]] (Doc 1 = the Planning Direction Statement) and [[decisions/2026-06-17-atlas-mode4-design-tiers34]] (Section C audits exactly its `monitoringProtocol` and tightens the schema). Produces the Coherence Record (Doc 2) that [[decisions/2026-06-19-atlas-threshold3-act-mandate]] later hands off alongside the integrated design (Doc 3).
- **Log:** [[log/2026-06-18-atlas-threshold2-coherence-check]]

## Context

Threshold 1 confirmed the project was real (declared intent vs surveyed evidence). The Mode-4 Design tiers then made the actual design decisions -- water strategy, zones, system design, monitoring intent. Before that design is allowed to phase into resourcing (Stratum 7) and hand off to Act, it needs one more readiness review: is the design internally COHERENT? Do its parts integrate, do its loops close, is its monitoring intent complete?

**Threshold 2 -- The Coherence Check** is that audit. It sits after `s5-system-design`, is Plan-only, and -- unlike the Reality Check's two phases -- runs as a single-pass three-section audit. It is the direct sequel to Threshold 1 and the Mode-4 design work, and it reuses Threshold 1's clickable-spine and soft-gate machinery.

## Decision

Plan-only chrome on the shared workbench, mauve register (`COHERENCE_PALETTE #9B7EC8`), additive. Five stages.

### Three-section audit (single pass)

- **Section A -- System Integration:** five config-pinned checks (A1-A5) that the design's subsystems connect.
- **Section B -- Closed Loops:** B1 / B2 / B3, where **B3 is a designed inline gap** (`designedGap: true`) -- the residential kitchen-waste -> compost-bay -> kitchen-garden loop that is intentionally surfaced as a gap to close, not a failure.
- **Section C -- monitoringProtocol coverage:** audits that each objective's `monitoringProtocol` (from the Mode-4 work) is present and complete.

All checks pass -> the audit is sealable into a **Coherence Record**.

### Schema tighten (Section C did this in Stage 1)

`monitoringProtocol` is TIGHTENED: `indicators` >= 2 with a structured frequency, and `feeds` drawn from the UniversalDomain enum (the Mode-4 ADR deliberately left `feeds` free-text; the audit step is the right place to demand structure). This is the migration the ~130-protocol Stage-1 sweep performed.

### Locked decisions (settled at design time)

- **Stratum 6 kept intact** -- Section B is an overlay narrative on the existing s6 integration design; s6 still gates s7 exactly as before.
- **Seal = SOFT banner on s6 + s7** -- display-only, navigates, NEVER blocks; `STRATUM_PREREQS` untouched (the Threshold-1 soft-gate precedent, carried forward).

### Stores / model / UI

- `coherenceCheckModel.ts` (pure): exports `evaluateCoherenceAudit`, `coherenceVerdict`, `coherenceGateState`, `deriveCoherenceOpen`, `SECTION_A_CHECKS`, `SECTION_B_LOOPS`, `SECTION_AB_REGISTRY`, `COHERENCE_COPY`; re-exports `detectCsaLikeText` / `CSA_ADVISORY_COPY`.
- `coherenceCheckStore.ts` (key `ogden-coherence-check`, v1, byProject, IndexedDB): `ProjectCoherenceCheck { itemResolutions, amendments (append-only), sealedAt? }`. `resolveItem` is **APPEND-ONLY** (no-op if already resolved or empty) and **REFUSES** `detectCsaLikeText` text as a persistence-boundary guard. Seal is idempotent; unseal strips `sealedAt`.
- `CoherenceCheckSurface.tsx` + `CoherenceCheckReferenceRail.tsx` + `Coherence.module.css`, plus a route gate and spine clickability for `'threshold-2'`.
- `CoherenceGateBanner.tsx` (mounts on s6 + s7, navigates never locks) + `CoherenceObjectiveAmendments.tsx` (self-gating Plan-only overlay -- the catalogue objective is never mutated; amendments render alongside).
- Helpers `auditItemObjectiveIds`, `amendmentsForObjective`.

## Rationale

- **Audit coherence before phasing:** a design can be individually well-decided yet incoherent as a whole; an explicit A/B/C pass catches integration / loop / monitoring gaps before resourcing commits to them.
- **Tighten `feeds` here, not in Mode-4:** the audit is the moment structured monitoring legitimately matters; demanding enum-backed feeds at design time would have been premature (the Mode-4 ADR's reasoning).
- **B3 as a designed gap, not a failure:** marking the residential kitchen-waste loop `designedGap: true` lets the audit surface an intentional closure target without flagging it as a broken loop.
- **Soft seal, never block:** sealing is a readiness signal; hard-blocking s6/s7 on it would break the soft-gate covenant Threshold 1 established. The banner navigates and advises; `STRATUM_PREREQS` stays the only gate.
- **Persistence-boundary CSA guard:** `resolveItem` refusing `detectCsaLikeText` text means the covenant is enforced at the store, not just the UI -- defence in depth.

## Alternatives Considered

- **Restructure Stratum 6 to carry the closed-loops audit:** rejected -- kept s6 intact; Section B overlays it instead, so s6's existing gate to s7 is undisturbed.
- **Leave `monitoringProtocol.feeds` free-text:** rejected for the audit -- Section C needs enum-backed feeds to assert coverage; tightened in Stage 1.
- **Hard-gate s6/s7 on the seal:** rejected -- violates the soft-gate covenant; the seal is a soft banner that never blocks.
- **Mutate the catalogue objective when an amendment is approved:** rejected -- never-overwrite; amendments append to the store and render alongside the original.

## Consequences

- The Plan stage gains a coherence audit between design and resourcing; a clean pass produces a sealable Coherence Record (Doc 2 of the eventual Act handoff).
- `monitoringProtocol` is now enum-backed (`indicators` >= 2 + structured frequency, `feeds` from UniversalDomain) across ~130 protocols.
- s6 and s7 carry a soft coherence-seal banner that advises but never blocks; objective-level amendments overlay the catalogue without mutating it.
- **Act is byte-identical** -- all chrome is Plan-only; the store is Plan-written.
- The CSA covenant is now enforced at the persistence boundary (`resolveItem` refuses CSA-like text), not only in the UI.

## Amanah

Load-bearing and defence-in-depth. The seal is SOFT and never blocks (no covenant-breaking gate). Amendments are append-only; the catalogue objective is never mutated. `detectCsaLikeText` / `CSA_ADVISORY_COPY` are re-exported from `coherenceCheckModel` and reused as BOTH a UI advisory AND a hard persistence-boundary reject in `resolveItem` -- no CSA / CSRA / advance-sale / subscription / yield-share can be stored. (Note: this surface's CSA-like regex does NOT include `salam`; the broader covenant still forbids salam everywhere.) No such term is ever authored or seeded ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Verification

- Threshold suite 141/141 green.
- `tsc --noEmit` clean to the standing 6-error foreign baseline.
- The same documented-foreign red set (`completionPathAudit.ratchet`, `secondaryReopen`, `VisionLayoutCanvas.surveyLayers`, `BoundaryCaptureLegacy`) remains causally isolated -- none import a Coherence symbol.
- Live preview deferred (headless hang) -> DOM/unit is the signal ([[project-screenshot-hang]]). No visual pass claimed.

## Connections

- [[entities/plan-tier-shell]] -- hosts the Coherence Check surface, gate banner, amendments overlay, and `'threshold-2'` spine clickability.
- [[entities/act-tier-shell]] -- byte-identical; the store is Plan-written.
- [[decisions/2026-06-17-atlas-threshold1-reality-check]] -- the first threshold whose soft-gate + clickable-spine machinery this reuses; Doc 1 of the Act handoff.
- [[decisions/2026-06-17-atlas-mode4-design-tiers34]] -- Section C audits its `monitoringProtocol` and tightens the schema.
- [[decisions/2026-06-19-atlas-threshold3-act-mandate]] -- hands the Coherence Record (Doc 2) off to Act.
- [[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]] -- the Amanah constraint the persistence-boundary CSA reject enforces.
- [[feedback-no-deletion]] -- additive, append-only amendments, no deletion.
