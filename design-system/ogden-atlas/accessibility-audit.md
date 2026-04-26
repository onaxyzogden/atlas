# Atlas/OLOS — Accessibility Audit (WCAG 2.1 AA)

**Date:** 2026-04-24
**Status:** Accepted. Covers the a11y area deferred by the UX Scholar audit ([`ui-ux-scholar-audit.md`](./ui-ux-scholar-audit.md)).
**Scope:** Audit only — no code changes. Desktop dark-mode-first, matching the prior audit's framing.
**Target level:** WCAG 2.1 Level AA. WCAG 2.2 additions (target-size minimum, focus-not-obscured) flagged as deferred — not failed here.
**Intended use:** Input to a subsequent implementation plan; P0 should be scheduled before the next UI feature lands.

---

## Context

Atlas ships to landowners, ecologists, and agronomists whose environments include enterprise accessibility requirements. The UX Scholar audit (2026-04-23) deferred accessibility as out of scope. Between then and this session, the codebase gained three primitives that materially changed the a11y posture:

- **OKLCH tokens** ([ADR 2026-04-23](../../wiki/decisions/2026-04-23-oklch-token-migration.md)) — perceived-brightness contrast is now predictable across hues.
- **DelayedTooltip** ([ADR 2026-04-23](../../wiki/decisions/2026-04-23-delayed-tooltip-primitive.md)) — a proper aria-described primitive exists to replace native `title=`.
- **MapControlPopover + mapZIndex** ([ADR 2026-04-24](../../wiki/decisions/2026-04-24-map-control-popover-and-mapzindex.md)) — chrome is typed; future map surfaces can adopt a11y defaults at the primitive level.

This audit rides on that foundation. It finds **one WCAG AA blocker (skip-link absence), five significant P1 gaps, and four P2 polish items.** The codebase already does the hard work on focus rings, ARIA live regions, and reduced-motion in most places — findings are narrowly scoped rather than structural.

**TL;DR** — Add a skip-link and promote `IconSidebar` from `<aside>` to `<nav>` in one small PR. Then run a `title=` → `DelayedTooltip` sweep (~70 sites, mechanical) and a targeted `<div onClick>` → `<button>` pass on the 13 identified files. Everything else is polish.

---

## 1. Landmark regions & skip links

**Principle** — A single skip-link at the top of the tab order lets keyboard users bypass repeating navigation (WCAG 2.4.1 Bypass Blocks, Level A). Landmark regions (`<main>`, `<nav>`, `<aside>`) let screen-reader users jump between structural areas.

**Current state**
- `<main>` landmark is present in every authed route — `AppShell.tsx:107` wraps `{children}` in `<main className={styles.main}>`.
- `IconSidebar.tsx:188` uses `<aside>` for the domain navigation spine.
- Dashboards and public portal have their own correct landmarks: `DashboardSidebar.tsx:57` (`<nav>`), `HydrologyDashboard.tsx:95` (`<nav>`), `PublicPortalShell.tsx:61` (`<nav>`), `LandingPage.tsx:19` (`<main>`), `LandingNav.tsx:25` (`<nav>`).
- `DashboardMetrics.tsx:237` uses `<aside>` correctly for complementary content.
- `StepIndicator.tsx:39` uses `<nav aria-label="Progress">` — good reference implementation.

**Gap**
- **No skip-link anywhere.** Grep for `skip|skipTo|skip-link|Skip to` across `apps/web/src` returns zero hits. A keyboard user pressing Tab from page load must traverse the entire `IconSidebar` (every collapsed phase accordion, every pinned item) before reaching map or rail content.
- `IconSidebar` is semantically `<aside>` (complementary) but functions as the primary domain navigation. A screen-reader user using landmark navigation (`⌃⌥U` on VoiceOver) will hear it labeled as "complementary," not "navigation."

**Recommendation**
- Add a visually-hidden `<a class="skipLink" href="#main-content">Skip to main content</a>` as the first child of `AppShell.tsx`'s shell div ([`AppShell.tsx:32`](../../apps/web/src/app/AppShell.tsx)), with a `:focus-visible` rule that reveals it. Pair with `id="main-content"` on the existing `<main>` at line 107.
- Change `IconSidebar.tsx:188` from `<aside>` to `<nav aria-label="Atlas domains">`. `<aside>` can remain on the user-row footer if needed, but the primary nav should land on the right landmark.
- Effort: ~15 min, one file + one CSS rule.

