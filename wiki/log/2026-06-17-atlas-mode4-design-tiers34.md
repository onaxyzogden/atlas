# 2026-06-17 -- Mode-4 Design Tiers 3-4: Strategic Decisions + System Design (4 stages)

> **Backfilled 2026-06-19** -- shipped 2026-06-17 without a contemporaneous record; this page and its ADR were authored retroactively to Threshold-3 parity.

**Objective:** Build out the first two Mode-4 design tiers (Strata 4-5) -- display-rename Stratum 4 to "Strategic Decisions" and Stratum 5 to "System Design" (ids byte-identical), add a display-only `monitoringProtocol` schema to carry monitoring intent, retire the vestigial `s4-direction`, and mount Plan-only design chrome.

**ADR:** [[decisions/2026-06-17-atlas-mode4-design-tiers34]]
**Entity:** [[entities/plan-tier-shell]] (hosts the chrome via `ObjectiveDetailPanel`) -- [[entities/act-tier-shell]] byte-identical.

## Completed

- **Stage 1 (`d708d953`)** -- schema + authoring helper + the s4/s5 display renames + `s4-direction` retirement: net-new `monitoringProtocol { indicators, triggers, feeds (free-text) }` + `planningDirectionMandate?`; `s4-direction` marked `excludedFromResolution: true`; `STRATUM_PREREQS['s5-system-design'] = ['s4-water-strategy','s4-zones']`.
- **Stage 2 (`33500994`, +983)** -- Tier-3 (s4) monitoring authoring sweep across all 14 project-type catalogues.
- **Stage 3 (`f6e76fd6`, +1001)** -- Tier-4 (s5) monitoring sweep + the RES > U-S5.1 access patch (residential 10 -> 11 objectives, type triad 22 -> 23) + the Option-B Silvopasture water conditional CLOSE on `s5-water-infrastructure`.
- **Stage 4 (`4cd4b398`)** -- Plan UI: `MonitoringStreamPanel` (green `--ms-accent #3f8f5f`) + `Mode4DesignChrome`, mounted in `ObjectiveDetailPanel` after `ActProgressBar` (Plan-only). `Mode4DesignChrome.test` 6/6, `ObjectiveDetailPanel` 8/8.

## Verification

- `@ogden/shared` 1547/1547 (all 14 catalogues iterate the new schema).
- `tsc --noEmit` clean to the standing 6-error foreign baseline.
- 4 `@ogden/web` fails (`VisionLayoutCanvas.surveyLayers`, `completionPathAudit.ratchet`, `projectStore.secondaryReopen`, `BoundaryCaptureLegacy`) proven FOREIGN via revert -- none import a Mode-4 symbol; the same red set carried into the later T2/T3 sessions.
- Live preview deferred -> DOM/unit is the signal ([[project-screenshot-hang]]). No visual pass claimed.

## Decisions of note

- **`feeds` is free-text, NOT the Observe enum** -- a design tier records monitoring intent in prose; Threshold 2 later tightens it (enum-backed) at the audit step, which is the right time to demand structure.
- **Retire, don't delete, `s4-direction`** -- `excludedFromResolution` + gate removal is reversible and append-only.
- **`monitoringProtocol` is display-only** -- never gates; the shared workbench never reads it, so Act stays byte-identical.

## Amanah

Structural. The banned-term scanner was extended to recurse over the new `monitoringProtocol` fields, so any CSA / advance-sale / subscription / yield-share text in indicators / triggers / feeds is caught. Nothing fabricated; no CSA / CSRA / salam authored or seeded ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Deferred / owed

- **Push state (verified 2026-06-19):** all four stages (`d708d953` / `33500994` / `f6e76fd6` / `4cd4b398`) are PUSHED -- ancestors of `origin/main` (`56546951`). The original session memo's "not pushed" note is superseded.
- This wiki record was the owed backfill flagged by [[decisions/2026-06-19-atlas-threshold3-act-mandate]]; now filed.
