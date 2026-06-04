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

> Remaining Gap A (114 across the other primary types) and R2 are **not yet implemented** — their tool mappings / form prompts are operator-reviewed catalogue content. Homestead (the active slice), regenerative_farm, market_garden, orchard, livestock_operation, conservation, and off_grid are complete.

### Regenerative farm — DONE (R1/R3, 2026-06-03)

**R1 (regen farm).** All 13 `rf-*` objectives now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries: 10 spatial objectives mapped to grounded tools (every id verified against a real `rf-*` checklist item + a mountable `ACT_TOOL_CATALOG` tool), 3 set to intentional gap-noted `[]` (`rf-s1-enterprise-mix` = enterprise-mix decision; `rf-s7-enterprise-sequencing` = sequencing decision; `rf-s7-cash-flow` = financial, Amanah-clean per c5 "no capital formation or investor structure content"). Before this the regen objectives fell through to the coarse stratum default with a severe misfit — S3 nutrient/pest showed access-utilities tools, S4 strategy showed roads/fencing, S5 fertility/windbreaks showed the water-line set.

**R3 (ratchet).** `actToolCoverage.test.ts` gains a "every regenerative-farm objective has an explicit override entry" assertion (intentional `[]` still satisfies it). 7/7.

**Audit re-run after regen R1/R3:** 316 objectives — Gap A **256 → 243** (regen's 13 now covered), Gap B 0, Gap C 47 → 49 (21 intentional / 28 default-driven; +3 = the regen decision/financial objectives consciously set to intentional `[]`).

**Tests (bounded, `--pool=forks`, per-workspace):** ✅ `actToolCoverage.test.ts` 7/7 · ✅ `objectiveObserveDomains.test.ts` 8/8 · ✅ `resolveProjectObjectives.test.ts` **25/25** (the previously pre-existing agritourism count failure has since been resolved upstream; full suite now green). Shared `tsc --noEmit` EXIT 0.

Committed `187c4f6f`.

### Market garden — DONE (R1/R3, 2026-06-03)

**R1 (market garden).** All 24 `mgd-*` objectives now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries: 18 spatial / field-log objectives mapped to grounded tools (every id verified against a real `mgd-*` checklist item + a mountable `ACT_TOOL_CATALOG` tool), 6 set to intentional gap-noted `[]` — the three s1 objectives (`mgd-s1-production-targets-sales`, `mgd-s1-growing-system-philosophy`, `mgd-s1-market-channels`; the first and third carry CSA Amanah scopeNotes flags, untouched, and are off-site decisions), `mgd-s6-sales-revenue-tracking` (financial, Amanah-clean), `mgd-s6-adaptive-management` (review protocol), and `mgd-s7-financial-viability` (break-even budgeting, MGD-S7.5, Amanah-clean). Before this the mgd objectives fell through to the coarse stratum default with the same misfit class as regen — S3 water/pest showed access-utilities, S4 strategy showed roads/fencing, S5 infrastructure showed the water-line set instead of bed/compost/wash-pack tools.

**R3 (ratchet).** `actToolCoverage.test.ts` gains a "every market-garden objective has an explicit override entry" assertion (intentional `[]` still satisfies it). 8/8.

**Audit re-run after market-garden R1/R3:** 316 objectives — Gap A **243 → 219** (market garden's 24 now covered), Gap B 0, Gap C 49 → 52 (27 intentional / 25 default-driven; +6 intentional = the mgd decision/financial objectives, −3 default-driven now explicitly wired).

**Tests (bounded, `--pool=forks`, per-workspace):** ✅ `actToolCoverage.test.ts` 8/8 · ✅ `objectiveObserveDomains.test.ts` 8/8 · ✅ `resolveProjectObjectives.test.ts` **25/25**. Shared `tsc --noEmit` EXIT 0.

Committed `3c340134`.

### Orchard — DONE (R1/R3, 2026-06-03)

**R1 (orchard).** All 30 orchard objectives now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries — the 25 `orch-*` primary objectives plus the 5 `orch-sec-*` standalone *additive* objectives (which surface when orchard is a secondary type, the same situation that forced the silvopasture-secondary overrides). 19 map to grounded tools (every id verified against a real checklist item + a mountable `ACT_TOOL_CATALOG` tool — e.g. frost-drainage->frost-pocket/drainage/sun-sector, planting-layout->orchards/zone/frost-pocket, guild-plan->orchards/vegetation, tree-protection->fencing/buffer-ring, phenological-monitoring->frost-pocket/harvest/transect); 11 set to intentional gap-noted `[]` (s1 species-philosophy / production-intent / provenance-sourcing, `orch-s4-species-mix` selection, `orch-s4-succession-management`, `orch-s6-adaptive-management`, `orch-s7-planting-establishment` sequencing, `orch-s7-succession-plan`, `orch-s7-financial-viability` ORCH-S7.6 Amanah-clean, `orch-sec-s4-species-pollination` selection, `orch-sec-s6-perennial-care` commitment). The 4 `ORCHARD_SECONDARY_PATCHES` inject into universal objectives (`s4-water-strategy`, `s5-soil-improvement`, `s2-ecology`, `s7-phase1`) that already carry universal overrides — no work needed. Before this the orchard objectives fell through the coarse stratum default with the familiar misfit (S3 rootzone/pest showed access-utilities, S4/S5 perennial design showed roads/fencing or the water-line set).

**R3 (ratchet).** `actToolCoverage.test.ts` gains an "every orchard objective (primary + secondary) has an explicit override entry" assertion over the `ORCHARD_PRIMARY_OBJECTIVES` + `ORCHARD_SECONDARY_OBJECTIVES` union (mirrors the silvopasture assertion). 9/9.

**Audit re-run after orchard R1/R3:** 316 objectives — Gap A **219 → 194** (the 25 orch-* primary enumerated by the audit; the 5 orch-sec-* additive are wired + ratcheted but not separately enumerated by the per-type audit walk), Gap B 0, Gap C 52 → 58 (36 intentional / 22 default-driven; +9 intentional = the orchard primary decision/financial objectives, −3 default-driven now explicitly wired).

**Tests (bounded, `--pool=forks`, per-workspace):** ✅ `actToolCoverage.test.ts` 9/9 · ✅ `objectiveObserveDomains.test.ts` 8/8 · ✅ `resolveProjectObjectives.test.ts` **25/25**. Shared `tsc --noEmit` EXIT 0.

Committed `da4a96f2`.

### Livestock operation — DONE (R1/R3, 2026-06-03)

**R1 (livestock).** All 30 livestock_operation objectives now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries — the 23 `lvs-*` primary objectives plus the 7 `lvs-sec-*` standalone *additive* objectives (which surface when livestock is a secondary type, the same situation that forced the silvopasture-secondary overrides). 17 map to grounded tools (every id verified against a real checklist item + a mountable `ACT_TOOL_CATALOG` tool, reusing the silvopasture livestock vocabulary — e.g. forage-base->pasture/vegetation/transect, stock-water-sources->watercourse/spring/storage/wells/tanks/water-lines, paddock-layout->paddocks/gates/path/zone, fencing-water->fencing/water-lines/tanks/storage, nutrient-cycling->paddocks/compost/pasture/transect/flow-connector); 13 set to intentional gap-noted `[]` (s1 enterprise-vision / production-goals / welfare-ethic, `lvs-s4-species-breed` / `lvs-s4-stocking-rate` / `lvs-s4-grazing-system` decisions, `lvs-s5-feed-budget` budgeting, `lvs-s6-herd-health` protocol, `lvs-s7-herd-buildup` sequencing, `lvs-s7-break-even` Amanah-clean break-even, `lvs-s7-marketing` off-site decision keeping its bay-ma-laysa-indak Amanah scopeNotes flag for the meat-share/herd-share/CSA surface, `lvs-sec-s1-enterprise-intent`, `lvs-sec-s4-species-stocking`). The 3 `LIVESTOCK_SECONDARY_PATCHES` inject into universal objectives (`s4-water-strategy`, `s5-soil-improvement`, `s5-access`) that already carry universal overrides — no work needed. Before this the livestock objectives fell through the coarse stratum default with the familiar misfit (S2/S3 forage & water showed access-utilities; S5 paddock/fencing/handling showed roads/fencing generically rather than the paddocks/gates/barns family).

**R3 (ratchet).** `actToolCoverage.test.ts` gains an "every livestock-operation objective (primary + secondary) has an explicit override entry" assertion over the `LIVESTOCK_PRIMARY_OBJECTIVES` + `LIVESTOCK_SECONDARY_OBJECTIVES` union (mirrors the orchard/silvopasture assertions). 10/10.

**Audit re-run after livestock R1/R3:** 316 objectives — Gap A **194 → 171** (the 23 lvs-* primary enumerated by the audit; the 7 lvs-sec-* additive are wired + ratcheted but not separately enumerated by the per-type audit walk), Gap B 0, Gap C 58 → 66 (47 intentional / 19 default-driven; +11 intentional = the livestock primary decision/financial objectives, −3 default-driven now explicitly wired).

**Tests (bounded, `--pool=forks`, per-workspace):** ✅ `actToolCoverage.test.ts` 10/10 · ✅ `objectiveObserveDomains.test.ts` 8/8 · ✅ `resolveProjectObjectives.test.ts` **25/25**. Shared `tsc --noEmit` EXIT 0.

Committed `7da9fe8a`.

### Conservation — DONE (R1/R3, 2026-06-03)

**R1 (conservation).** All 30 `con-*` objectives now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries (conservation ships no standalone secondary layer, so this is primary-only). 19 map to grounded tools (every id verified against a real checklist item + a mountable `ACT_TOOL_CATALOG` tool, reusing the regen-farm / silvopasture ecology vocabulary — e.g. baseline-condition->vegetation/zone/transect/wildlife-sector, degradation-history->erosion/soil/drainage/hazard-zone, water-regime-degradation->drainage/watercourse/sink/runoff-path, native-planting-plan->vegetation/zone/water-lines, water-regime-infrastructure->drainage/sink/swale/watercourse, fencing-exclusion->fencing/gates/wildlife-sector, ecological-monitoring->transect/wildlife-sector); 11 set to intentional gap-noted `[]` — the three s1 objectives (`con-s1-conservation-intent` vision, `con-s1-intervention-philosophy`, `con-s1-tenure-covenant` legal), `con-s4-native-species-provenance` (species selection; spatial plan sited in s5), `con-s4-pest-invasive-strategy` (method/sequence decision; infrastructure sited in s5), `con-s6-external-relations-compliance` (reporting admin), and the whole s7 band (`con-s7-phase1-priorities` sequencing, `con-s7-longterm-timeline` planning, `con-s7-funding-resourcing` off-site funding, `con-s7-adaptive-management` review protocol, `con-s7-volunteer-stewardship` programme admin). Before this the conservation objectives fell through the coarse stratum default with the familiar misfit (S2/S3 ecological surveys showed access-utilities / the water-line set instead of the vegetation/wildlife-sector/erosion/fire-sector/transect ecology tools; S5 restoration design showed roads/fencing generically).

**Amanah.** `con-s7-funding-resourcing` (c1/c3) references conservation grants, trusts, covenants and — flagged — **carbon credits & biodiversity credits**. These are environmental-market instruments with potential gharar in credit trading; they are encoded as catalogue content and **flagged for Scholar Council review**, not actioned here. The objective is an off-site funding decision and maps to `[]` regardless. No catalogue content was reworded or omitted. No break-even / capital-formation objective exists in the conservation catalogue.

**R3 (ratchet).** `actToolCoverage.test.ts` gains an "every conservation objective has an explicit override entry" assertion (primary-only, like homestead / regen-farm / market-garden; intentional `[]` still satisfies it). 11/11.

**Audit re-run after conservation R1/R3:** 316 objectives — Gap A **171 → 141** (conservation's 30 now covered), Gap B 0, Gap C 66 → 74 (58 intentional / 16 default-driven; +11 intentional = the conservation decision/financial/admin objectives, −3 default-driven now explicitly wired).

**Tests (bounded, `--pool=forks`, per-workspace):** ✅ `actToolCoverage.test.ts` 11/11 · ✅ `objectiveObserveDomains.test.ts` 8/8 · ✅ `resolveProjectObjectives.test.ts` **25/25**. Shared `tsc --noEmit` EXIT 0.

Committed `923464a0` (code) + this docs commit.

### Off-grid resilience — DONE (R1/R3, 2026-06-03)

**R1 (off_grid).** All 27 `ofg-*` objectives now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries (off_grid ships no standalone secondary layer and no patches, so primary-only). 13 map to grounded tools, concentrated where the spatial work actually is — the **S2/S3 site & systems surveys** (water-sources-yield->spring/watercourse/catchment/wells, energy-generation-potential->sun-sector/wind-sector/watercourse/vegetation, access-road-emergency-route->roads/path/hazard-zone, fire-risk-evacuation->fire-sector/vegetation/path/hazard-zone, water-quality-treatment->spring/watercourse/wells, communications-connectivity->neighbour-pin, food-production-storage-conditions->frost-pocket/zone, plus site-selection-access->roads/parking) and the **S5 infrastructure design block** (water-system->wells/spring/tanks/water-lines, energy-system->sun-sector/power/buildings/tanks, shelter-thermal->dwellings/sun-sector/tanks, food-production->beds/orchards/paddocks/buildings, comms-emergency->buildings/power/note); 14 set to intentional gap-noted `[]` — the s1 philosophy/redundancy decisions (`ofg-s1-resilience-philosophy`, `ofg-s1-critical-systems-redundancy`), the entire **s4 strategy/redundancy band** (water/energy/food/comms/shelter — these define standards & redundancy, with the physical systems sited in s5), `ofg-s3-energy-demand-balance` (a generation-vs-demand calculation), the **s6 monitoring-protocol design** (systems-performance, emergency-preparedness, adaptive-management — thresholds/schedules attached to already-sited features), and the **s7 phasing band** (systems-establishment-sequence, resourcing-supply-chain, phased-habitation — sequencing/logistics/gate decisions). Before this the off_grid objectives fell through the coarse stratum default and surfaced the access-utilities set instead of the source/structure/climate-sector/production families.

**Amanah.** Every off_grid objective is life-safety resilience (water, energy, shelter, food, communications, emergency response, habitation sequencing). The catalogue ships **no sales channel, advance purchase, or financing instrument** — `ofg-s7-resourcing-supply-chain` is materials logistics, not capital — so nothing engages riba or gharar. Clean throughout; no scopeNotes flag needed.

**R3 (ratchet).** `actToolCoverage.test.ts` gains an "every off-grid objective has an explicit override entry" assertion (primary-only, like homestead / regen-farm / market-garden / conservation; intentional `[]` still satisfies it). 12/12.

**Audit re-run after off_grid R1/R3:** 316 objectives — Gap A **141 → 114** (off_grid's 27 now covered), Gap B 0, Gap C 74 → 85 (72 intentional / 13 default-driven; +14 intentional = the off_grid decision/strategy/protocol objectives, −3 default-driven now explicitly wired).

**Tests (bounded, `--pool=forks`, per-workspace):** ✅ `actToolCoverage.test.ts` 12/12 · ✅ `objectiveObserveDomains.test.ts` 8/8 · ✅ `resolveProjectObjectives.test.ts` **25/25**. Shared `tsc --noEmit` EXIT 0.

Committed `ee3af9b1` (code) + this docs commit. **Note:** the code commit unintentionally swept in 3 unrelated files (`observe/lens/lensData/liveBundle.ts`, its test, and `observe/lens/types.ts`) that an out-of-band process had pre-staged in the index; `git commit` without a pathspec commits the whole index. The off_grid override change within it is correct and self-contained; the stray files' newer versions remain in the working tree. Left for the operator (un-bundling needs amend/reset, both forbidden on this rebased branch). Subsequent commits use `git commit -- <pathspec>` to prevent recurrence.

### Agritourism — DONE (R1/R3, 2026-06-03)

**R1 (agritourism).** All **34** `ag-*` objectives now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries (agritourism ships no standalone secondary layer and no patches, so primary-only). The count is 34 not 29 because the **eco-resort / glamping extension** added 5 objectives out-of-band (AG-S3.7, AG-S4.9, AG-S5.9, AG-S5.10, AG-S7.8; commits `89541b55` + `15680301`); the ratchet reads `AGRITOURISM_PRIMARY_OBJECTIVES` live so it picked them up automatically. **19 map to grounded tools**, concentrated in the **S2/S3 surveys** (arrival-experience->roads/parking/gates/path/hazard-zone, hospitality-infra->buildings/dwellings/barns, landscape-context->neighbour-pin/catchment/hazard-zone/note, water-sanitation-demand->spring/watercourse/wells/storage, sensory-environment->note/vegetation/wind-sector, emergency-access->roads/path/fire-sector/hazard-zone, food-production-capacity->crops/orchards/beds/paddocks/buildings, ecological-carrying-capacity->soil/erosion/wildlife-sector/buffer-ring/zone) and the **S4 zoning + S5 design block** (circulation-strategy->zone/path/buffer-ring/fencing, safety-compliance->fire-sector/hazard-zone/path, biosecurity-zoning->buffer-ring/fencing/gates/zone, accommodation->dwellings/buildings, dining-infra->buildings/barns, programming-infra->path/buildings/zone, sanitation-infra->buildings/tanks/water-lines, safety-infra->path/fire-sector/roads/hazard-zone, dispersed-siting->dwellings/zone/path/buffer-ring, decentralised-servicing->tanks/water-lines/catchment/power), plus the S6 farm-to-guest loop->harvest. **15 set to intentional gap-noted `[]`** — the S1 vision/capacity/regulatory decisions, the S2 seasonal-pattern read, the S4 service-model / food-strategy / **revenue-model** decisions, the S6 experience-feedback / compliance / load monitors, and the whole S7 staffing / booking / phased-launch / adaptive / seasonal-resilience band. Before this the agritourism objectives fell through the coarse stratum default and surfaced the access-utilities set instead of the access / structure / climate-sector / zoning families.

**Amanah.** AG-S4.8 (booking, pricing & revenue model) carries the **membership / season-pass Amanah scopeNote** in the catalogue — *bayʿ mā laysa ʿindak* / gharar, structured as a membership benefit (entitlement of belonging, cancellable / pro-rata-refundable, not advance prepayment of undelivered nights), routed to **Scholar Council** review. The Act layer maps AG-S4.8 to an intentional `[]` so **no act surface engages the sales instrument** — the correct outcome, mirroring how market_garden's CSA-flagged s1 objectives and livestock's CSA-flagged s7 objective already resolve to `[]`. AG-S7.8 (seasonal resilience) is explicitly operational planning, not a sales surface, also `[]`. No new fiqh is re-encoded at the Act layer; the catalogue scopeNote remains the single source. Clean.

**R3 (ratchet).** `actToolCoverage.test.ts` gains an "every agritourism objective has an explicit override entry" assertion (primary-only, like homestead / regen-farm / market-garden / conservation / off-grid; intentional `[]` still satisfies it). 13/13.

**Audit re-run after agritourism R1/R3:** 316 objectives — Gap A **114 → 80** (agritourism's 34 now covered), Gap B 0, Gap C 85 → 97 (87 intentional / 10 default-driven; +15 intentional = the agritourism decision/financial/protocol objectives, −3 default-driven now explicitly wired).

**Tests (bounded, `--pool=forks`, per-workspace):** ✅ `actToolCoverage.test.ts` 13/13 · ✅ `objectiveObserveDomains.test.ts` 8/8 · ✅ `resolveProjectObjectives.test.ts` **25/25**. Shared `tsc --noEmit` EXIT 0.

Committed `a1f9b042` (code, clean 3-file explicit-pathspec commit — no index pollution this time) + this docs commit.

**Remaining Gap A: 80**, across the 3 still-unwired primary types (ecovillage, education, wellness) plus the nursery/residential secondary-only objectives that do not reduce Gap A. R2 (form-arm tools) stays deferred.