**Priority:** **P0** (skip-link — WCAG 2.4.1 Level A fail). P1 (nav semantics — affects AT navigation but not a direct fail).

---

## 2. Keyboard-operable interactives

**Principle** — Any element that responds to a click must also respond to Enter/Space and be reachable via Tab (WCAG 2.1.1 Keyboard, Level A). `<button>` gets this for free; `<div onClick>` does not.

**Current state**
- Grep `<div[^>]*onClick` in `apps/web/src/**/*.tsx` finds 13 files. `Modal.tsx` is a legitimate backdrop-dismiss case (keyboard path is the Escape handler at `Modal.tsx:55-82`).
- The other 12 span mostly export-flow UI and edit surfaces: `ProjectPage.tsx`, `UtilityPanel.tsx`, `LivestockPanel.tsx`, `PaddockListFloating.tsx`, `DesignToolsPanel.tsx`, `CropPanel.tsx`, `MilestoneMarkers.tsx`, `AccessPanel.tsx`, `InvestorSummaryExport.tsx`, `QRCodeGenerator.tsx`, `EmbedCodeModal.tsx`, `EducationalBookletExport.tsx`.
- Many are decorative overlay divs (not interactive) but some are click targets lacking keyboard equivalents — notably `components/panels/timeline/MilestoneMarkers.tsx` (timeline marker clicks to edit).

**Gap** — Each of the 13 files needs a case-by-case review: is the `<div onClick>` a true interactive control, or a backdrop/overlay with a separate keyboard path? True interactive controls must become `<button>` (or add `role="button"` + `tabIndex={0}` + onKeyDown for Enter/Space, and a visible focus style).

**Recommendation**
- Triage pass: open each of the 12 non-Modal files, classify each `onClick`-div as either (a) backdrop/decorative — leave alone but document, or (b) interactive — replace with `<button>` or add the three-prop keyboard trio (`role`, `tabIndex`, `onKeyDown`). Buttons are the default choice; only use `role="button"` on non-`<button>` elements when the semantic tag (e.g., `<li>`) cannot be changed.
- Effort: ~1 hour for the triage + conversions. Pairs naturally with the tooltip sweep (§5) since both touch overlapping files.

**Priority:** **P1**.

---

## 3. Focus management & focus rings

**Principle** — Every focusable control must have a visible focus indicator that meets 3:1 contrast against the background (WCAG 2.4.7 Focus Visible, Level AA). Dialogs should trap focus and restore it to the trigger on close.

**Current state (mostly strong)**
- `--color-focus-ring: rgba(196, 162, 101, 0.5)` — warm-gold at 50% alpha, defined in [`dark-mode.css:41`](../../apps/web/src/styles/dark-mode.css).
- Consumed by `Button.module.css:27-30`, `Input.module.css:68-72,82-85`, `Tabs.module.css:45-49,80-84`, `Accordion.module.css:49-53` — all four primitives define `:focus-visible` with `outline: none` + `box-shadow` ring.
- `Modal.tsx:55-114` is a textbook focus-trap implementation: Escape dismisses, Tab/Shift+Tab cycles within dialog, focus restored to previously-focused element on close.
- `CommandPalette.tsx:107-121` handles Escape/ArrowUp/ArrowDown/Enter and auto-focuses its input on open.

**Gap**
- **Input focus ring uses a different color** from Button: `Input.module.css:70` sets `border-color: var(--color-accent)` (sage green) in addition to the warm-gold ring. Result: a focused input visually reads sage where every other focused control reads gold. Not a WCAG fail (contrast still passes) but an inconsistency the design system should resolve.
- **`LayerLegendPopover` carries `role="dialog"` but has no focus-trap implementation** — unlike `Modal` it does not save/restore focus, not trap Tab. Users can Tab out of the popover into the map behind it, which then loses context.
- **Dashboard `<nav>` elements lack `aria-label`** (`DashboardSidebar.tsx:57`, `HydrologyDashboard.tsx:95`) — when multiple nav regions exist on a page, AT users cannot distinguish them.

