# Atlas — Updated Description for Permaculture Scholar (2026-05-13)

This block replaces the 2026-04-28 Atlas description that was used in the
original Permaculture Scholar dialogue (conversation
`48a34396-5525-4a57-9884-108d93b1872f`, notebook
`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`). It captures the state of Atlas
after the post-2026-04-28 permaculture-alignment branch
(`feat/atlas-permaculture`) shipped five of the six recommendations from
that dialogue. **Rec #2 (Temporal slider) remains an open P0** and has
not been built; the Scholar should not credit it.

---

## What Atlas is (unchanged structurally)

Atlas is a geospatial land-intelligence web app for stewardship-
conscious land design. It integrates public GIS layers (SoilGrids,
NWIS/PGMN, GAEZ, NASA POWER), interactive map editing on Mapbox GL, a
site-assessment scoring engine, and four design stages — **Observe →
Plan → Design → Decide**. The ethical substrate is anchored by the
Amanah Gate (the operator's covenant-based no-go gate) and a
mission-scoring axis that structurally rewards regenerative value
beyond profit.

Engineering discipline is unchanged: pre-flight audits, deterministic
merge gates, ADR culture, and confidence laddering (Tier-1 → Tier-3
data layers, demand-model rounds 1 → 2) remain. The 2026-04-28
recommendations were explicitly framed as *additive surfaces*, not as
softening engineering rigour.

---

## What changed since 2026-04-28 — five shipped recommendations

All five surfaces ship behind no feature flag (Rec #1's underlying
math was already behind `FEATURE_RELATIONSHIPS` since 2026-04-28; the
v3 Plan-stage audit surface added 2026-05-13 renders unconditionally).

### Rec #1 — Needs & Yields dependency graph (P0)

**Status:** ADR shipped 2026-04-28 (`wiki/decisions/2026-04-28-needs-yields-
dependency-graph.md`). v3 Plan-stage `NeedsYieldsAuditCard` shipped
2026-05-13 under the `principle-verification` module.

**What it does.** Every placed entity (structures, utilities, crop
areas, livestock paddocks) declares typical biological / structural
flows it produces (outputs) and consumes (inputs) via a closed
`ResourceType` enum (13 resources: manure, greywater, compost,
biomass, seed, forage, mulch, heat, shade, pollination, pest_predation,
nutrient_uptake, surface_water). An `Edge` object links one entity's
output to another's input. The shared package
(`packages/shared/src/relationships/`) computes:

- `orphanOutputs` — declared outputs no edge consumes (resources going
  to waste).
- `unmetInputs` — declared inputs no edge supplies (resources being
  imported rather than cycled).
- `closedLoops` — simple directed cycles (Johnson-style DFS), surfaced
  as "CYCLING" badges.
- `integrationScoreFromEdges` — fraction of declared outputs that an
  edge routes. Weight `0.10` in the overall site score.

The Plan-stage card renders the audit as: site rollup (entity count,
declared outputs/inputs, edges routed, integration-score tier pill
WEB INTEGRATED ≥ 0.66 / PARTIAL ≥ 0.33 / LINEAR < 0.33), closed-loop
list, and a per-entity audit list sorted flagged-first with orphan
outputs and unmet inputs displayed as coloured resource chips.

**Principles addressed:** Holmgren P6 (Produce no waste), P8
(Integrate rather than segregate).

**v2 deferrals:** Inline edge-editing UX inside the Plan slide-up
(edges currently authored on the legacy canvas socket flow).

### Rec #3 — Highest-potential water router (P1)

**Status:** v1 shipped 2026-05-13. `WaterRouterCard` under the
`water-management` Plan module.

**What it does.** Aspect-projected heuristic flags water-harvest
elements placed below the parcel's median elevation, with a numeric
"head lost" estimate (metres of gravity-fed pressure forfeited) and a
suggested upper-third coordinate. v1 is a textual readout; no
auto-relocation.

**Principles addressed:** Holmgren P2 (Catch and store energy).

**v2 deferrals:** Map-canvas snap-to-relocated-position UX; multi-
catchment optimisation across the parcel.

### Rec #4 — Edge & connectivity evaluator (P1)

**Status:** v1 shipped 2026-05-12. `EdgeConnectivityCard` under the
`plant-systems` Plan module.

**What it does.** Polsby–Popper compactness audit on planting
polygons (orchards, food forests, gardens, windbreaks). The metric
ranges 0..1 with circles at 1.0 and dendritic shapes near 0; the card
flags polygons with compactness > 0.85 as "homogenised" and prompts
the designer to introduce undulations / keyhole edges. v1 outputs a
textual recommendation per polygon.

**Principles addressed:** Holmgren P11 (Edges and marginal), P10
(Diversity).

**v2 deferrals:** Shape-variant generation (one-click "edge-up this
polygon" suggestion).

### Rec #5 — Material substitution calculator (P2)

**Status:** v1 shipped 2026-05-13. `MaterialSubstitutionsCard` under
the `phasing-budgeting` Plan module.

**What it does.** A cited static catalog of 8 substitution pairs maps
conventional infrastructure cost line items to biological alternatives
(metal fence → hawthorn hedge; PVC drip → swale + berm; concrete
cistern → earthen pond + roof catchment; etc.). Each pair carries a
fractional `costMultiplier` (so the alternative scales with the
steward's drawn quantity), an establishment-time penalty (informational
in v1), and a mission-uplift estimate (informational in v1).

Toggling a substitution writes through to
`financialStore.costOverrides[itemId]`, so the project's total
investment recomputes immediately via the existing
`useFinancialModel(projectId)` hook. Each catalog row carries ≥1 full
bibliographic citation (Mollison Designer's Manual, Crawford 2010,
Coleman 2018, Lancaster 2008, Drinkwater *Nature* 396 [1998], USDA
NRCS CPS-380, etc.).

**Principles addressed:** Holmgren P5 (Use & value renewable
resources & services), P9 (Use small & slow solutions).

**v2 deferrals:** Establishment-time delta flowing into cashflow
phase scheduling; mission-uplift wiring into `missionScoring.ts`;
catalog expansion to 10–15 pairs; per-region cost-multiplier tuning.

### Rec #6 — "Nets in the flow" social-node generator (P2)

**Status:** v1 shipped 2026-05-13. `SocialNodesCard` under the
`zone-circulation` Plan module.

**What it does.** Computes path×path intersections (planar lat/lng)
across all drawn footpaths, filters to intersections that fall inside
a Z1 or Z2 zone (high-traffic permaculture-zone band), and checks
each surviving intersection against the nearest social-element point
within a `COVERED_RADIUS_M = 12 m` radius. Covered intersections are
labelled "social node served"; uncovered ones become "social node
opportunities" with a textual prompt to place a bench / shaded seat /
gathering point. Catalog scope v1: `prayer-pavilion` and `fire-circle`
amenities.

**Principles addressed:** Holmgren P8 (Integrate rather than
segregate), People Care ethic.

**v2 deferrals:** Richer social-element catalog (bench, picnic table,
shaded seat, signage post, gathering pavilion); one-click canvas
placement.

---

## What did NOT ship — Rec #2 (Temporal slider) is still open

**Status:** ADR `wiki/decisions/2026-04-28-temporal-slider-succession-
modeling.md` is `proposed`. Not implemented.

This is the only open P0 from the 2026-04-28 set. The Scholar should
**not** credit Atlas for representing Holmgren P9 (Small & slow
solutions) or P12 (Respond to change) any better than the 2026-04-28
snapshot. The Plan stage's Vision-Layout canvas does carry a
Year-1 / Year-5 phase-tab filter keyed to Yeomans' Scale of
Permanence (added 2026-05-07 — see
`wiki/concepts/atlas-sidebar-permaculture.md`), but that is a
*permanence-gating* surface, not a *succession-modelling* surface. It
filters which design elements appear in each phase; it does not
simulate plant maturity, canopy succession, or community ecological
dynamics over decades.

---

## What also shipped under the same branch (context for the Scholar)

- **Three Ethics rollup card + Holmgren coverage matrix + principle
  evidence visible-IDs** under the `principle-verification` Plan
  module (Scholar verdict 2026-05-07; ADR
  `wiki/decisions/2026-05-07-atlas-plan-principles-scholar-keep-
  atlas.md`). The Scholar's 2026-05-07 verdict was "keep Atlas, do
  not pivot to a non-permaculture frame," and the design surfaces
  the three ethics + 12 principles + feature-bucket coverage matrix
  directly to the steward.
- **Observe-stage right-rail Scholar guidance** (WHY / HOW / Pitfall
  triplets) under each Observe tool — see
  `wiki/decisions/2026-05-06-atlas-observe-tools-functional.md`.
- **Closed-loop graph card** under `soil-fertility` (not a Rec #1
  duplicate — this one operates on the waste-vector graph drawn in
  the Soil module, distinct from the entity-level Needs & Yields
  audit).

---

## What did NOT change — process / structural posture

- **Engineering rigour preserved.** Pre-flight audits, ADR culture,
  deterministic merge gates, and the confidence-laddered data
  pipeline are unchanged. The recommendations *added surfaces*; they
  did not soften gates.
- **Structural ceiling acknowledged.** The 2026-04-28 verdict held
  that even with all six recommendations shipped, a permaculture
  designer would still describe Atlas as "brilliant ally / distant
  cousin" — software is diagnostic; the actual medicine still
  requires hands in the soil. The Scholar may revisit this framing
  in the re-evaluation but should weigh whether the structural
  ceiling has moved, not just whether individual gaps have closed.

---

## Open questions for the Scholar (Round 1 only)

1. Given the description above, which cells in the 2026-04-28
   12-principle audit table should move, and to what status? (Old
   tally: 4 represented / 6 partial / 3 missing.)
2. For each shipped rec, does the gap it was meant to close now
   register as closed, partially closed, or still open?
3. With the verdict updated, what are the next 3–5 ranked
   recommendations (excluding Rec #2, which is already on the
   backlog)? Cite a PDC source per recommendation.

(These three asks are split across the three Round 1 prompt files.)
