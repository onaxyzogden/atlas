# Forward-Traceability (`feedsInto`) Wiring — 2026-06-13

**Author:** Claude Code (Opus 4.8) · **Operator:** Yousef Abdelsalam
**Scope:** Complete the forward `feedsInto` channel across `universal.ts` + all 14 per-type
catalogues, then lock it with a strengthened conformance test.
**Supersedes:** §5 and §9.1 of [STRATUM_TRACEABILITY_AUDIT_2026-06-11.md](STRATUM_TRACEABILITY_AUDIT_2026-06-11.md)
(the "31 S2–S3 items feed nothing / forward channel almost entirely unwired" finding — partly
stale; S2/S3 universal items were wired between the audit and 2026-06-13).

---

## 1. The two-direction model

Objectives are wired in two directions. Only the **forward** channel was incomplete.

| Direction | Mechanism | State before this change |
|---|---|---|
| **Backward gating** | `STRATUM_PREREQS` → `prerequisiteObjectiveIds`; every S4+ objective gates on prior-stratum universal reads/decisions | ✅ Fully wired + test-enforced (`spineGate.conformance.test.ts`, `spineTraceability.conformance.test.ts`). Untouched. |
| **Forward feeds** | `feedsInto: string[]` on each checklist item — "*this read/decision is consumed by that downstream objective*"; surfaced as "Feeds" chips in the Plan DecisionChecklist + Act tier shell | ❌ universal S1/S4/S5/S6 + all 14 per-type catalogues unwired |

`feedsInto` is **display-only** — never a gate. A dangling target degrades to a raw-id label.
Zero behavioural / lock blast radius. (Contrast `prerequisiteObjectiveIds`, which silently locks
an objective forever if it references a dropped id — see the `STRATUM_PREREQS` invariant note in
`authoring.ts`.)

---

## 2. The wiring invariant ("fully wired")

For every objective `O` in stratum `N`:

- **Outbound** — `O` has ≥1 checklist item declaring ≥1 `feedsInto` target, **OR** `O` is in the
  `terminalObjectives` allowlist (with a reason).
- **Inbound** — `O` is the `feedsInto` target of ≥1 upstream item, **OR** `O` is in the
  `rootObjectives` allowlist (with a reason).

### Where the teeth are

| Stratum | Role | Outbound required? | Inbound required? |
|---|---|---|---|
| S1 project-foundation | foundation (sourced from steward) | ✅ yes | ⬜ root — exempt |
| S2 land-reading | observation (sourced from the site) | ✅ yes | ⬜ root — exempt |
| S3 systems-reading | observation (sourced from the site) | ✅ yes | ⬜ root — exempt |
| **S4 foundation-decisions** | **decision** | ✅ **yes** | ✅ **yes** |
| **S5 system-design** | **design** | ✅ **yes** | ✅ **yes** |
| **S6 integration-design** | **design** | ✅ **yes** | ✅ **yes** |
| S7 phasing-resourcing | final handoff | ⬜ terminal — exempt | ✅ yes |

**Rationale for the allowlists.** A *read* (S1–S3) is not "fed" by an upstream objective — it is
sourced from the physical site and steward inputs; its prereqs are *gates*, not data feeds. So
reads are roots (exempt from inbound) but MUST feed downstream (outbound has teeth). The *phasing*
stratum (S7) is the terminal handoff — nothing downstream consumes it (terminal, exempt from
outbound) but every phasing objective MUST be informed by ≥1 upstream read/decision (inbound has
teeth). The full force of the invariant lands on **S4/S5/S6** — every decision/design objective
must be both informed by ≥1 upstream item and inform ≥1 downstream objective, with no orphans.

Enforcement uses the codebase's established **baseline/ratchet idiom** (mirrors
`completionPathGaps.baseline.json`): allowlists live in
`packages/shared/src/constants/plan/__tests__/feedsIntoCoverage.baseline.json`; anything unwired
and not allowlisted fails `spineTraceability.conformance.test.ts`.

---

## 3. Per-edge derivation methodology

For each S1–S6 checklist item, `feedsInto` targets are derived from three signals, in priority order:

