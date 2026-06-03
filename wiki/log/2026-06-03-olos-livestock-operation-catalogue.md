# 2026-06-03 -- Livestock Operation: new PRIMARY type + 23-objective catalogue (project-type #1 of the 19-type expansion)

**Branch.** `feat/atlas-permaculture` (explicit-path commit `e47be590`, 8 files
+1689/-15; **not pushed**).

First type of the operator's 19-type catalogue expansion, built fully as the
repeatable template. Gap analysis (19 requested -> 13 encoded) surfaced 5 missing
types; **Livestock Operation** was chosen first.

## Decision shape

- **New primary-only type** `livestock_operation` (`canBePrimary:true,
  canBeSecondary:false`, ordinal 13), distinct from `silvopasture` (integrated
  trees+forage+livestock). The catalogue leads with the animal enterprise
  (breeding/health/nutrition/processing/marketing) and excludes tree integration.
- **Hybrid sourcing:** I drafted `docs/catalogues/livestock-operation-draft.md`,
  operator ratified ("proceed" -> Option A, animal-enterprise-led, 23 objectives),
  then I encoded to TS.
- **Binds the 6 livestock formula ids** shipped by the 2026-06-02 objective->formula
  work (`forage-carrying-capacity`, `carrying-capacity-seasonal`,
  `paddock-stocking-density`, `stock-water-demand`, `paddock-system-capacity`,
  `enterprise-break-even`) - which previously had no dedicated host type.

## Files (8)

- NEW `packages/shared/src/constants/plan/catalogues/livestockOperation.ts` -
  `LIVESTOCK_PRIMARY_OBJECTIVES`, 23 objectives, ref prefix `LVS`, S1-S7.
- `schemas/plan/projectTypeTaxonomy.schema.ts` - `'livestock_operation'` appended
  to `PROJECT_TYPE_IDS` (13->14).
- `schemas/project.schema.ts` - added to the `ProjectType` superset enum before
  the `moontrance` sentinel.
- `constants/plan/projectTypes.ts` - `ProjectTypeDef` row.
- `constants/plan/catalogues/index.ts` - 5-edit catalogue pattern (import,
  re-export, `getPrimaryCatalogue` branch, `ALL_CATALOGUE_OBJECTIVES` union,
  header).
- `constants/plan/relationshipMatrix.ts` - `livestock_operation` in
  `PRIMARY_TYPE_IDS` (compile-strict `Record<PrimaryTypeId>`) -> a cell added to
  **all 8 secondary rows** (mg 'X', orch 'A', silvo 'M', agri 'A', edu 'A',
  wellness 'X', nursery 'A', residential 'A') + 2 new `DESIGN_TENSIONS`
  (livestock x wellness @ s4, livestock x market_garden @ s5).
- `__tests__/catalogues.test.ts` - `LVS` in `OBJECTIVE_REF`, added to
  `ALL_AUTHORED`, source/layer-discipline `it`, and a resolution describe block.

## Amanah

`lvs-s7-marketing` surfaces meat-share / herd-share subscription channels
**verbatim** in c3 and flags them in `scopeNotes` as needing Scholar Council
review for *bay` ma laysa `indak* - never omitted/reworded
([[feedback-csa-in-catalogues]], [[fiqh-csra-erased-2026-05-04]]). No CSRA/salam
framing. `lvs-s7-break-even` is an ordinary break-even, riba/gharar-clean.
`lvs-s1-welfare-ethic` carries an ihsan scopeNote. `lvs-s7-herd-buildup` keeps a
hard phasing gate (completionGate + scopeNotes).

## Verified

- `corepack pnpm exec tsc --noEmit` on `@ogden/shared` **EXIT 0** (pnpm is not on
  the PowerShell PATH this session; invoked via `corepack`).
- `catalogues.test.ts` **88/88** green, bounded `--pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]); asserts 42-objective resolution (19+23),
  unique item/obj ids + refs, all 6 formula ids bound (Set equality), Amanah flag.
- One authoring fix during verify: a test type-predicate `(id): id is string`
  was wrong (the element is `ObjectiveFormulaId | undefined`); changed to
  `id is NonNullable<typeof id>`.
- Matrix self-check: the nursery x livestock_operation cell is `'A'` (a prior
  summary mis-flagged it as `'X'`; the encoded value is `'A'`, matching intent).

## Commit hygiene

`git fetch` first; branch ahead 57 / behind 0 (no divergence). Working tree was
heavy with foreign WIP - the 8 slice files were staged **explicitly by name**;
staged set verified == exactly those 8 ([[feedback-commit-immediately-on-rebased-branches]],
[[project-branch-rebase]]). Not pushed (operator's standing "commit, not push").
ASCII-only.

## Next

Iterate the remaining 18 types one at a time. Still missing: Watershed/Wetland
Restoration, Sustainable Forestry/Woodlot, Community Garden/Urban Ag,
Eco-Resort/Glamping; plus splitting the combined types.

ADR [[decisions/2026-06-03-olos-livestock-operation-primary]]; entity
[[entities/shared-package]]; builds on [[decisions/2026-06-02-atlas-objective-formula-binding]]
+ [[decisions/2026-06-02-olos-food-forest-adoption]].
