# ADR: Livestock Operation SECONDARY layer

**Date:** 2026-06-03
**Project:** Atlas / OLOS (atlas.ogden.ag)
**Branch:** feat/atlas-permaculture
**Status:** Accepted
**Related:** 2026-06-03 livestock_operation PRIMARY type (this is the deferred follow-up); 2026-05-31 silvopasture/orchard secondary derivation pattern; 2026-06-02 objective->formula binding (the 6 livestock formula ids); OLOS Project-Type + Secondary-Layer Spec v1.2

## Context

`livestock_operation` shipped 2026-06-03 as a **primary-only** type
(`canBeSecondary: false`). A steward running a regenerative farm, orchard / food
forest, homestead, or ecovillage who wanted to fold a standalone grazing / animal
enterprise onto that host had no way to layer it. This ADR adds the deferred
**secondary layer**.

The shape and sourcing were ratified with the operator:

- **Shape = Modifying** (like the silvopasture secondary): additive objectives PLUS
  universal patches, reusing the forage / stocking / water / paddock formula bindings.
- **Sourcing = hybrid:** I drafted a reviewable markdown spec
  (`docs/catalogues/livestock-operation-secondary-draft.md`), iterated it across three
  expert-review revisions (5+3 -> 6+3 -> **7+3**), the operator ratified it and
  delegated the final two calls to me as domain expert, then I encoded to TypeScript.

