# ADR: Plan stage migrated to URL-driven module routing for Observe / Plan / Act parity

**Date:** 2026-05-07
**Status:** accepted

## Context

After [`2026-05-07-atlas-act-stage-page.md`](2026-05-07-atlas-act-stage-page.md)
shipped, Observe and Act both drove their active module from the URL
(`/v3/project/$projectId/observe/$module`,
`/v3/project/$projectId/act/$module`). Plan was the odd stage out: its active
module lived in local React state inside `PlanLayout`, so:

- Plan modules could not be deep-linked
  (`/v3/project/mtc/plan/water-management` did not exist as a route).
- A page refresh reset the active module.
- `V3LevelNavBridge.parseV3Route` and `V3ProjectLayout.activeFromPath` already
  parsed an optional module segment after `plan`, but Plan ignored the URL.

Two related Plan-side regressions surfaced during smoke-testing the new route:

1. The parcel boundary outline never appeared on `/plan/mtc`. Plan derived
   `boundary` from a raw `useProjectStore` lookup that fell through to a local
   `MTC_FALLBACK` with `parcelBoundaryGeojson: null`, while Observe used
   `useV3Project` (which special-cases `'mtc'` → `MTC_PROJECT.location.boundary`).
2. The map canvas was squeezed to ~108 px wide. Plan was missing from
   `SELF_RAILED_STAGES` in both `DecisionRail` and `V3ProjectLayout`, so the
   outer `LandOsShell` decision rail rendered alongside Plan's own
   `PlanChecklistAside`, doubling the right-rail width.

## Decision

Bring Plan to full parity with Observe and Act:

1. **URL routing.** Add `v3PlanModuleRoute` (`path: 'plan/$module'`) in
   `apps/web/src/routes/index.tsx` mapped to `PlanLayout`. Convert `PlanLayout`
   to read the active module from `useParams({ strict: false })`, validate via
   `isPlanModule`, and call `useNavigate()` from `handleSelectModule` for both
   clear and select branches (mirroring `ActLayout` exactly). `slideUpOpen`
   stays local React state.
2. **Boundary read.** Replace `PlanLayout`'s raw `useProjectStore` boundary
   lookup with `useV3Project(params.projectId)?.location.boundary`, matching
   Observe. The `MTC_FALLBACK` LocalProject (used to satisfy
   `PlanModuleSlideUp`'s `LocalProject` prop) is preserved.
3. **Self-railed stage.** Add `'plan'` to `SELF_RAILED_STAGES` in both
   `apps/web/src/v3/components/DecisionRail.tsx` (line 52) and
   `apps/web/src/v3/V3ProjectLayout.tsx` (line 58). Plan owns its right rail
   via `StageShell.rightRail`, so the outer `LandOsShell` rail must short-circuit
   to `null`.

## Consequences

- Plan modules deep-link and survive refresh:
  `/v3/project/mtc/plan/water-management` lands on Water with the slide-up
  closed; reload preserves it.
- Plan no longer renders a dead outer decision rail. Canvas widened from
  ~108 px to ~246 px on a 1030-px window in the test.
- Boundary outline now renders on the Plan map for the MTC sentinel, and for
  any real project carries through identically to Observe.
- The three lifecycle stages (Observe / Plan / Act) now share one URL
  contract, one boundary-read pattern, and one rail policy.

### Out of scope

- Wiring plan pillars into `V3LevelNavBridge.handleSegmentClick` (still
  observe-only). Plan-side pillar/segment interaction is a follow-up that
  also needs `PLAN_PILLARS` and pillar tasks defined.
- Backfilling Plan-side vitest coverage for the new URL contract.

## References

- Code: `apps/web/src/routes/index.tsx`,
  `apps/web/src/v3/plan/PlanLayout.tsx`,
  `apps/web/src/v3/components/DecisionRail.tsx`,
  `apps/web/src/v3/V3ProjectLayout.tsx`.
- Prior ADR: [`2026-05-07-atlas-act-stage-page.md`](2026-05-07-atlas-act-stage-page.md)
  (the proven pattern this change copies).
