# ADR: Livestock Operation PRIMARY type + catalogue (new type)

**Date:** 2026-06-03
**Project:** Atlas / OLOS (atlas.ogden.ag)
**Branch:** feat/atlas-permaculture
**Status:** Accepted
**Related:** 2026-05-29 per-type objective model; 2026-06-02 objective->formula binding (the 6 livestock formula ids); 2026-06-02 food-forest adoption (5-edit catalogue pattern); OLOS Project-Type + Secondary-Layer Spec v1.2

## Context

The operator asked (as a permaculture/biodynamics/SaaS expert) to author OLOS
project-type catalogues for 19 requested project types, one at a time, gap-first.
Gap analysis: 19 requested -> 13 encoded; 10 cleanly covered, 4 partial/combined,
**5 missing** (Livestock Operation, Watershed & Wetland Restoration, Sustainable
Forestry/Woodlot, Community Garden/Urban Ag, Eco-Resort/Glamping).

Livestock Operation was chosen as the first type and built fully as the repeatable
template. Two decisions framed it:

1. **New primary type, not a reuse of silvopasture.** A standalone grazing /
   animal-husbandry operation (herd-led: breeding, health, nutrition, sale of
   animals and animal products) is genuinely distinct from `silvopasture`
   (integrated trees + forage + livestock). The draft leads with the animal
   enterprise and explicitly excludes tree integration.
2. **The compute backbone already exists.** The schema already ships **six**
   livestock/grazing formula ids (`forage-carrying-capacity`,
   `carrying-capacity-seasonal`, `paddock-stocking-density`, `stock-water-demand`,
   `paddock-system-capacity`, `enterprise-break-even`) with a live app-side
   `formulaCatalog.ts` (2026-06-02 objective->formula binding), but no dedicated
   type bound them. Livestock Operation is their natural home.

Sourcing followed the operator's hybrid ruling: I drafted the catalogue as a
reviewable markdown artifact (`docs/catalogues/livestock-operation-draft.md`),
the operator ratified it ("proceed" -> Option A, animal-enterprise-led, 23
objectives), then I encoded the ratified version to TypeScript.

## Decision

Add `livestock_operation` as a **primary-only** type
(`canBePrimary: true, canBeSecondary: false`, ordinal 13) and encode a 23-objective
primary catalogue spanning the 7 Plan strata, ref prefix `LVS`:

- **S1 Project Foundation** - enterprise vision & species mix; production goals;
  welfare ethic (ihsan scopeNote).
- **S2 Land Reading** - forage base / pasture inventory; stock-water sources;
  existing fencing/shelter infrastructure.
- **S3 Systems Reading** - carrying capacity (`ckF` forage-carrying-capacity +
  carrying-capacity-seasonal, both `satisfiesWhenComputed`); animal-health /
  parasite baseline; predator & risk reading.
- **S4 Foundation Decisions** - species/breed selection; stocking rate
  (`ckF` paddock-stocking-density); grazing system (continuous / rotational /
  mob); stock-water strategy (`ckF` stock-water-demand).
- **S5 System Design** - paddock/cell layout (`ckF` paddock-system-capacity +
  paddock-stocking-density); fencing & water reticulation; handling & shelter;
  winter/dry-season feed budget (`ckF` carrying-capacity-seasonal).
- **S6 Integration Design** - herd-health & welfare protocol; manure/nutrient
  cycling; biosecurity.
- **S7 Phasing & Resourcing** - herd build-up phasing (hard gate in
  completionGate + scopeNotes); enterprise budget & break-even
  (`ckF` enterprise-break-even); marketing & sales channels (Amanah-flagged).

All six formula ids are bound across the catalogue (asserted by a Set-equality
test). Each objective carries 5-15 checklist items, a full mutually-exclusive
decision-group partition, non-empty completionGate + actHandoff,
`source:'primary', sourceTypeId:'livestock_operation'`, globally-unique ids/refs.

### Taxonomy + wiring (the 5-edit catalogue pattern, plus the matrix)

- `schemas/plan/projectTypeTaxonomy.schema.ts` - `'livestock_operation'` appended
  to `PROJECT_TYPE_IDS` (13 -> 14 ids).
- `schemas/project.schema.ts` - added to the `ProjectType` superset enum before
  the `moontrance` sentinel (keeps the sync test green).
- `constants/plan/projectTypes.ts` - `ProjectTypeDef` row (ordinal 13).
- `constants/plan/catalogues/livestockOperation.ts` - NEW,
  `LIVESTOCK_PRIMARY_OBJECTIVES`.
- `constants/plan/catalogues/index.ts` - import + re-export, `getPrimaryCatalogue`
  branch, `ALL_CATALOGUE_OBJECTIVES` union, header comment.
- `constants/plan/relationshipMatrix.ts` - `livestock_operation` added to
  `PRIMARY_TYPE_IDS` (the compile-strict `Record<PrimaryTypeId>`), so a
  `livestock_operation:` cell was added to **each of the 8 secondary rows**
  (market_garden 'X', orchard 'A', silvopasture 'M', agritourism 'A',
  education 'A', wellness 'X', nursery 'A', residential 'A'); plus 2 new
  `DESIGN_TENSIONS` (livestock x wellness @ s4, livestock x market_garden @ s5).
- `__tests__/catalogues.test.ts` - `LVS` added to `OBJECTIVE_REF`,
  `LIVESTOCK_PRIMARY_OBJECTIVES` in `ALL_AUTHORED`, source/layer-discipline block,
  and a resolution describe block (42 objectives = 19 universal + 23 primary,
  unique ids/refs, all 6 formula ids bound, Amanah flag present).

## Amanah Gate

Ordinary animal husbandry and the halal sale of animals / animal products is a
permitted livelihood. The marketing objective (`lvs-s7-marketing`) surfaces
meat-share / herd-share subscription channels **verbatim** and flags them in
`scopeNotes` as requiring Scholar Council review for *bay` ma laysa `indak*
(sale of what one does not yet possess) - never silently omitted or reworded
([[feedback-csa-in-catalogues]], carrying [[fiqh-csra-erased-2026-05-04]] forward).
No CSRA / salam advance-purchase framing is introduced. The break-even objective
scopes an ordinary break-even with no riba/gharar. Clean.

## Consequences

- `livestock_operation` is the 14th taxonomy id; the wizard Step-2 grid (reads
  `PROJECT_TYPES` dynamically) picks it up with no UI change. Now **12 of 13**
  selectable primaries carry an encoded layer (only Nursery-as-primary stays
  universal-only).
- `resolveProjectObjectives({ primaryTypeId: 'livestock_operation' })` returns
  **42** objectives (19 universal + 23 primary), a valid partition.
- The 6 livestock/grazing formula ids now have a dedicated home type and bind
  live through `formulaCatalog.ts` in the Plan objective detail panel.
- `tsc --noEmit` on `@ogden/shared` EXIT 0; `catalogues.test.ts` 88/88
  (bounded `pool:'forks'`).

## Deferred

- The other 18 requested project types (iterated one at a time after this
  template): the 4 remaining missing types (Watershed/Wetland Restoration,
  Sustainable Forestry/Woodlot, Community Garden/Urban Ag, Eco-Resort/Glamping)
  and splitting the combined types.
- `livestock_operation` as a *secondary* layer (primary-only for now).
- Any post-acquisition yield-share / membership-benefit framing (out of scope;
  would require fresh Scholar Council design).
