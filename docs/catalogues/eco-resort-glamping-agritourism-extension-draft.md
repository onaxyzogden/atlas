# DRAFT for ratification - Eco-Resort / Glamping: agritourism catalogue extension

**Status:** DRAFT (Phase 1 of the hybrid sourcing model). Nothing is encoded yet.
Operator ratifies / edits this spec; only then does it become TypeScript.
**Date:** 2026-06-03
**Project:** Atlas / OLOS (atlas.ogden.ag), branch `feat/atlas-permaculture`
**Type:** content extension of the existing `agritourism` primary catalogue
(no new project type).

---

## Why this shape (decision recap)

Eco-Resort / Glamping is one of the four still-missing types from the 19-type roadmap.
It is **not greenfield**: the existing `agritourism` ("Agritourism / Retreat") primary
type already scopes paid overnight guest stays on regenerating land - visitor capacity
(AG-S1.5), guest water & sanitation (AG-S3.3), sensory survey (AG-S3.4), circulation &
boundaries (AG-S4.4), service model incl. glamping (AG-S4.5), accommodation design incl.
"cabin placement, glamping site layout" + thermal + licensing (AG-S5.4), booking/pricing
(AG-S4.8), operational load monitor (AG-S6.5), seasonal patterns (AG-S2.8), and phased
launch / financial viability (AG-S7.6).

**Operator ruling (2026-06-03):** do NOT add a standalone `eco_resort` type (it would
near-duplicate agritourism and force schema/taxonomy/matrix churn). Instead **extend the
agritourism catalogue** with the eco-resort/glamping differentiators agritourism does not
yet cover. Each new objective is written so it captures only the *delta* and explicitly
cross-references (does not duplicate) the existing objective nearest to it.

**Conditional scoping.** Every new objective carries a `scopeNotes` conditional so a
plain day-visit agritourism/retreat project is not over-scoped - mirroring the education
precedent (`EDU-S4.7` / `EDU-S5.7` "omit if no food service intended").

**Amanah.** The extension introduces **no new sales surface**. Bookings remain the
already-ratified service-reservation model (AG-S4.8 / AG-S7.6, operator 2026-05-29).
No season-pass, advance multi-night package, or membership prepayment is added. Were one
ever added it would trigger the verbatim-encode + Amanah scopeNote treatment
(*bay` ma laysa `indak* / gharar) and Scholar Council review. Animal-contact rules carry
a welfare / ihsan duty. No riba / gharar / CSRA. Clean.

---

## Count & test impact (Phase 2, after ratification)

- `AGRITOURISM_PRIMARY_OBJECTIVES`: **29 -> 34** (this draft proposes 5; operator may
  add/cut/merge).
- Resolved total: **48 -> 53** (19 universal + 34 primary).
- `catalogues.test.ts`: bump the count assertion (`...toBe(29)` -> `34`) and the
  `it('resolves to 48 objectives ...')` title + total (`-> 53`). All generic checks
  (source discipline, ref-uniqueness, 5-15 items, decision-group partition) auto-cover
  the new objectives. Optional new `it`: assert each new objective carries `scopeNotes`.
- Ref ceilings used (next-free per stratum): S3 -> AG-S3.7, S4 -> AG-S4.9,
  S5 -> AG-S5.9 / AG-S5.10, S7 -> AG-S7.8. (No collision with the existing 29.)

---

## Open calls for the operator (please decide at ratify)

1. **Objective 4 split?** AG-S5.10 currently bundles decentralised servicing AND
   dark-sky/quiet design. Keep bundled, or split dark-sky/quiet into its own AG-S5.11?
2. **Biosecurity placement.** AG-S4.9 (guest-to-production biosecurity) is filed as an
   s4 foundation decision. Prefer it in s6-integration-design instead?
3. **Conditional wording.** Confirm the "Applies when ... ; omit for ..." voice, or
   supply preferred phrasing.
4. **observeFeeds** overlay names below are editorial suggestions - confirm or correct
   the overlay vocabulary (existing AG objectives use e.g. 'Water & Hydrology',
   'Infrastructure & Access').
