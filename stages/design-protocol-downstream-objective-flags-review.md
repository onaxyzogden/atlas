# Design Spec - Protocol-Driven Downstream Objective Adjustment (closed-loop review flags)

> **Status:** review (awaiting steward gate). No build scoped yet.
> **Date:** 2026-06-02 | **Project:** OLOS / atlas | **Branch when built:** `feat/atlas-permaculture`
> **Revision:** v4 - introduces the expected-firing-rate baseline as the conceptual foundation (a flag fires on DEVIATION from a stated hypothesis, not on firing-at-all), reworks flag direction as deviation-sign, makes the observation window a per-protocol property (not derived from depth), fixes the verify-loop copy to stop implying causation, records a shared temporal bucket on every activation for co-occurrence, adds flag auto-dormancy, and re-frames (rather than suppresses) the establishment guard.
> **Note:** This is a design document, NOT an implementation plan. It exists so the steward can validate the concept, the dependency evidence, and the proposed mechanism before any build scope is chosen. Scope is presented for a later decision, not committed.

---

## Context

The operator asked: *"Are there objectives that meaningfully affect downstream objectives and would benefit from protocols that trigger adjustments to downstream objectives?"*

Investigation of the live model confirms: **yes** - the S1->S7 strata form an explicit dependency chain, and the loop the operator is sensing (field evidence contradicting a Plan assumption and flagging the downstream objective resting on it) is **real, valuable, and currently unbuilt**. Today a protocol firing writes an immutable `ProtocolActivation` log entry and lights a "Triggered" badge, then stops - it produces NO effect on any objective or parameter. This spec defines a non-destructive way to close that loop.