**Recommendation**
- Drop the `border-color: var(--color-accent)` from `Input.module.css:70`; keep only the `box-shadow` ring, matching Button. (2-line change; visual parity across primitives.)
- Either (a) apply the `Modal` focus-trap pattern to `LayerLegendPopover`, or (b) drop the `role="dialog"` and treat it as a non-modal popover with a `role="region"` + `aria-label`. Choice depends on whether the popover is truly interrupting — if users need to dismiss it to continue, keep the dialog semantics and trap focus.
- Add `aria-label` to each `<nav>` element (`aria-label="Domain sections"`, `aria-label="Hydrology suite"`, etc.).

**Priority:** **P1** (Input inconsistency + LayerLegendPopover trap — both affect keyboard UX). P2 (nav aria-labels — polish).

---

## 4. Screen-reader hooks

**Principle** — State changes that happen outside user action must be announced via `aria-live` (WCAG 4.1.3 Status Messages, Level AA). Form errors need programmatic association. Heading hierarchy should be flat-ish and meaningful.

**Current state (strong coverage)**
- `aria-live="polite"` on: `Toast.tsx:123` (ToastContainer), `OfflineBanner` (status div), `ErrorBoundary` (`role="alert"` + polite), `DashboardSectionSkeleton` (with `aria-busy="true"` during compute), `TypingIndicator` (`role="status"` + polite).
- `FormField.tsx:43-64` wires label ↔ input via `htmlFor` and error/helper messages via injected `aria-describedby` on cloned children. Error messages render with `role="alert"`.
- `Modal.tsx:143` sets `aria-describedby` when a description prop is provided.
- `Input.tsx:56` passes `aria-invalid={error || undefined}`.

**Gap**
- **Heading hierarchy on dashboards is uneven.** `SolarClimateDashboard.tsx` uses `<h1>` for the dashboard title; interior sections use `<h3>` without an `<h2>` bridge. Other dashboards (Hydrology, HerdRotation, NurseryLedger, PlantingTool) follow similar skipping patterns. Screen-reader rotor navigation (H key) will feel jumpy.
- **Tier-3 compute progress is `aria-busy` but result deltas are not announced.** When a score finishes computing and the value flips from "—" to "78/100 (High)", there is no live-region hook to let AT users know the page content just changed meaningfully.
- **Score updates after boundary redraw** likewise have no announcement; the user must re-read the panel manually.

**Recommendation**
- Write a one-page heading-hierarchy rule in `design-system/ogden-atlas/` (or amend `ia-and-panel-conventions.md`) and fix dashboards in a single sweep: dashboard container = `<h1>`, top-level section containers = `<h2>`, sub-sections = `<h3>`. No skipping levels.
- Add an `aria-live="polite"` span to `SiteIntelligencePanel` that reads score changes: *"Site score updated to 78, high confidence"* — debounced so a rapid re-compute doesn't spam AT users.
- Effort: heading pass ~45 min across ~8 dashboard files; live-region ~30 min in one panel component.

**Priority:** **P1** (heading hierarchy — affects AT navigation on the most content-dense pages). P2 (score live-region — enhancement, not a fail).

---

## 5. Tooltip migration closure

**Principle** — Native HTML `title=` tooltips have inconsistent timing, no dark-mode styling, no keyboard surface (cannot be shown by focusing the control), and cannot be styled to meet contrast requirements. A custom delayed tooltip with `role="tooltip"` + `aria-describedby` is the correct primitive (WCAG 1.4.13 Content on Hover or Focus, Level AA).

**Current state**
- `DelayedTooltip.tsx` exists and is the documented standard ([ADR 2026-04-23](../../wiki/decisions/2026-04-23-delayed-tooltip-primitive.md)).
- Grep `title=` across `apps/web/src/**/*.tsx` returns **70 occurrences in 34 files** (as of this audit).
- High-density hotspots:
  - `features/climate/SolarClimateDashboard.tsx` — 9 sites (shadow-chart cells, info chips)
  - `features/regulatory/RegulatoryPanel.tsx` — 7 sites
  - `components/panels/DesignToolsPanel.tsx` — 5 sites (edit/delete role tooltips)
  - `features/project/ProjectDashboard.tsx` — 5 sites
  - `app/AppShell.tsx` — 2 sites (theme toggle, auth button)
  - 29 other files with 1–3 sites each.

