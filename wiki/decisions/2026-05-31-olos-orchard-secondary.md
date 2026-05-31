# ADR: Orchard / Food Forest SECONDARY catalogue (derived)

**Date:** 2026-05-31
**Project:** Atlas / OLOS (atlas.ogden.ag)
**Branch:** feat/atlas-permaculture
**Status:** Accepted
**Related:** 2026-05-30 Wellness-secondary derive; 2026-05-31 Silvopasture-secondary derive; OLOS Project-Type + Secondary-Layer Spec v1.2

## Context

`orchard_food_forest` is `canBePrimary: true, canBeSecondary: true` in the
taxonomy, but on the secondary side it layered nothing:
`getSecondaryCatalogue('orchard_food_forest')` returned `undefined`. Selecting
Orchard as a secondary on another primary (e.g. a regenerative farm or
ecovillage that wants a food-forest element) therefore added no objectives.

No operator source document exists for the Orchard secondary layer. This work
is a derivation authored under the operator's in-conversation directive
("Orchard secondary (derive)") plus their chosen depth (5 additive + 4
universal patches incl. one pollinator/biodiversity patch) - the same
scoped-derive pattern already used for the Wellness (2026-05-30) and
Silvopasture (2026-05-31) secondaries. This is an explicit, narrowly-scoped
exception to the standing "catalogue docs are operator-provided, do not invent
content" rule.

## Decision

Encode an Orchard / Food Forest secondary catalogue that contributes the
perennial tree-crop concerns a host primary lacks:

**5 additive objectives** (`source:'secondary', sourceTypeId:'orchard_food_forest', secondaryClass:'additive'`):

1. `orch-sec-s2-climate-chill-fit` (s2-land-reading, ORCH-S2.20) - chill-hours,
   frost window, heat, hardiness-zone fit for intended fruit & nut species;
   backup species if marginal.
2. `orch-sec-s4-species-pollination` (s4-foundation-decisions, ORCH-S4.20) -
   cultivar + rootstock selection (vigor -> spacing), pollination groups /
   bloom-overlap partners, self-fertile vs cross, true-to-type sourcing.
3. `orch-sec-s5-guild-layout` (s5-system-design, ORCH-S5.20) - canopy +
   understory + support-species multilayer layout, spacing/density vs light
   competition, integrated with the host primary's layout.
4. `orch-sec-s6-perennial-care` (s6-integration-design, ORCH-S6.20) -
   committed recurring regime: pruning/training, thinning, integrated pest +
   disease management, seasonal-labor peaks costed, skills/tools gap.
5. `orch-sec-s6-harvest-pathway` (s6-integration-design, ORCH-S6.21) - harvest
   windows per species, post-harvest handling + storage, processing/value-add,
   halal market or subsistence destination (no riba/gharar).

**4 universal patches** (all target real universal objective ids -> zero
skippedPatches):

- -> `s4-water-strategy` (ORCH>U-S4.2): perennial 3-5yr establishment +
  drought-year irrigation demand; drip/micro-irrigation + weaning schedule.
- -> `s5-soil-improvement` (ORCH>U-S5.3): pre-plant deep soil prep per planting
  zone; ongoing orchard-floor fertility (mulch rings, compost, living mulch).
- -> `s2-ecology` (ORCH>U-S2.3): pollinator + beneficial-insect habitat
  baseline for fruit/nut set; insectary / flowering-understory provision. (This
  is the pollinator/biodiversity patch; `s2-ecology` is the real seam - no
  standalone biodiversity-baseline objective exists in universal.ts.)
- -> `s7-phase1` (ORCH>U-S7.1): perennial stock + rootstock spacing into the
  planting palette; staged multi-year establishment + tree protection (guards,
  stakes, mulch) in Phase 1.

Refs use the `.20+` band so they never collide with the ORCH primary refs
(which max at S*.8). The ref NUMBER tracks the canonical stratum NUMBER.

## Correction captured during authoring

The approved plan's first-draft patch targets `s5-planting-design (U-S5.4)` and
`s3-biodiversity-baseline (U-S3.3)` DO NOT EXIST in universal.ts. They were
reconciled to the real seams `s5-soil-improvement (U-S5.3)` and `s2-ecology
(U-S2.3)` before authoring, keeping skippedPatches empty.

## Amanah Gate

Ordinary perennial food production (fruit/nut/food-forest) and its halal sale.
The harvest objective scopes the market destination as halal with no
advance-sale / CSRA / riba / gharar content. Clean.

## Consequences

- The secondary-catalogue family is now complete for every encoded type
  (Residential, Wellness, Nursery, Silvopasture, Orchard).
- `getSecondaryCatalogue('orchard_food_forest')` returns 5 additive + 4
  patches; resolving onto a host primary adds 5 standalone objectives and
  injects 8 checklist items into 4 universal objectives, each stamped
  `expandedBySecondaryId === 'orchard_food_forest'`.
- Verified: `@ogden/shared` typecheck exit 0; full suite 810 passed (43 files);
  `catalogues.test.ts` 63 tests incl. the orchard-secondary describe block.

## Deferred

- (b) The PRIMARY-sourced universal-augmentation seam (Silvo/Orchard
  harvest-access additions to universal objectives) still has no mechanism; a
  primary->universal patch seam is required first. Tracked in the orchard.ts
  header "Universal-augmentation note".
