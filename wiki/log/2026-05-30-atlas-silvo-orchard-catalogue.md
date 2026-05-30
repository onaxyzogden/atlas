# 2026-05-30 -- Silvopasture + Orchard objective catalogues encoded (primary layers)

**Branch:** `feat/atlas-permaculture`
**Commits:** `f615df7a` (data, parent `55f4c1c6`) + `f712348c` (registry wiring + tests,
parent `f615df7a`) -- two explicit-path slice commits.
**Files:** `packages/shared/src/constants/plan/catalogues/silvopasture.ts` (new),
`.../catalogues/orchard.ts` (new), `.../catalogues/index.ts` (wired),
`.../__tests__/catalogues.test.ts` (conformance).

## What shipped

The **Silvopasture / Livestock Land Management** and **Orchard / Food Forest /
Perennial Agroforestry** catalogues, the first two **ecology-defined** (non-economic)
types fanned out after the Wellness catalogue
([[log/2026-05-30-atlas-wellness-catalogue]]), encoded as pure data through the
same registry seam proven by Ecovillage + Agritourism + Wellness.

- **Silvopasture: 26 primary-layer objectives** (`SILV-S1.4 .. SILV-S7.7`) across
  the 7 strata, transcribed verbatim from the operator-provided Silvopasture
  catalogue doc (`OLOS_Silvopasture_Objective_Catalogue_v1.0.docx`). 45 total when
  layered on the Universal-19. Hard gate preserved on `silv-s7-livestock-establishment`
  (SILV-S7.4) via `scopeNotes`: no livestock established before fencing / stock water /
  handling pass independent go/no-go.
- **Orchard: 25 primary-layer objectives** (`ORCH-S1.4 .. ORCH-S7.6`), transcribed
  verbatim from `OLOS_Orchard_Objective_Catalogue_v1.0.docx`. 44 total with the
  Universal-19. Hard gate on `orch-s7-planting-establishment` (ORCH-S7.4) via
  `scopeNotes`: tree stock is non-refundable, so planting infrastructure precedes
  arrival.
- Both files `const PRIMARY = '<typeid>' as const;` with every objective stamped
  `source:'primary'`, `sourceTypeId:PRIMARY`. Taxonomy ids confirmed live:
  `silvopasture` and `orchard_food_forest`.
- Registry wiring: two `getPrimaryCatalogue` arms, re-exports, and the
  `ALL_CATALOGUE_OBJECTIVES` union spreads. No `getSecondaryCatalogue` change this
  slice (secondary layers deferred -- see below).

## Deferred (pending operator source files)

Both catalogue docs carry `->` (arrow) checklist additions that augment **universal**
objectives -- Silvo augments universal 4.1 (Access) + 4.3 (Soil improvement);
Orchard augments universal 4.1 (Access) with a harvest-access addition. There is no
existing seam for a **primary** (vs a secondary) to patch a universal objective:
`resolveProjectObjectives` collects patches only from secondary catalogues, and
`PatchRecord.secondaryTypeId` is required. The operator stated a resolving document
is forthcoming, so the universal-augmentation blocks and both **secondary layers**
(Silvopasture-secondary, Orchard-secondary `{additive[], patches[]}` bundles) are
**deferred verbatim** until those files are attached -- no invent/derive override is
in play here (the 2026-05-30 "derive + author" ruling was scoped to the Wellness
secondary ONLY). The header comment of each new file documents the deferred blocks.

## Covenant

Both types are non-economic land-stewardship catalogues with **no riba/gharar
surface** -- the only money objective in each is an ordinary enterprise financial
viability / break-even budgeting plan (`CostRange` data, no advance-sale framing).
The CSRA prohibition ([[fiqh-csra-erased-2026-05-04]]) is neither implicated nor
reintroduced. No economic-tier Amanah Gate override was needed.

## Verification

Shared typecheck (8GB, `tsc --noEmit`) EXIT 0; vitest 744 tests pass
(catalogues.test.ts grew 32 -> 40 tests: asserts `SILVOPASTURE_PRIMARY_OBJECTIVES.length
=== 26` / 45 total, `ORCHARD_PRIMARY_OBJECTIVES.length === 25` / 44 total, `SILV` +
`ORCH` added to the `OBJECTIVE_REF` regex `/^(U|RF|RES|EV|AG|WELL|SILV|ORCH)-S[1-7]\.\d+$/`,
per-catalogue id-uniqueness + ref-uniqueness, source/layer discipline, gate+handoff
present). A mid-slice bug where `f615df7a` committed the data files **orphaned**
(unwired) was caught via git grep and closed by the `f712348c` wiring commit.
Committed by explicit path (`git reset` + `git diff --cached --name-only` confirmed
the staged set) per [[feedback-commit-immediately-on-rebased-branches]]; heavy
foreign WIP from parallel sessions left untouched per [[feedback-no-deletion]].
ASCII-only copy.

## State after

**2 ecology-defined catalogues done** (primary layers). Encoded primaries:
Regenerative-Farm, Ecovillage, Agritourism, Wellness, Silvopasture, Orchard.
Encoded secondaries: Residential, Wellness. Still unencoded (selectable,
universal-only): Conservation, Education, MarketGarden, Nursery, OffGrid, plus the
Homestead primary stand-in. Pending follow-on: Silvo/Orchard universal-augmentation
patches + secondary layers, once the operator attaches the resolving document and
the per-type secondary catalogue files.
