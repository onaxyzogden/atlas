# 2026-05-10 — Triage round 3 + strategic-thread close-out


Two-commit round on the three remaining dirty files, plus confirmation
that two long-carried strategic threads are settled.

- `95029f8` — Plan selection: when a single `kind === 'guild'` item is
  selected, PlanSelectionFloater renders an "Open Guild Builder"
  action (Trees icon) alongside Edit vertices / Delete. Clicking it
  selects `plant-systems` and opens the slide-up. Count label for
  guild selections is enriched with `<name> · N member(s)` from
  `usePolycultureStore`. `apps/web/src/v3/plan/PlanLayout.tsx` +
  `apps/web/src/v3/plan/PlanSelectionFloater.tsx`.
- `d122734` — V3LifecycleSidebar test un-skipped. Replaces the
  previously-skipped placeholder with a render-smoke suite (4 tests,
  all passing) by mocking `lucide-react` via
  `vi.mock(..., async (importOriginal) => …)` — harvests every export
  from the real module and replaces every component-shaped value with
  a small `<svg data-lucide-icon="…">` `forwardRef` stub. Satisfies
  Vitest 2's static-export check without inheriting the
  `lucide-react@1.x` `Icon` `[undefined]`-spread bug.
  `apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx`.

Verification: `tsc --noEmit` clean against HEAD-as-of-`d122734`;
`vitest run src/v3/components/__tests__/V3LifecycleSidebar.test.tsx`
→ 4 passed.

### Strategic threads — close-out

- **Terrain3D enable** (deferred across two prior plans because its
  renderer files were missing): now resolved upstream.
  `PlanPhaseTabs.tsx` carries no `isDisabled` flag, `terrain3d` is one
  of `PLAN_VIEWS`, and `Terrain3DController.tsx` /
  `DesignElementExtrusionLayer.tsx` / `DesignElementGlbLayer.tsx` /
  `elementHeights.ts` / `VisionLayoutCanvas.tsx` are all on disk and
  wired. Nothing left to do.
- **Legacy `computeRecommendedStocking` v2 callsites** (6 dashboards
  /cards): re-confirmed deferred per
  `wiki/decisions/2026-05-10-atlas-stocking-input-canonical-pasture-quality.md`
  §"Out of scope" — site-level callers keep working unchanged;
  per-paddock migration via `computePaddockRecommendedStocking`
  triggers when each card is being revised, not as a sweep. No
  triage commit; backlog item closes on its own as cards are touched.

### Surfaced for next session — new "built-environment unification" thread

Working tree is dirty again with a coherent new thread the user
authored mid-round (not triaged; per plan §Out of scope):

```
M  apps/web/src/v3/plan/PlanLayout.tsx
M  packages/shared/src/index.ts
?? apps/web/src/v3/plan/draw/ObserveLinkPopover.tsx
?? apps/web/src/v3/plan/draw/PlanObserveSelectionHandler.tsx
?? apps/web/src/v3/plan/draw/observeLinkPopoverStore.ts
?? packages/shared/src/builtEnvironment.ts
?? packages/shared/src/builtEnvironmentKinds.ts
?? wiki/decisions/2026-05-10-atlas-built-environment-unification.md
```

`tsc` reports three errors in the untracked
`PlanObserveSelectionHandler.tsx` (L32 `ObserveModule` type narrowing
on a `string[]` literal; L110/L120 `top` possibly undefined under
`noUncheckedIndexedAccess`). For the next round.
