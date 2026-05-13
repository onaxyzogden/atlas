# 2026-05-13 — Cancel discards provisional entity on V1 Observe draw tools

## Context

ADDENDUM 6 (introduced earlier in the Observe draw refactor) changed the
post-draw flow from *open-form-with-geometry → save-creates* to
*create-defaults-then-edit-existing*. The rationale was sound: a
provisional entity persists at draw-complete time so the polygon
survives even if the form-open bridge fails, and live on-map handles
(sector bearing drag, etc.) can mutate the record while the form is
open.

The side effect: when the steward hit **Cancel** on the slide-up
following a fresh draw, the slide-up's `close()` only nulled form
state — it did NOT delete the provisional stub. Every cancelled draw
left a default-labeled phantom in the namespace store ("Adopted
building", "Untitled sector", etc.). The hole spans 20 V1 Observe
draw tools — every one that wraps
`createWithDefaults(...) → open({ mode: 'edit', existingId })`.

The V2 Plan inline-form path was already fixed in a prior turn for
`AdoptBasemapBuildingTool` via a per-call `onCancel` wrap that calls
`store.delete(entity.id)`. That precedent informed this design.

## Decision

**Per-call payload flag + centralized dispatch table.** Add
`discardOnCancel?: boolean` to `AnnotationFormActive`. Set it `true`
in every post-draw tool. The slide-up's `onCancel` looks the flag up,
and when present, dispatches into a kind-keyed `FIELD_REMOVERS` table
that calls the right namespace store's remove fn. Edit-from-dashboard
and SelectionFloater paths leave the flag unset so their Cancel
remains a no-op (preserving the record they were editing).

The `Record<AnnotationKind, (id: string) => void>` shape of
`FIELD_REMOVERS` doubles as a TypeScript exhaustiveness check: adding
a new annotation kind without a matching remover is a build error.

## Considered alternatives

1. **Wrap onCancel at each of the 20 tool call sites.** Rejected —
   20× boilerplate, easy to drift over time, no central guarantee
   that every post-draw flow gets the discard semantics.
2. **Move the Cancel-discard into `createWithDefaults` itself via an
   AbortController-style return handle.** Rejected — couples
   transient form lifecycle to a store-write helper. The slide-up is
   the natural place to know "Cancel was hit," not the create site.
3. **Revert ADDENDUM 6 (open form first, save creates).** Rejected —
   would re-introduce the bridge-failure-loses-polygon risk and break
   on-map drag handles (sector bearing).

## Consequences

- Every post-draw cancel now produces zero net state change.
- `FIELD_REMOVERS` is the canonical contract — future BE/annotation
  kinds must add to it (the typed Record forces this).
- `discardOnCancel` defaults to false: edit-from-dashboard and
  SelectionFloater Cancels are unchanged.
- `frostPocket` re-uses `externalForces.removeHazard` (its records
  live in the hazards collection, shared with `hazardZone`).
- `drainageLine` remover lives in `topographyStore.removeDrainageLine`
  (not `waterSystemsStore` — the drainage lines collection is on
  topography per the schema's save dispatch).
- `soilSample` uses `deleteSample` (not the standard `remove*`
  naming) — captured in the table.
- Out of scope: purging historical phantoms already in user state.
  Needs a one-shot data-migration utility filed separately.
- Out of scope: route-leave / tool-change as a Cancel signal — current
  contract is the Cancel button only.

## Verification

- 10/10 vitest cases pass for `FIELD_REMOVERS` dispatch across
  representative kinds (BE, swot, externalForces, topography,
  waterSystems, ecology, soilSample, humanContext).
- Full project typecheck clean
  (`NODE_OPTIONS=--max-old-space-size=8192 tsc --noEmit`).
- Dev server renders clean with new wiring; no console errors.
- The equivalent V2 inline-form Cancel-discard path (same shape) was
  verified end-to-end via Chrome MCP in the prior turn for
  AdoptBasemapBuildingTool — this turn extends the same pattern to
  the V1 slide-up surface centrally.

## Files

- `apps/web/src/store/annotationFormStore.ts` — added
  `discardOnCancel?: boolean` to `AnnotationFormActive`.
- `apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts`
  — added `FIELD_REMOVERS: Readonly<Record<AnnotationKind, (id) => void>>`.
- `apps/web/src/v3/observe/components/draw/AnnotationFormSlideUp.tsx`
  — patched onCancel to invoke remover when flag set.
- `apps/web/src/v3/observe/components/draw/*Tool.tsx` (×20) — pass
  `discardOnCancel: true` in the post-draw `open({...})` call.
- `apps/web/src/v3/observe/components/draw/__tests__/fieldRemovers.test.ts`
  — new vitest covering the dispatch contract.

## Addendum (2026-05-13) — sector scope note

The 21st annotation kind, **`sector`**, was audited as a follow-up and
is intentionally **out of scope** for this fix.

Sector creation lives in `SunWindWedgeTool.tsx` (lines 107–117) and is
a save-on-click popover, not a `createWithDefaults`-then-edit flow:
form values stay in local React state until the steward presses Save,
and `addSector` is invoked only then. Closing the popover or switching
tools discards local state without ever writing to the namespace
store, so no provisional stub exists to discard. The sector schema's
`save` is also explicitly edit-only
(`annotationFieldSchemas.ts` — `if (!ctx.existingId) return;`),
making the slide-up create path structurally unreachable for sectors.

ADDENDUM 6's pre-allocate rationale (drawn polygon survives bridge
failures; live on-map drag handles mutate the record mid-edit) does
not apply here — sectors have no drawn geometry to lose, and the
bearing-seed click is a one-shot local-state update.

The edit-from-floater path is already covered: `FIELD_REMOVERS.sector`
is wired to `useExternalForcesStore.getState().removeSector(id)`, and
edit-mode Cancel correctly stays a no-op (no `discardOnCancel: true`
passed) — same contract as the other 20 kinds' edit paths.

If sectors ever migrate to a live on-map drag-handle creation pattern
(e.g. rotate bearing by dragging the wedge edge), creation would need
to move to `createWithDefaults` + the shared slide-up. At that point,
pass `discardOnCancel: true` on the post-create `open({...})` call —
the existing `FIELD_REMOVERS.sector` entry will service it without
further changes.
