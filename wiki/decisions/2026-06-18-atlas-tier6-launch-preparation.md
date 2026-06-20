# ADR: Tier 6 / Mode 5 -- Launch Preparation (terminal stratum reframe: display-only progressTracking + structured Phase-1 demand capture + Capacity Bridge)

- **Date:** 2026-06-18 (shipped)
- **Backfilled:** 2026-06-19 (record authored retroactively to full Threshold-3 parity; the surfaces shipped on 2026-06-18 without a contemporaneous wiki record)
- **Status:** Accepted
- **Branch:** `main` (Stage 1 `c99d81a2`, 2 `f0443ba0`, 3 `ae6e1994`, 4 `643d513a`, 5 `2304c8bc`, 6 `167b11b8`). At ship time S1-2 were already on origin and S3-6 were local; all six have since been **pushed** -- all are ancestors of `origin/main` (`56546951`), carried up by the later always-clickable-dividers / rail-header-switcher pushes. (Verified by `git merge-base --is-ancestor` against `origin/main` on 2026-06-19 -- this corrects the prior "S3-6 local-only" note, which predated those pushes.)
- **Entity:** [[entities/plan-tier-shell]] (the Mode-5 chrome mounts here via `ObjectiveDetailPanel`) -- [[entities/act-tier-shell]] confirmed byte-identical
- **Relates to:** sequel to [[decisions/2026-06-18-atlas-threshold2-coherence-check]]; restructures the terminal Plan stratum (`s7-phasing-resourcing`) that [[decisions/2026-06-19-atlas-threshold3-act-mandate]] hands off FROM. Adds a sibling display-only schema (`progressTracking`) to the one introduced in [[decisions/2026-06-17-atlas-mode4-design-tiers34]] (`monitoringProtocol`).
- **Log:** [[log/2026-06-18-atlas-tier6-launch-preparation]]

## Context

`s7-phasing-resourcing` is the final Plan stratum -- the last design tier before the project hands off to Act. As the Plan stage matured into a five-mode shape (Reception, Reality Check, Design, Coherence Check, and now Launch Preparation), the terminal stratum needed to read as **"Launch Preparation"** (the Mode-5 framing) rather than the generic "Phasing & Resourcing", while keeping its id byte-identical (per the 2026-05-30 stratum-rename discipline). Two substantive gaps also remained: there was no schema field to carry launch-readiness milestones, and the resource plan captured demand and capital as free-text rather than structured, covenant-checkable input. This is also the stratum that the (separately-built) Threshold 3 hands off from -- Tier 6 was deliberately built FIRST and kept SEPARATE from the T3 ceremony.

## Decision

All chrome is Plan-only, mounted in the SHARED `ObjectiveDetailPanel` after `ActProgressBar`, so Act stays byte-identical. Six stages.

### Locked decisions (settled at design time)

- **Tier 6 first, Threshold 3 SEPARATE** -- the terminal-stratum restructure ships independently of the Act-handoff ceremony.
- **Display rename only** -- "Phasing & Resourcing" -> "Launch Preparation"; the id `s7-phasing-resourcing` stays byte-identical (2026-05-30 stratum-rename ADR).
- **ADD structured Phase-1 demand capture** + a **FULL `progressTracking` sweep** across the s7 objectives.

### Net-new DISPLAY-ONLY schema

`progressTracking = { milestones: { metric, cadence }[] (min 2) }`, placed after `planningDirectionMandate`. It is **DISTINCT from `monitoringProtocol`** -- launch-readiness milestones, NOT monitoring streams (no `feeds`). Display-only; it never gates.

### Structured Phase-1 demand capture

`DemandCapture.tsx` (`demandModeFor` / `decode` / `encode` / `phase1DemandBaseline`) upgrades `s7-resource-plan`: c1 (labour) and c4 (capital) move from free-text to structured input. **Capital is constrained to the closed `CAPITAL_CHANNEL_LIST`** (covenant boundary -- see Amanah).

### UI (Stage 6)

- `LaunchProgressPanel` (blue) renders the `progressTracking` milestones.
- `Mode5LaunchChrome` self-arms on the presence of `progressTracking`, SEPARATE from `Mode4DesignChrome`.
- `CapacityBridgePanel` arms only on `s7-resource-plan`, joining Tier-0 supply (`stewardSupplyBaseline` + `useStewardRoster`) against Phase-1 demand (`phase1DemandBaseline`); when demand is not yet captured it shows an **honest "not yet captured" empty state** rather than a fabricated number.

