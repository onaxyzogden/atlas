# ADR: Observe annotation hover-probe coverage gap (dead prefix)

**Date:** 2026-05-15
**Status:** Accepted
**Area:** apps/web — MapLibre map cursor (Observe)
**Relates to:** `2026-05-15-atlas-map-cursor-intent-channel.md`,
`2026-05-15-atlas-map-cursor-authoritative.md`

## Context

The single-authority cursor model makes `useMapCursor`'s internal
hover-probe responsible for the universal "this is clickable" `pointer`
affordance: on `mousemove` it `queryRenderedFeatures` against every
style layer whose id matches a prefix in `INTERACTIVE_LAYER_PREFIXES`,
and the MutationObserver re-asserts the computed cursor (`!important`)
over any bare external write.

That prefix list contained `'observe-annot-'` and `'obs-annot-'`. Both
were **dead** — they appear nowhere in the codebase except inside
`useMapCursor.ts`. Every Observe annotation layer is `observe-anno-*`
(`ObserveAnnotationLayers.tsx` `LAYER_PREFIX = 'observe-anno-'`).
`'observe-anno-…'.startsWith('observe-annot-')` is `false` (index 12 is
`-` vs `t`), so the probe matched **no** Observe annotation layer.

Consequence (Observe-wide regression): hovering any annotation feature
(SWOT markers, zones, sectors, soil samples, built-environment entities,
contours, water lines, vegetation, pasture, …) yielded `grab` instead of
`pointer`. `ObserveAnnotationLayers` still wrote a bare `'pointer'` on
`mouseenter`, but with the prefix dead the probe never set
`internalHover`, so the observer recomputed `grab` and clobbered that
bare write back — the clickable affordance was silently dead. This was
the only gap; `design-el-`, `plan-data-`, `be-v2-`, and
`plan-scheduled-moves-` all match correctly, and
`observe-sector-handles-circle` is intentionally excluded (intent
channel only). It closes the "next session" follow-up flagged after
`2026-05-15-atlas-map-cursor-intent-channel.md`.

## Decision

1. **Fix the prefix.** Replace the two dead entries with the single
   correct `'observe-anno-'` in `INTERACTIVE_LAYER_PREFIXES`. The probe
   now matches all Observe annotation layers and computes `pointer` on
   hover (priority 5, pan-mode), surviving observer re-assertion because
   it *is* the computed value.
2. **Delete the now-redundant writers** (the prior ADR's "Redundant —
   deleted" disposition, not applied to Observe at the time): removed
   `ObserveAnnotationLayers`' `onEnter`/`onLeave` bare cursor writes plus
   their plumbing (`enterHandlers`/`leaveHandlers` maps, the
   `mouseenter`/`mouseleave` registration, and the teardown loops). The
   probe is now the single owner of this affordance; `click`/`dblclick`
   handlers (→ `openDetail`) are untouched.

## Consequences

- **Positive:** Observe annotation hover shows the correct `pointer`
  again; one cursor authority with no second writer for Observe to fight.
  New annotation layers need no per-layer cursor wiring — the
  `observe-anno-` prefix covers them automatically.
- **Trade-off:** The probe is prefix-based, so any future Observe
  interactive layer that does *not* start with `observe-anno-` (cf. the
  deliberately-excluded `observe-sector-handles-circle`) must either
  adopt the prefix or use the intent channel — there is no per-layer
  opt-in anymore. This is the intended single-authority constraint.

## Verification

`corepack pnpm --filter web typecheck` exit 0 (compiles with all
`ObserveAnnotationLayers` enter/leave plumbing removed; click/dbl
intact). Live on `web-wt` (port 5210, this branch): pan rest =
`grab !important` (host + observer active). The fix is deterministic
string-prefix logic; proved by replaying the exact
`INTERACTIVE_LAYER_PREFIXES.some(p => id.startsWith(p))` predicate over
the real `observe-anno-*` layer-id set — OLD prefixes → all `false`
(the regression), NEW → all `true`; other families still `true`;
non-interactive id `false` (specificity intact). A live rendered-map
hover screenshot was not obtainable in the headless preview (MapTiler
`403` with the placeholder key prevents the base style from loading, so
real annotation layers never render; the synthetic-style eval and
screenshot both time out the headless WebGL renderer) — stated as a
limitation, not assumed. Console: only the pre-existing
`ObserveModuleBar.tsx:32` DOM-nesting warning + the expected MapTiler
`403` — no cursor / observer / recursion errors.