1. **Existing prose cites** — where an item's `feedNote` / `feedHint`, or a downstream objective's
   checklist text, already names the relationship. Encoded verbatim (these are unambiguous).
   *e.g.* universal `s1-boundaries-c5` `feedNote` "*Water entitlements feed Tier 2: Water strategy
   and constrain all water harvesting and storage design*" → `feeds: ['s4-water-strategy',
   's5-water-infrastructure']`.
2. **The prereq graph (inverted at item granularity)** — an objective's `prerequisiteObjectiveIds`
   names the upstream objectives it consumes; the forward edge is the inverse.
   *e.g.* S5 objectives gate on `s4-zones` → `s4-zones` decision items feed those S5 objectives.
3. **Domain affinity** — mirrors the pattern universal S2/S3 already established:
   soil read → soil-improvement; hydrology/climate → water-strategy/water-infrastructure;
   terrain → zones/access; vision capacity → resource-plan/phase1; constraints → risk-register.

### Target constraints (all edges must satisfy)
- **Strictly-later stratum** — target stratum index > source stratum index.
- **Resolvable** — target id ∈ `GLOBAL_BY_ID` (universal ∪ all authored catalogue objectives).
- **Scoped to {universal} ∪ {same-catalogue}** — keeps per-project runtime resolution clean
  (cross-catalogue targets degrade to raw-id labels; avoid).
- **No content invention** — `feedsInto` is structural wiring of relationships the prereq graph +
  prose cites + domain affinity already imply. No new checklist prose is authored.

Items with no genuine downstream consumer (administrative reads, read-only echoes such as
`s1-vision-c1` primary-type, S7 terminal items) are left unwired at the *item* level — the
invariant operates at *objective* granularity, so a terminal item is fine as long as its objective
feeds elsewhere (or the objective is allowlisted).

### Authoring-helper note
`ckA(...)` (answerSpec recap) and `ckF(...)` (formula binding) items hardcode `feedsInto: []` and
take no `feeds` option. Where a `ckA`/`ckF` item would conceptually feed downstream, its objective
is wired through a sibling `ck(...)` item instead (e.g. `s1-vision` is wired via
labour/constraints/classify/assumptions, not the `ckA` success-criteria/capital items). No change
to `authoring.ts`.

---

## 4. `universal.ts` edge table (encoded 2026-06-13)

S2/S3 (already wired before this change) omitted. S7 terminal. Roots (S1–S3) have no inbound by design.

### S1 — project foundation
| Item | Feeds | Signal |
|---|---|---|
| `s1-vision-labour` | `s4-direction`, `s7-resource-plan` | capacity → feasibility + labour plan |
| `s1-vision-constraints` | `s4-direction`, `s7-risk-register` | hard constraints → classify + risk |
| `s1-vision-classify` | `s4-direction` | committed/aspirational → vision classification |
| `s1-vision-assumptions` | `s4-direction`, `s7-risk-register` | assumptions → unresolved Qs + risk |
| `s1-boundaries-c1` (title/deed) | `s4-direction` | prose "no design proceeds w/o title" → gates direction |
| `s1-boundaries-c2` (map boundaries) | `s4-zones` | base boundary layer → spatial framework |
| `s1-boundaries-c3` (easements) | `s4-zones`, `s7-risk-register` | prose "land-use constraint map + Risk/Compliance overlay" |
| `s1-boundaries-c4` (zoning/permitted) | `s4-direction`, `s7-risk-register` | prose "enterprise mix decisions + Risk/Compliance overlay" |
| `s1-boundaries-c5` (water rights) | `s4-water-strategy`, `s5-water-infrastructure` | prose "Tier 2 Water strategy + constrain harvesting/storage" |
| `s1-boundaries-c6` (covenants) | `s4-zones`, `s7-risk-register` | prose "hard constraints gating affected zones + Risk/Compliance" |
| `s1-boundaries-c7` (permits) | `s7-phase1`, `s7-risk-register` | prose "prerequisites on Act handoff packages" |
| `s1-stakeholders-c1` (neighbours) | `s5-access` | shared boundary relationships → circulation |
| `s1-stakeholders-c3` (cultural obligations) | `s4-zones`, `s7-risk-register` | cultural areas constrain zones + risk |
| `s1-stakeholders-c5` (conflict/goodwill) | `s7-risk-register` | conflict relationships → social risk |
| `s1-stakeholders-c6` (comms channels) | `s6-monitoring` | comms → feedback/reporting responsibilities |

`s1-vision` `ckA` items (c1 type, c2 success, steward, c3 capital), `s1-boundaries` none-left,
`s1-stakeholders-c2`/`c4` (authority list, community interest list) → terminal items (objectives
already feed via siblings).

### S4 — foundation decisions
| Item | Feeds | Signal |
|---|---|---|
| `s4-direction-c2` (classify elements) | `s7-phase1` | feasible/deferred → Phase 1 scope |
| `s4-direction-c3` (MVP scope) | `s7-phase1` | MVP → Phase 1 scope |
| `s4-direction-c4` (success criteria) | `s6-monitoring`, `s7-phase1` | criteria → indicators + milestones |
| `s4-direction-c5` (assumptions) | `s7-risk-register` | unresolved → risk |
| `s4-direction-c6` (approve direction) | `s7-phase1` | approved direction → phase plan |
| `s4-water-strategy-c1..c5` | `s5-water-infrastructure` | demand/source/supply/storage/harvesting → infrastructure design |
| `s4-water-strategy-c6` (conservation/drought) | `s6-monitoring`, `s7-risk-register` | drought protocol → monitoring + risk |
| `s4-zones-c1` (zone framework) | `s5-access`, `s5-soil-improvement` | zones → circulation + per-zone soil program |
| `s4-zones-c2` (sector influences) | `s5-access` | sectors → access placement |
| `s4-zones-c3` (allocate enterprise zones) | `s5-access`, `s5-water-infrastructure`, `s5-soil-improvement`, `s7-phase1` | enterprise allocation = prime spatial input to all S5 + Phase 1 |
| `s4-zones-c4` (resolve conflicts) | `s5-access` | movement conflicts → circulation |
| `s4-zones-c5` (buffer/transition) | `s5-access` | buffers → circulation |
| `s4-zones-c6` (confirm framework) | `s7-phase1` | confirmed framework → phase plan |

### S5 — system design
| Item | Feeds | Signal |
|---|---|---|
| `s5-access-c1` (primary route) | `s7-phase1` | access build → Phase 1 |
| `s5-access-c2` (road/track standards) | `s7-resource-plan` | standards → materials/equipment |
| `s5-water-infrastructure-c1` (harvesting structures) | `s7-phase1` | build → Phase 1 |
| `s5-water-infrastructure-c3` (distribution) | `s7-resource-plan` | network → materials/equipment |
| `s5-water-infrastructure-c4` (overflow/spillway) | `s7-risk-register` | flood/overflow → risk |
| `s5-water-infrastructure-c5` (materials/standards) | `s7-resource-plan` | procurement |
| `s5-soil-improvement-c1` (program by zone) | `s7-phase1` | implementation → Phase 1 |
| `s5-soil-improvement-c2` (rates/timing) | `s7-resource-plan` | inputs procurement |
| `s5-soil-improvement-c3` (machinery/equipment) | `s7-resource-plan` | equipment sourcing |
| `s5-soil-improvement-c4` (priority zones) | `s7-phase1` | first-cycle zones → Phase 1 |
| `s5-soil-improvement-c5` (monitoring baseline) | `s6-monitoring` | baseline → tracking |

### S6 — integration design
| Item | Feeds | Signal |
|---|---|---|
| `s6-monitoring-c1` (key indicators) | `s7-phase1` | indicators → milestone tracking |
| `s6-monitoring-c2` (data collection) | `s7-resource-plan` | recording systems → equipment |
| `s6-monitoring-c4` (responsibility) | `s7-resource-plan` | stream responsibility → labour |
| `s6-monitoring-c5` (feedback triggers) | `s7-risk-register` | early-warning triggers → risk |

**Post-edit universal coverage:** every S1–S6 objective feeds ≥1 downstream; every S4–S7 objective
is fed by ≥1 upstream. (S4-direction + S6-monitoring, previously orphaned on the inbound side, are
now fed by S1 / S4 items respectively.)

---

## 5. Per-type catalogue wiring (applied 2026-06-13)

Derived in Phase 2 (per-catalogue derivation workflow, one agent per catalogue + adversarial
verify) and applied file-by-file in Phase 3 via the `ck(id, label, { feeds: [...] })` helper, each
target constrained to {universal} ∪ {same-catalogue} and a strictly-later stratum. After each file:
bounded `--pool=forks` run of `spineTraceability.conformance.test.ts` + `catalogues.test.ts`.

**Feed-bearing checklist items per layer (verified `grep -c "feeds:"` == `grep -oc "feeds: \["`):**

| Layer | Feed-bearing items |
|---|---|
| `universal.ts` | 78 |
| `silvopasture` | 154 |
| `agritourism` | 159 |
| `conservation` | 140 |
| `offGrid` | 129 |
| `livestockOperation` | 122 |
| `marketGarden` | 110 |
| `orchard` | 78 |
| `ecovillage` | 73 |
| `wellness` | 70 |
| `regenFarm` | 69 |
| `education` | 51 |
| `homestead` | 43 |
| `residential` | 32 |
| `nursery` | 19 |
| **Total** | **1327** |

Every S1–S6 objective across all 15 layers now feeds ≥1 downstream objective; every S4–S7
objective is fed by ≥1 upstream item. (The full per-edge `{itemId → targets, rationale}` mapping
was reviewed in the Phase-2 workflow proposal; the live source files are the canonical record.)

---

## 6. Phase-4 reconciliation — disposition of the empty-allowlist sweep

After wiring, the strengthened test was run against an **empty** baseline to surface every
remaining unfed objective. The sweep found exactly 7, each classified and resolved:

### 6a. Genuine inbound misses — WIRED (preferred over allowlisting; a natural upstream read exists)

| Objective (S5) | Fed by (new edge) | Rationale |
|---|---|---|
| `orch-s5-tree-protection` | `orch-s2-landscape-context-c1` ("Map surrounding land uses within 2km") | Mapping adjacent bushland/reserves is what surfaces the rabbit / hare / possum / deer / wallaby browsing pressure the tree guards counter. |
| `mgd-s5-propagation-nursery` | `mgd-s1-production-targets-sales-c2` (volume targets) + `mgd-s4-crop-rotation-bed-layout-c2` (rotation interval) | Volume → transplant quantity; rotation interval → succession/propagation timing. |

### 6b. Genuine structural roots — ALLOWLISTED (`rootObjectives`, with reasons)

| Objective | Why it is a root (no same-catalogue earlier-stratum feeder) |
|---|---|
| `mgd-s6-adaptive-management` | S6 end-of-season feedback loop; only conceivable inbound is co-stratum S6 monitoring (strictly-later forbids); all items feed S7. |
| `ofg-s6-adaptive-management` | Same feedback-loop shape (off-grid). |
| `con-s6-external-relations-compliance` | S6 external-relations/compliance system seeded from universal stakeholder context + the regulatory/funding environment, not a same-catalogue survey. |
| `silv-sec-s4-stock-infrastructure` | Additive secondary (livestock) layer **entry decision** at S4; the additive layer begins at S4 with no S1–S3 reads of its own. |
| `lvs-sec-s4-stock-infrastructure` | Same shape — entry decision of the livestock secondary layer. |

**Zero `terminalObjectives` entries** — outbound is fully wired; no S1–S6 orphans.

---

## 7. The strengthened conformance test

`spineTraceability.conformance.test.ts` kept its prior **5-consumer floor** and gained **four**
new assertions (suite count 14 → 18):

1. **Outbound participation** — every S1–S6 objective has ≥1 `ck` item with ≥1 `feedsInto`, OR is an allowlisted terminal (`OUTBOUND_MAX_STRATUM = s6`).
2. **Inbound participation** — every S4–S7 objective is the target of ≥1 upstream item, OR is an allowlisted root (`INBOUND_MIN_STRATUM = s4`).
3. **Stale-terminal guard** — every `terminalObjectives` allowlist id still exists, sits in its band, and has not since become wired.
4. **Stale-root guard** — every `rootObjectives` allowlist id still exists, sits in its band, and has not since become fed.

Allowlist source: `packages/shared/src/constants/plan/__tests__/feedsIntoCoverage.baseline.json`
(baseline/ratchet idiom, mirrors `completionPathGaps.baseline.json`).

---

## 8. Task-layer verification (no gaps)

- `actToolCoverage.test.ts` (17) + `completionPathAudit.ratchet.test.ts` (5) — green. Objective→Act-tool wiring is orthogonal to `feedsInto` and unaffected.
- OLOS-tier `requiredInputs` chains (observe→plan→act, per domain) are **generated** by `requiredInputsForStage` via `buildObjectiveId(domain, upstream-stage)`, so every `objectiveId` resolves by construction. Added a referential-resolution guard to `src/tests/olos.test.ts` (34 → 35) to lock it against drift.

---

## 9. Final verification

| Check | Result |
|---|---|
| `spineTraceability.conformance` + `catalogues` | 138/138 (bounded `--pool=forks`) |
| **Negative check** — delete sole feeder of `orch-s5-tree-protection` | inbound assertion failed listing exactly `orch-s5-tree-protection (s5-system-design)`; restored → green |
| Full `@ogden/shared` suite | **80 files / 1368 tests** green |
| `@ogden/shared` `tsc --noEmit` (8 GB heap) | clean (= the package `lint` script) |
| `src/tests/olos.test.ts` | 35/35 |

**Not committed** — branch `main`; working tree carries the wiring edits across the 15 catalogues
+ the 2 test files + the new baseline JSON. Push/commit awaits the steward (standing rule). The 4
pre-existing operator-WIP working-tree files (`ConflictFrameworkCapture.tsx`, `actToolCatalog.ts`,
`DesignElementLayers.tsx`, `objectiveActTools.ts`) and the untracked `community*` files are foreign
to this work and were left intact.

Decision record: `wiki/decisions/2026-06-13-feedsinto-forward-wiring.md`.
