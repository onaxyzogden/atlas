# 2026-05-30 — Portfolio Home P2: at-a-glance right rail + bottom stage rail

**Backfilled 2026-05-31 from commit history** (commits `7a0ff085` + `15bd29a2`) — code-committed in a prior session but never logged at the time; reconstructed from the commit bodies + `--stat` for epic-record completeness.

**Branch.** `feat/atlas-permaculture` (`7a0ff085` 6 files +1261/−3, then mount follow-up `15bd29a2` 1 file +6/−19; not pushed). Phase 2 of the OLOS Portfolio Home epic — wires both rails of the four-zone map to the selected project. Builds on P1 ([[log/2026-05-30-portfolio-home-p1-four-zone-shell]]).

**What shipped.** A composing read-only briefing hook + the two rails, both strictly read-only (no mutators imported).

- **`usePortfolioBriefing`** — assembles project type badges, stage/stratum with Plan progress, last activity, an Observe snapshot (latest point per domain with status-severity trend), and the urgency breakdown — reusing the same shared selectors and `useProjectUrgency` the existing surfaces use, so copy and semantics never drift.
- **`PortfolioAtAGlanceRail`** (right, §2.4) — serif name + primary/secondary type badges + area; stage pill + active stratum + Plan progress bar; last-activity line; tappable Observe metric chips (open the domain); alert chips from the shared urgency chips (open Act or Observe by channel); relationships **stub until P5**; empty state when nothing is selected.
- **`PortfolioStageRail`** (bottom, §2.5) — three always-enabled Plan/Act/Observe buttons with live sublabels; the current-stage button filled, others outlined; colours bound to the High-Tech Earth stage tokens; each navigates into that stage for the selected project.
- State colours bind to semantic status + stage-identity tokens, centralised in the two CSS modules for P3 sign-off.

**Mount follow-up (`15bd29a2`).** Replaced the P1 right/bottom placeholders in `PortfolioMapPage` with the live rails, each fed the selected project's read-only briefing and rendering its own empty state. Preview-verified: selecting Moontrance Creek populated the right rail (stratum + 0/8 objectives, last activity, Observe snapshot, alert chips) and the bottom rail (Plan S1 0/8, Act outstanding, Observe baseline); the Plan button navigated to `/v3/project/mtc/plan/stratum/s1-project-foundation`; stage colours bound to the High-Tech Earth tokens with the current stage filled.

**Discipline.** Append-only commits on the rebased branch ([[project-branch-rebase]]); not pushed. CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]). Continues [[log/2026-05-30-portfolio-home-p1-four-zone-shell]]; ADR [[decisions/2026-05-31-atlas-portfolio-home-p7]]; entity [[entities/web-app]].