Some `title=` usages are on plain `<div>`/`<span>` (annotations on chart cells, keyboard-inaccessible by nature) — those warrant a separate decision: either make them focusable with `tabIndex={0}` + DelayedTooltip, or accept that chart micro-details are mouse-only.

**Gap** — The DelayedTooltip primitive shipped a day ago; adoption has not swept the codebase. Every unmigrated `title=` is a minor a11y regression (no keyboard surface, no styling control) and an onboarding tax for new contributors who see `title=` precedent and copy it.

**Recommendation**
- One mechanical sweep. Replace `title={foo}` on buttons/icons with `<DelayedTooltip label={foo}>` wrapping the element. For `title=` on non-interactive elements, add `tabIndex={0}` + DelayedTooltip if the info matters; otherwise leave alone and document in a comment.
- Effort: ~2 hours for 70 sites, plus ~30 min of case-by-case judgment on non-interactive `title=`.
- Gate: afterwards, grep `title=` in `apps/web/src/**/*.tsx` should return only the DelayedTooltip source file's self-referential comment plus any intentional exceptions (documented inline).

**Priority:** **P2** (polish; no WCAG hard fail since native `title=` is technically exposed to AT — but a meaningful UX upgrade and closes ADR adoption debt).

---

## 6. Motion & reduced motion

**Principle** — Animations exceeding 5 seconds, or flashing content, can trigger seizures or vestibular distress (WCAG 2.3.3 Animation from Interactions, Level AAA). Respecting `prefers-reduced-motion` is Level AA compliance.

**Current state (strong)**
- Nine CSS files already gate animations behind `@media (prefers-reduced-motion: reduce)`:
  - `Skeleton.module.css` (shimmer)
  - `Spinner.module.css` (rotation)
  - `MapLoadingIndicator.module.css:58` (chip + dot)
  - `MapLoadingOverlay.module.css`
  - `Toast.module.css` (slide-in)
  - Landing page heroes + pillars bento
- `DelayedTooltip` uses `setTimeout`, not CSS animation — no media query needed; reduced-motion users simply experience the delay without a fade.

**Gap**
- **`Button.module.css:186-193` — the loading-spinner `@keyframes spin` has no `prefers-reduced-motion` block.** Every loading button spins indefinitely regardless of user preference. Confirmed via grep: `prefers-reduced-motion` count in `Button.module.css` is 0.

**Recommendation**
- Add to `Button.module.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .spinner { animation: none; }
  }
  ```
- Effort: 3 minutes. One-line scan for other CSS modules with animations: `grep -l @keyframes apps/web/src/**/*.module.css | xargs grep -L prefers-reduced-motion` to find stragglers.

**Priority:** **P2** (single known case; most motion already respects the preference).

---

## 7. Color contrast — post-OKLCH compliance stamp

**Principle** — Body text must meet 4.5:1 against its background; large text (18pt/24px or 14pt/18px bold) and non-text UI must meet 3:1 (WCAG 1.4.3 Contrast Minimum + 1.4.11 Non-text Contrast, Level AA).

**Current state (compliant)**
- Dark-mode bases ([`dark-mode.css:10-33`](../../apps/web/src/styles/dark-mode.css)):
  - `--color-text: #f2ede3` on `--color-bg: #1a1611` → **~13:1** (well above body minimum)
  - `--color-text-muted: #9a8a74` on `--color-bg: #1a1611` → **~4.8:1** (passes AA for body; tight)
  - `--color-primary: #c4a265` on `--color-surface: #2a2420` → **~7:1** (passes AA for all text + UI)
  - `--color-success: #5a9e6f` on dark bg → **~6:1** (passes)
  - `--color-warning: #c4a044` on dark bg → **~5:1** (passes)
  - `--color-error: #c45a4a` on dark bg → **~5.5:1** (passes)

No WCAG AA failures detected.