5. **Count.** 5 objectives feels proportionate; say if you want fewer (merge) or more.

---

## Proposed objectives (full spec)

> Format mirrors `agritourism.ts` exactly so ratified content drops straight into
> `obj({...})`. ASCII-only copy. `source:'primary'`, `sourceTypeId:'agritourism'` on all.

### 1. AG-S3.7 - Ecological carrying capacity under visitor pressure  (s3-systems-reading)

- **id:** `ag-s3-ecological-carrying-capacity`
- **shortTitle:** Ecological carrying capacity under visitor pressure
- **title:** A clear read of the land's ecological carrying capacity under visitor pressure
- **focusedQuestion:** How much foot traffic and dispersed-stay pressure can this
  landscape absorb before regeneration is undermined - and which areas must be protected
  from guest access?
- **Delta vs existing:** AG-S6.5 (load monitor) tracks *operational/infrastructure* load
  (guest numbers, water use, staff). This reads the *ecological* tolerance of the ground
  itself. Feeds AG-S6.5 thresholds and AG-S4.4 / AG-S4.9 zoning.
- **checklist:**
  - c1 Map guest-trafficked zones against soil type and compaction / erosion susceptibility
  - c2 Assess trampling and trail-erosion thresholds for proposed paths and gathering areas
  - c3 Identify sensitive habitats and wildlife corridors to exclude or buffer from guest access
  - c4 Define seasonal sensitivity windows (wet soil, breeding, regeneration) when access must reduce or close
  - c5 Define sacrificial vs protected ground - where wear is accepted and hardened vs prevented
  - c6 Set an ecological carrying-capacity ceiling that feeds the Stratum 6 load monitor and Stratum 4 zoning
- **decisionGroups:**
  - dg1 "Ground & traffic tolerance" -> c1, c2, c5  (observeFeeds: Soil & Land)
  - dg2 "Sensitive areas & seasonal limits" -> c3, c4  (observeFeeds: Ecology & Habitat)
  - dg3 "Carrying-capacity ceiling" -> c6
- **completionGate:** Ecological carrying capacity assessed. Protected areas, seasonal
  limits, and the visitor-load ceiling defined.
- **actHandoff:** Ecological Carrying Capacity & Visitor-Load Assessment
- **scopeNotes:** Applies when guests move through or stay dispersed across the
  working / regenerating landscape (eco-resort / glamping / nature-immersion model); omit
  for agritourism confined to a hardened visitor precinct. Feeds AG-S6.5 and
  AG-S4.4 / AG-S4.9; does not duplicate AG-S6.5 (operational load, not ecological tolerance).

### 2. AG-S4.9 - Guest-to-production biosecurity & contamination buffers  (s4-foundation-decisions)

- **id:** `ag-s4-biosecurity-zoning`
- **shortTitle:** Guest-to-production biosecurity & buffers
- **title:** A sound guest-to-production biosecurity & contamination-buffer strategy
- **focusedQuestion:** How is disease, weed, and contamination transfer between guest
  traffic and active livestock, crop, and water systems prevented?
- **Delta vs existing:** AG-S4.4 defines guest *circulation* and experience boundaries.
  This adds the *biosecurity / contamination* layer (disease vectors, weeds, hygiene),
  cross-referencing - not redefining - those circulation boundaries.
- **checklist:**
  - c1 Identify contamination pathways between guest movement and livestock, food-crop, and water-supply zones
  - c2 Define buffer distances between guest areas and livestock handling, manure, and spray / chemical zones
  - c3 Define hygiene and biosecurity protocols for guest entry to production areas - footwear, hand-wash, foot-baths where warranted
  - c4 Define weed and pathogen controls for guest vehicles, gear, and pets arriving on site
  - c5 Define safe guest-animal interaction rules (welfare + zoonosis control)
  - c6 Confirm the strategy is consistent with the AG-S4.4 circulation boundaries (cross-reference, do not redefine)
