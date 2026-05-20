# 2026-05-03 — `apps/atlas-ui` lifted; 11 OBSERVE pages on typed `builtin-sample.js` adapter


New app `apps/atlas-ui` (React 19 + Vite 7, port 5300) added to the
pnpm + Turborepo workspace alongside `apps/web`. The OGDEN Land
Operating System prototype was lifted verbatim into the monorepo
(Phase 1A), QaOverlay-toggled to visual fidelity (Phase 1B), then
all 11 OBSERVE routes refactored onto a single-source-of-truth typed
view-model module at
[`apps/atlas-ui/src/data/builtin-sample.js`](../apps/atlas-ui/src/data/builtin-sample.js)
(Phase 1C).

**Pages refactored (11):** ObservePage, ObserveDashboardPage,
HumanContextDashboardPage, StewardSurveyPage,
IndigenousRegionalContextPage, VisionPage, MacroclimateDashboardPage,
SolarClimateDetailPage, TopographyDashboardPage, TerrainDetailPage,
CrossSectionToolPage, EarthWaterEcologyPage.

**Pattern.** Each page imports a named view-model from
`builtin-sample.js` as `vm` plus optional `siteBanner` /
`breadcrumbStem`. Icons in data are **string keys**
(`"sun"`, `"droplet"`, `"triangle"`); per-page `iconMap` resolves
to `lucide-react` components at render time. Keeps the data file a
pure-value module that `/projects/builtins` can replace one-to-one.

**351 House — Halton, ON** is the sample project (sentinel UUID
`00000000-0000-0000-0000-0000005a3791`). Prototype's hardcoded
"Green Valley Homestead / Nimbin, NSW" strings replaced with
`siteBanner.siteName` / `siteBanner.location` across detail-page
footers.

**Forward-reference TDZ caught.** Initial `siteBanner.lastUpdatedAbsolute`
referenced `observeStageProgress` (declared later in the module)
→ `ReferenceError: Cannot access 'observeStageProgress' before
initialization` on every reload. Fixed by inlining the literal
`"Today, 9:42 AM"`. Rule: never reference a later `const` from an
earlier `export const` in module scope.

**Verification.** Smoke-test on port 5300 — all 11 routes load, no
console errors. terrain-detail / cross-section-tool /
earth-water-ecology spot-checked: footer reads from `siteBanner`,
KPI / soil / overlay counts match adapter shape (5 KPIs + 4 segments
+ 7 overlays / 6 KPIs + 5 soil rows respectively). `apps/web` runs
unchanged on its own port.

ADR: [decisions/2026-05-03-atlas-ui-prototype-lift.md](decisions/2026-05-03-atlas-ui-prototype-lift.md).

Out of scope this phase: routing migration (prototype's pathname
switch retained), auth (Supabase deferred), PLAN/ACT stages
(spec PNGs only), replacing `apps/web`.