**Gap** — `--color-text-muted` at ~4.8:1 is adequate for UI labels but uncomfortable for small (11–13px) body copy. Grep-spot-check usages in `panel.module.css` and section modules to confirm muted text is not used at font-sizes below 14px.

**Recommendation**
- Add a lint-style check — either a codemod or a documented rule — that `--color-text-muted` must not be paired with `font-size < 14px`. For labels and timestamps that require muted + small, bump either the size (to 14px) or the color (to `--color-text` on a one-step-darker surface).
- Effort: 1 hour including the audit sweep.

**Priority:** **P2** (AA passes today; this is a preventive guardrail against future regressions).

---

## 8. Forms & inputs

**Principle** — Every form control needs a programmatic label; errors must be announced to AT; required fields must be marked in both visual and programmatic channels (WCAG 3.3.1 Error Identification + 1.3.1 Info and Relationships, Level A).

**Current state (strong in primitives)**
- `FormField.tsx:43-64` is the canonical wrapper: `<label htmlFor={id}>` links to the rendered input, `aria-describedby` injects both helper and error ids onto the child input via `React.cloneElement`, error messages render inside `<div role="alert">`.
- `Input.tsx:56` passes `aria-invalid={error || undefined}`.
- `Button.tsx` and `Select` (if present) are not sampled in detail here.

**Gap**
- **FormField is only useful if consumers adopt it.** Direct grep for `<input` (not through FormField) across feature folders shows consumers in `LoginPage.tsx`, several modals (`StructurePropertiesModal`, `BoundaryEditor`), and mobile capture flows. Not all wire up label/aria-describedby correctly.
- **No visible "required" indicator** convention — both visual (asterisk) and programmatic (`required` attribute + aria-required).
- **Async form validation announcements** are not standardized — saves and failures use Toast, but inline field errors during typing may or may not push through `aria-describedby`.

**Recommendation**
- Inventory every `<input>`, `<textarea>`, `<select>` in `apps/web/src/**/*.tsx`; for each, confirm it's either wrapped in `FormField` or has an explicit associated label + error wiring. Produce a punch list of bare inputs.
- Standardize required-field marking: `FormField` gains a `required?: boolean` prop that renders a visual asterisk and sets `required` + `aria-required="true"` on the child.
- Effort: ~2 hours inventory + ~30 min primitive change.

**Priority:** **P1** (forms are high-stakes for users with AT; bare inputs can silently break data entry).

---

## Priority Summary

| # | Area | Priority | Status | Effort | Notes |
|---|---|---|---|---|---|
| 1 | **Skip-link + main-content anchor** | **P0** | ✅ shipped | S (15 min) | Slice 1 — `AppShell.tsx` |
| 1 | IconSidebar `<aside>` → `<nav>` | P1 | ✅ shipped | S | Slice 1 |
| 2 | `<div onClick>` triage on 12 files | P1 | ✅ shipped | M (1 h) | Slice 2 — 12 backdrops gained Escape handlers + `role="dialog" aria-modal`; MilestoneMarkers card → `role="button"` + keyboard |
| 3 | Input focus-ring color parity | P1 | ✅ shipped | S (2 min) | Slice 1 |
| 3 | LayerLegendPopover focus trap | P1 | ✅ shipped | S (30 min) | Slice 1 |
| 4 | Dashboard heading hierarchy | P1 | ✅ shipped | M (45 min) | Slice 2 — 9 dashboards |
| 8 | Form input inventory + FormField adoption | P1 | ✅ shipped | M (~2 h) | Slice 2 — 22 controls wired with `htmlFor`/`id` across 3 files |
| 3 | Nav aria-labels | P2 | ✅ shipped | S (10 min) | Slice 2 — 3 of 4 `<nav>`s (LandingNav untracked; label in working tree for its eventual commit) |
| 4 | Score live-region in SiteIntelligencePanel | P2 | ✅ shipped | S (30 min) | Slice 2 — `ScoresAndFlagsSection` suitability card |
| 5 | `title=` → DelayedTooltip sweep (70 sites) | P2 | ✅ shipped | M (~2 h) | Slice 1 |
| 6 | Button spinner reduced-motion | P2 | ✅ shipped | S (3 min) | Slice 2 — `Button.module.css` |
| 7 | Muted-text font-size guardrail | P2 | ✅ shipped | M (1 h) | Slice 2 — documented rule in `tokens.css` (≥14px floor for `--color-text-muted`) |

