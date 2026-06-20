# ADR: Mode-4 Design Tiers 3-4 (Strategic Decisions + System Design: display-only monitoringProtocol schema + s4-direction retirement)

- **Date:** 2026-06-17 (shipped)
- **Backfilled:** 2026-06-19 (record authored retroactively to full Threshold-3 parity; the surfaces shipped on 2026-06-17 without a contemporaneous wiki record)
- **Status:** Accepted
- **Branch:** `main` (Stage 1 `d708d953`, 2 `33500994`, 3 `f6e76fd6`, 4 `4cd4b398`). At ship time all four were local-only; they have since been **pushed** -- all are ancestors of `origin/main` (`56546951`), carried up by the later always-clickable-dividers / rail-header-switcher pushes.
- **Entity:** [[entities/plan-tier-shell]] (the Mode-4 chrome mounts here via `ObjectiveDetailPanel`) -- [[entities/act-tier-shell]] confirmed byte-identical
- **Relates to:** sequel to [[decisions/2026-06-17-atlas-threshold1-reality-check]] (Threshold 1 softly gates entry into these strata); the design substrate later audited by [[decisions/2026-06-18-atlas-threshold2-coherence-check]] (whose Section C reads exactly the `monitoringProtocol` introduced here) and handed off by [[decisions/2026-06-19-atlas-threshold3-act-mandate]]. Tier 6 ([[decisions/2026-06-18-atlas-tier6-launch-preparation]]) adds a sibling display-only schema (`progressTracking`).
- **Log:** [[log/2026-06-17-atlas-mode4-design-tiers34]]

## Context

"Mode-4 Design" is the codebase name for the Plan strata that follow Reception -- Strata 4-7 (`s4-foundation-decisions`, `s5-system-design`, `s6-integration-design`, `s7-phasing-resourcing`), pinned as ordinals 4-7 by `MODE_4_STRATUM_IDS`. This work built out the first two of those design tiers: Tier 3 (Stratum 4) and Tier 4 (Stratum 5). Two presentation problems stood in the way of treating them as a real design phase:

1. The strata carried generic Reception-era titles. Stratum 4 needed to read as **"Strategic Decisions"** and Stratum 5 as **"System Design"** -- but the underlying ids (`s4-foundation-decisions`, `s5-system-design`) had to stay byte-identical so no prerequisite map, route, or test broke (the same display-rename-only discipline used for the 2026-05-30 stratum renames).
2. A design tier needs to say not just WHAT is decided but HOW it will be watched once built -- and there was no schema field to carry monitoring intent. There was also a vestigial `s4-direction` objective that overlapped the (new) Planning Direction concept and muddied the s5 gate.

## Decision

All chrome is Plan-only, mounted in the SHARED `ObjectiveDetailPanel` after `ActProgressBar`, so Act stays byte-identical. Four stages.

### Net-new DISPLAY-ONLY schema

