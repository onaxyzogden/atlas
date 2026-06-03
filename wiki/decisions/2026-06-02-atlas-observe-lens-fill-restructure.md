# ADR: Observe lens -- viewport fill fix + chrome restructure

**Date:** 2026-06-02
**Status:** accepted
**Branch:** `feat/atlas-permaculture` (commit `bcb0ea2b`; not pushed)
**Supersedes (in part):** the mount + zoom-box sizing decided in
[[decisions/2026-06-02-atlas-observe-lens-module-bar-promotion]]
**Entity:** [[entities/observe-dashboard]]

## Context

The mock-backed observational-lens dashboard was promoted to the live
`module-bar` Observe shell earlier on 2026-06-02 (`f7e164f2`) with a whole-UI
true-zoom wrapper (`Z = 12/7`). On viewing the promoted result the operator
reported two problems:

1. **Confinement.** The lens rendered "ridiculously confined to a space smaller
   than the actual viewable window" -- an `C.bg` (#0F0F0D) gutter on the right
   and bottom.
2. **Chrome layout.** Wanted `CycleTimelineBar` in a left sidebar,
   `DomainsView` across the top, and the redundant `LensBar` pill row gone.

## Decision

### 1. Fill -- two coupled root causes, two fixes

- **Zoom-box sizing.** The wrapper sized the inner zoom box at
  `width/height: calc(100% / Z)` and relied on `zoom: Z` scaling the box's
  footprint back to 100% (the pre-M126 Chromium semantics). The current engine
  treats a percentage-sized box as filling its parent and applies `zoom` only to
  internal lengths, so `calc(100%/Z)` was never scaled back up -- the UI painted
  at ~58% (= 1/Z) of the viewport. **Fix:** set the zoom box to
  `width/height: 100%`. It fills the host exactly; `zoom` still magnifies every
  internal length by `Z`, so the min 7px source font still paints 12px.
- **Mount context.** The `module-bar` branch wrapped the lens in a rails/tray-
  `null` `StageShell` whose grid/flex/padding context was a second confinement
  source (the standalone `/v3/prototype/observe-lens` route, mounted full-bleed
  under `appShellRoute`, never had the gutter). **Fix:** the `module-bar` branch
  now returns a full-bleed `position:absolute; inset:0` container holding
  `ObserveLensDashboard` with `ObserveShellToggle` floating above -- no
  `StageShell`. The `dashboard` branch (`ObserveDualShellLayoutLegacy`) is
  byte-untouched.

### 2. Chrome restructure (mock-backed, additive props)

- `CycleTimelineBar` gains `vertical?: boolean` -- a full, always-expanded
  left sidebar (260px): cycle header, full spiral SVG, "Now / Observe active"
  callout, and the plan-review/stale/ageing signal column. Horizontal mode
  (default) unchanged.
- `DomainsView` gains `horizontal?: boolean` -- a scroll-x top-bar strip of
  rich lens cards (icon, label, freshness, obs count, summary, "View all
  observations ->" deep-link). It is now the sole lens selector: a card click
  calls `onSelectLens(isActive ? 'all' : lens.id)`, so re-clicking the active
  card resets to `all`. Vertical mode (default) unchanged.
- `LensBar` removed from the root JSX. Per no-deletion, `LensBar` and the old
  left `DomainsRail` mount are left defined-but-unused (mock-prototype helpers,
  not legacy stage components).
- `IntelligencePanel` unchanged on the right (300px); `PseudoMap` unchanged in
  the flex-1 center.

## Alternatives considered

- **Keep `calc(100%/Z)` and fight `StageShell` with grid overrides.** Rejected:
  the zoom-box calc was itself wrong for this engine; overriding `StageShell`
  would mask one cause and leave the other.
- **Bake `Z` into per-value literals instead of a zoom wrapper.** Rejected
  (out of scope; loses the single-knob true-zoom; large churn in
  `components.tsx`).
- **A LensBar "All" replacement control.** Unnecessary: re-clicking the active
  top-bar card already resets to `all`.

## Consequences

- The module-bar lens fills the viewport edge-to-edge with the requested
  layout. The fixed-width rails (cycle 260px + intelligence 300px) are enlarged
  by `Z`, so the flex-center map is comparatively narrow -- acceptable for the
  mock prototype; revisit when live-data/MapLibre wiring lands.
- Still mock-backed; no `ObserveDataPoint`/`useDomainSnapshot`/MapLibre wiring.
- Verified live (port 5200) on a module-bar project: 0 `C.bg` gutters across 75
  edge samples, zoom box fills the outlet (1266x916 in a 1294x992 viewport),
  min source font 7px paints 12px, cycle rail left / cards top / no LensBar /
  IntelligencePanel right, card-click drives `activeLens` (`all` -> `climate`,
  read from the React fiber), screenshot captured, dashboard-shell diff empty.
  Typecheck (`tsc --noEmit`) EXIT 0.

## Discipline

Explicit-path commit (3 files) on the externally-rebased branch; foreign WIP
left untouched; not pushed; no-deletion of unused helpers; mock-backed scope
held; ASCII-only.
