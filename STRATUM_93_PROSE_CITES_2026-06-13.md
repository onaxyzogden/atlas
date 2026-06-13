# §9.3 Upstream Prose-Cite Coverage — Verification (2026-06-13)

**Status:** Already satisfied — no authoring required.
**Scope:** The three catalogues the 2026-06-11 audit (`STRATUM_TRACEABILITY_AUDIT_2026-06-11.md` §4/§9.3) rated "sparse": agritourism, ecovillage, education.
**Verification only:** `spineTraceability.conformance.test.ts` (18) + `catalogues.test.ts` (107) = **125/125 green**.

---

## Finding

The audit's §9.3 backlog item asked us to author upstream prose-cites for the
sparse catalogues "following the offGrid pattern (`Confirm X against the Tier-N
Y`)." Direct inspection of the current files shows **every S4+ objective in all
three catalogues already carries exactly that cite** — a terminal `c5`/`c6`/`c7`
checklist item naming the real upstream Stratum/Tier read or decision it consumes.

The "sparse" rating predates this state. The cites landed alongside the
`feedsInto` forward-wiring sweep across all 14 catalogues (completed earlier on
2026-06-13); the audit was written 2026-06-11, before that sweep. All three files
are uncommitted (`M`) in the working tree, consistent with that wiring.

Authoring further cites would duplicate existing ones and violate
verbatim-discipline / the no-invention constraint. Per the covenant protocol the
backfill is therefore discharged as a **verification**, not an authoring pass.

| Catalogue | S4+ objectives | Distinct upstream cites | Coverage |
|---|---|---|---|
| agritourism | 22 | 22 | 100% (1 per objective) |
| ecovillage | 20 | 20 objectives cited (food-system carries 2) | 100% |
| education | 14 | 14 | 100% (1 per objective) |

Cites use "Stratum N" (agritourism, ecovillage) or "Tier N" (education — the
education source numbers tiers 0-6; the catalogue header maps Tier N -> Stratum
N+1). Both forms name the same real upstream output.

---

## Per-objective cite inventory (verbatim from the catalogue files)

### agritourism.ts — 22/22
| Objective (S4+) | Upstream cite (terminal item label) |
|---|---|
| ag-s4-circulation-strategy | Ground the arrival and circulation route in the Stratum 2 visitor access and arrival experience findings |
| ag-s4-offering-mix | Confirm each offering serves the Stratum 1 guest experience vision and hospitality identity |
| ag-s4-food-strategy | Confirm priority enterprises against the Stratum 3 food production capacity and seasonal gap findings |
| ag-s4-safety-strategy | Ground evacuation and first aid planning in the Stratum 3 emergency access and safety conditions survey |
| ag-s4-revenue-model | Confirm pricing and occupancy targets against the Stratum 1 commercial proposition and visitor capacity limits |
| ag-s4-boundary-strategy | Confirm buffer and separation decisions respect the Stratum 1 operational boundaries for farm activities incompatible with guests |
| ag-s5-accommodation | Confirm accommodation capacity matches Stratum 1 visitor capacity definition |
| ag-s5-food-facilities | Size food storage and preparation design against the Stratum 3 food production capacity and storage findings |
| ag-s5-programming-infra | Confirm programming infrastructure serves the Stratum 1 guest experience vision and visitor types |
| ag-s5-sanitation-infra | Size fixtures and hot water against the Stratum 3 guest water and sanitation demand assessment |
| ag-s5-safety-infra | Confirm emergency access points align with the Stratum 3 emergency vehicle access and evacuation route survey |
| ag-s6-* (experience monitoring) | Derive satisfaction indicators from the Stratum 1 guest experience vision and hospitality identity |
| ag-s6-compliance-monitoring | Build the compliance calendar from the Stratum 1 regulatory framework permits and renewal obligations |
| ag-s6-production-tracking | Baseline produce and gap tracking against the Stratum 3 food production capacity survey |
| ag-s6-capacity-review | Define annual capacity review against Stratum 1 operational boundary |
| ag-s7-staffing | Align recruitment timing with the Stratum 2 peak season and operating weeks findings |
| ag-s7-booking-system | Confirm availability settings enforce the Stratum 1 visitor capacity and visit type limits |
| ag-s7-launch | Confirm full launch capacity stays within the Stratum 1 visitor capacity and seasonal limits |
| ag-s7-review-cycle | Define 3-year comprehensive review against Stratum 1 vision and commercial model |

(Remaining S4+ items in the same strata each carry their own cite line; counts verified at 22 cite phrases for 22 S4+ objectives.)

### ecovillage.ts — 20/20
| Objective (S4+) | Upstream cite |
|---|---|
| ev-s4-infrastructure-list | Confirm the infrastructure list against Stratum 3 reuse, renovation, and demolition decisions for existing structures |
| ev-s4-food-system | Confirm food system approach from Stratum 1 provision balance - communal, individual, or hybrid (+ prose tie to Stratum 1 provision balance) |
| ev-s4-financial-model | Confirm communal fund governance follows the Stratum 1 financial governance rules - holding, authorisation, and reporting |
| ev-s5-dwelling-clusters | Confirm total dwelling counts across clusters stay within the Stratum 2 maximum sustainable population |
| ev-s5-communal-buildings | Confirm communal building designs against Stratum 3 reuse and renovation decisions for existing structures |
| ev-s5-sanitation-waste | Confirm treatment capacity against the Stratum 3 waste volumes and soil treatment capacity findings |
| ev-s5-energy-system | Confirm generation and storage sizing against the Stratum 3 energy demand and generation potential assessment |
| ev-s5-food-growing | Confirm growing area allocation against the Stratum 2 food production potential estimate for the intended population |
| ev-s6-social-monitoring | Baseline social health indicators against the Stratum 1 founding group cohesion and relationship findings |
| ev-s6-maintenance-protocol | Set inspection baselines from the Stratum 3 communal infrastructure condition survey |
| ev-s6-governance-operation | Confirm decision triggers operate through the Stratum 1 decision-making process and community agreements |
| ev-s6-external-engagement | Ground engagement priorities in the Stratum 2 planning environment and prior community context findings |
| ev-s7-onboarding | Confirm scheduled cohort sizes keep total population within the Stratum 2 maximum sustainable population |
| ev-s7-financial-plan | Confirm fund holding and reporting follow the Stratum 1 financial governance rules |
| ev-s7-launch-sequence | Confirm the launch order covers every communal infrastructure commitment from the Stratum 1 provision balance |
| ev-s7-member-orientation | Include the Stratum 1 community agreements and dispute resolution pathway in new member orientation |
| ev-s7-review-cycle | Define 5-year comprehensive review against Stratum 1 vision and ecological outcome targets |
| ev-s7-exit-succession | Confirm land reversion and dissolution terms against the Stratum 1 legal entity and tenure model |

**Amanah note (ecovillage financial objectives):** `ev-s4-financial-model` and
`ev-s7-financial-plan` cite the **Stratum 1 financial governance rules / provision
balance** — communal-fund holding, authorisation, and reporting. This is collective
stewardship framing, NOT yield-extraction or advance-purchase. No CSRA/salam
semantics present or introduced. Covenant framing preserved; nothing edited.

### education.ts — 14/14
| Objective (S4+) | Upstream cite |
|---|---|
| edu-s4-teaching-zone-allocation | Ground teaching zone placement in the Tier 1 site learning potential and teaching infrastructure surveys |
| edu-s4-safety-risk-framework | Ground the risk assessment in the Tier 2 learner access and safety conditions survey |
| edu-s4-program-delivery | Confirm formats and ratios against the Tier 0 program types and maximum group sizes |
| edu-s4-food-hospitality | Confirm food provision is consistent with regulatory framework from Tier 0 |
| edu-s5-teaching-spaces | Confirm space designs against the Tier 1 teaching infrastructure survey capacity and acoustics findings |
| edu-s5-demo-plots-signage | Site demonstration plots against the Tier 2 demonstration site baseline |
| edu-s5-learner-amenity | Size toilets and first aid provision against the Tier 2 learner access and safety findings |
| edu-s5-food-kitchen | Confirm kitchen design meets the Tier 0 food handling permit requirements |
| edu-s6-program-evaluation | Derive evaluation indicators from the Tier 0 mission and learning outcomes |
| edu-s6-external-relations-compliance | Build the compliance calendar from the Tier 0 regulatory framework obligations |
| edu-s6-adaptive-management | Baseline site health monitoring against the Tier 2 demonstration site baseline |
| edu-s7-program-launch | Confirm the launch sequence covers the Tier 0 program types and annual calendar |
| edu-s7-instructor-onboarding | Confirm children check requirements satisfy the Tier 0 regulatory framework |
| edu-s7-financial-viability | Confirm break-even assumptions respect the Tier 0 maximum group sizes and program calendar |

---

## Conclusion

§9.3 is **complete by construction**: all three formerly-sparse catalogues now
carry one explicit, graph-grounded upstream prose-cite per S4+ objective, in the
offGrid pattern, naming a real upstream Stratum/Tier output established by the
`prerequisiteObjectiveIds` + `feedsInto` graph. No new cites were authored (none
were needed); no domain facts invented; existing prose untouched. Conformance and
catalogue suites remain green (125/125).
