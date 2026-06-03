# Act-Stage Objective Coverage — Findings & Remediation Plan

**Date:** 2026-06-03
**Project:** OLOS / Atlas
**Question asked:** _"Check every single objective to see if there's a tool in the Act stage that enables the user to complete and record completion of that objective's set of tasks."_
**Method:** Deterministic audit — [`scripts/audit-act-objective-coverage.ts`](../audit-act-objective-coverage.ts) drives the *same* `@ogden/shared` resolvers the live `ActTierShell` uses. Raw matrix regenerated at [`act-objective-coverage.md`](act-objective-coverage.md) (overwritten each run; **this** file holds the interpretation).

> Companion, not duplicate: the matrix file is the evidence (one row per objective). This file is the answer, the gap classification, and the fix.

---

## 1. Direct answer

**Yes — every one of the 316 objectives (across all 14 project types) is completable and recordable today.** Completion does not depend on the bottom-rail tools at all. For *every* objective, [`ActTierExecutionPanel`](../../apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx) universally renders three surfaces:

| Surface | Store / mechanism | Empty? |
|---|---|---|
| **Checklist** (the task set) | `planStratumStore.toggleItem` | Never — every objective has ≥ 5 checklist items |
| **Evidence** (photo / confirm / note) | `actEvidenceStore` via `getObjectiveEvidence` | Never — always ≥ a `summary-note` |
| **Record observation** (the completion record) | emits `ObserveDataPoint` | Gated, but **never hard-blocked** — see Gap B |

The **"Record observation"** button is the actual *record-completion* act. It is gated on `checklistReady && evidenceReady && domainId !== null` ([ActTierExecutionPanel.tsx:245](../../apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx)). The audit empirically proves the third condition (`domainId !== null`) is satisfied for **all 316 objectives** — so the record path is reachable for every objective once the user finishes its checklist and required evidence.

**The `olos_*` API tables** (`olos_act_tasks`, `olos_proof_records`, `olos_verification_records`) are a separate backend that is **not wired into the live Act UI** and do **not** drive completion today. The lightweight `ObserveDataPoint` path is the live mechanism. (Strategic note in §5.)

So the literal question — _"is there a tool to complete and record each objective?"_ — is **yes, universally**. The real findings are about **tool precision**, not availability.

---

## 2. What the audit measured (316 objectives, 14 types)

