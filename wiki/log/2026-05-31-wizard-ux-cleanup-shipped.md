# Wizard UX cleanup (5 changes) - shipped

**Date:** 2026-05-31
**Branch:** feat/atlas-permaculture
**Commit:** 00032acf (pushed clean, 0/0 divergence vs origin)

## What shipped

Five project-creation wizard changes:

1. **Address search relocated** - moved "Find your property by address" from the
   on-map overlay into the Step 1 left form column. Because DiagnoseMap is
   foreign WIP (never edited) and exposes its map only via its render-prop, a
   tiny non-persisted `wizardMapStore` plus an effect-only `WizardMapRegistrar`
   (mounted inside the render-prop) publish the live MapLibre handle out to the
   sibling form column, where `WizardAddressSearch` reads it back.
2. **Step 1 project-type chips removed** - the legacy "Project type (optional)"
   fieldset is superseded by the required Step 2 taxonomy grid. Draft field and
   API wiring left intact (harmless undefined).
3. **Step 2 "Your vision" section removed** - plus dead wiring (profile memo,
   flushRef, handleProfileChange, VisionProfile import, WizardVisionFormFields
   mount). Confirmed no impact on loaded objectives/tasks:
   `resolveProjectObjectives` reads only primaryTypeId + secondaryTypeIds, never
   visionProfile. Legacy vision components kept for Plan + Stage Zero (no
   deletion per repo rule).
4. **Per-step page-fit** - each wizard step is now a single non-scrolling page
   with only the content column scrolling. Added `min-height:0` to Step 2/3 form
   columns, mobile scroll handoff to the stacked layout, and `flex:0 0 auto` on
   the completion panel so the map takes remaining height.
5. **Redo crash fixed** - "Cannot read properties of undefined (reading
   getLayer)". Clearing the boundary tears down + recreates DiagnoseMap's map;
   the shared `useMapboxDrawTool` setup then briefly held a removed map. Guarded
   both the setup (addControl through paint overrides) and the teardown in
   try/catch so a torn-down map bails cleanly. Observe path unchanged (always
   passes a live map).

## Files

New: `wizardMapStore.ts`, `WizardMapRegistrar.tsx`.
Modified: `WizardStep1Site.tsx`, `WizardSiteMap.tsx`, `WizardStep2Vision.tsx`,
`WizardAddressSearch.module.css`, `WizardStep2Vision.module.css`,
`WizardStep3Team.module.css`, `WizardCompletionScreen.module.css`,
`useMapboxDrawTool.ts` (shared with Observe - additive guards only).

## Verification

- `tsc --noEmit` on @ogden/web: exit 0 (clean). Note: the typecheck OOMs at the
  default ~4GB Node heap on this tree; ran green with
  `NODE_OPTIONS=--max-old-space-size=8192`. Tooling memory ceiling, not a code
  error - worth a tsconfig/CI heap bump follow-up.
- No vitest files exist under project-wizard or observe/draw, so no unit gate.
- Staged only the 10 task files by explicit path (foreign-WIP guard); working
  tree had extensive out-of-band foreign-WIP edits that were deliberately not
  staged.

## Deferred / follow-ups

- Preview screenshots NOT captured (dev server / preview tool unreliable this
  session). Visual confirmation of all five changes still pending a manual or
  next-session preview pass.
- Consider raising the Node heap for typecheck in CI/tsconfig so the default-heap
  OOM doesn't recur.