**All 12 findings shipped across slices 1 and 2.** P0 + all P1s + all P2s now closed.

---

## Deferred / out of scope

These are explicitly not covered by this audit and should be scheduled as separate passes:

- **Mobile `SlideUpPanel` ergonomics** — touch targets (WCAG 2.5.5 Target Size, AAA in 2.1 / AA in 2.2), sheet-drag a11y, back-gesture handling. Separate mobile audit.
- **Performance budgets** for map + overlay stacking — CLS/LCP from Cesium swaps, overlay re-renders. Separate perf audit (the UX Scholar audit also deferred this).
- **Public portal (`PublicPortalShell`)** — different user cohort (landowners vs. operators), different IA concerns. Portal-specific a11y pass needed before public launch.
- **Automated axe/Lighthouse integration** — set up `@axe-core/react` in dev + Lighthouse CI on staging. Would catch regressions but is a tooling task, not a current-state finding.
- **WCAG 2.2 Level AA additions** — target-size minimum (2.5.8), focus-not-obscured (2.4.11), dragging movements (2.5.7), consistent help (3.2.6). Worth tracking but Atlas targets 2.1 AA today.
- **ARIA patterns not currently in use** — combobox, treeview, grid. When the Scenarios panel or Cross-Domain comparison surfaces adopt these patterns, audit at that time.
- **Map canvas a11y** — MapLibre GL is a `<canvas>` element; there is no native a11y layer for pan/zoom/feature-click. A non-visual parallel UI (e.g., boundary + feature list in the rail) is the typical mitigation but is out of scope here.
- **Authenticated flows** — login, password reset, SSO handshake. `LoginPage.tsx` was not sampled in depth; a standalone auth-flow audit should precede any compliance review.

---

## Verification protocol (for the eventual implementation slice)

When P0/P1 items land, verify with:

1. **Keyboard-only traversal**: Tab from page load through the full flow. Skip-link must be first focus; every interactive control must show a visible ring; focus must never disappear into a canvas or untrapped dialog.
2. **Screen reader sweep**: VoiceOver (macOS) rotor navigation by landmarks, headings, and form controls on `/project/<id>`. Verify landmarks read correctly, headings are not skipped, form errors announce.
3. **`prefers-reduced-motion`**: toggle macOS *Reduce Motion* / Windows *Show animations* off and verify no animation still plays.
4. **Automated scan**: run `axe` DevTools on `/home`, `/project/<id>`, `/project/<id>/solar`, `/new`, `/login`. Record baseline; re-run after each P1 lands.
5. **Contrast spot-check**: use Deque Color Contrast Analyzer on `--color-text-muted` text at every font size it appears in.

---

## References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/) — Level A + AA success criteria
- [The A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Deque ARIA Practices](https://www.deque.com/axe/) — patterns for dialog, combobox, tooltip
- UX Scholar audit: [`ui-ux-scholar-audit.md`](./ui-ux-scholar-audit.md)
- IA & Panel Conventions: [`ia-and-panel-conventions.md`](./ia-and-panel-conventions.md)
- OKLCH token ADR: [`wiki/decisions/2026-04-23-oklch-token-migration.md`](../../wiki/decisions/2026-04-23-oklch-token-migration.md)
- DelayedTooltip ADR: [`wiki/decisions/2026-04-23-delayed-tooltip-primitive.md`](../../wiki/decisions/2026-04-23-delayed-tooltip-primitive.md)
- MapControlPopover + mapZIndex ADR: [`wiki/decisions/2026-04-24-map-control-popover-and-mapzindex.md`](../../wiki/decisions/2026-04-24-map-control-popover-and-mapzindex.md)

---

*Next session: produce an implementation plan that executes §1 (skip-link + nav semantics — P0) and at least §§2 + 3 (keyboard-operable interactives + focus-ring parity — P1). The sweep in §5 (tooltip migration) can run in parallel or fill a buffer session — it is mechanical and touches many files but carries no architectural risk.*
