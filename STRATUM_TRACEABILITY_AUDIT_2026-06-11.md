# STRATUM TRACEABILITY AUDIT — 2026-06-11

**Question:** Does every design and decision from Stratum 4 onwards refer to a design and/or decision made in Stratum 1, 2, and/or 3?
**Scope:** All 226 S4–S7 objectives across the Plan objective layer — 14 per-type catalogues (212), `universal.ts` (10), and the legacy skeleton `stratumObjectives.ts` (4) — plus the enforcement layer (resolver, status engine, conformance tests).
**Mode:** Report-only (operator decision) — no source, config, or git-index changes. Remediation filed as a deferred backlog (§9).
**Method:** Three parallel exploration passes (universal+skeleton; production catalogues; visitor/community catalogues + enforcement), followed by firsthand re-verification of every negative claim with pattern sweeps. Two agent under-counts were corrected before publication (§8). Branch: `main`.

---

## 1. Verdict

**Structurally: PASS.** Every one of the 226 S4–S7 objectives is gated — directly or transitively — on Stratum 1–3 objectives via the `STRATUM_PREREQS` spine. Zero ungated objectives, zero dangling prerequisite refs, zero non-universal prerequisite ids.

**Content-level: MIXED.** Whether the objective's *text* (checklist, focused question, scope notes, formula bindings) explicitly names the upstream read/decision it consumes varies by catalogue: production catalogues are strongly grounded; agritourism, ecovillage, and (to a lesser degree) education lean mostly on the transitive gate alone; and in `universal.ts` the declared `feedsInto` data channel is almost entirely unwired (31 S2–S3 checklist items feed nothing).

So: the *gating* invariant ("you cannot decide S4+ before completing S1–S3 reads") holds everywhere and is test-enforced. The *traceability* invariant ("each S4+ decision names which S1–S3 output it derives from") holds in most catalogues by prose, but is not encoded as data and is absent from a minority of objectives.

---

## 2. The four traceability channels

| Channel | Mechanism | Status |
|---|---|---|
| **Spine gate** | `obj()` defaults `prerequisiteObjectiveIds` to `STRATUM_PREREQS[stratumId]` ([authoring.ts:47-64,198](packages/shared/src/constants/plan/catalogues/authoring.ts)). S4 gates directly on `['s3-hydrology','s3-soil']`; S5→S4 decisions, S6→S5, S7→S6 — chaining transitively to S1. `computeObjectiveStatus` locks any objective whose prereqs aren't complete; `buildActLockContext` enforces with route redirects. | **Universal — every S4+ objective** |
| **Content cites** | Checklist/scopeNote prose naming the upstream output: "Review Stratum 1 vision…", "Confirm… against acoustic survey findings", "fits the welfare ethic". | **Majority, uneven** (§4) |
| **Typed bindings** | `ckF` formula bindings to S3 system reads (carrying-capacity, stock-water-demand); `ckA` answerSpec prefills from upstream captures. | Present where formulas exist (livestock, silvopasture) |
| **feedsInto forward wiring** | S1–S3 checklist items declare which downstream objective consumes them. | **Wired in skeleton, ~unwired in universal.ts** (§5) |

---

## 3. Structural layer — PASS (details)

- **No opt-outs:** zero S4–S7 objectives carry an explicit `prerequisiteObjectiveIds: []` in any catalogue. All type-catalogue S4+ objectives inherit the spine default; the only explicit overrides are the 4 skeleton objectives (a deliberate minimal linear chain: `s4-zones-sectors ← s3-systems-baseline`, etc. — still S1–S3-rooted).
- **No dangling refs / universal-ids-only invariant holds:** `spineGate.conformance.test.ts` asserts (1) every prereq id resolves in the resolved set for representative type combos, (2) the gate binds at zero progress (only S1 reachable), (3) it releases when S1–S4 complete, (4) stratum states roll up.
- **Transitivity is by design:** S5–S7 objectives reference S4 decision ids, not S1–S3 ids, directly. The narrated chain "can't design planting (S5) before zones (S4) before soil/hydrology (S3) before terrain/climate (S2) before vision (S1)" holds end-to-end through the spine.

---

## 4. Content layer — per-catalogue matrix

"Direct cites" = S4+ objectives whose own text explicitly names an S1–S3 read/decision (or carries a typed binding to one). Counts are minimums — pattern sweeps undercount paraphrased references.

