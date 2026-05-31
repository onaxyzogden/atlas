# 2026-05-30 — Portfolio Home P1: four-zone shell + multi-boundary map

**Backfilled 2026-05-31 from commit history** (commit `37f0d062`) — this phase was code-committed in a prior session but never logged at the time; reconstructed from the commit body + `--stat` so the OLOS Portfolio Home epic's wiki record is complete end-to-end. See [[log/2026-05-31-portfolio-home-p7]] / [[log/2026-05-31-portfolio-home-p8-acceptance]] for the phases that flagged this gap.

**Branch.** `feat/atlas-permaculture` (commit `37f0d062`, 12 files +1413/−60; not pushed). Phase 1 of the OLOS Portfolio Home epic (`OLOS_Portfolio_Home_Spec_v1.0`, plan `olos-port-twinkly-peach`) — the multi-project landing surface. Builds on the Phase-5 urgency card grid ([[log/2026-05-28-portfolio-home-slice53]]).

**What shipped.** `/v3/portfolio` now defaults to a four-zone **Map** view (left project list · centre multi-boundary MapLibre map · placeholder right rail · placeholder bottom stage rail) with a top-bar toggle that preserves the existing urgency card grid as the **Dashboard** view (no-deletion rule — the grid body was extracted verbatim).

- **`portfolioModel.ts`** — pure helpers: `PortfolioStage`, `STAGE_PAINT`, `derivePortfolioStage` (coarse for P1 — returns `'plan'` whenever geometry exists, reconciled to live data in P3), boundary FeatureCollection + centroid/area helpers.
- **`PortfolioMap.tsx`** — MapLibre host reusing `lib/maplibre` + `useBasemapStore` + `MapTokenMissing`; a single FeatureCollection with data-driven stage paint (the `PlanDataLayers` `as never` idiom), idempotent `styledata` re-add, DOM marker pins, feature-state selection + fly-to, fit-all control.
- **`PortfolioProjectList.tsx`** — left rail: text filter, stage chips, selectable rows, empty state.
- **`PortfolioMapPage.tsx`** — four-zone CSS grid; right/bottom rails stubbed for P2 (`PortfolioAtAGlanceRail` / `PortfolioStageRail`).
- **`PortfolioViewToggle.tsx`** + **`PortfolioDashboardView.tsx`** — Map⇄Dashboard segmented toggle; existing grid extracted verbatim.

**Deferred to later phases.** Right/bottom rails + live rail data (P2); stage-colour tokens + true per-project stage derivation (P3); mobile (P3); the plan/act/observe stage split. Migration numbering and full-stack data come in P4–P6.

**Discipline.** Append-only commit on the rebased branch ([[project-branch-rebase]]); not pushed. CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); 3-item nav forward IA ([[project-lifecycle-retirement]]). Continues [[log/2026-05-28-portfolio-home-slice53]]; ADR for the epic's decisions is [[decisions/2026-05-31-atlas-portfolio-home-p7]]; entity [[entities/web-app]].
