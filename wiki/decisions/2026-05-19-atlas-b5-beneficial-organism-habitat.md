# ADR — Atlas B5: Beneficial-Organism Habitat Audit

**Date:** 2026-05-19
**Branch:** `feat/atlas-permaculture`
**Sub-project:** B5 (last B-series slice per the Bd decomposition ADR)
**Status:** Accepted — shipped in commits `36b22ae2`, `bf9be395`, `d9f6f49d`
**Related:** [[2026-05-18-atlas-bd-subproject-decomposition]],
[[2026-05-18-atlas-b4-guild-livestock-silvopasture-integration]],
[[2026-04-28-atlas-permaculture-alignment-recs]]

---

## Context

B1 (plant-system design integrity + Year0→Year30 succession),
B2/B2.1 (soil food-web + compost hardening), B3/B3.1 (rotational-
grazing sequencer + hardening), and B4 (guild ↔ livestock ↔
silvopasture integration) had landed on `feat/atlas-permaculture`.
B5 is the last B-series slice per the Bd decomposition ADR
(line 65 of that file):

> Guild/hedge/pond/box inventory feeding habitat & biodiversity
> outcomes; cover-crop & living-roots planning | habitat-allocation
> (A2) + biodiversity-monitor (A3) registries; B1 | habitat-
> allocation (cross)

B5 closes the loop back to the A-series: A2
(`HabitatAllocationCard`) tells the steward *how much area* is set
aside; A3 (`BiodiversityMonitorCard`) measures *outcomes* over
Y0/5/9. B5 sits between them — a **design-time quality audit** of
what's actually inside that allocated area (which guilds carry
pollinator/insectary species, which structural elements act as
habitat) and whether the composite signal projects toward the
biodiversity-outcomes targets.

## Decision

Ship B5 as **three additive parts**, mirroring the B2.1/B3.1/B4
template (pure deterministic math + colocated vitest + render-only
card cross-registered into the relevant Plan modules + one
goal-tree criterion):

1. **Static cited beneficial-function catalog**
   (`apps/web/src/features/biodiversity/beneficialFunctionCatalog.ts`):
   maps the four beneficial-relevant `PLANT_CATALOG.ecologicalFunction`
   tags (`pollinator`, `insectary`, `wildlife_food`, `n_fixer`) and
   the three habitat-relevant `DesignKind` values (`hedgerow`, `pond`,
   `shrub`) onto seven `BeneficialCategory` buckets. Every entry
   cites Xerces Society, Cornell Lab of Ornithology, UC IPM
   (UC ANR 3386), USDA NRCS (TN-PM-15), or Audubon.

2. **Pure habitat-inventory math**
   (`apps/web/src/features/biodiversity/beneficialHabitatMath.ts`):
   `computeBeneficialHabitatReport` counts distinct beneficial
   species across the project's guilds, tallies hedgerow length
   (Turf line-length), pond area (Turf polygon area), and shrub
   point count, then composes a 0..100 `coveragePct`:

   - plant-richness band: `min(40, distinctBeneficialSpecies * 4)`
   - structural band: `min(40, (hedgerowM/100 + pondM²/500 + shrubCount) * 4)`
   - functional-diversity bonus: `min(20, distinctCategories * 5)`

   Sum clamped 0..100. `computeBeneficialHabitatPct` is the
   thin goal-tree wrapper.

3. **Render-only `BeneficialHabitatCard`** + cross-registration
   into **both** `MODULE_CARDS['habitat-allocation']` and
   `MODULE_CARDS['plant-systems']` (one card, one sectionId,
   two surfacing tabs — B4 precedent). New criterion
   `beneficial-organism-habitat-pct` (target 60 by Y3) sits as a
   sibling of `regen-habitat-pct` under the existing
   `'biodiversity-habitat'` sub-goal, wired through
   `CriteriaForecastTab`.

## Posture — additive, non-covenant

Strictly additive A-series posture (B2.1/B3.1/B4 precedent):

- No DB migration, no schema change, no persist version bump.
- No new `PlanModule` union member — therefore the
  `never`-guarded 6-touchpoint contract is **not** triggered.
- No `Record<PlanModule, _>` change, no `syncManifest` entry,
  no spine mutation.