| Catalogue | S4+ objs | Grounding | Evidence (representative) |
|---|---|---|---|
| **homestead** | 10 | **Strong** | `hms-s4-food-production-strategy` c1 "Map household food needs from Tier 0"; `hms-s5-animal-husbandry` loads only if animals confirmed in the Tier-0 survey; `hms-s6-self-sufficiency-feedback` c3 connects tracking to Tier-0 targets |
| **silvopasture** | 22 | **Strong** | `silv-s4-tree-integration` c6 gates on the S1 land-improvement philosophy; `silv-sec-s3-forage-survey` ckF carrying-capacity; patches tie stock-water demand into `s4-water-strategy` |
| **regenFarm** | 8 | **Strong** | `rf-s7-enterprise-sequencing` c1 "Confirm enterprise priority tiers from Stratum 1"; `rf-s5-windbreaks` c1 maps against prevailing wind sectors (S2) |
| **marketGarden** | 16 | **Strong** | `mgd-s4-irrigation/fertility/ipm` each end with "consistent with growing philosophy" (S1 design constraint); `mgd-s4-crop-rotation-bed-layout` c3 sizes beds from S1 production targets |
| **orchard** | 20 | **Strong** | `orch-s4-guild-planting` c6 gates on the S1 species philosophy; `orch-s5-planting-layout` places against S2 frost-drainage microclimates; `orch-sec-s4-species-pollination` selects against the S2 climate-matched shortlist |
| **livestockOperation** | 19 | **Strong** | `lvs-s4-stocking-rate` ckF-binds the S3 carrying-capacity formula; `lvs-s4-grazing-system` c5 "fits the welfare ethic" (S1); `lvs-s7-herd-buildup` hard-gates arrival on S4–S5 infrastructure go/no-go |
| **residential** (secondary) | 4 | **Strong** | `res-s6-self-sufficiency` c3 connects tracking to the Stratum-1 household-needs baseline (scopeNote: feedback loop only works if S1 was honestly recorded); P1–P4 patches inject domestic demand into universal S3–S5 |
| **offGrid** | 16 | **Strong** | `ofg-s4-water/energy/food` c5–c6 each validate against a named Tier-0/Tier-2 target ("worst-case month energy balance from Tier 2"); S7 hard gate: no habitation until S4 systems pass go/no-go |
| **nursery** (secondary) | 3 | **Adequate** | S4-only by design; infra/irrigation/dispatch are sized by the sec-S3 propagation strategy and sec-S2 biosecurity survey |
| **wellness** | 19 | **Moderate** | 4 of 5 S4 objectives validate against named upstream surveys (acoustic S3, privacy-gradient S2, regulatory Tier-0); S5–S7 transitive-only |
| **conservation** | 19 | **Moderate** | Blanket philosophy gate: CON-S1.5 scopeNote — "All downstream design decisions (S4–S5) must be evaluated against this philosophy before proceeding"; 4 of 5 S4 objectives cite it in checklist items; `con-s5-wildlife-habitat-infrastructure` c5 confirms placement against wildlife survey findings; `con-s6-ecological-monitoring` measures against Tier-0 outcome targets. S7 transitive-only |
| **education** | 14 | **Moderate** | `edu-s4-food-hospitality` c5 confirms against the Tier-0 regulatory framework; `edu-s4-safety-risk-framework` hard-gates on the S3 site risk assessment; rest transitive-only |
| **ecovillage** | 20 | **Sparse** | `ev-s4-food-system` explicitly derives from the Stratum-1 provision balance; `ev-s4-settlement-strategy`/`ev-s4-housing-cluster` align with S2 carrying capacity; `ev-s7-adaptive-management` reviews against Stratum-1 vision; the other ~16 transitive-only |
| **agritourism** | 22 | **Sparse** | 3 direct cites: `ag-s5-accommodation` (S1 visitor-capacity definition), `ag-s6-load-monitoring` (S1 operational boundary), `ag-s7-adaptive-management` (S1 vision + commercial model); the other ~19 transitive-only |
| **universal** | 10 | **Mixed** | `s4-direction` c1 explicitly reviews Stratum-1 vision against all survey findings (the strongest single anchor — every type inherits it); `s4-zones` c3 allocates "based on survey findings"; but `s5-access`, `s6-monitoring`, `s7-phase1/resource-plan/risk-register` carry no upstream cite |
| **skeleton** | 4 | **Wired** | The only layer using `feedsInto` properly: `s1-vision-c2→s4-zones-sectors`, `s1-vision-c3→s7-phasing`, `s2-land-baseline→s4/s5`, `s3-systems-baseline→s5/s6`. Live only for legacy/null-type projects (level-3 fallback in [useProjectObjectives.ts](apps/web/src/v3/plan/strata/useProjectObjectives.ts)) |

**Transitive-only universal objectives (highest leverage, inherited by every project type):** `s4-water-strategy`, `s4-zones` (partial), `s5-access`, `s5-water-infrastructure`, `s5-soil-improvement`, `s6-monitoring`, `s7-phase1`, `s7-resource-plan`, `s7-risk-register`.

---

## 5. The feedsInto wiring gap (universal.ts)

The schema provides `feedsInto` precisely to encode "this S1–S3 read is consumed by that S4+ decision" — and the universal catalogue almost never uses it:

