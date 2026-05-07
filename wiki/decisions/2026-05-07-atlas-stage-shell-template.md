# Atlas — Canonical StageShell template for all lifecycle stages

**Date:** 2026-05-07
**Status:** Adopted
**Scope:** Atlas web (`apps/web/src/v3/**`) — every lifecycle stage page

## Context

Atlas's eight lifecycle stages (Observe, Plan, Diagnose, Design, Prove, Build,
Operate, Report) had drifted apart visually. Only **Observe** and **Plan**
carried the 3-column shell with bento rails + bottom module tray, and they did
so by **duplicating** the same CSS grid into two parallel modules
(`ObserveLayout.module.css` and `PlanLayout.module.css` were byte-equivalent on
the layout grid). The other six stages each invented their own page chrome —
single-canvas pages with no shared frame.

The user's directive (2026-05-07): "make the Observe page the global standard
template" — scoped to lifecycle stages.

## Decision

Extract the shell into a single slot-based component and migrate every stage
to use it.

### `apps/web/src/v3/_shell/StageShell.tsx`

```tsx
interface StageShellProps {
  leftRail?: ReactNode;
  canvas: ReactNode;
  rightRail?: ReactNode;
  bottomTray?: ReactNode;
  overlay?: ReactNode;
  canvasLabel?: string;
  leftRailLabel?: string;
  rightRailLabel?: string;
}
```

The shell owns:

- The outer 8 px page padding
- The responsive 3-column grid (240 / 1fr / 260 px, collapsing at
  1200 / 1000 / 820 px)
- `display: flex` on each rail aside (so the inner bento panel handles its own
  scroll without the outer aside clipping the panel's rounded bottom corner)
- The bottom-tray slot
- The overlay slot (slide-up sheets, modals)

Every rail slot is **optional**. The body grid uses `:has()` selectors to adapt
its column count to which rails are present:

```css
.body { grid-template-columns: minmax(0, 1fr); }
.body:has(> .left):has(> .right) { grid-template-columns: 240px minmax(0, 1fr) 260px; }
.body:has(> .left):not(:has(> .right)) { grid-template-columns: 240px minmax(0, 1fr); }
.body:not(:has(> .left)):has(> .right) { grid-template-columns: minmax(0, 1fr) 260px; }
```

Pages with no rails render as a clean single canvas column — no phantom
gutters, no broken-looking empty bento panels.

### Rail content style

The shell is **style-agnostic about its slots**. The bento-panel surface
treatment for rail content lives in the slot fillers themselves:

- `apps/web/src/v3/observe/tools/ObserveTools.module.css` — canonical left-rail
  bento-panel pattern (outer panel surface + inset cards).
- `apps/web/src/v3/observe/components/ObserveChecklistAside.module.css` —
  matching right-rail pattern.

When other stages grow rails, they should adopt the same pattern.

### Migration

- **Observe** and **Plan**: rewired to pass children via slot props. Their
  per-stage `*.module.css` files were deleted.
- **Diagnose / Design / Prove / Build / Operate / Report**: each page's
  outer return is now wrapped in `<StageShell canvas={…} canvasLabel="…"/>`.
  Their internal padding, headers, and existing `.page` divs live **inside**
  the canvas slot — no internal restyling this turn.

## Consequences

- Single source of truth for stage chrome; new stages adopt the standard with
  one wrapper.
- Adding a left rail / right rail / bottom tray to any stage is a one-prop
  addition — the responsive grid and clipping discipline come for free.
- Plan inherits the `display: flex` rail-clipping fix automatically (it had
  the same bug as Observe before today; resolved by adopting StageShell).

## Browserslist requirement

CSS `:has()` is required. Atlas's browserslist already targets evergreen
Chromium / Safari / Firefox (verified by existing `color-mix()` usage), all of
which support `:has()` since 2023. The default canvas-only column rule is the
safe fallback if `:has()` ever fails.

## Deferred follow-ups

These pages have stage-internal panels that should migrate into the shell's
rail slots in a future turn — out of scope for this turn:

- **DesignPage** — page-internal toolbox in `<aside class={css.toolbox}>`
  should move into the `leftRail` slot.
- **ProvePage** + **OperatePage** — `DecisionRail` (mounted by
  `V3ProjectLayout`) should move into the `rightRail` slot of each page.
- A generic `<RailModuleList/>` component — a lifecycle-wide bento-rail
  content kit callable by every stage — is a candidate for when 3+ stages
  grow rails.

## Files

**Created:**

- `apps/web/src/v3/_shell/StageShell.tsx`
- `apps/web/src/v3/_shell/StageShell.module.css`

**Migrated:**

- `apps/web/src/v3/observe/ObserveLayout.tsx`
- `apps/web/src/v3/plan/PlanLayout.tsx`
- `apps/web/src/v3/pages/DiagnosePage.tsx`
- `apps/web/src/v3/pages/DesignPage.tsx`
- `apps/web/src/v3/pages/ProvePage.tsx`
- `apps/web/src/v3/pages/BuildPage.tsx`
- `apps/web/src/v3/pages/OperatePage.tsx`
- `apps/web/src/v3/pages/ReportPage.tsx`

**Deleted:**

- `apps/web/src/v3/observe/ObserveLayout.module.css`
- `apps/web/src/v3/plan/PlanLayout.module.css`

## Verification

- `tsc --noEmit` — clean against StageShell + migrated files (pre-existing
  errors in unrelated test fixtures and `MTC_FALLBACK` typing remain;
  not introduced by this change).
- `vite build` — clean.
