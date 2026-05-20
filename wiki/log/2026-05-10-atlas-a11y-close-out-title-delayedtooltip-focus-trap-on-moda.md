# 2026-05-10 — Atlas a11y close-out: title= → DelayedTooltip + focus-trap on modals


**Context.** Phase 3 of the pre-test friction audit
([wiki/decisions/2026-05-09-atlas-pre-test-audit.md] / launch checklist)
called for two carry-forward fixes from the 2026-04-24 a11y audit:
(1) replace native `title=` tooltips in v3 with the shared
`<DelayedTooltip>` primitive (per
[wiki/decisions/2026-04-23-delayed-tooltip-primitive.md]) and (2) add a
focus-trap to the `role="dialog"` surfaces flagged in
`wiki/LAUNCH-CHECKLIST.md`.

**Phase 3.1 — title= sweep.** Wrapped buttons in `<DelayedTooltip>`
across the high-traffic v3 chrome — toolbars, floaters, and the audit's
explicit examples:

- `v3/act/ActTools.tsx` (quick-log buttons)
- `v3/components/CategoryCard.tsx` (View buttons; suppressed when no detail)
- `v3/plan/PlanSelectionFloater.tsx` + `v3/observe/components/SelectionFloater.tsx`
  (Edit / Delete / Clear)
- `v3/plan/canvas/DesignToolRail.tsx` (7 right-edge tools, `position="left"`)
- `v3/observe/components/MapToolbar.tsx` (basemap / distance / elevation /
  area / boundary / return / clear)
- `v3/plan/PlanTools.tsx` (tool item / lens row / open-module fallback)
- `v3/observe/tools/ObserveTools.tsx` (left-rail tool item)

`disabled` / `aria-pressed` / `aria-label` / `data-active` props preserved
verbatim. Audit doc said "10 sites" but the real count was higher; scope
landed on operator-visible chrome only — data-tip `<span>`/`<div>`
annotations remain for a follow-up sweep.

**Phase 3.2 — focus-trap.** Extracted the focus-trap pattern from
`apps/web/src/components/ui/Modal.tsx` into a shared
`apps/web/src/components/ui/useFocusTrap.ts` hook
(`useFocusTrap(panelRef, active, { onEscape, lockBodyScroll })`):

- Records previously-focused element on activation, restores on cleanup.
- `requestAnimationFrame` first-focus on the first focusable inside the
  panel; falls back to the panel itself (`tabIndex={-1}`).
- Tab/Shift+Tab wrap inside the panel.
- Optional Escape handler.
- Optional `document.body` scroll lock (default on).

Wired into the two true modals:

- **`PlanModuleSlideUp.tsx`** — replaced the manual closeRef+Escape
  effect with the hook; sheet now traps Tab and locks background scroll.
  Existing `role="dialog"` + `aria-modal="true"` + scrim-click close
  preserved; added `tabIndex={-1}` to the sheet so the hook can fall back.
- **`SlideUpPanel.tsx`** — added `role="dialog"`, `aria-modal="true"`,
  `aria-label`, `tabIndex={-1}`, plus the hook (Escape closes, body
  scroll locked). Was previously a non-dialog modal-shaped div.
- **`Modal.tsx`** — refactored to consume the hook (zero behavior
  change; ~85 lines down to a one-liner).

**RailPanelShell intentionally skipped.** The 2026-05-09 audit listed
`SlideUpPanel / RailPanelShell` together, but `RailPanelShell` is
non-modal chrome — the right rail sits alongside the map, and users
must Tab out to the map and other UI. Adding focus-trap there would be
a regression. Added a docstring note at the top of
`apps/web/src/components/ui/RailPanelShell.tsx` recording the call.

**Verification.**
- `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  → exit 0.
- `grep -rn "title=" apps/web/src/v3` still shows data-tip `<span>`/`<div>`
  occurrences — those are out of scope (no pointer cursor / focus
  affordance) and can be folded into a tooltip-content sweep later.
- Manual keyboard walk in dev preview deferred — current session is
  text-only; flagged for the next preview pass.

**Deferred.** Remaining audit phases — 2.3 (archive `apps/atlas-ui` from
the workspace), 4.1 (backfill 128 null-citation rows in
`packages/shared/src/regionalCosts/`), 4.2 (deferred TODO sweep:
guild centroid, succession slider, GAEZ scenario picker, hydrology
stubs, public-portal cache).