- **decisionGroups:**
  - dg1 "Contamination pathways & buffers" -> c1, c2
  - dg2 "Entry hygiene & arrivals control" -> c3, c4
  - dg3 "Animal contact & circulation fit" -> c5, c6
- **completionGate:** Guest-to-production biosecurity strategy approved. Buffers, hygiene
  protocols, and arrivals controls confirmed.
- **actHandoff:** Guest-to-Production Biosecurity & Contamination-Buffer Strategy
- **scopeNotes:** Applies where guests share a landscape with active livestock, food
  production, or sensitive water systems; omit where the visitor precinct is fully
  separated from production. Builds on - does not redefine - AG-S4.4 circulation
  boundaries. Animal-contact rules carry a welfare / ihsan duty (humane handling; no
  distress to animals for guest entertainment).

### 3. AG-S5.9 - Dispersed low-impact accommodation siting & landscape integration  (s5-system-design)

- **id:** `ag-s5-dispersed-siting`
- **shortTitle:** Dispersed low-impact siting & landscape integration
- **title:** A coherent dispersed low-impact accommodation siting & landscape-integration plan
- **focusedQuestion:** Where exactly are the scattered guest structures placed across the
  landscape, and how is each sited to minimise ground disturbance and stay reversible?
- **Delta vs existing:** AG-S5.4 owns unit *design* (construction standard, thermal,
  amenity, licensing) incl. "glamping site layout" at the building level. This owns the
  *distributed spatial logic* - siting many light-footprint units across a regenerating
  landscape - and defers all structure design back to AG-S5.4.
- **checklist:**
  - c1 Locate each dispersed unit (tent, yurt, cabin) against the AG-S3.7 carrying-capacity and protected-area map
  - c2 Minimise ground disturbance per site - light-footprint or zero-foundation platforms, no permanent earthworks where avoidable
  - c3 Design for reversibility - each site can be decommissioned and the ground allowed to recover
  - c4 Set inter-unit spacing for guest privacy, view lines, and acoustic separation
  - c5 Define low-impact access to each unit - paths, surfacing, and erosion control
  - c6 Confirm siting respects the AG-S3.4 sensory / privacy findings and AG-S3.7 seasonal access limits
  - c7 Defer unit construction standard, thermal design, and licensing to AG-S5.4 (cross-reference, no duplication)
- **decisionGroups:**
  - dg1 "Placement & ground impact" -> c1, c2, c3  (observeFeeds: Infrastructure & Access)
  - dg2 "Spacing & access" -> c4, c5
  - dg3 "Cross-objective fit" -> c6, c7
- **completionGate:** Dispersed accommodation siting plan approved. Ground-impact
  minimisation and reversibility confirmed against carrying capacity.
- **actHandoff:** Dispersed Low-Impact Accommodation Siting & Landscape-Integration Plan
- **scopeNotes:** Applies to dispersed / scattered overnight accommodation (glamping,
  yurts, off-grid cabins); omit where guest accommodation is a single building or hardened
  cluster handled fully by AG-S5.4. This objective owns spatial siting only; structure
  design, thermal performance, and accommodation licensing remain with AG-S5.4.

### 4. AG-S5.10 - Decentralised servicing & dark-sky / quiet design for dispersed sites  (s5-system-design)

- **id:** `ag-s5-decentralised-servicing`
- **shortTitle:** Decentralised servicing & dark-sky / quiet design
- **title:** Well-designed decentralised servicing & dark-sky / quiet provisions for dispersed sites
- **focusedQuestion:** How is each dispersed guest site supplied with water, sanitation,
  and power - and how are dark-sky and acoustic-quiet commitments built into the design?
- **Delta vs existing:** AG-S3.3 *reads* central guest water/sanitation demand; AG-S3.4
  *surveys* sensory conditions. This is the s5 *design* response for scattered sites:
  point-of-use servicing + dark-sky/quiet as built commitments rather than surveys.