- Cross-registration is two `MODULE_CARDS` array pushes.
- "Coverage %" is plants × structures × functional diversity —
  strictly ecological, never a financial or yield-as-return
  notion. Covenant lock
  `/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i`
  holds in both new test files (strip `/* … */` doc-comments
  before scanning so the negative declaration in the module
  docstring stays legal).

## Scope decisions

- **Cover-crop & living-roots planning deferred to B5.1.** The
  Bd ADR text names this dimension, but `CropArea`
  (`apps/web/src/store/cropStore.ts:14-59`) carries no
  seasonal/rotation/cover-crop fields, so it cannot ship under
  the strict additive posture without a persist-versioned schema
  change. B5.1 will revisit once the schema grows.
- **Beetle-bank / insectary-strip / bird-box / bat-box
  `DesignElement` kinds omitted, not stubbed.** They do not exist
  in `elementCatalog.ts` yet; the catalog grows organically
  (B4 precedent). They surface naturally once added.
- **A-series cards untouched.** `HabitatAllocationCard`
  (A2) and `BiodiversityMonitorCard` (A3) are not modified —
  B5 ships as a sibling tab in `habitat-allocation`, not an
  edit to either A-card.

## Files

**New (6):**
- `apps/web/src/features/biodiversity/beneficialFunctionCatalog.ts`
- `apps/web/src/features/biodiversity/__tests__/beneficialFunctionCatalog.test.ts`
- `apps/web/src/features/biodiversity/beneficialHabitatMath.ts`
- `apps/web/src/features/biodiversity/__tests__/beneficialHabitatMath.test.ts`
- `apps/web/src/features/biodiversity/BeneficialHabitatCard.tsx`
- `apps/web/src/features/biodiversity/BeneficialHabitatCard.module.css`

**Edited (4, append-only hunks):**
- `apps/web/src/v3/plan/types.ts` — two `MODULE_CARDS` pushes
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — lazy import +
  switch arm
- `apps/web/src/v3/plan/data/goalTreeTemplates.ts` — one
  criterion entry
- `apps/web/src/v3/plan/cards/goal-compass/CriteriaForecastTab.tsx`
  — one import + one `currentValues` entry

## Verification

- **Targeted vitest:** `beneficialFunctionCatalog` (15) +
  `beneficialHabitatMath` (15) — 30/30 green.
- **Full web vitest:** 127 files / 1358 tests green
  (no regression vs the post-B4 baseline).
- **Typecheck:** `tsc --noEmit` clean for the new + edited
  B5 files (pre-existing OOB D0 errors unrelated to B5).
- **Vite build:** exit 0.
- **Covenant grep** over `apps/web/src/features/biodiversity/`
  finds only the negative declarations in the doc comments,
  the test descriptions, and the lock-test regex itself.
- **Per-commit additive isolation audit** (`git diff-tree`):
  - `36b22ae2` touches only the Part 1 catalog + test.
  - `bf9be395` touches only the Part 2 math + test.
  - `d9f6f49d` touches only the 6 Part 3 files.
- **Live preview:** not exercised — the known MapLibre/WebGL
  hang may recur; per the screenshot-honesty rule, no
  screenshot claimed. Pure-math tests + tsc + criterion forecast
  wiring are the authoritative proof (B-series precedent).

## Consequences

- **B-series complete.** The forward queue is B5.1 (cover-crop &
  living-roots planning, gated on `CropArea` schema growth) and
  any C/D-series work outside the permaculture branch.
- The `'biodiversity-habitat'` sub-goal now carries two
  criteria — `regen-habitat-pct` (set-aside area, A2) and
  `beneficial-organism-habitat-pct` (composite quality signal,
  B5). They are independent dimensions and meant to be read
  alongside each other.
- The `BeneficialHabitatCard` is the **third** Plan card
  cross-registered into two modules under one sectionId
  (after the B4 `SilvopastureIntegrationCard`); the pattern
  is now stable enough to formalise as house style for
  cross-cutting audits.

## Notes (session-close)

`wiki/index.md` and `wiki/log.md` were dirty from out-of-band
work at session close; per the standing rule (B4 precedent),
those files are **not** touched in this commit. This ADR ships
standalone. A follow-up housekeeping pass should add an index
entry and a log line once the wiki tree is clean.