**Deliberately distinct from the silvopasture secondary.** Silvopasture frames
livestock as one leg of an *integrated tree + forage + livestock* system
(grazing-as-a-tool under a canopy). This livestock secondary is the **standalone
animal enterprise** folded onto any host - herd-led, no tree-integration framing -
and it foregrounds the two things silvopasture does not: **biosecurity at the host
interface** (stock meeting the host's crops / visitors / nursery stock / wildlife)
and **closing the manure / nutrient loop** back into the host's production. Refs and
ids are namespaced (`LVS-S*.20+`, item ids `...-lvs-N`, groups `...-dglvs*`) so both
secondaries can co-resolve on a third primary without collision.

## Decision

Flip `livestock_operation` to `canBeSecondary: true` and encode a **7 additive
objective + 3 universal patch** secondary layer (ref band `LVS-S*.20+`), appended to
the existing `catalogues/livestockOperation.ts` (one-file-per-type convention).

### The 7 additive objectives

- **LVS-S1.20** (s1) - Livestock enterprise intent & host-integration rationale:
  why a herd is added to *this* host, product vs land-management service, candidate
  species, labour, compatibility with the host vision/scale.
- **LVS-S3.20** (s3) - Carrying-capacity fit on the host forage base:
  `ckF carrying-capacity-seasonal` + `ckF forage-carrying-capacity`; available area;
  weed/toxic-plant scan.
- **LVS-S4.20** (s4) - Species/breed, stocking rate (`ckF paddock-stocking-density`,
  advisory) & grazing system; dry-season feed budget + contingency; capacity-fit check.
- **LVS-S4.21** (s4) - Core stock infrastructure & **establishment hard gate**:
  fencing, handling yards/race/loading, shelter, water-reticulation readiness;
  go/no-go that **no livestock arrive before water, fencing, and handling each pass an
  independent readiness test** (welfare/ihsan scopeNote).
- **LVS-S5.20** (s5) - Animal-impact integration & stacking timing (the permaculture
  differentiator): impact windows vs the host production calendar, functional stacking
  per species, leader-follower sequencing, spatial footprint
  (`ckF paddock-system-capacity`, optional), yield protection.
- **LVS-S6.20** (s6) - Animal health, welfare & host-interface biosecurity:
  health program, daily welfare + humane/halal handling intent (ihsan scopeNote),
  biosecurity, predator/guardian strategy, disease-vector/quarantine controls,
  regulatory compliance, record-keeping.
- **LVS-S6.21** (s6) - Manure, nutrient cycling & closed-loop fertility:
  nutrient flows, livestock-to-land fertility balance, manure as compost / BD-prep
  substrate (illustrative), safe-handling withholding periods, overgrazing/loading
  guard, loop closure.

### The 3 universal patches

- **A -> `s4-water-strategy`** (`LVS>U-S4.2`): `ckF stock-water-demand`; reticulation +
  water quality to every grazing area; riparian/waterway exclusion.
- **B -> `s5-soil-improvement`** (`LVS>U-S5.3`): grazing-impact monitoring; graze/rest
  thresholds + manure-loading limits.
- **C -> `s5-access`** (`LVS>U-S5.1`): stock-movement laneways; gated crossings at
  crop/visitor/waterway intersections.

### Wiring (data-only - the id already exists in the taxonomy)

- `projectTypes.ts` - `livestock_operation` `canBeSecondary: true` (picker 8 -> 9);
  `SECONDARY_TYPES` filter picks it up, no UI change.
- `relationshipMatrix.ts` - `'livestock_operation'` added to the `SecondaryTypeId`
  union + `SECONDARY_TYPE_IDS`; a new compile-strict 13-cell `livestock_operation`
  ROW (homestead/regen/market_garden/orchard/ecovillage/conservation **M**,
  agritourism/education/off_grid/nursery **A**, wellness **X**, silvopasture/self
  **NA**); **tension-13** livestock_operation x conservation @ s4-foundation-decisions
  (grazing-as-tool vs habitat protection - makes the softened `M` cell honest).
  Tensions 11 (xwellness) and 12 (xmarket_garden) already exist and fire symmetrically.
- `catalogues/index.ts` - import/re-export the two new symbols, `getSecondaryCatalogue`
  branch, `ALL_CATALOGUE_OBJECTIVES` union, header comment.
- `catalogues.test.ts` - `PATCH_REF` allows `LVS`; `LIVESTOCK_SECONDARY_OBJECTIVES` in
  `ALL_AUTHORED`; source/layer-discipline `it`; a resolution describe block (+7 additive,
  all 3 patches applied/none skipped, gate amendment concatenation, ref non-collision,
  **co-resolution with the silvopasture secondary on a third host** without id
  collision).
- **No schema change** - `projectTypeTaxonomy.schema.ts` / `project.schema.ts` already
  carry the id; secondary capability is pure data.

## Amanah Gate

The secondary is **production-integration only** - the host primary owns marketing and
economics, so there is **no sales-channel objective** here and **no advance-sale /
herd-share / CSA surface is introduced at all** (no *bay` ma laysa `indak* surface to
flag). Ordinary halal animal husbandry. LVS-S6.20 carries a welfare/ihsan scopeNote and
LVS-S4.21 carries the establishment-gate welfare note; humane + halal handling intent is
explicit. No riba, gharar, or CSRA/salam framing. Clean. (Had a sales hook surfaced
during drafting it would have re-engaged the verbatim-encode + scopeNote CSA rule
[[feedback-csa-in-catalogues]]; none did, because economics live on the host.)

## Consequences

- `resolveProjectObjectives({ primaryTypeId, secondaryTypeIds: ['livestock_operation'] })`
  layers the 7 additive objectives and applies all 3 patches (none skipped) on any
  compatible host; the resolved set stays a valid partition with globally-unique ids.
- A user can select **both** the silvopasture-secondary and the livestock-secondary on a
  third host -> duplicated grazing/water/soil content, but namespaced ids
  (`...-lvs-N` vs `...-silv-N`) prevent collision; it reads redundant, never breaks. A
  mutual-exclusion rule would be a later resolver change, not a catalogue change. A
  dedicated test asserts this co-resolution stays id-unique.
- `tsc --noEmit` on `@ogden/shared` EXIT 0; `catalogues.test.ts` **98/98**
  (was 88; +10) bounded `pool:'forks'`.

## Deferred

- The other 18 requested project types (iterated one at a time).
- Any host-specific marketing/economic objectives in the secondary (the host owns those).
- A resolver-level mutual-exclusion guard for the silvopasture+livestock double-select.
- Folding this into `entities/shared-package.md` (deferred while the working tree
  carries foreign WIP, per the primary-type precedent).
