---
title: Plan map-view IA — ModuleBar in open slide-up + Vision-first view order
date: 2026-05-15
status: accepted
stage: plan
module: plan-canvas
---

# ADR: ModuleBar surfaced at top of the open module slide-up; Vision-first plan view order

## Context

Two unrelated IA papercuts in the Plan map view:

1. **Lost module navigator while a module is open.** The Plan ModuleBar
   (COMPASS / LAYERING / WATER … tile row) is rendered into
   `StageShell.bottomTray`, pinned to the screen bottom. When a module page
   opens, the shared `ModuleSlideUp` renders a full-screen scrim from
   `top: 48px` (under the app header) that **fully covers the bottom
   ModuleBar** — the user can only switch modules by closing the sheet first.

2. **Current Land was both first and the default tab.** The floating phase
   tabs rendered `Current Land → Vision Layout → 3D Terrain` and opened on
   `current`, but Vision Layout is the primary working surface.

## Decision

**Change A — `topBar` slot on the shared `ModuleSlideUp`.** Added an optional
`topBar?: ReactNode` to `ModuleSlideUpProps`, rendered as the **first child of
`<aside className={sheet}>`**, above `<header>` (new `.topBar` CSS wrapper:
`8px 16px` gutter + bottom border + `--color-surface`). Plan feeds the **same
stateless `PlanModuleBar` element** into both `StageShell.bottomTray` (closed
state, unchanged) and `PlanModuleSlideUp`'s new pass-through `topBar` (open
state). Open/close + module-switch semantics are unchanged because the same
element with the same props powers both. `PlanModuleSlideUp` gained a
pass-through `topBar` prop forwarding to `<ModuleSlideUp topBar=… />`.

Additive and backward-compatible: `topBar` is optional, so Act / Observe
slide-ups omit it and render exactly as before — no shared-chrome regression.

**Change B — Vision-first view order + default.** `PLAN_VIEWS` reordered to
`['vision', 'current', 'terrain3d']` (sole driver of tab render order — only
consumers are the type decl and `PlanPhaseTabs.tsx:38`'s map). Default active
view is independently controlled by `PlanLayout.tsx`'s
`useState<PlanView>(…)`, flipped `'current' → 'vision'`. `PLAN_VIEW_LABEL` is
order-independent and unchanged.

## Consequences

- The bottom ModuleBar stays mounted behind the scrim when open (visually
  covered, no behavior change); the in-sheet copy is purely additive. Two
  live `PlanModuleBar` instances exist while a module is open — acceptable as
  `PlanModuleBar` is stateless and cheap.
- Plan map view now opens on Vision Layout.
- Files: `_shared/moduleNav/ModuleSlideUp.tsx` (+`topBar` prop/render),
  `_shared/moduleNav/ModuleSlideUp.module.css` (+`.topBar`),
  `plan/PlanModuleSlideUp.tsx` (pass-through), `plan/PlanLayout.tsx`
  (extracted `moduleBar` const → both slots; default view `'vision'`),
  `plan/types.ts` (`PLAN_VIEWS` order).

## Verification

Browser preview (`mtc` → redirected project, Plan map view):
- Closed: ModuleBar still at screen bottom.
- Open: DOM child order `[_topBar, _header, _tabs, _body]`; screenshot shows
  the bar under the OGDEN/Plan app header and above the
  "PLAN · MODULE / Goal Compass" module header.
- In-sheet tile click switches module (Goal Compass → Water Management) with
  sheet kept open; active-tile click and ESC both close the sheet.
- Tab order renders Vision Layout → Current Land → 3D Terrain; Vision Layout
  active on load.

## Scope / non-goals

No Act/Observe change; no `StageShell` API change; no store/schema change. The
pre-existing `mtc` fallback-project redirect that resets slide-up state on
first module open is unrelated and left as-is.
