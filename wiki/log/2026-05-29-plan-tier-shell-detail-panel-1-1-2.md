# 2026-05-29 — Plan Tier Shell detail-panel 1/4 / 1/4 / 1/2 proportional columns

Steward request: when the Plan Tier Shell's ObjectiveDetailPanel is open
(all three columns visible), set the column widths to **1/4 / 1/4 / 1/2**
of the grid area — tier spine quarter, objective list quarter, detail
panel half. CSS-only follow-up to
[[decisions/2026-05-27-atlas-plan-tier-shell-phase1]] Slice 1.6.

## Change

`apps/web/src/v3/plan/tiers/PlanTierShell.module.css` — the
`.layout[data-has-detail-panel='true']` rule swaps the pixel-fixed
`minmax(0, 260px) / minmax(0, 300px) / minmax(0, 1fr)` for fractional
`minmax(0, 1fr) / minmax(0, 1fr) / minmax(0, 2fr)`. The `minmax(0, …)`
wrap is preserved (prevents grid blowout when child content — e.g. the
embedded map — is wider than its column). `gap: 20px` unchanged.

Other layout modes untouched:
- `.layout` base (spine-only, no tier selected).
- `.layout[data-has-objective-column='true']` (two-column, tier selected
  without an objective).
- `@media (max-width: 960px)` mobile collapse (single grid track) — fires
  unchanged because it overrides `grid-template-columns` wholesale.

## Verification

Live `preview_eval` against `/v3/project/$id/plan/tier/t0-project-foundation/objective/t0-vision`
at 1440×900: `grid-template-columns: 322.5px 322.5px 645px`, exact 1 : 1 : 2 ratio
(detail panel is precisely 2× each side column). At ≤960px the layout
collapses to a single grid track and sections stack vertically (top
offsets 291 / 835 / 1231), confirming the mobile rule still fires.
Screenshot tool was unresponsive (browser tab hidden in headless preview
mode → renderer pauses paint) — disclosed not assumed; the
`getBoundingClientRect`-based measurement is the canonical evidence per
[[concepts/local-first-architecture]]-style "verify-don't-screenshot"
preference when both are available.

No ADR — proportion tweak is too narrow for a standalone decision
record; precedent is `1bc907d4` (single-scroll restore) and `a6ee7ae8`
(per-column scroll), both CSS-only follow-ups to the same shell that
shipped without their own ADRs. The Phase 1 ADR remains canonical for
Slice 1.6 layout rationale.

## Branch state

`feat/atlas-permaculture` was 2 commits ahead of `origin` at session
start (carry-over from the 2026-05-29 projectType-normalization fix and
prior session). Pre-flight `git diff --cached --name-only` confirmed
only the CSS file + this log entry + `log.md`/`index.md` pointers
staged; foreign WIP from parallel sessions (capitalPartnerSummary,
EconomicsPanel, financialStore, DesignMap, DiagnoseMap, OperateMap,
MaterialSubstitutionsCard, substitutionCatalog, ZoneSomSidebar,
graphify-out/*, evidence/selectors/capitalPartner) left out per
[[feedback-no-deletion]]. Explicit-path commit per
[[feedback-commit-immediately-on-rebased-branches]]. Divergence-check
via `git fetch origin feat/atlas-permaculture` + ahead/behind probe
before push. CSRA model untouched; ASCII-only copy.