## Rationale

- **Tier 6 before T3:** the terminal stratum must be coherent before a ceremony hands it off; building it first and separately keeps each change reviewable.
- **`progressTracking` distinct from `monitoringProtocol`:** launch milestones (metric + cadence) and monitoring streams (indicators + triggers + feeds) are different concerns; conflating them would overload one schema. A separate display-only field keeps both honest.
- **Structured demand + closed capital channels:** moving capital capture from free-text to a closed channel list makes the covenant boundary enforceable at the input, not just by a scanner.
- **Honest empty state on the Capacity Bridge:** joining supply and demand is only meaningful once demand exists; fabricating a number when it does not would be a false readiness signal. The "not yet captured" state tells the truth.

## Alternatives Considered

- **Extend `monitoringProtocol` to carry milestones:** rejected -- overloads a monitoring schema with launch-readiness concerns; a separate `progressTracking` field keeps each one clear.
- **Keep demand/capital as free-text:** rejected -- structured capture is what makes the capital channel list enforceable and the Capacity Bridge computable.
- **Show a default/estimated capacity number when demand is uncaptured:** rejected -- a fabricated readiness number; the honest empty state is correct.
- **Rename the stratum id to match "Launch Preparation":** rejected -- display rename only; the id stays byte-identical to keep prerequisite maps, routes, and tests green.

## Consequences

- The terminal Plan stratum now reads as "Launch Preparation" with launch-readiness milestones captured per objective.
- A second display-only schema (`progressTracking`) joins `monitoringProtocol`; neither gates.
- `s7-resource-plan` captures labour and capital as structured input, with capital constrained to the closed channel list.
- A Capacity Bridge joins Tier-0 steward supply against Phase-1 demand, with an honest empty state until demand is captured.
- **Act is byte-identical** -- all chrome is Plan-only; the shared workbench never reads `progressTracking`.
- The s7 sweep covered 46 objectives (5 authored verbatim + 41 derived), with Residential (+3) and Silvopasture (+3) patches.

## Amanah

Load-bearing. Capital capture transcribes ONLY the closed `CAPITAL_CHANNEL_LIST` -- charitable donation, restricted donation, qard hasan (interest-free loan), in-kind contribution, sponsorship, and communal cost-share among co-owners; a foreign/out-of-list value decodes to `''`. The source mockups' "deferred CSA" / "Commercial CSA" references were deliberately NEVER transcribed. No CSA / CSRA / salam / advance-sale / subscription / yield-share is authored, stored, or seeded -- this surface records cost-share contributions within permitted channels only. Any real yield-share / membership instrument stays Scholar-Council-gated and out of scope (CSRA erased 2026-05-04 on fiqh grounds, bay' ma laysa 'indak). The Capacity Bridge's honest empty state avoids fabricating a readiness number ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Verification

- 7/7 new Stage-6 chrome tests; `plan/strata` 307/307 green.
- `tsc --noEmit` clean to the standing 6-error foreign baseline.
- The same documented-foreign red set remains causally isolated -- none import a Tier-6 symbol.
- Live preview deferred (headless hang) -> DOM/unit is the signal ([[project-screenshot-hang]]). No visual pass claimed.

## Connections

- [[entities/plan-tier-shell]] -- hosts `LaunchProgressPanel` + `Mode5LaunchChrome` + `CapacityBridgePanel` via `ObjectiveDetailPanel`.
- [[entities/act-tier-shell]] -- byte-identical; the shared workbench never reads `progressTracking`.
- [[decisions/2026-06-18-atlas-threshold2-coherence-check]] -- the coherence audit that precedes this terminal-stratum restructure.
- [[decisions/2026-06-17-atlas-mode4-design-tiers34]] -- introduced the sibling display-only schema (`monitoringProtocol`).
- [[decisions/2026-06-19-atlas-threshold3-act-mandate]] -- the Act-handoff ceremony that hands off FROM this terminal stratum (built separately, after Tier 6).
- [[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]] -- the covenant boundary the closed `CAPITAL_CHANNEL_LIST` enforces.