This is the most permaculture-authentic feature in the product: it treats the land as the source of truth and the design as a falsifiable hypothesis (Holmgren Principle 4, *apply self-regulation and accept feedback*; Mollison, *the designer becomes the recipient of information from the system*). The destination is **adaptive management** (Savory's holistic-management feedback loop): state a hypothesis -> sense -> compare to hypothesis -> adjust -> *verify the adjustment* -> repeat.

**Amanah gate:** agronomic land-stewardship tooling; benign, halal. No riba/gharar, no CSRA/advance-purchase framing. ASCII-only. Cleared. Flag-not-mutate is also a covenant choice: the human steward holds the trust; the system advises, it does not seize the wheel.

## The foundation - a flag fires on DEVIATION FROM A STATED EXPECTATION, not on firing-at-all

This is the load-bearing correction in v4 and it governs everything below.

In permaculture, a protocol firing is **usually the design working, not failing**. The cover-trigger firing IS the rotation logic functioning; a paddock hitting its recovery target and the steward moving stock is success. The design assumption is contradicted only when firings deviate from the **expected frequency** - not when they occur. A detector that treats every firing as suspicious is implicitly measuring against zero, which is agronomically false and is the true source of alarm fatigue.

Therefore: **at protocol-approval time, capture the steward's expected firing rate** - a rough hypothesis such as "I expect this to fire about 2-3 times per grazing season." This is the most biodynamically authentic act in the whole design: the steward stating, quantitatively, what they believe the land will do. The flag then fires on **deviation from that hypothesis**, which:

- Grounds every flag in something the land can confirm or refute, rather than an implicit "any firing is suspect."
- **Unifies the two flag directions for free:** fires MORE often than expected -> `tighten`; fires LESS often than expected -> `loosen`. `direction` becomes a *deviation sign*, not a severity-tier lookup - far more honest, and it makes abundance (over-performance) a first-class signal rather than a bolt-on.
- Makes the **count-only path sufficient**: "fired 6x vs your expected 2" is a complete, actionable signal with no numeric field measurement required (see field-seam realism below).

Where the expectation lives: alongside the s6 `parameterGroup` value (which today stores the threshold *value* but not its expected *crossing frequency*). A new per-protocol `expectedRate { count, per: 'season' | 'cycle' }` is the home. For protocols with no s6 token (Tier 2), it is authored on the protocol approval record. Absent an expectation, a protocol does not raise deviation flags (it can still raise the single-event existential exception below).

## Current state (verified against source)

- **Objective dependency** (`packages/shared/src/constants/plan/stratumObjectives.ts`): `prerequisiteObjectiveIds` HARD-gates (`packages/shared/src/relationships/stratumObjectiveStatus.ts`); checklist `feedsInto` is SEMANTIC and **display-only today**.
- **Protocol activation** (`apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx` -> `resolveTrigger` -> `recordActivation`): immutable, accumulates, carries reserved `season`/`cycleNumber`/`weatherConditionAtActivation` fields (currently unpopulated). `feeds` maps a protocol only to an Observe/Act *module* (`apps/web/src/v3/act/data/protocolFeedsMap.ts`) - never to an objective.
- **Only existing protocol<->objective binding:** the parameter-token table on `s6-yield-flows` (`buildProtocolOutputs`, one-way Plan -> condition). It stores threshold values, NOT expected frequencies.

## Evidence - the `feedsInto` edge graph (verbatim from seed)

| From (checklist item) | -> To objective |
|---|---|
| s1-vision-c1 (vision) | s2-land-baseline |
| s1-vision-c2 (land-use goals) | s4-zones-sectors |
| s1-vision-c3 (stewardship capacity) | s7-phasing |
| s2-land-baseline-c1 (contour/landform) | s4-zones-sectors |
| s2-land-baseline-c2 (water flow) | s5-water-strategy |
| s2-land-baseline-c3 (soils + ecology) | s4-zones-sectors |
| s3-systems-baseline-c1 (access/movement) | s5-water-strategy |
| s3-systems-baseline-c2 (resource flows) | s6-yield-flows |
| s3-systems-baseline-c3 (infrastructure) | s5-water-strategy |
| s4-zones-sectors-c1 (zone boundaries) | s5-water-strategy |
| s4-zones-sectors-c2 (sector directions) | s5-water-strategy |
| s4-zones-sectors-c3 (rationale/trade-offs) | s6-yield-flows |
| s5-water-strategy-c1 (keypoints/water lines) | s6-yield-flows |
| s5-water-strategy-c2 (storage strategy) | s7-phasing |
| s6-yield-flows-c1 (yield outputs) | s7-phasing |
| s6-yield-flows-c2 (circular flows) | s7-phasing |

(Terminal: s1-stewardship, s5-c3, s6-c3, all of s7.) **Convergence nodes:** s5-water-strategy (5 in) | s7-phasing (4) | s4-zones-sectors (3) | s6-yield-flows (3).

## Protocol -> objective binding - two feasibility tiers

Stratum objectives carry **no domain tag**, so the protocol `feeds -> ActModule` map does NOT reach any objective.

**Tier 1 - already bound by data (no new mapping).** Five protocols consume an `s6-yield-flows` parameter token directly:

| Protocol | token | s6 parameter |
|---|---|---|
| paddock-rotation-cover-trigger | `approved threshold` | cover-trigger |
| paddock-rotation-grazing-day-limit | `approved day limit` | day-limit |
| rest-period-re-entry-gate | `approved recovery target` | recovery-target |
| livestock-health-check-prompt | `configured window` | bcs-window |
| emergency-destocking | `emergency threshold` | emergency-threshold |

Adjustment target = **s6-yield-flows**; cascade ONE feedsInto hop -> **s7-phasing**.

**Tier 2 - needs a NEW `FEEDS_TO_OBJECTIVE` table (does not exist).** The event-driven protocols (post-rotation-impact-assessment, pre-rotation-paddock-assessment, water-trough-inspection, seasonal-stocking-rate-review, silvopasture-pest-diversion) carry no token and no objective edge. Agronomically the richest ("the land contradicts the base reading" -> s2-land-baseline / s5-water-strategy) but require a new table + semantics. Own design pass.

## Signal weighting - depth governs RENDERING, not the window (corrected in v4)

Engineering effort and agronomic consequence run in opposite directions on Yeomans' Scale of Permanence (climate -> landform -> water -> access -> soil -> structures, deepest first): Tier 1 hits the *shallowest, cheapest-to-change* s6 thresholds (low stakes, easy build); Tier 2 hits the *deep, slow-to-change* layers (high stakes, hard build, where the real regenerative value lives). A soil-baseline contradiction must render heavier than a threshold tweak.

So the flag carries a **depth** weight - but depth's ONLY job is rendering/prioritisation (a deep flag is visually heavier and sorts above a shallow one). **Depth does NOT compute the observation window** - see the next section for why v3's depth=window rule was wrong.

## The observation window is a per-protocol property, NOT derived from depth (corrected in v4)

v3 collapsed window into scale-of-permanence depth (shallow = short window, deep = multi-year). That rule is self-refuting. Ecological lag tracks the **biological response time of the indicator being measured**, not the permanence-rank of the objective the flag targets:

- A dam overtopping is a *deep* (water-strategy) signal that arrives in a single rain event - instant feedback, not multi-year.
- Soil microbial recovery is "deep" AND slow - the rule happens to hold, which is why it seduced.

The giveaway is the Emergency Destocking exception below: a **deep** carrying-capacity assumption that is nonetheless a *single-event* signal. When the cleanest rule needs an exception for its most important case, the rule is wrong.

Therefore the **window is authored per protocol**, alongside the expected rate (`expectedRate.per` already implies the natural window - a per-season rate is evaluated over a season; a per-cycle rate over a cycle). Express it in biodynamically-native cyclical terms via the reserved `season`/`cycleNumber` fields. Phenological note for a later pass: the *same* count means opposite things in different phases (6 cover-trigger firings in peak growing season is a real fault; the same in the shoulder season is noise) - so a mature version should weight the window by phenological phase, not just calendar span.

## Mechanism - deviation-based, bidirectional, non-destructive review flags

Five load-bearing rules:

**1. Flag on DEVIATION across a window, not on a single firing.** A flag raises when observed firings over the protocol's window deviate from its `expectedRate` (more -> `tighten`, fewer -> `loosen`). This is agronomically honest *and* the structural defence against alarm fatigue. Keep the "should this raise a flag, and which direction?" policy as a **pure, tested function in `@ogden/shared`** (alongside `resolveSeverityTier`/`buildProtocolOutputs`).
> **Single-event existential exception:** Emergency Destocking - existential, not noise, and carries ihsan/rifq weight (a wrong carrying-capacity assumption cost the animals). It may flag on one confirmed activation regardless of expected rate. This exception is precisely why window must be per-protocol, not depth-derived.

**2. Direction is a deviation sign, not a severity-tier lookup.** `direction: tighten | loosen` is set by the SIGN of the deviation (over vs under expected). Over-performance is a contradicted assumption too: land consistently beating the re-entry recovery target in half the expected rest is the land saying the stocking rate is too timid and yield is being left on the table. A regenerative tool learns from abundance, it does not only manage faults. The reason string states which way the evidence points AND against what expectation ("fired 6x vs your expected 2 this season").

**3. Flag, do NOT mutate.** "Adjust a downstream objective" must not mean unchecking its checklist items - the status engine derives `complete` purely from checked items; unchecking is destructive and breaks the no-deletion rule. Instead emit an additive **review flag** - an amber "Review" chip on the objective card with an actionable, directional, expectation-anchored reason. `complete` stays honest; resolution is steward-driven (acknowledge / re-validate / dismiss). Human authority over the Plan is preserved.

**4. Close the loop - adaptive-management verify step, WITHOUT laundering correlation as proof.** When a flag's resolution coincides with a parameter change (e.g. s6 cover-trigger 1,500 -> 1,700), link them and report subsequent behaviour **against the expectation, with the confound stated**. NOT *"your change worked (0 firings)"* - that credits a tweak for what may have been a wetter season, training the steward to trust noise. INSTEAD: *"Since you raised the cover trigger: fired 0x vs your expected 2x. Note: conditions this season were also milder than last."* The verify step compares firings-since against the stated `expectedRate` (a hypothesis) rather than against last season's weather (an uncontrolled variable), and the copy always names the confound. The skeleton may defer the verify step, but the flag schema must be shaped for it from day one.

**5. The land closes its own loop - flag auto-dormancy.** Living systems self-regulate; the flag store should too. If a flag's pattern does NOT recur within a comparable subsequent window, the flag **auto-ages to dormant** on its own - distinct from human dismissal. A `tighten` flag raised in a drought autumn that the steward never formally resolves must not sit amber forever once the next season is fine; the land not reproducing the signal IS a resolution. Auto-dormancy is reversible: if the pattern returns, the flag re-activates (and the dismissed-but-worsening escalation path still applies for human-dismissed flags whose pattern intensifies).

### Data-model sketch (for review, not final)

`ObjectiveReviewFlag { id, projectId, objectiveId, sourceTemplateId, sourceActivationIds[], observedCount, expectedRate { count, per }, window { season?, cycleNumber? }, deviationSign, depth, direction (tighten|loosen), reason, raisedAt, acknowledgedAt?, resolvedAt?, dormantSince?, resolutionParameterDelta? { itemId, from, to }, firingsSinceResolution? }`
- Stored in a slice parallel to `activations` (immutable-append pattern, mirrors `protocolStore`).
- `observedCount` + `expectedRate` + `deviationSign` + `direction` + `window` present from the skeleton, so deviation flags and bidirectionality slot in with NO migration.
- `dormantSince` carries the auto-dormancy state (rule 5); `resolutionParameterDelta` + `firingsSinceResolution` shape the verify loop in from day one even if computed later.
- **Dedup + lifecycle:** at most one OPEN flag per `(objectiveId, sourceTemplateId, direction)`; do not raise a duplicate while one is open (increment `observedCount`). Lifecycle: raise -> acknowledge -> resolve -> archive, OR raise -> auto-dormant (rule 5).
- **Dismissed-but-worsening escalates:** a human-dismissed flag whose pattern then *intensifies* re-surfaces with raised depth/severity. Dedup must not become learned helplessness.

### Co-occurrence requires a shared temporal bucket on EVERY activation, recorded from day one (architecture-now)

The dedup key is per-template, but **co-occurrence (the north star) is inherently cross-template** - cover-trigger AND recovery-failure AND destocking firing together is a structural water/stocking verdict far stronger than any single edge. A purely per-template model will never naturally surface it. The skeleton need not *detect* co-occurrence, but it MUST **stamp a shared temporal bucket / window-id on every `ProtocolActivation` from day one** (e.g. derive a bucket key from `season` + `cycleNumber`), or the north star becomes a painful retrofit. This is an architecture decision for the skeleton, not a deferrable later slice.

## Data-capture dependencies (verified against source - NOT free)

1. **Quantitative reason strings are ENRICHMENT over a count-sufficient core.** The deviation model (count-vs-expected) is a complete signal with NO numeric field measurement, which matters because numeric capture is costly: `ProtocolActivation` stores no number (`packages/shared/src/schemas/protocol/protocol.schema.ts` lines 199-223; `resolveTrigger` passes only metadata + recipeSnapshot). The semantic home is `ObserveDataPoint.measurementValue` (`packages/shared/src/schemas/observe/dataPoint.schema.ts`, `z.unknown().nullable()`), but the Act path stamps only `{ label, note }` text. Populating it numerically means asking a field operator to type a number during proof capture - mobile, in the paddock, gloves on, at the worst moment. If optional, the data is sparse and "trended to 1,720 vs 1,500" strings are unreliable; if mandatory, friction is added to a flow that works today. So treat **"fired Nx vs expected M" as the primary, possibly permanent mode** and numeric measurement as opt-in enrichment - design the feature to be genuinely good on counts alone (the expected-rate baseline makes this possible). Join path when numerics do exist: `projectId` + `sourceObjectiveId` + temporal proximity; no `ProtocolActivation` schema change.
2. **The establishment guard RE-FRAMES the flag, it does not suppress it (corrected in v4).** There is NO planting/commencement date on the project (`project.createdAt` is a system stamp; `project.startDate` is an optional Goal Compass anchor); a J-curve definition `establishment = years 1-2` exists only in financial export (`apps/web/src/features/financial/somAppreciation.ts`). Two corrections to v3's binary suppress-guard: (a) establishment is **not uniform** - in silvopasture the tree rows establish over 3-5 years while the inter-row pasture establishes in one season, so a single project-level flag is too coarse; (b) suppressing flags in-window can be **backwards** - during establishment you often want *tighter* protective triggers for fragile young ground. The honest rule: establishment changes the **interpretation** ("don't conclude the design failed - this is expected during establishment") but NOT necessarily the **action** ("you may still need to destock to protect young ground"). So the guard annotates the flag's reason; it does not silence the flag. Source for the window: reuse `startDate` (with fallback) or add `commencementDate`; reuse the J-curve year-bands for consistency.

## Risks

| Risk | L | I | Mitigation |
|---|---|---|---|
| **Alarm fatigue** | High | High | Deviation-from-expectation (not firing-at-all); per-(objective,template,direction) dedup; auto-dormancy; resolution lifecycle; expectation-anchored reasons. |
| **No baseline to falsify against** | High | High | Expected-firing-rate captured at approval; flags fire on deviation only. |
| **Establishment dip** - young systems underperform regardless of design quality | High | Med | Guard re-frames the reason ("expected during establishment"), does not suppress the action; needs age source. |
| **Verify loop launders correlation as proof** | Med | Med | Compare firings-since against expected rate; always name the confound in copy. |
| **Deficit bias** - only flagging faults | Med | Med | Direction is a deviation sign; under-expected firing raises `loosen` flags. |
| **Design thrashing** | Med | Med | Deviation + window + flag-not-mutate keeps human in loop; patience is a permaculture value. |
| **Co-occurrence becomes a retrofit** | Med | Med | Shared temporal bucket stamped on every activation from day one. |
| **Flags never forgive** | Med | Med | Auto-dormancy when the land stops producing the signal. |
| **Cascade storm** | Med | Med | One feedsInto hop only (s6 -> s7), never transitive. |
| **Field-numeric friction** | Med | Low | Count-vs-expected is the core; numeric is opt-in enrichment. |

## Recommended answers to the open questions

1. **Flag vs. re-open:** **flag-only.** Auto-transitioning a `complete` objective strips authorship and violates amanah. System signals; steward decides.
2. **Cascade depth:** **one feedsInto hop** (s6 -> s7). Transitive cascades produce flag storms. (North star: cross-protocol co-occurrence via the shared temporal bucket - far stronger than any single edge.)
3. **Direction coupling:** **direction is the deviation sign** (over-expected -> tighten; under-expected -> loosen). `watch` stays observational (no flag); the Emergency Destocking single-event existential case bypasses the expected-rate test.
4. **Scope:** **Emergency-Destocking walking skeleton first** (the one case a single event justifies; exercises the full pipe activation -> flag -> objective surface -> resolve), with the flag schema shaped for expected-rate deviation + direction + window + shared-bucket + verify so nothing needs migration. Defer Tier 2 (`FEEDS_TO_OBJECTIVE`), numeric enrichment capture, co-occurrence detection, phenological weighting, and the verify-step computation to follow-on slices. Decide the establishment-age source before the guard is implemented; capture `expectedRate` at approval as part of the skeleton (it is the foundation, not an add-on).
5. **Spec home:** promote to `wiki/decisions/YYYY-MM-DD-...md` once accepted; keep in `stages/` until then.

## Explicitly out of scope for this spec
- The full auto-evaluation engine / 6 first-class trigger types (already deferred in the slice plan).
- Any change to `statusMeta`, `ProtocolColumn`, `v3/plan/spine/`, or `ProtocolConfirmationFlow` (import-only surfaces).
- The Tier 2 `FEEDS_TO_OBJECTIVE` table; cross-protocol co-occurrence DETECTION (the data hook is in scope, the detection is not); phenological-phase window weighting; numeric-measurement enrichment capture; the verify-loop computation (all own slices).
- Implementation step decomposition - a separate plan once scope is chosen.