- **checklist:**
  - c1 Design point-of-use water supply per site - rainwater capture and storage or low-impact reticulation
  - c2 Design greywater and blackwater handling per site - composting, constructed wetland, or contained treatment to regulation
  - c3 Design off-grid or low-draw power and refrigeration where central services do not reach
  - c4 Design lighting to a dark-sky standard - shielded, warm, minimal, motion-limited
  - c5 Define acoustic-quiet zoning and quiet-hours as a design constraint, not only a policy
  - c6 Confirm decentralised servicing load sits within the AG-S3.3 water/sanitation and AG-S3.7 ecological limits
  - c7 Confirm servicing design meets sanitation and environmental-discharge regulation
- **decisionGroups:**
  - dg1 "Water & waste at point of use" -> c1, c2, c7  (observeFeeds: Water & Hydrology)
  - dg2 "Power & refrigeration" -> c3
  - dg3 "Dark-sky & quiet" -> c4, c5
  - dg4 "Capacity & compliance fit" -> c6
- **completionGate:** Decentralised servicing design approved. Per-site water, waste,
  power, and dark-sky / quiet provisions confirmed within ecological and regulatory limits.
- **actHandoff:** Decentralised Servicing & Dark-Sky / Quiet Design Package
- **scopeNotes:** Applies to dispersed off-grid or partially-serviced guest sites; omit
  where all accommodation is on central farm water / sanitation / power handled by AG-S3.3
  and the universal infrastructure objectives. Turns the AG-S3.4 sensory survey into
  design commitments (dark-sky, quiet); does not re-survey conditions.

### 5. AG-S7.8 - Seasonal-occupancy resilience & off-season resourcing  (s7-phasing-resourcing)

- **id:** `ag-s7-seasonal-resilience`
- **shortTitle:** Seasonal-occupancy resilience & off-season resourcing
- **title:** A sound seasonal-occupancy resilience & off-season resourcing plan
- **focusedQuestion:** How does the operation stay financially and operationally sound
  across peak, shoulder, and off-season - including maintenance, staffing, and cash-flow gaps?
- **Delta vs existing:** AG-S2.8 *reads* when guests can visit; AG-S7.6 sets overall
  financial viability. This adds the *off-season resourcing* layer - maintenance,
  seasonal staffing, cash-flow buffering, mothballing - cross-referencing both.
- **checklist:**
  - c1 Define the off-season maintenance and land-recovery program (when guest pressure lifts)
  - c2 Define seasonal staffing - hiring, training, and stand-down cycle across the operating calendar
  - c3 Define cash-flow buffering for revenue gaps between peak periods
  - c4 Define a mothballing / partial-closure protocol for structures and systems in the off-season
  - c5 Define off-season uses that do not compromise regeneration (maintenance, education, rest)
  - c6 Confirm the plan is consistent with AG-S2.8 operating-season limits and AG-S7.6 financial viability (cross-reference)
- **decisionGroups:**
  - dg1 "Off-season operations" -> c1, c4, c5
  - dg2 "Staffing & cash flow" -> c2, c3
  - dg3 "Cross-objective fit" -> c6
- **completionGate:** Seasonal-occupancy resilience plan approved. Off-season maintenance,
  staffing, and cash-flow buffering confirmed.
- **actHandoff:** Seasonal-Occupancy Resilience & Off-Season Resourcing Plan
- **scopeNotes:** Applies to seasonal operations with material off-peak closure;
  light-touch for year-round operations. Resourcing / cash-flow content is operational
  planning, not a sales surface - it adds no booking or advance-payment mechanism beyond
  AG-S4.8 / AG-S7.6 (operator-ratified 2026-05-29 as clean service reservation). No
  season-pass, advance multi-night package, or membership prepayment is introduced; were
  one added it would require the verbatim-encode + Amanah scopeNote (*bay` ma laysa
  `indak* / gharar) treatment and Scholar Council review.

---

## Ratification

Reply with **"ratified"** (optionally with edits to the open calls above, the objective
set, refs, checklists, or wording) and I will encode the agreed set into
`agritourism.ts`, update the conformance test, verify (tsc + bounded vitest), and commit
on `feat/atlas-permaculture` (not pushed), then file the ADR + log.
