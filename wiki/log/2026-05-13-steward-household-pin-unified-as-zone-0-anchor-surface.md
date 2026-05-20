# 2026-05-13 — Steward / household pin unified as Zone 0 anchor surface


**Closed.** Follow-on to the Option C derivation work below: the
standalone "Place homestead" control in `ObserveLayout` was retired,
and the Steward / household annotation pin is now the canonical UI for
placing the Mollison Zone 0 anchor. The household pin's `save()`
writes through to `homesteadStore` so `useEffectiveHomestead` still
resolves the explicit branch first; deleting the household pin tied to
the current anchor either promotes the next remaining pin or clears
the anchor (no blink-to-none mid-deletion). `useEffectiveHomestead`
and `resolveEffectiveHomestead` gain a third "single-household
fallback" branch so projects whose households were created before the
unification (no `homesteadStore` mirror) still derive an anchor from a
lone household pin.

**Changes.**
- `apps/web/src/v3/observe/ObserveLayout.tsx` — dropped the
  `homestead={…}` prop passed to `DiagnoseMap`; Place/Clear now
  surfaces through the Steward / household annotation tool instead.
- `apps/web/src/store/humanContextStore.ts` — `removeHousehold`
  imports `useHomesteadStore` and syncs the anchor (promote next or
  clear) when the deleted pin matched the explicit anchor.
- `apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts`
  — household save() pathway extended to mirror the pin position into
  `homesteadStore`.
- `apps/web/src/v3/observe/hooks/useEffectiveHomestead.ts` — both the
  hook and its imperative twin gained the `households.length === 1`
  derived branch (resolved after explicit, before the BE-residence
  branch) plus a `useHumanContextStore` dependency.
- 26 Observe draw-tool components + `AnnotationFormSlideUp` +
  `annotationFormStore` + `DiagnoseMap.module.css` — small uniform
  surface adjustments that fall out of the unification (annotation
  field plumbing).

**Verification.** Manual smoke pending. Recommended check: place a
Steward / household pin → Permaculture-zone tile enables and the same
pin appears as the legend's anchor; delete that pin → with another
household pin remaining, anchor promotes silently; with none, anchor
clears and tile disables (or derives from a single BE residence if
present).
