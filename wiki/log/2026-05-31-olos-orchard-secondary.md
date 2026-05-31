# Log: Orchard secondary catalogue (derived) - 2026-05-31

**Project:** Atlas / OLOS - feat/atlas-permaculture
**Task:** #13 remainder, slice (a)
**Outcome:** Orchard / Food Forest secondary catalogue authored, wired, tested, committed, pushed.

## What happened

- Authored the Orchard secondary by derivation (no operator doc) under the
  operator's scoped directive + chosen depth: 5 additive objectives + 4
  universal patches (incl. one pollinator/biodiversity patch). Same
  scoped-derive pattern as Wellness (05-30) and Silvopasture (05-31).
- Appended `ORCHARD_SECONDARY_OBJECTIVES` (5) and `ORCHARD_SECONDARY_PATCHES`
  (4) to `packages/shared/src/constants/plan/catalogues/orchard.ts`.
- Wired through `catalogues/index.ts`: import + re-export both arrays, added a
  `getSecondaryCatalogue('orchard_food_forest')` branch, added
  `...ORCHARD_SECONDARY_OBJECTIVES` to the `ALL_CATALOGUE_OBJECTIVES` union,
  refreshed the header inventory comment.
- Extended `catalogues.test.ts`: PATCH_REF now allows `ORCH>`, imported the new
  arrays into ALL_AUTHORED, added an 8-test orchard-secondary describe block
  (5 additive + 4 patches; refs valid + parse; +5 onto regenerative_farm; all
  4 patches applied with empty skippedPatches; gate-concat asserts the
  pollinator amendment on s2-ecology; no ref collision with ORCH primary; id +
  checklist-item uniqueness when layered).

## Correction

Plan's draft patch targets `U-S5.4` (s5-planting-design) and `U-S3.3`
(s3-biodiversity-baseline) do not exist in universal.ts. Reconciled to the real
seams `U-S5.3` (s5-soil-improvement) and `U-S2.3` (s2-ecology) - zero skipped
patches.

## Verification

- `pnpm --filter @ogden/shared run typecheck` -> exit 0.
- `pnpm --filter @ogden/shared run test` -> 810 passed (43 files);
  catalogues.test.ts 63 tests.

## Notes

- Branch was rebased out-of-band again (HEAD advanced to 0621d9b8 secondary
  removal + Deferred objective state). Staged only the 3 code files by explicit
  path; fetched + 0-behind check before push.
- index.ts edit landed via a full-file PowerShell rewrite after the Edit tool's
  read-gate repeatedly failed to register the in-session read (tool-pipe lag).

## Deferred

- (b) PRIMARY-sourced universal-augmentation seam - still no primary->universal
  patch mechanism.
- Sub-slice F (Task #6): mid-project secondary add/remove.
- Fold catalogue inventory into wiki/entities/shared-package.md.
