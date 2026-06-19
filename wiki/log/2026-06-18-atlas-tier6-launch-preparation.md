# 2026-06-18 -- Tier 6 / Mode 5: Launch Preparation (6 stages)

> **Backfilled 2026-06-19** -- shipped 2026-06-18 without a contemporaneous record; this page and its ADR were authored retroactively to Threshold-3 parity.

**Objective:** Restructure the terminal Plan stratum -- display-rename `s7-phasing-resourcing` to "Launch Preparation" (id byte-identical), add a display-only `progressTracking` milestone schema, upgrade the resource plan with structured Phase-1 demand capture (capital constrained to the closed channel list), and mount Plan-only Mode-5 chrome plus a Capacity Bridge joining supply against demand.

**ADR:** [[decisions/2026-06-18-atlas-tier6-launch-preparation]]
**Entity:** [[entities/plan-tier-shell]] (hosts the chrome via `ObjectiveDetailPanel`) -- [[entities/act-tier-shell]] byte-identical.

## Completed

- **Stage 1 (`c99d81a2`)** -- net-new display-only `progressTracking { milestones: { metric, cadence }[] (min 2) }` after `planningDirectionMandate`, DISTINCT from `monitoringProtocol` (no `feeds`); + authoring helper.
- **Stage 2 (`f0443ba0`)** -- stratum display rename "Phasing & Resourcing" -> "Launch Preparation" (id `s7-phasing-resourcing` byte-identical) + Mode-5 framing copy.
- **Stage 3 (`ae6e1994`)** -- the full `progressTracking` sweep across 46 s7 objectives (5 authored verbatim + 41 derived).
- **Stage 4 (`643d513a`)** -- Residential (+3) + Silvopasture (+3) s7 patches.
- **Stage 5 (`2304c8bc`)** -- structured Phase-1 demand capture: `DemandCapture.tsx` (`demandModeFor` / `decode` / `encode` / `phase1DemandBaseline`) upgrading `s7-resource-plan` c1 (labour) + c4 (capital); capital constrained to the closed `CAPITAL_CHANNEL_LIST`.
- **Stage 6 (`167b11b8`, 8 files)** -- Plan UI: `LaunchProgressPanel` (blue) + `Mode5LaunchChrome` (self-arms on `progressTracking`, separate from `Mode4DesignChrome`) + `CapacityBridgePanel` (arms only on `s7-resource-plan`, joins Tier-0 supply `stewardSupplyBaseline` + `useStewardRoster` against Phase-1 demand `phase1DemandBaseline`, honest "not yet captured" empty state). 7/7; `plan/strata` 307/307.

## Verification

- 7/7 new Stage-6 chrome tests; `plan/strata` 307/307 green.
- `tsc --noEmit` clean to the standing 6-error foreign baseline.
- The documented-foreign red set remains causally isolated -- none import a Tier-6 symbol.
- Live preview deferred -> DOM/unit is the signal ([[project-screenshot-hang]]). No visual pass claimed.

## Decisions of note

- **Tier 6 first, Threshold 3 separate** -- the terminal-stratum restructure ships independently of the Act-handoff ceremony.
- **`progressTracking` distinct from `monitoringProtocol`** -- launch milestones (metric + cadence) vs monitoring streams (indicators + triggers + feeds); both display-only, neither gates.
- **Honest empty state** -- the Capacity Bridge shows "not yet captured" rather than fabricating a readiness number when demand is absent.

## Amanah

Load-bearing. Capital capture transcribes ONLY the closed `CAPITAL_CHANNEL_LIST` (charitable donation, restricted donation, qard hasan, in-kind contribution, sponsorship, communal cost-share); a foreign value decodes to `''`. The source mockups' "deferred CSA" / "Commercial CSA" references were NEVER transcribed. No CSA / CSRA / salam / advance-sale / subscription / yield-share authored, stored, or seeded; any real yield-share / membership instrument stays Scholar-Council-gated and out of scope ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Deferred / owed

- **Push state (verified 2026-06-19):** all six stages (`c99d81a2` / `f0443ba0` / `ae6e1994` / `643d513a` / `2304c8bc` / `167b11b8`) are PUSHED -- ancestors of `origin/main` (`56546951`). At ship time S1-2 were already on origin and S3-6 were local; the later pushes carried S3-6 up. The original "S3-6 not pushed" note is superseded.
- This wiki record was the owed backfill flagged by [[decisions/2026-06-19-atlas-threshold3-act-mandate]]; now filed.
