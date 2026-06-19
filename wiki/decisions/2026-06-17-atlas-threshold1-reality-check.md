# ADR: Threshold 1 -- The Reality Check (Plan-stage readiness hinge: evidence review + intent classification + Planning Direction Statement)

- **Date:** 2026-06-17 (shipped)
- **Backfilled:** 2026-06-19 (record authored retroactively to full Threshold-3 parity; the surface shipped on 2026-06-17 without a contemporaneous wiki record)
- **Status:** Accepted
- **Branch:** `main` (Stage A `80c3b903`, B `960cf525`, C `35f2fcf5`, D `a8aae2ba`). At ship time all four were local-only; they have since been **pushed** -- all are ancestors of `origin/main` (`56546951`), carried up by the later always-clickable-dividers / rail-header-switcher pushes.
- **Entity:** [[entities/plan-tier-shell]] (all chrome mounts here) -- [[entities/act-tier-shell]] confirmed byte-identical
- **Relates to:** the first of three Plan-stage thresholds, the soft-gate forerunner of [[decisions/2026-06-18-atlas-threshold2-coherence-check]] and the hard Plan->Act gate [[decisions/2026-06-19-atlas-threshold3-act-mandate]]; gates (softly) into the Mode-4 Design strata recorded in [[decisions/2026-06-17-atlas-mode4-design-tiers34]]. Intent source = the Tier-0 declaration; evidence source = the Tier-1/Tier-2 reception surveys.
- **Log:** [[log/2026-06-17-atlas-threshold1-reality-check]]

## Context

