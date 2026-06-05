# 2026-04-24 — Accessibility implementation slice 1: P0 skip-link + §3 P1 cluster + §5 tooltip sweep


First implementation pass against the [Accessibility Audit (WCAG 2.1 AA)](../design-system/ogden-atlas/accessibility-audit.md) (2026-04-24). Two commits on `feat/shared-scoring`.

### Shipped
- **`d129dd0` — P0 + §3 P1 cluster (5 files):**
  - **Skip-link (WCAG 2.4.1, Level A)** — `AppShell` renders a visually-hidden `<a href="#main-content">` as the first focusable child; `:focus` reveals it via `translateY(0)` + warm-gold outline. `<main>` carries `id="main-content"`. Preview-verified: `transform: matrix(1,0,0,1,0,0)` + `outline: rgba(196,162,101,0.5) solid 2px` on focus.
  - **Landmark nav** — `IconSidebar` promoted from `<aside>` to `<nav aria-label="Atlas domains">`. Screen readers can now traverse Atlas domains via landmark navigation.
  - **Input focus-ring parity** — dropped the sage-green `border-color` shift from `Input.module.css` `:focus-visible`; the box-shadow ring + `--color-focus-ring` token now match Button's pattern (no border flash on focus).
  - **LayerLegendPopover focus trap** — ported `Modal`'s pattern (`FOCUSABLE_SELECTOR`, `panelRef`, `previousFocusRef`). Tab/Shift+Tab cycle within the dialog; auto-focus first focusable (Close button) on open; restore previous focus on close; dialog gets `aria-modal="true"` + `tabIndex={-1}`.
- **`29bf499` — §5 tooltip sweep (28 files, ~55 sites):**
  - Mechanical `title="…"` → `<DelayedTooltip label="…">` across panels, map controls, dashboard pages (Climate/Hydrology/Herd/Planting), collaboration/reporting/project features, and the mobile GPS tracker.
  - Rule 4 conditionals expressed as `disabled={!cond}`. Rule 3 non-interactive spans/divs get `tabIndex={0}` for keyboard reachability.
  - **Intentionally skipped** — 17 sites where `title` is a component prop (`RegSection`, `Section`, `MicroCard`, etc.) and 3 rule-3 exceptions (`ZoneAllocationSummary` stacked-bar segments, `NurseryLedgerDashboard` 12×N calendar grid, `ScoresAndFlagsSection` redundant aggregate row) with `// a11y: keyboard tooltip deferred` comments; high-cardinality siblings would spam tab order.

### Verification
- `tsc --noEmit` clean on all touched files (pre-existing errors in `PlantingToolDashboard.tsx` + financial test fixtures are unrelated to this slice).
- Preview (port 5200): skip-link hides above viewport, reveals on focus; `nav[aria-label="Atlas domains"]` present in DOM; `role="dialog"` + `aria-modal="true"` on legend popover open; no new console errors.

### Still open from the audit
- P1: `<div onClick>` triage across 13 files (not in this slice — requires case-by-case decision)
- P1: dashboard heading hierarchy (`<h1>`/`<h3>` unevenness)
- P1: form input audit (LoginPage, StructurePropertiesModal, boundary-draw)
- P2: nav `aria-label`s across remaining landmarks; score live-region; Button spinner `prefers-reduced-motion` block; muted-text small-font guardrail
