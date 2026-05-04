# Permaculture Alignment Backlog — 2026-04-28

Recommendations 3-6 from the [2026-04-28 Permaculture Scholar review](../wiki/concepts/permaculture-alignment.md).
P0 recommendations 1-2 are tracked as ADRs:
[Needs & Yields dependency graph](../wiki/decisions/2026-04-28-needs-yields-dependency-graph.md) ·
[Temporal slider](../wiki/decisions/2026-04-28-temporal-slider-succession-modeling.md).

Conversation: NotebookLM `48a34396-5525-4a57-9884-108d93b1872f` against
the Permaculture Scholar (`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`).

---

## Rec #3 — Highest-potential water router (P1)

**Principle:** Catch & Store Energy
**Source:** *Permaculture Design for Water*, *Watershed Patterns*,
*Understanding the Watershed*, *How Trees Affect the Watershed*, *The
Beaver: Watershed Engineer*, *Permaculture Design for Slope*.

**Scholar's framing:** "Water represents potential energy, and the primary
rule of permaculture water design is to keep water in its place of highest
potential (up high) so gravity can do the work."

**Atlas surface:** Data layer + scoring engine.

**Specifically:**
- Add an automated overlay that traces potential surface runoff starting
  from the highest elevation points on the site, derived from the existing
  DEM/topography layer. Output: vector flow paths with magnitude annotated.
- Scoring: when a user attempts to place a water-harvesting element
  (tank, pond, swale, cistern) low in the watershed, the engine **flags
  the placement** and suggests a higher-elevation alternative within the
  parcel boundary.

**Acceptance criterion:** A water-harvest element placed below the parcel's
median elevation surfaces a "lower-than-optimal" warning in the right rail
with a numeric "potential gravity head lost" estimate (in metres) and a
suggested coordinate within the upper third of the parcel.

**Dependencies:** Existing DEM ingest already supplies elevation. No new
data source needed for v1.

**Estimated effort:** 1 sprint (1 dev). Mostly geometry + score-engine
wiring; UI surface is small (badge + suggestion popover).

---

## Rec #4 — Edge & connectivity evaluator (P1)

**Principle:** Edges & Marginal · Diversity
**Source:** *Permaculture Design by Sectors*, *Zones in the Matrix*,
*Permaculture Design for Food*, *The Foundations of Permaculture Design*,
*The Permaculture Principles* (Principle 11).

**Scholar's framing:** "Homogenized layers lack the edge necessary to
create niches for diverse species and predator/prey relationships that
keep pests in check."

**Atlas surface:** Scoring engine.

**Specifically:**
- Add an analyzer that computes perimeter-to-area ratio for every drawn
  planting zone.
- Add a "homogeneity penalty": a single uniform geometric shape (square,
  rectangle, circle) above a threshold area triggers a Diversity score
  reduction.
- Surface a UI prompt: "carve out edges, peninsulas, or marginal borders
  for companion plants."

**Acceptance criterion:** Drawing a 2-hectare uniform rectangular orchard
yields a Diversity score below 0.5 and shows a "low edge-to-area ratio"
prompt with three suggested shape variants (peninsula, scalloped border,
keyhole carve-out). Shape variants are non-binding suggestions; user can
accept/dismiss.

**Dependencies:** No new data — pure geometry analysis on existing
zone polygons.

**Estimated effort:** 0.5 sprint. Geometry math is straightforward; the
suggestion-shape generator is the biggest unknown.

---

## Rec #5 — Local/biological material substitution calculator (P2)

**Principle:** Renewable Resources & Services · Small & Slow Solutions
**Source:** *Permaculture Shelter Design*, *Permaculture Trees in Temperate
Climates*, *Building Community*, *Regenerative Investments*.

**Scholar's framing:** "Permaculture prioritizes using local, natural
materials and replacing imported hardware with living systems, such as
growing trees specifically to serve as living fence posts."

**Atlas surface:** Financial model.

**Specifically:**
- For every infrastructure line item in the cost model with a known
  biological alternative (metal fencing → living willow hedge; plastic
  irrigation pipe → bamboo conduits; gravel paths → living mulch path),
  surface a **substitution toggle** in the budget tool.
- Compute cost/time delta — biological alternatives are usually cheaper
  in dollars but slower in years-to-establishment. Both axes shown.
- Add a "biological substitution rate" metric to the project's mission
  scoring.

**Acceptance criterion:** Adding "100ft of metal fencing" to a project
budget surfaces a "🌱 Living willow hedge alternative" toggle showing
cost: -65%, establishment time: +24 months, mission-score uplift: +0.08.

**Dependencies:** Need to seed a substitution catalog (~10-15 high-leverage
pairs). Citation discipline matches the existing regional cost dataset
(NRCS / OSCIA / OMAFRA precedents).

**Estimated effort:** 1 sprint, gated on building the substitution
catalog (the unknown unknown).

---

## Rec #6 — "Nets in the flow" social node generator (P2)

**Principle:** Integrate rather than segregate · People Care
**Source:** *Building Community*, *Permaculture Zones*,
*Permaculture Design Course Week 1 Overview*.

**Scholar's framing:** "Human movement flows like water, and placing 'nets
in the flow' (like benches or public spaces) slows people down to foster
necessary community relationships."

**Atlas surface:** Design canvas.

**Specifically:**
- Detect path intersections in placed footpaths within Zones 1 and 2
  (existing zone classification).
- At each intersection, surface a non-blocking prompt: "consider placing
  a social element here (bench, gathering spot, sign, shaded seat)."
- Add a `socialNodeDensity` sub-metric under People Care that rewards
  designs with social nodes at high-traffic intersections.

**Acceptance criterion:** Drawing two intersecting footpaths within Zone
1 surfaces a "social node opportunity" pin at the intersection, with a
one-click "place bench" / "place gathering area" / "dismiss" choice.
Score updates live.

**Dependencies:** Zone classification (already exists); footpath as a
first-class entity (already exists). Need a small "social element"
catalog (bench, picnic table, shaded seat, signage post, prayer space,
gathering pavilion).

**Estimated effort:** 0.5 sprint. Mostly UX surface + a tiny new entity
catalog.

---

## Branch / sequencing

All four are queued on `feat/atlas-permaculture` (cut from `feat/atlas-3.0`).
Suggested order:

1. **Rec #1** (Needs & Yields) — P0, foundational data-model change, ships
   first. Without it the others have no relationship graph to attach to.
2. **Rec #2** (Temporal slider) — P0, parallel work to #1; depends only on
   geometry + species data, not on relationships. Can ship in parallel.
3. **Rec #4** (Edge evaluator) — P1, simplest of the remaining; ships
   third as a quick win.
4. **Rec #3** (Water router) — P1, larger scope; ships fourth.
5. **Rec #6** (Social nodes) — P2, ships fifth.
6. **Rec #5** (Substitution calculator) — P2, ships last; gated on
   substitution catalog research.

## Re-evaluation cadence

After Rec #1 + #2 ship, **re-run the Permaculture Scholar dialogue** with
the updated Atlas description. Verdict gates may move (Produce No Waste
from "missing" to "represented"; Integrate from "partial" to
"represented") and the Scholar may surface new gaps.
