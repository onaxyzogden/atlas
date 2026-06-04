# ADR: Eco-Resort / Glamping as an agritourism catalogue extension (not a new type)

**Date:** 2026-06-03
**Project:** Atlas / OLOS (atlas.ogden.ag)
**Branch:** feat/atlas-permaculture
**Status:** Accepted
**Related:** 2026-06-03 livestock_operation PRIMARY + SECONDARY (the gap-first 19-type expansion this continues); 2026-05-29 agritourism economics ruled clean service reservation; education EDU-S4.7 / EDU-S5.7 conditional-scoping precedent; OLOS Project-Type + Secondary-Layer Spec

## Context

Eco-Resort / Glamping is one of four still-missing types from the operator's 19-type
roadmap. Exploration established it is **not greenfield**: the existing `agritourism`
("Agritourism / Retreat") primary type already scopes paid overnight guest stays on
regenerating land - visitor capacity (AG-S1.5), guest water & sanitation (AG-S3.3),
sensory environment (AG-S3.4), guest circulation / zoning (AG-S4.4), accommodation
design (AG-S5.4), booking / pricing / revenue (AG-S4.8, ratified 2026-05-29 as clean
service reservation), safety, and phased launch (AG-S7.6). A separate `eco_resort` type
would near-duplicate all of that.

Two operator AskUserQuestion gates set the approach:

- **Type modeling = extend agritourism** (reject add-new-type). Avoids
  schema / taxonomy / matrix / index churn for almost-identical content.
- **Unit scope = draft markdown first, then encode** (hybrid sourcing). Operator replied
  **"ratified"** with no edits, authorizing encode.

## Decision

Encode **5 additive primary objectives** onto `AGRITOURISM_PRIMARY_OBJECTIVES`
(29 -> 34; resolved total 48 -> 53), each capturing only the eco-resort / glamping
*delta* agritourism lacked and cross-referencing - not duplicating - its nearest
existing neighbour. This is a **catalogue-content-only** change.

### The 5 additive objectives

- **AG-S3.7** (s3) - Ecological carrying capacity under visitor pressure: soil/compaction,
  trampling/trail-erosion thresholds, sensitive-habitat & wildlife-corridor exclusion,
  seasonal sensitivity windows, sacrificial-vs-protected ground, carrying-capacity ceiling
  feeding S6/S4. Distinct from AG-S6.5 (operational load) - this is *ecological* tolerance.
- **AG-S4.9** (s4) - Guest-to-production biosecurity & contamination buffers: bidirectional
  pathways, buffer distances, arrival hygiene, weed/pathogen controls on vehicles/gear/pets,
  safe guest-animal interaction (welfare + zoonosis). Complements AG-S4.4 (circulation).
- **AG-S5.9** (s5) - Dispersed low-impact accommodation siting & landscape integration:
  locate units against the AG-S3.7 map, minimal/zero-foundation disturbance, reversibility,
  inter-unit spacing, low-impact access. **Owns siting only**; structure design stays with
  AG-S5.4, servicing with AG-S5.10.
- **AG-S5.10** (s5) - Decentralised servicing & dark-sky / quiet design: point-of-use
  water/rainwater, greywater/blackwater treatment, off-grid power/refrigeration, dark-sky
  lighting, acoustic-quiet zoning, within AG-S3.3/AG-S3.7 limits + regulatory compliance.
  Turns the AG-S3.3/AG-S3.4 surveys into design commitments.
- **AG-S7.8** (s7) - Seasonal-occupancy resilience & off-season resourcing: off-season
  maintenance/land-recovery, seasonal staffing cycle, cash-flow buffering, mothballing /
  partial closure, complementary off-season uses; consistent with AG-S2.8 + AG-S7.6.

### Conditional scoping

Each glamping-specific objective carries a conditional `scopeNotes` ("Applies when ...;
omit for day-visit-only agritourism") mirroring the education EDU-S4.7 / EDU-S5.7 "omit if
no food service intended" precedent, so plain day-visit agritourism / retreat projects are
not over-scoped. A test asserts all 5 carry non-empty `scopeNotes`.

### Deliberately NOT touched

`projectTypes.ts`, `projectTypeTaxonomy.schema.ts`, `project.schema.ts`,
`relationshipMatrix.ts`, `catalogues/index.ts` - agritourism is already fully registered
(`AGRITOURISM_PRIMARY_OBJECTIVES`, `getPrimaryCatalogue` branch, picker row, matrix
row/column). No new type id, no new formula ids (all 6 are livestock; app-layer).

## Amanah Gate

The extension introduces **no new sales surface** - bookings remain the ratified
service-reservation model (2026-05-29). AG-S7.8 explicitly records that any future
season-pass / advance multi-night package / membership prepayment is a sales instrument
requiring **verbatim encoding + an Amanah scopeNote** (*bay` ma laysa `indak* / gharar -
no advance sale of undelivered nights) and **Scholar Council review**; it is not assumed
here. No riba / gharar / CSRA / salam framing ([[feedback-csa-in-catalogues]],
[[fiqh-csra-erased-2026-05-04]]). AG-S4.9's guest-animal interaction carries a welfare
(ihsan) duty. Clean.

## Consequences

- `getPrimaryCatalogue('agritourism')` / `resolveProjectObjectives({ primaryTypeId:
  'agritourism' })` now layer 19 universal + 34 primary = 53 objectives; the resolved set
  stays a valid partition with globally-unique ids.
- Eco-resort / glamping projects are modeled as agritourism with the conditional
  objectives active; day-visit agritourism ignores them via `scopeNotes`. No UI change -
  new objectives flow through the existing data-driven Plan wizard automatically.
- `tsc --noEmit` on `@ogden/shared` EXIT 0; `catalogues.test.ts` **99/99** (was 98; +1)
  bounded `pool:'forks'`.

## Deferred

- The other 3 missing types: Watershed / Wetland Restoration, Sustainable Forestry /
  Woodlot, Community Garden / Urban Ag (iterated one at a time).
- A real season-pass / membership / advance-package instrument for agritourism (would
  re-engage the verbatim-encode + Amanah scopeNote + Scholar Council path; none added).
- Folding this into `entities/shared-package.md` (deferred while the working tree carries
  foreign WIP, per the livestock-type precedent).
