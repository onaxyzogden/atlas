# 2026-05-10 — Product Chain divider polish (gold accent ribbon)


Same-day follow-up to the broiler-fold-in below. The eyebrow "PRODUCT
CHAIN" label sat on a thin `var(--color-border)` left-rule that was
near-invisible against the surrounding chrome; the steward couldn't
tell at a glance which three tabs belonged to the sub-group.

Per AskUserQuestion (4 options: stronger inline rule, two-row
sub-header, pill enclosure, gold accent ribbon), the steward picked
the gold accent ribbon: keep one row, give the three grouped tabs a
persistent faint-gold underline.

Implementation:

- `PlanModuleSlideUp.tsx` — grouped tab `<button>`s now get
  `css.tabGrouped` in addition to `css.tab` (and `css.tabActive`).
- `PlanModuleSlideUp.module.css` — new `.tabGrouped` rule:
  `border-bottom-color: rgba(var(--color-gold-rgb), 0.35)` (0.6 on
  hover). `.tabActive` declared later, so the active grouped tab
  still reads as full gold. Dropped the redundant `border-left` rule
  on `.tabGroupLabel` and tightened its margins.

Gates: tsc + lint exit 0. eval over the accessibility tree confirms
the three Product Chain tabs render with
`border-bottom-color: rgba(212, 175, 95, 0.35)` inactive and
`rgb(212, 175, 95)` when active. ADR addendum filed under the same
Module 7 decision doc. `preview_screenshot` unresponsive again (third
timeout in this sprint) — no visual proof captured.