- **31 S2–S3 checklist items declare `feedsInto: []`** — every item of `s2-terrain`, `s2-climate`, `s2-ecology`, `s2-infrastructure`, `s3-hydrology`, `s3-soil`. The reads gate downstream (spine) but never name their consumers.
- **Strongest single gap — `s5-access`:** the access & circulation design has *no* tether (prose, prereq, or feed) to the S2 infrastructure read (existing roads, legal access points) or the S3 access-pattern item. In the skeleton, `s3-systems-baseline-c1` (movement patterns) even feeds `s5-water-strategy` instead.
- **Expected-but-absent feeds:** `s3-soil → s5-soil-improvement`; `s3-hydrology → s4-water-strategy/s5-water-infrastructure`; `s2-climate → s4-zones/s4-water-strategy`; `s1-vision-c3` (capacity bands) feeds skeleton `s7-phasing` but nothing feeds universal `s7-phase1`/`s7-resource-plan`; no S1-boundaries constraint feeds `s7-risk-register`.

Consequence: the UI cannot render "this decision is informed by these reads" from data; the relationship lives only in prose and in the steward's head. Not a defect (nothing breaks), but it is the difference between *gated* and *traceable*.

---

## 6. Enforcement layer

| Finding | Location | Assessment |
|---|---|---|
| Spine gate enforced at runtime | `stratumObjectiveStatus.ts` (missing/incomplete prereq → `locked`), `buildActLockContext` route redirects | Sound |
| Conformance test covers representative combos, not every catalogue statically | `spineGate.conformance.test.ts` | A new objective with a non-universal prereq id in an untested combo would silently lock forever (documented invariant, authoring.ts:34-41). Latent risk, not an active defect — current catalogues are clean |
| Resolver skips missing patch targets silently (recorded in provenance) | `resolveProjectObjectives.ts` | Acceptable; provenance preserves the audit trail |
| No global check that S4+ objectives carry upstream traceability | — | The content-level convention (§4) is author-discipline only |
| Prose "philosophy gates" not computationally enforced | e.g. conservation CON-S1.5, wellness sensory standards | They gate by steward adherence, not by the status engine — consistent with how completion gates work generally |

---

## 7. Amanah flags (verified intact through S4+)

The S1-decided ethical constraints correctly propagate to downstream strata, and nothing was silently dropped:

- **marketGarden:** S1 CSA flags (bayʿ mā laysa ʿindak) gate `mgd-s4-post-harvest-handling` c5 ("meets all market channel requirements").
- **livestockOperation:** `lvs-s7-marketing` carries the full herd-share/meat-share advance-sale flag verbatim — Scholar Council review required before adoption, membership-benefit framing only, permissible spot-sale channels listed.
- **orchard:** `orch-sec-s6-harvest-pathway` c4 requires the destination be "a halal pathway with no riba or gharar."

This is itself S1→S4+ traceability of the most important kind: the covenant constraints set at the foundation bind the commercial decisions downstream.

---

## 8. Method notes & corrections

Two exploration-agent claims were corrected by firsthand re-verification before this report:

1. *"Conservation S4+ has no direct S1–S3 references"* — **wrong.** 4 of 5 S4 objectives cite the intervention philosophy in checklist items; the catalogue carries a blanket S4–S5 philosophy gate; `con-s5-wildlife-habitat-infrastructure` and `con-s6-ecological-monitoring` cite named surveys/targets.
2. *"Agritourism and ecovillage have zero direct references"* — **overstated.** Each has 3–4 anchor cites (§4); the accurate finding is *sparse*, not *absent*.

Counts in §4 were re-derived by direct `stratumId`/cite pattern sweeps over every catalogue file, not taken from agent summaries.

---

## 9. Deferred remediation backlog (NOT executed — operator decision: report-only)

| # | Item | Effort | Notes |
|---|---|---|---|
| 1 | Wire universal `feedsInto`: S2/S3 reads → their S4/S5 consumers (terrain/climate/soil→`s4-zones`; hydrology/climate→`s4-water-strategy`; infrastructure+access patterns→`s5-access`; soil→`s5-soil-improvement`; hydrology/infrastructure→`s5-water-infrastructure`; vision capacity bands→`s7-phase1`/`s7-resource-plan`; boundaries constraints→`s7-risk-register`) | Small per edit | **Encodes design judgment** — which read feeds which decision is an authoring call, not mechanical. Operator should confirm the mapping before wiring |
| 2 | Add a global conformance test: every catalogue objective's explicit `prerequisiteObjectiveIds` override references only universal ids; every S4+ objective reaches S1 transitively through the resolved prereq graph | Small | Closes the silent-permanent-lock latent risk for future authoring; current catalogues already pass |
| 3 | Author upstream cites for the sparse catalogues (agritourism ~19 objectives, ecovillage ~16, education S5–S7) following the offGrid pattern ("Confirm X against the Tier-N Y") | Medium | Content authoring; source-doc fidelity rules apply (catalogue docs are operator-provided) |
| 4 | Optionally surface `feedsInto` in the Plan UI ("Informed by" chips on the objective detail panel) once #1 lands | Medium | Turns traceability from data into a steward-visible feature |