| Gap | Definition | Count | Severity |
|---|---|--:|---|
| **A** | No explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE`; falls through to the coarse `STRATUM_ACT_TOOLS_DEFAULT` | **271** | Precision (tools are generic, not absent) |
| **B** | Null primary Observe domain → "Record observation" can *never* fire | **0** | **None — disproven** |
| **C** | Zero bottom-rail tools (empty rail) | **41** | 11 intentional / **30 accidental** |

Per-type breakdown is in the matrix (§"Per-type coverage"). Only **silvopasture** (overrides authored 2026-06-01) and **nursery** carry zero Gap-A objectives; **homestead — the active vertical-slice primary — has 15 Gap-A objectives.**

---

## 3. The real gaps (corrected from the plan's assumptions)

### Gap B is empty — the plan's "null-domain Record blocker" does not exist
The plan hypothesized that some objectives resolve to a null Observe domain and can therefore never emit a completion record. **The audit returns 0.** Every objective resolves a primary domain via `STRATUM_OBSERVE_DOMAINS_DEFAULT`. **Drop Gap B entirely** — no remediation needed.

### Gap A (271) — tools exist but are semantically misaligned, not missing
Objectives without a per-type override inherit their stratum's default tool set. The default is **subject-blind**: every s3 objective gets the *same* 6 infrastructure tools, every s6 gets the *same* 8, regardless of what the objective is actually about.

`STRATUM_ACT_TOOLS_DEFAULT` ([objectiveActTools.ts:35](../../packages/shared/src/relationships/objectiveActTools.ts)):

| Stratum | Default tools | # |
|---|---|--:|
| `s1-project-foundation` | _(none)_ | 0 |
| `s2-land-reading` | contour, drainage, soil, vegetation, erosion | 5 |
| `s3-systems-reading` | roads, power, water-lines, gates, fencing, buildings | 6 |
| `s4-foundation-decisions` | roads, gates, fencing, buildings | 4 |
| `s5-system-design` | water-lines, tanks, wells, water | 4 |
| `s6-integration-design` | crops, orchards, paddocks, beds, compost, harvest, livestock, flow-connector | 8 |
| `s7-phasing-resourcing` | buildings, barns, tanks | 3 |

So e.g. `hms-s5-animal-husbandry` and `mgd-s5-irrigation-system` both surface the identical `[water-lines, tanks, wells, water]` rail — adequate for irrigation, wrong for animal husbandry. **This is precisely the misalignment that forced explicit silvopasture overrides on 2026-06-01.** The user can still complete + record the objective; the rail just isn't scoped to the objective's own checklist.

### Gap C — 41 empty rails, but only 30 are accidental
- **11 intentional** (explicit `[]` override, gap-noted in code): `s1-boundaries`, `s4-direction`, `s7-phase1`, `s7-resource-plan`, and the silvopasture decision/text objectives (`silv-s1-*`, `silv-s4-animal-health`, `silv-s6-animal-health-monitoring`, `silv-s7-*`). These are legal/decision/analysis objectives with no mountable draw tool by nature — correctly empty, served by checklist + note.
- **30 accidental** — all `s1-project-foundation` **vision/intent** objectives across the 10 per-type catalogues (e.g. `hms-s1-household-needs`, `ag-s1-experience-vision`, `con-s1-conservation-intent`, `lvs-s1-enterprise-vision`). They get `[]` because the s1 default is empty **and** they have no override.

The tell that these 30 are accidental, not intentional: the **universal** `s1-vision` objective — the same kind of text/decision objective — carries **7 form-arm tools** (`purpose-statement`, `success-criteria`, `labour-inventory`, `capital-budget`, `constraints`, `vision-classify`, `assumptions`) that open data-capture popups, and `s1-stakeholders` carries 2 (`neighbour-pin`, `steward`). Form-arm tools for exactly this objective class **already exist and are mounted** — the per-type s1 objectives simply were never wired to them.

---

## 4. Remediation plan

Three data-only changes in `packages/shared` (mirroring the silvopasture override precedent), gated by a strengthened conformance test. **No invented content** — every candidate tool list is operator-reviewed catalogue data.

### R1 — Gap A: author per-type `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries (homestead first)
Follow the documented coverage principle ([objectiveActTools.ts:72](../../packages/shared/src/relationships/objectiveActTools.ts)): every checklist item with a real mountable `MapToolId` gets a rail tool; pure analysis/decision/legal items are left out with a `gap:` note. The audit script can be extended to emit **candidate** lists by matching checklist text against `ACT_TOOL_CATALOG` ids, but **final mappings require operator review** — this is catalogue content, not to be invented.

**Priority order:** homestead (active slice, 15 objectives) → silvopasture's primary peers (regenerative_farm, market_garden, orchard_food_forest) → remaining types.

Homestead Gap-A worklist (15 objectives needing overrides):
`hms-s2-landscape-vectors`, `hms-s2-productive-capacity`, `hms-s2-resource-flows`, `hms-s3-water-quality`, `hms-s4-energy-shelter-resilience`, `hms-s4-fertility-strategy`, `hms-s4-food-production-strategy`, `hms-s5-animal-husbandry`, `hms-s5-energy-shelter-systems`, `hms-s5-food-zones-layout`, `hms-s6-self-sufficiency-feedback`, `hms-s7-adaptive-management`, `hms-s7-budget-input-reduction`, `hms-s7-provision-phasing` (+ `hms-s1-household-needs`, addressed under R2).

### R2 — Gap C (30 accidental s1 empties): wire form-arm tools — **DEFERRED (operator design needed)**
On implementation this proved larger than data-in-shared. The existing form-arm tools (`purpose-statement` etc.) are hardwired to the universal `s1-vision` checklist-item ids (`formId: 's1-vision-c1'…`) and universal prompts ("State the primary purpose of **this land project**"). Reusing them on, say, `hms-s1-household-needs` would open a modal whose `formId`/prompt does not match that objective's checklist. Closing R2 properly therefore requires **new per-type form-catalog entries** (new prompts + new `formId`s + `VisionFormModal` wiring in the app layer) — i.e. authored catalogue content, which is operator-reviewed, not invented unilaterally.

