# ADR — ObserveModuleBar invalid `<button>`-in-`<button>` nesting fix

**Date:** 2026-05-18
**Status:** Accepted
**Context:** Pre-existing React `validateDOMNesting` warning on the
Observe stage ("`<button>` cannot appear as a descendant of
`<button>`"), internal to `ObserveModuleBar` — not introduced by the
recent module-bar `topBar` work.

## Context

In `apps/web/src/v3/observe/components/ObserveModuleBar.tsx` each module
tile was an outer `<button className={css.tile}>` that contained inner
per-task progress `<button className={css.subseg}>` elements. Nesting an
interactive `<button>` inside another `<button>` is invalid HTML; React
emits a `validateDOMNesting` console warning and browser behaviour for
the nested control is undefined. Both surfaces must stay clickable: the
outer tile selects/opens the module (`handleCardClick`), the inner
sub-segments `stopPropagation` and navigate to a task URL.

## Decision

Convert the outer element from `<button>` to
`<div role="button" tabIndex={0}>`, preserving `aria-pressed`,
`onClick={() => handleCardClick(mod)}`, and the
`css.tile`/`css.tileActive` classes (zero visual change). Add an
`onKeyDown` handler so Enter/Space invoke `handleCardClick` with
`preventDefault()` (Space no longer scrolls), restoring native-button
keyboard semantics. The inner sub-segment `<button>`s are now legally
nested (button inside div) and keep their `stopPropagation` + navigate
behaviour. Removed the now-redundant `type="button"` on the outer
element.

## Consequences

- DOM is now valid; the `validateDOMNesting` warning is eliminated.
- Visual appearance and click/keyboard behaviour unchanged.
- Accessibility preserved via `role="button"` + `tabIndex` +
  `aria-pressed` + Enter/Space handler.

## Verification

`tsc --noEmit` over `apps/web` reports **zero** errors for
`ObserveModuleBar` (other errors in the run are pre-existing worktree
environment artifacts — the worktree lacks installed `node_modules`, so
`@ogden/shared` subpaths fail to resolve; unrelated to this change).
In-browser preview confirmation deferred: this isolated worktree has no
installed dependencies, so a dev server cannot be started here. The fix
mechanically removes the exact nesting `validateDOMNesting` flags.
