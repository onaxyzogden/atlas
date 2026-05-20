# 2026-05-03 — M6 SWOT conform to OGDEN reference


**Trigger.** Static audit of `apps/atlas-ui` M6 SWOT pages (commit `e1930b4`) against the OGDEN prototype at `C:\Users\MY OWN AXIS\Documents\OGDEN Land Operating System\src\pages\` — initial port had drifted: missing `.swot-hero` wrapper, dropped `.is-active` modifier on `.verdean-subnav`, hardcoded copy substituted with vm strings where unnecessary, prioritized-findings dot math removed.

**Decision.** Treat OGDEN's `src/pages/` as canonical. Re-port verbatim, surgically reintroduce four atlas-ui-specific concerns: vm imports (`swotDashboard`/`swotJournal`/`swotSynthesis` + `useBuiltinProject`), vm injection at data-only points (with `KPI_BY_LABEL`/`KPI_LABEL_DISPLAY` translation maps for UPPERCASE labels), TanStack Router `Link` (Lucide `Link` icon aliased to `LinkIcon`), and "351 House"/"Yousef A." labels. One approved deviation: dynamic `ReportRadar` polygon driven by `vm.swotDiamond`. ADR: [`decisions/2026-05-03-m6-swot-conform-to-ogden.md`](decisions/2026-05-03-m6-swot-conform-to-ogden.md).

**CSS audit conclusion.** Re-grep confirmed atlas-ui's M6 SWOT block (`styles.css` 8101–10507) already contains every OGDEN selector — `.swot-hero h1`, `.swot-equations`, `.swot-journal-rows p`, `.swot-panel-card button`, `.diagnosis-card section`, `.verdean-subnav .is-active`, full report-card family — and `.green-button` base at line 1195 matches OGDEN's line 7055 byte-for-byte. **No CSS backfill needed**; the visual drift was entirely structural (JSX), not stylistic.

**Files.** Three pages rewritten, net +145/−292:
- [`SwotDashboardPage.jsx`](apps/atlas-ui/src/pages/SwotDashboardPage.jsx)
- [`SwotJournalPage.jsx`](apps/atlas-ui/src/pages/SwotJournalPage.jsx)
- [`SwotDiagnosisReportPage.jsx`](apps/atlas-ui/src/pages/SwotDiagnosisReportPage.jsx)

**Verification.** `pnpm --filter atlas-ui build` clean (4.14s, 142 KB CSS / 481 KB JS). `preview_console_logs --level error` empty across all three SWOT routes. DOM eval on each route confirms expected `<h1>` text. `preview_screenshot` timed out repeatedly during this session — visual side-by-side diff against OGDEN deferred until tool recovers.

**Commit.** `ba32fc7`.

### Deferred

- **Visual side-by-side diff** against OGDEN once `preview_screenshot` is responsive — register OGDEN at port 4173 in `.claude/launch.json`, navigate both servers to `/observe/swot`, `/observe/swot/journal`, `/observe/swot/diagnosis-report` at viewport 1672×941, screenshot pair-wise.
- **`preview_inspect`** on six previously-broken selectors (`.swot-hero h1`, `.swot-equations`, `.swot-journal-rows`, `.diagnosis-card section`, `.verdean-subnav .is-active`, `.green-button`) to confirm computed values match OGDEN.

### Recommended next session

- Pair the M6 SWOT conform with the deferred visual side-by-side once screenshot tool recovers.
- Or — pivot to PLAN/ACT stage: 100+ reference PNGs in `C:\Users\MY OWN AXIS\Documents\OGDEN Land Operating System\src\assets\reference\` are spec-only and not yet built into pages.
- Or — pick up the deferred follow-ups from 2026-04-26 (Zustand selector sweep on `features/vision/` + `features/export/` `getVisionData` sites).
