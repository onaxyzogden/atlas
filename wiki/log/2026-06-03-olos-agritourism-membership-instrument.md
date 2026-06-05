# Log: Agritourism membership / season-pass instrument (extend AG-S4.8)

**Date:** 2026-06-03
**Project:** Atlas / OLOS
**Branch:** feat/atlas-permaculture
**Commit:** `15680301`
**ADR:** [[2026-06-03-olos-agritourism-membership-instrument]]

## What happened

Realised the season-pass / membership instrument that AG-S7.8's scopeNote explicitly
deferred. Operator chose (AskUserQuestion) to **extend the existing AG-S4.8 revenue-model
objective in place** (not a standalone objective) and to **draft markdown first, then
encode**. After two expert-lens (biodynamics / permaculture / SaaS) refinement rounds the
operator replied "ratified - apply the optional AG-S7.8 forward pointer."

## Sequence

1. **Phase 1 - draft.** Authored `docs/catalogues/agritourism-membership-instrument-draft.md`
   with verbatim c7-c11, the candidate scopeNotes, the fiqh rationale
   (membership-benefit-vs-advance-purchase), and Scholar-Council routing. Refined twice on
   operator request: (a) non-stay substance requirement, stay-stays-a-separate-reservation,
   AG-S3.7 carrying-capacity bound; (b) produce-share tether to MGD-S1.4 / MGD-S1.6, AG-S3.7
   scope-trigger, cancellable / pro-rata refundability as access-not-purchase evidence.
2. **Phase 2 - encode.** Extended `ag-s4-revenue-model` (AG-S4.8) in
   `packages/shared/src/constants/plan/catalogues/agritourism.ts`: appended checklist items
   c7-c11, added decision groups dg3 / dg4 (partition stays complete), added the Amanah
   `scopeNotes`, amended `completionGate`, applied the AG-S7.8 forward pointer
   ("now scoped at AG-S4.8"), added a header note. Added a new Amanah `it` to
   `catalogues.test.ts` (scopeNotes truthy + "Scholar Council" + "membership benefit"; c8
   label "membership benefit"). Objective count unchanged (34 / total 53).
3. **Phase 3 - verify + commit.** `tsc --noEmit` EXIT 0; bounded `catalogues.test.ts`
   100/100 (`pool:forks`, `--testTimeout=20000`). `git fetch` - branch ahead 87, behind 0
   (no divergence). Staged the 3 files explicitly by name; committed `15680301` on
   `feat/atlas-permaculture`. Not pushed.

## Fiqh / Amanah

Surface (not omit), structure-as-membership-benefit (not advance prepayment of undelivered
nights - *bayʿ mā laysa ʿindak* / gharar), flag (Amanah scopeNote), route to Scholar
Council. No riba. The objective never itself rules a structure halal. Per
`feedback_csa_in_catalogues` and the retired MTC CSRA model (2026-05-04).

## Deferred

- Remaining 3 missing roadmap types (Watershed / Wetland, Forestry / Woodlot, Community /
  Urban Ag).
- `entities/shared-package.md` fold (foreign-WIP precedent).
