---
name: M6 SWOT — Conform JSX to OGDEN reference, preserve VM wiring
description: Re-port the three M6 SWOT pages verbatim from OGDEN prototype after structural drift in initial port; vm data wiring kept; one approved deviation (dynamic radar polygon)
type: decision
date: 2026-05-03
---

# 2026-05-03 — M6 SWOT conform to OGDEN reference

## Trigger

Static CSS/JSX audit of `apps/atlas-ui` M6 SWOT pages (commit `e1930b4`) against
the OGDEN Land Operating System prototype at
`C:\Users\MY OWN AXIS\Documents\OGDEN Land Operating System\src\pages\` revealed
structural drift introduced during the initial port:

- `SwotDashboardPage.jsx` lost the `.swot-hero` wrapper element and the
  `.swot-main` flex column; equation strip rendered without its grid.
- `SwotJournalPage.jsx` had hardcoded copy substituted with vm strings where
  not needed; KPI label translation was open-coded rather than mapped.
- `SwotDiagnosisReportPage.jsx` dropped the `.is-active` modifier on
  `.verdean-subnav`, lost the prioritized-findings dot-pattern math, and
  reordered facts in the executive summary.

Visual symptom: hero typography fell back, primary CTAs lost green-button
styling, journal-preview rows lacked their grid, diagnosis cards rendered as
bare `SurfaceCard`s.

## Decision

Treat OGDEN's `src/pages/` as the canonical guide for M6 SWOT structure and
aesthetics. Re-port the three page files verbatim, then surgically reintroduce
exactly four atlas-ui-specific concerns:

1. **VM imports** — `swotDashboard`, `swotJournal`, `swotSynthesis` from
   `data/builtin-sample.js`; `useBuiltinProject()` for site-name/area on the
   diagnosis report.
2. **VM injection at data-only points** — quadrant counts, list items, score
   numbers, table rows continue to read from VM. UPPERCASE vm labels
   (`STRENGTHS`, `WEAKNESSES`, …) translated via `KPI_BY_LABEL` /
   `KPI_LABEL_DISPLAY` lookup maps so the OGDEN className-derivation pattern
   keeps working.
3. **TanStack Router `Link`** — internal nav stays on `<Link to="/observe/...">`
   instead of OGDEN's plain `<a href>` / `onClick(history.pushState)` pattern.
   Lucide's `Link` icon aliased to `LinkIcon` to avoid collision.
4. **Site/user labels** — kept as "351 House" / "Yousef A." (OGDEN uses generic
   placeholders).

**One approved deviation:** the diamond radar polygon in `SwotDiagnosisReportPage`
remains dynamic (`cx ± (value/10) * r`) rather than OGDEN's static points. This
is the functional improvement that justifies VM wiring on the synthesis page —
the radar responds to live `vm.swotDiamond` scores.

## CSS audit conclusion

Initial plan anticipated ~20 missing selectors plus a missing `.green-button`
base rule. **Re-grep confirmed the atlas-ui M6 SWOT block (`styles.css` lines
8101–10507) already contains every OGDEN SWOT selector** including
`.swot-hero h1`, `.swot-equations`, `.swot-journal-rows p`,
`.swot-panel-card button`, `.diagnosis-card section`, `.verdean-subnav .is-active`,
and the full report-card family. `.green-button` base rule exists at line 1195
matching OGDEN's line 7055 byte-for-byte. **No CSS backfill needed** — the
visual drift was entirely structural (JSX) not stylistic.

## Files

- `apps/atlas-ui/src/pages/SwotDashboardPage.jsx` — full rewrite, 154 → 90 lines
- `apps/atlas-ui/src/pages/SwotJournalPage.jsx` — full rewrite, 186 → 99 lines
- `apps/atlas-ui/src/pages/SwotDiagnosisReportPage.jsx` — full rewrite, 97 → 99 lines
- Net: +145 / −292 across 3 files

## Verification

- `pnpm --filter atlas-ui build` — clean, 4.14s, 142 KB CSS / 481 KB JS
- `preview_console_logs --level error` on `/observe/swot`,
  `/observe/swot/journal`, `/observe/swot/diagnosis-report` — empty
- DOM eval: each route's `<h1>` resolves to expected text
  ("SWOT Synthesis", "SWOT journal", "Diagnosis report")
- `preview_screenshot` timed out repeatedly during this session; visual
  side-by-side diff against OGDEN deferred until tool recovers

## Why

OGDEN is the canonical design source. Drift introduced during initial JSX
port — even when CSS rules were copied — broke the structural contract those
rules expect. Conforming JSX back to the OGDEN template restores the visual
fidelity without giving up the VM-driven dynamism that makes atlas-ui useful.

## How to apply

When porting future OGDEN pages into atlas-ui:
- Copy the JSX verbatim first.
- Substitute only at data-injection points; keep wrapper elements,
  decorative `<i />` separators, hardcoded copy, and class names intact.
- Convert OGDEN's `<a>` / `onClick(history.pushState)` navigation to TanStack
  `<Link to="...">`.
- Add `screenCatalog` metadata + `QaOverlay` block at the bottom for
  pixel-checking.
- Re-grep both stylesheets after the port to confirm every selector resolves
  before assuming a CSS backfill is needed.

## Commit

`ba32fc7 refactor(atlas-ui): conform M6 SWOT JSX to OGDEN reference (preserve VM wiring)`
