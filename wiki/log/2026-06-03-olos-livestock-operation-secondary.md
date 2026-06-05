# 2026-06-03 -- Livestock Operation: SECONDARY layer (7 additive + 3 patches)

**Branch.** `feat/atlas-permaculture` (explicit-path commit `485fd924`, 6 files
+833/-14; **not pushed**).

The deferred follow-up to the 2026-06-03 `livestock_operation` PRIMARY type: making the
same type available as a **secondary layer** that folds a standalone animal enterprise
onto a host primary (regen farm, orchard/food forest, homestead, ecovillage).

## Decision shape

- **Modifying** secondary (like silvopasture): **7 additive objectives** (`LVS-S*.20+`
  band, collision-free vs the primary's lower refs) **+ 3 universal patches**
  (water/soil/access), reusing the forage/stocking/water/paddock formula bindings.
- **Hybrid sourcing:** drafted `docs/catalogues/livestock-operation-secondary-draft.md`,
  iterated across 3 expert-review revisions (5+3 -> 6+3 -> 7+3; Rev 3 restored the core
  stock-infrastructure + establishment hard-gate objective dropped in Rev 2), operator
  ratified and delegated the final two calls, then encoded to TS.
- **Distinct from the silvopasture secondary:** herd-led standalone enterprise, no
  tree-integration framing; foregrounds **biosecurity at the host interface** and
  **closing the manure/nutrient loop**. Namespaced ids (`lvs-sec-*`, `...-lvs-N`,
  `*-dglvs*`) co-resolve with the silvopasture secondary on a third host without collision.

## The 7 additive objectives

`LVS-S1.20` enterprise intent & host-integration rationale (s1); `LVS-S3.20`
carrying-capacity fit on host forage (s3, ckF carrying-capacity-seasonal +
forage-carrying-capacity); `LVS-S4.20` species/stocking/grazing-system (s4, ckF
paddock-stocking-density advisory + dry-season feed budget); `LVS-S4.21` core stock
infrastructure & **establishment hard gate** (s4, fencing/handling/shelter/water; "no
livestock arrive before water, fencing, handling each pass an independent go/no-go"; ihsan
scopeNote); `LVS-S5.20` animal-impact integration & stacking timing (s5, the
permaculture differentiator; ckF paddock-system-capacity optional); `LVS-S6.20` animal
health, welfare & host-interface biosecurity (s6, predator/guardian, quarantine,
regulatory compliance, ihsan scopeNote, humane+halal handling); `LVS-S6.21` manure,
nutrient cycling & closed-loop fertility (s6, livestock-to-land balance, BD-prep
substrate illustrative, overgrazing/loading guard).

## The 3 universal patches

A -> `s4-water-strategy` (`LVS>U-S4.2`, ckF stock-water-demand + water quality + riparian
exclusion); B -> `s5-soil-improvement` (`LVS>U-S5.3`, grazing-impact monitoring +
graze/rest + manure-loading limits); C -> `s5-access` (`LVS>U-S5.1`, stock laneways +
gated crossings).

## Files (6)

- `catalogues/livestockOperation.ts` - imports add `PatchRecord` type + `patch` helper +
  `const SECONDARY`; appended `LIVESTOCK_SECONDARY_OBJECTIVES` (7) +
  `LIVESTOCK_SECONDARY_PATCHES` (3) after the primary array, with a SECONDARY section
  header documenting the silvopasture+livestock double-select interaction.
- `projectTypes.ts` - `canBeSecondary: true` (picker comment 8 -> 9).
- `relationshipMatrix.ts` - `SecondaryTypeId` union + `SECONDARY_TYPE_IDS` +
  compile-strict 13-cell `livestock_operation` ROW + `tension-13` (x conservation @ s4);
  count comments 8 -> 9, 12 -> 13.
- `catalogues/index.ts` - import/re-export + `getSecondaryCatalogue` branch +
  `ALL_CATALOGUE_OBJECTIVES` + header.
- `__tests__/catalogues.test.ts` - `PATCH_REF` allows `LVS`; `ALL_AUTHORED`;
  source-discipline `it`; a resolution describe block (+10 tests).
- NEW `docs/catalogues/livestock-operation-secondary-draft.md` - the ratified Rev 3 spec.

## Amanah

Production-integration only - host owns marketing/economics, so **no sales-channel
objective** and **no advance-sale/CSA surface introduced at all** (no
*bay` ma laysa `indak* to flag). `LVS-S6.20` + `LVS-S4.21` carry welfare/ihsan
scopeNotes; humane + halal handling intent explicit. No riba/gharar/CSRA
([[feedback-csa-in-catalogues]], [[fiqh-csra-erased-2026-05-04]]). Clean.

## Verified

- `corepack pnpm exec tsc --noEmit` `@ogden/shared` **EXIT 0** (pnpm not on PowerShell
  PATH -> via `corepack`).
- `catalogues.test.ts` **98/98** (was 88; +10) bounded `--pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]); asserts +7 additive resolution, all 3 patches
  applied/none skipped, gate-amendment concatenation, ref non-collision, and
  **silvopasture+livestock co-resolution** stays id-unique.

## Commit hygiene

`git fetch` first; ahead 71 / behind 0 (no divergence). Working tree heavy with foreign
WIP - the 6 slice files staged **explicitly by name**, staged set verified == exactly
those 6 ([[feedback-commit-immediately-on-rebased-branches]], [[project-branch-rebase]]).
Not pushed (operator's standing "commit, not push"). LF->CRLF warnings benign. ASCII-only.

## Next

Iterate the remaining 18 types one at a time (4 still-missing: Watershed/Wetland
Restoration, Sustainable Forestry/Woodlot, Community Garden/Urban Ag,
Eco-Resort/Glamping; plus splitting combined types).

ADR [[decisions/2026-06-03-olos-livestock-operation-secondary]]; builds on
[[decisions/2026-06-03-olos-livestock-operation-primary]]; entity
[[entities/shared-package]] (fold deferred while tree carries foreign WIP).
