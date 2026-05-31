# 2026-05-31 — Portfolio Home P3: §2.6 stage colouring unified across map + list, mobile sheets

**Backfilled 2026-05-31 from commit history** (commit `203b5d39`) — code-committed in a prior session but never logged at the time; reconstructed from the commit body + `--stat` for epic-record completeness.

**Branch.** `feat/atlas-permaculture` (commit `203b5d39`, 8 files +300/−80; not pushed). Phase 3 of the OLOS Portfolio Home epic. Builds on P2 ([[log/2026-05-30-portfolio-home-p2-rails]]).

**What shipped.** Ratify the spec's §2.6 boundary semantics onto the **existing High-Tech Earth stage tokens** (no new placeholder palette), reconcile `STAGE_PAINT` to those exact hexes, derive one live stage rule shared by the selected-project rail and every project's map boundary + list pill, and add the mobile slide-up list / bottom-sheet rail.

- **`tokens.css`** — add `--color-stage-setup` (Muted Sand) + `--color-stage-archived` (Neutral Grey) so the two map-only stages have named DOM tokens.
- **`portfolioModel.ts`** — reconcile `STAGE_PAINT` hexes to mirror the stage tokens (plan `#38a3a5`, act `#d9a036`, observe `#6c8294`); extract `OUTSTANDING_STATUSES` + `deriveStageFromSignals` as the canonical live-data rule; `buildBoundaryFeatureCollection` now accepts a per-project stage map.
- **`usePortfolioBriefing.ts`** — call `deriveStageFromSignals` (no behaviour change).
- **`usePortfolioStages.ts`** (new) — compute the live §2.6 stage for **every** project from the field-action / observe / plan-progress stores.
- **`PortfolioMap` / `PortfolioMapPage` / `PortfolioProjectList`** — thread `stageById` so boundaries, label pins, list dots, and the stage filter all share one stage (fixing P1's coarse `derivePortfolioStage` painting every boundary teal).
- **`PortfolioMapPage.module.css`** — mobile (≤760) slide-up project list behind a Projects toggle; right rail becomes a bottom sheet on selection (≤1000); bottom stage rail stays fixed; dead P1 stub classes removed.

**Verified.** web `tsc` clean; preview at 1280 / 900 / 600px — list + pin stages match (setup/act/plan), mobile toggle + sheet open/close, tablet rail bottom-sheet.

**Discipline.** Append-only commit on the rebased branch ([[project-branch-rebase]]); not pushed. CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]). Continues [[log/2026-05-30-portfolio-home-p2-rails]]; ADR [[decisions/2026-05-31-atlas-portfolio-home-p7]]; entity [[entities/web-app]].
