# 2026-05-03 — `apps/atlas-ui` prototype lift + typed builtin-sample adapter

## Context

The user produced a complete OBSERVE-stage React prototype at
`C:\Users\MY OWN AXIS\Documents\OGDEN Land Operating System\` (React 19 +
Vite 7, 11 pages + 18 reusable components + `screenCatalog.js` manifest +
dev `QaOverlay`, deep-forest dark palette). The existing `apps/web` is
visually dense and offers no narrative scaffolding for the OBSERVE
diagnostic flow; rather than retrofit, the decision was to lift the
prototype into the monorepo as a new app and progressively wire it to
the existing `apps/api` + `packages/shared` substrate.

## Decision

1. **New app, not refactor.** `apps/atlas-ui` added alongside `apps/web`
   in the existing pnpm + Turborepo workspace. `apps/web` stays running
   unchanged as the production frontend.
2. **Phase 1A — Lift verbatim.** Prototype `src/`, `index.html`,
   `vite.config.js`, `scripts/`, `docs/`, `legacy/` copied as-is into
   `apps/atlas-ui/`. Workspace-aligned `package.json` (`@ogden/atlas-ui`,
   private, type=module, dev port 5300). React pinned to 19 (no shared
   component imports yet, so React 18/19 conflict deferred).
3. **Phase 1B — Visual fidelity.** Each route's `QaOverlay` toggled at
   the catalog viewport against its reference PNG.
4. **Phase 1C — Typed adapter, not direct fetch.** Introduced
   `apps/atlas-ui/src/data/builtin-sample.js` as a single-source-of-truth
   view-model module. All 11 OBSERVE pages now import named view-models
   from there:
   - `observeStageMetrics`, `observeModules`, `observeStageProgress`
   - `humanContextDashboard`, `stewardSurvey`,
     `indigenousRegionalContext`, `visionPage`
   - `macroclimateDashboard`, `solarClimateDetail`
   - `topographyDashboard`, `terrainDetail`, `crossSectionTool`
   - `earthWaterEcologyPage`
   - Shared `siteBanner` + `breadcrumbStem` reused across detail-page
     footers and breadcrumb stems.
5. **Icon-key strings, not component refs, in data.** View-models
   contain string keys (`"sun"`, `"droplet"`, `"triangle"`); each page
   carries a small `iconMap` that resolves keys to `lucide-react`
   components at render time. Keeps the data file a pure-value module
   that can be replaced with a fetch result without touching React.
6. **Sample project = 351 House — Halton, ON** (sentinel UUID
   `00000000-0000-0000-0000-0000005a3791`). Hardcoded prototype strings
   ("Green Valley Homestead", "Nimbin, NSW, Australia") replaced with
   `siteBanner.siteName` / `siteBanner.location` etc.

## Why

- **One swap, eleven pages.** When the unauthenticated
  `GET /projects/builtins` endpoint lands, replacing the default export
  of `builtin-sample.js` with a fetch result swaps every OBSERVE page in
  one file. No component-level refactor required.
- **Auth deferred cleanly.** Builtin sample carries us through visual +
  data wiring without plumbing Supabase into atlas-ui yet.
- **Prototype layout preserved.** The lift was verbatim; visual diffs
  against the reference PNGs are stable. No design "improvements"
  injected during the move.

## How to apply

- New OBSERVE pages: extend `builtin-sample.js` with a named view-model;
  page imports it as `vm` plus any needed `siteBanner`/`breadcrumbStem`.
- Icons in data: pass the **string key**, resolve via a per-page
  `iconMap`. Never import `lucide-react` from the data module.
- Site/location strings: read from `siteBanner` — never hardcode the
  prototype's "Green Valley Homestead" defaults.
- React-19-only deps: keep them inside `apps/atlas-ui` until shared
  component imports are introduced. `apps/web` stays React 18.

## Out of scope

- Routing migration (the prototype's `window.location.pathname` switch
  in `src/main.jsx` is retained until visual fidelity stabilizes).
- Auth (Supabase) — the builtin sample is the substrate.
- PLAN/ACT stages — design-spec PNGs only this phase; not built.
- Replacing `apps/web` — atlas-ui must reach parity + auth + write
  paths before that conversation reopens.

## Verification

- `pnpm --filter atlas-ui dev` serves on port 5300; all 11 OBSERVE
  routes load, no console errors.
- Smoke-tested `/observe/topography/terrain-detail`,
  `/observe/topography/cross-section-tool`,
  `/observe/earth-water-ecology` after the final adapter pass:
  - terrain-detail footer: `Site: 351 House — Atlas Sample · Location:
    Halton, ON, Canada · …`
  - cross-section-tool: 5 KPIs, 4 segments + intro span, 7 overlay
    toggles — all from `vm`.
  - earth-water-ecology: 6 KPIs, 5 soil rows, footer mapped to
    `siteBanner`.
