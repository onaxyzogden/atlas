# 2026-04-24 — Accessibility Audit (WCAG 2.1 AA)


Produced [`design-system/ogden-atlas/accessibility-audit.md`](../design-system/ogden-atlas/accessibility-audit.md),
closing the a11y area deferred by the 2026-04-23 UX Scholar audit. Documentation
only — no code changes in this session.

### Headline findings

- **P0 (one):** No skip-link anywhere in `AppShell.tsx`. Every keyboard user
  must Tab through the full IconSidebar before reaching main content — WCAG
  2.4.1 Level A fail. Recommendation: visually-hidden `<a href="#main-content">`
  as first child of the shell div + `id="main-content"` on the existing
  `<main>` at `AppShell.tsx:107`.
- **P1 (six):** IconSidebar `<aside>` → `<nav>` promotion; `<div onClick>`
  triage across 12 files (Modal's backdrop-dismiss is legitimate; others need
  `<button>` or the role/tabIndex/onKeyDown trio); Input focus-ring uses
  sage-green border-shift inconsistent with Button's gold ring; LayerLegendPopover
  has `role="dialog"` but no focus trap; dashboard heading hierarchy skips
  levels (h1 → h3); bare `<input>` inventory outside FormField adoption.
- **P2 (five):** `title=` → DelayedTooltip sweep (70 occurrences across 34
  files); Button spinner `@keyframes` missing `prefers-reduced-motion` block
  (grep-confirmed); nav aria-labels; score live-region in SiteIntelligencePanel;
  muted-text font-size guardrail.

### Positive findings (compliance stamps)

- Focus-ring token (`--color-focus-ring`) consumed correctly by Button, Input,
  Tabs, Accordion.
- `Modal.tsx:55-114` textbook focus trap (Escape + Tab cycle + restore).
- `FormField.tsx:43-64` wires label/error/helper via `htmlFor` + injected
  `aria-describedby`.
- OKLCH contrast passes WCAG AA body text (13:1) and all status colors (5:1+).
- 9 CSS files correctly respect `prefers-reduced-motion`.

### Deliverables

- **NEW:** `design-system/ogden-atlas/accessibility-audit.md` — 8 sections +
  Priority Summary + Deferred + References. Follows the `ui-ux-scholar-audit.md`
  template. Every finding cites `file:line`.
- Cross-link: `ui-ux-scholar-audit.md` "does not cover" bullet updated to point
  at the new audit.
- `wiki/index.md` updated under Design System.

### Next session

Implementation plan that executes §1 (P0 skip-link + `<nav>` promotion) plus
§§2–3 P1 items (div-onClick triage + focus-ring parity). The §5 tooltip sweep
(mechanical, ~2 h) can run in a buffer session or parallel worktree.