- `monitoringProtocol = { indicators: string[] (min 1), triggers: string[] (min 1), feeds: string }`. `feeds` is **deliberately free-text, NOT the Observe enum** -- a Mode-4 design tier records monitoring intent in prose; binding it to the Observe vocabulary would be a premature coupling. (Threshold 2 later TIGHTENS this -- `indicators` >= 2 with structured frequency, `feeds` from the UniversalDomain enum -- but that is T2's decision, not this one.)
- `planningDirectionMandate?: string` -- optional prose carrying a Planning-Direction-derived mandate onto the objective.

Both are display-only: they render in Plan chrome and NEVER gate. `prerequisiteObjectiveIds` / `STRATUM_PREREQS` do not read them.

### `s4-direction` retired

The vestigial `s4-direction` objective is marked `excludedFromResolution: true` and dropped from the s5 prerequisite set: `STRATUM_PREREQS['s5-system-design'] = ['s4-water-strategy', 's4-zones']`. It is retired, not deleted (append-only / never-overwrite); the catalogue entry remains but no longer resolves or gates.

### Option-B conditional closure (display-only)

A conditional raise/close pattern, entirely display-only: an amber `planningDirectionMandate` RAISES a Silvopasture water conditional on `silv-sec-s4-stock-infrastructure`, which CLOSES on `s5-water-infrastructure`. This is a rendered narrative of a design dependency, not a gate -- neither the raise nor the close changes any prerequisite.

### UI

- `MonitoringStreamPanel.tsx` (green accent `--ms-accent #3f8f5f`) renders the `monitoringProtocol` triple.
- `Mode4DesignChrome.tsx` wraps the Mode-4 design framing on the objective detail.
- Both mount in `ObjectiveDetailPanel.tsx` after `ActProgressBar` -- imported only on the Plan path, so Act renders identically.

## Rationale

- **Display-rename, never re-id:** renaming Strata 4-5 in the UI while holding `s4-foundation-decisions` / `s5-system-design` byte-identical keeps every prerequisite map, route, and conformance test green -- the established stratum-rename discipline.
- **`feeds` as free-text, not the Observe enum:** a design tier records monitoring INTENT; coupling it to the Observe vocabulary prematurely would force a runtime concept into a planning-time field. T2 tightens it later, once the design is being audited for coherence -- the right time to demand structure.
- **Retire, don't delete, `s4-direction`:** `excludedFromResolution` plus removal from the s5 gate is reversible and append-only; deleting the catalogue entry would violate never-overwrite and risk dangling references.
- **Conditional closure stays display-only:** rendering the water dependency as an Option-B raise/close narrative communicates the design coupling without converting it into a covenant-breaking gate.

## Alternatives Considered

- **Bind `monitoringProtocol.feeds` to the Observe enum immediately:** rejected here -- premature coupling; deferred to T2 Section C, which is the audit step that legitimately demands structured feeds.
- **Delete the `s4-direction` objective outright:** rejected -- violates never-overwrite; `excludedFromResolution` + gate removal is the reversible, audit-friendly form.
- **Promote the Silvopasture water conditional into a real prerequisite:** rejected -- it would gate on a display-only mandate; kept as an Option-B display narrative.

## Consequences

- Strata 4-5 now present as a real design phase ("Strategic Decisions" / "System Design") with monitoring intent captured per objective.
- A new display-only schema (`monitoringProtocol`, `planningDirectionMandate`) exists for downstream surfaces to read -- Threshold 2 Section C audits exactly these fields, and Tier 6 adds a sibling (`progressTracking`).
- `s5-system-design` no longer gates on `s4-direction`; its prerequisites are `s4-water-strategy` + `s4-zones`.
- **Act is byte-identical** -- the Mode-4 chrome is Plan-only; the shared workbench never reads `monitoringProtocol`.
- A Stage-3 access patch swept the full design seed: residential objective count 10 -> 11 (RES > U-S5.1 access), the type triad 22 -> 23.

## Amanah

Structural. `monitoringProtocol` is display-only and never gates; nothing is fabricated -- monitoring intent is the steward's own prose. The banned-term scanner was extended to recurse over the new `monitoringProtocol` fields, so any CSA / advance-sale / subscription / yield-share text in indicators / triggers / feeds is caught by the same wording-pin discipline used elsewhere. No CSA / CSRA / salam ever authored or seeded ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Verification

- `@ogden/shared` 1547/1547 green (all 14 protocol catalogues iterate the new schema).
- `@ogden/web`: `Mode4DesignChrome.test` 6/6, `ObjectiveDetailPanel` 8/8.
- `tsc --noEmit` clean to the standing 6-error foreign baseline.
- 4 `@ogden/web` failures (`VisionLayoutCanvas.surveyLayers`, `completionPathAudit.ratchet`, `projectStore.secondaryReopen`, `BoundaryCaptureLegacy`) proven **foreign** via revert -- none import any Mode-4 symbol; they are the same documented red set carried into the later Threshold-2/3 sessions.
- Live preview deferred (headless maplibre/cesium hang) -> DOM/unit is the signal ([[project-screenshot-hang]]). No visual pass claimed.

## Connections

- [[entities/plan-tier-shell]] -- hosts `MonitoringStreamPanel` + `Mode4DesignChrome` via `ObjectiveDetailPanel`.
- [[entities/act-tier-shell]] -- byte-identical; the shared workbench never reads `monitoringProtocol`.
- [[decisions/2026-06-17-atlas-threshold1-reality-check]] -- Threshold 1 softly gates entry into these design strata.
- [[decisions/2026-06-18-atlas-threshold2-coherence-check]] -- Section C audits this `monitoringProtocol` and tightens its schema.
- [[decisions/2026-06-18-atlas-tier6-launch-preparation]] -- adds the sibling display-only `progressTracking` schema.
- [[decisions/2026-06-19-atlas-threshold3-act-mandate]] -- hands the resolved Mode-4 design off to Act.
- [[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]] -- the Amanah constraint the extended banned-term scanner enforces.