Note also: the universal `s1-vision` (with its 7 form arms) is **already resolved into every project** alongside the per-type s1 objectives, so the project-level vision capture is not actually missing — the per-type s1 objectives are additional, type-specific intent objectives. Their completion already works via checklist + `summary-note` + Record observation.

**Decision taken for homestead:** `hms-s1-household-needs` is set to an explicit, gap-noted `[]` (intentional empty, like `s1-boundaries`), not a fabricated form tool. The broader R2 (per-type vision capture forms across the 30 objectives) is flagged for operator design.

### R3 — Guardrail: ratchet `actToolCoverage.test.ts` across all 14 types
Extend [actToolCoverage.test.ts](../../apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts) so its "every objective has an explicit override" assertion covers **all 14 types** (today it enforces only universal + silvopasture). The assertion should permit the 11 intentional `[]` overrides via an explicit allow-list, and fail on any *new* default-fallthrough — locking in R1/R2 and preventing regression.

### Leave intentional `[]` (11) as-is
Decision/legal/analysis objectives are correctly served by checklist + `summary-note`. Optional future nicety: a small "decision capture" form tool so they aren't checkbox-only — defer unless the operator wants it.

---

## 5. Strategic note — the unwired `olos_*` backend

The formal proof/verification layer (`olos_act_tasks` / `olos_proof_records` / `olos_verification_records`) exists in the API but is not connected to the live Act UI; completion today runs entirely through the lightweight `ObserveDataPoint` path. Whether to wire the formal backend (structured proof + verification workflow) or keep the lightweight path is a **separate epic-level decision**, out of scope for this audit. Flagged here so it isn't mistaken for a coverage gap — it's a deliberate architecture fork awaiting a decision.

---

## 6. Implementation status (2026-06-03)

**R1 (homestead) — DONE.** All 15 `hms-*` objectives now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries ([objectiveActTools.ts](../../packages/shared/src/relationships/objectiveActTools.ts)): 8 spatial objectives mapped to grounded tools (every id verified against a real checklist item + a mountable `ACT_TOOL_CATALOG` tool), 7 strategy/decision/financial objectives set to intentional gap-noted `[]`. This also corrected 6 objectives that previously inherited *misaligned* stratum-default tools (e.g. `buildings/barns/tanks` on the household budget objective) — now an honest empty rail like universal `s4-direction`.

**R3 (ratchet) — DONE.** [actToolCoverage.test.ts](../../apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts) gains a "every homestead objective has an explicit override entry" assertion (allowing intentional `[]`). Locks homestead alongside the existing universal + silvopasture ratchets.

**R2 — DEFERRED** (see §4 R2 — needs operator-designed per-type form-catalog content).

**Audit re-run after R1/R3:** 316 objectives — Gap A **271 → 256** (homestead's 15 now covered), Gap B 0, Gap C 41 → 47 (18 intentional / 29 default-driven; the +6 are homestead decision objectives consciously moved from misaligned defaults to intentional `[]`).

**Tests (bounded, `--pool=forks`, per-workspace):**
- ✅ `actToolCoverage.test.ts` — 6/6 (incl. new homestead assertion).
- ✅ `objectiveObserveDomains.test.ts` — pass.
- ⚠️ `resolveProjectObjectives.test.ts` — 24/25; the 1 failure (`agritourism + residential = 54`, now 59) is **pre-existing and unrelated** — confirmed by re-running with the R1/R3 edits stashed. It is drift from the agritourism `AG-S4.8` membership/season-pass extension (commit `15680301`) whose count assertion was never updated. Flagged for a separate fix.

> Remaining Gap A (256 across the other 11 primary types) and R2 are **not yet implemented** — their tool mappings / form prompts are operator-reviewed catalogue content. Homestead (the active slice) is complete.