The Plan stage opens with **Reception** -- Tier 0 (the steward's declaration of intent) then Tiers 1-2 (eleven land-reading surveys: six `s2-*` in Tier 1, five `s3-*` in Tier 2). It then moves into **Mode-4 Design** (Strata 4-7). Between those two phases there was a missing synthesis step: after eleven surveys the steward had never been asked to turn back and measure the Tier-0 declaration against what the land actually said. The spine carried a decorative divider after `s3-systems-reading` (the first entry in the global `THRESHOLDS` constant in `declarationModel.ts`) but it did nothing.

**Threshold 1 -- The Reality Check** fills that step. It is a NON-TIER structural hinge surface sitting after `s3-systems-reading`, in its own amber/gold register (neither Mode-2 Reception nor Mode-4 Design). It is the first Plan-stage readiness review: the place where declared intent meets surveyed reality before any design decision is committed.

**Terminology bridge:** doc "Tier 0/1/2" = codebase Strata 1/2/3 (Mode-2 Reception); Mode-4 "Design" = Strata 4-7 (`s4-foundation-decisions`, `s5-system-design`, `s6-integration-design`, `s7-phasing-resourcing`). `MODE_4_STRATUM_IDS` pins the `PLAN_STRATA` ordinals 4-7.

## Decision

Build Threshold 1 as Plan-only chrome on the SHARED Act/Plan workbench, additive ([[feedback-no-deletion]]). Two phases, a derived-intent model, and a soft (never-blocking) Mode-4 gate. Four stages.

### Two phases

- **Phase 1 -- Review** (analytical, decides nothing). The eleven-survey evidence is re-organised by **six cross-tier strands** -- Water, Soil & Fertility, Ecology & Habitat, Infrastructure & Access, Land Health, Landscape Context -- each a hybrid of derived record summaries plus an optional steward stance/note. Completes on a `phase1Ready` signal. `EVIDENCE_STRANDS` + `STRAND_SURVEY_MAP` pin the 11-survey-to-6-strand mapping 1:1.
- **Phase 2 -- Direction** (decisional). Classify each Tier-0 intent element, then compose and approve a bounded **Planning Direction Statement** (`composePlanningDirection`).

### Classification vocabulary (pinned exactly)

`feasible | conditional | deferred | released`. Type-gated via `statusOptionsForType(type)`: `non-negotiable -> ['feasible','released']`; `committed -> all four`; `aspirational -> all four`. `releaseNeedsConfirm(type)` is true only for `committed` (releasing a committed intent needs an explicit "the project can proceed without it" confirmation).

### Intent is DERIVED, not re-authored

`deriveIntentElements({classify, constraints, visionProfile})` projects the two Tier-0 `s1-vision` captures into intent elements (constraint severity `'nn'` -> non-negotiable, hard `'hc'` excluded; `classify.committed` -> committed; `classify.aspirational` -> aspirational), with a `deriveIntentElementsFromProfile` fallback when both are empty. Stable **FNV-1a** ids (`ie-<token>-<hash>`). The originally-planned bespoke `IntentElementsCapture` was superseded by this derivation -- the steward classifies their own already-declared intent rather than re-typing it.

### Soft Mode-4 gate (covenant invariant)

`realityCheckGateState(stratumId, approvedAt) -> {mode4, approved, pending}`; `pending` arms ONLY on a Mode-4 stratum that is not yet approved, and is silent everywhere else. It is **derived, display-only, and NEVER blocks navigation**; `prerequisiteObjectiveIds` / `STRATUM_PREREQS` are untouched. `RealityCheckGateBanner` (Plan-only) mounts at the top of the `PlanTierShell` objective-detail arm: null off a Mode-4 stratum; unapproved -> an amber "approve Threshold 1 first" reminder whose shortcut NAVIGATES (never locks); approved -> a calm "in effect" reading plus display-only Conditional / Deferred / Released registers read from the store via `groupClassifications`.

### Stores, route, architecture

New byProject `useRealityCheckStore` (key `ogden-reality-check`, v1; `idbPersistStorage` + `rehydrateWithLogging`; registered in `syncManifest` `SYNCED_STORES`). A new route `plan/threshold/$thresholdId` (static prefix ahead of `plan/$module`) mounts `PlanLayout`; its `beforeLoad` redirects to `/plan` when the threshold is not yet open (reusing `deriveReceptionProgress().thresholdOpen` = Tier-1 6/6 AND Tier-2 5/5). WebGL never mounts -- the threshold center arm returns before `VisionLayoutCanvas`. Clickability rides additive defaulted props on the shared `ActTierSpine` (`onSelectThreshold?` / `thresholdActiveId?` / `clickableThresholdIds?`); Act passes none, so Act stays byte-identical.

## Rationale

- **Derive intent, never re-ask:** the steward declared their intent in Tier 0; the Reality Check should make them weigh it against evidence, not retype it. Derivation keeps a single source of truth and stable ids.
- **Soft gate, never block:** a readiness review that hard-blocked Mode-4 would contradict the standing soft-gate covenant (display-only signals that advise but never lock; `STRATUM_PREREQS` stays the only real gate). The amber banner advises and offers a navigation shortcut; it never prevents entry. This is the precedent the later thresholds inherit (T2 keeps it; only T3's Begin-Act deliberately breaks it, by explicit operator mandate).
- **Plan-only chrome on the shared workbench:** additive defaulted props mean Act imports nothing new and renders identically.

## Alternatives Considered

- **A bespoke `IntentElementsCapture` plan item (re-author intent):** rejected -- it would duplicate the Tier-0 declaration and risk drift; superseded by `deriveIntentElements` + a VisionProfile fallback.
- **Promote a classification into a hard prerequisite (block Mode-4 until approved):** rejected -- it would convert an advisory readiness signal into a covenant-breaking gate; intentionally avoided pending covenant review.
- **Free-form Planning Direction with no classification vocabulary:** rejected -- the four-state `feasible|conditional|deferred|released` vocabulary (type-gated) keeps the direction auditable and downstream-renderable.

## Consequences

- The Plan stage now has a real synthesis hinge: declared intent is measured against eleven surveys, classified, and sealed into a Planning Direction Statement before any Mode-4 design decision.
- The Mode-4 strata gain an advisory readiness banner (amber when unapproved, calm registers when approved) that never blocks -- a Mode-4 stratum remains fully navigable whether or not Threshold 1 is approved.
- A new clickable-spine seam (`clickableThresholdIds` on `ActTierSpine`) generalises to the later thresholds (T2 and, with the reach/clickability split, T3).
- **Act is byte-identical** -- all chrome is Plan-only; the shared spine's new props default to inert.
- No schema, migration, or prerequisite change -- `prerequisiteObjectiveIds` / `STRATUM_PREREQS` are untouched and nothing new gates.

## Amanah

Structural. The classification surface is covenant-neutral, and no CSA / advance-sale / subscription / yield-share is ever SEEDED -- the source spec's "Commercial CSA" example was deliberately NOT transcribed; intent derives only from the steward's own captures. CSA-like steward free-text is never censored but raises a **non-blocking** advisory: `detectCsaLikeText` (regex `/(subscription|presale|pre-sale|advance[ -]sale|csa|csra|yield[ -]share)/i`) names the permitted capital channels (charitable donation, restricted donation, qard hasan, in-kind contribution, sponsorship). Wording-pin tests over all OLOS-authored copy and seed output are green. Any real yield-share / membership instrument stays Scholar-Council-gated and out of scope (no CSRA / salam -- bay' ma laysa 'indak) ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Verification

- 82 tests green in the threshold suite (Stage A 12, Stage B 56, Stage C ~76, Stage D 16 new / 82 cumulative).
- `tsc --noEmit` clean to the standing **6-error foreign baseline** (`syncServiceWorkItemsFallback.test.ts` x1, `WorkConflictSection.test.tsx` x3, `useDimensionDrawTool.commit.test.tsx` x2 -- none ours).
- Live preview deferred (maplibre/cesium headless hang) -> DOM/unit tests are the verification signal ([[project-screenshot-hang]]). No visual pass claimed.

## Connections

- [[entities/plan-tier-shell]] -- hosts the Reality Check surface, gate banner, and clickable-spine seam.
- [[entities/act-tier-shell]] -- confirmed byte-identical; the shared spine's new props default inert.
- [[decisions/2026-06-17-atlas-mode4-design-tiers34]] -- the Mode-4 Design strata that Threshold 1 (softly) gates into.
- [[decisions/2026-06-18-atlas-threshold2-coherence-check]] -- the second threshold, which inherits this soft-gate pattern.
- [[decisions/2026-06-19-atlas-threshold3-act-mandate]] -- the third threshold, whose Begin-Act is the one deliberate exception to the soft-gate covenant established here.
- [[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]] -- the Amanah constraint the non-blocking CSA advisory enforces.
- [[feedback-no-deletion]] -- additive, no deletion.
