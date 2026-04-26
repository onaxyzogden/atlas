# DelayedTooltip primitive for icon-only chrome

**Date:** 2026-04-23
**Status:** Accepted
**Scope:** `apps/web/src/components/ui/DelayedTooltip.tsx`, icon sidebar, left tool spine, map control toggles

## Context

UX Scholar audit (§6) flagged that Atlas relies on native `title=` attributes for labeling icon-only controls in `IconSidebar`, the left tool spine, and map chrome (overlay toggles, measure tools, cross-section). Native `title`:

- has browser-variable delay (typically 500–1500 ms, user-configurable),
- does not match the dark-mode chrome,
- is not keyboard-surfaceable,
- cannot carry rich content.

A first-class tooltip primitive with an explicit 800 ms delay and dark-aware styling was already partially present: `apps/web/src/components/ui/Tooltip.tsx` exposes `delay`, `position`, `content`, and uses `React.cloneElement` + `aria-describedby`.

## Decision

Add `DelayedTooltip` as a thin preset wrapper over the existing `<Tooltip>`, not a from-scratch component:

- `DEFAULT_DELAY_MS = 800` (power-user discoverability threshold).
- `position="right"` default (sidebar + tool spine are vertical; tooltips sit beside them).
- `label` prop typed as `React.ReactNode` — passes through to `Tooltip.content`.
- `disabled` pass-through so collapsed-state-only labels can unwrap cleanly.

Exported from `apps/web/src/components/ui/index.ts`. Applied wherever native `title=` labeled an icon-only control:

- `components/IconSidebar.tsx` — collapse button (always wrapped), phase headers + bottom buttons wrapped only in collapsed state.
- `features/map/CrossSectionTool.tsx`, `MeasureTools.tsx`, `ViewshedOverlay.tsx`, `MicroclimateOverlay.tsx`, `HistoricalImageryControl.tsx`, `OsmVectorOverlay.tsx`, `SplitScreenCompare.tsx` — compact spine button + non-compact label button.

## Plan deviations

**Unit tests skipped.** The vitest config is `environment: 'node'` + `include: ['src/**/*.test.ts']`. A component test needs happy-dom and .tsx globs — infrastructure shift out of scope for this session. Relying on the underlying `<Tooltip>` being battle-tested and preview-verified behavior of the wrapper.

**Implementation shrunk.** Plan budgeted ~80 LOC for a from-scratch tooltip; actual implementation is ~30 LOC as a preset over the existing rich tooltip.

## Consequences

### Positive

- Uniform 800 ms delay across sidebar and map controls — no more browser-variable delay.
- Dark-mode-aware tooltip chrome everywhere (inherited from `<Tooltip>`).
- Discoverable via keyboard focus, not just hover.
- Removing the wrapper is a one-line change if we ever decide to go back to natives.

### Negative / follow-up

- Still one stray `title=` attribute in `features/map/MeasureTools.tsx` on the inner mode-selector buttons inside the compact popover — low discoverability value, deferred.
- No test coverage for the wrapper specifically; relies on the parent Tooltip's verification.

## References

- Audit §6 (`design-system/ogden-atlas/ui-ux-scholar-audit.md`)
- Implementation plan (`design-system/ogden-atlas/impl-plan-oklch-tooltip.md`)
- `apps/web/src/components/ui/Tooltip.tsx` (upstream component)
- `apps/web/src/components/ui/DelayedTooltip.tsx` (this primitive)
