# 2026-05-20 — Phase 0: Apricot-Lane showcase blocker close

Branch `feat/atlas-permaculture`. Closes the still-open residue of the 5/20
walkthrough top-10 against the Apricot-Lane showcase program plan (Phase 0).
Four tasks: two IMPLEMENT (gap #5 nursery/catalogue discoverability, gap #8
auth-guard re-enable), two VERIFY (gap #4 scorecard partition, gap #9
Create-Account tab toggle). One VERIFY was promoted IMPLEMENT after an
in-file audit refuted the prior session's "already shipped" claim.

## Outcome by gap

- **#4 (VERIFY → IMPLEMENT) scorecard 13→8.** Audit of
  [`LandAssessmentSlideUp.tsx`](../../apps/web/src/components/LevelNavigator/LandAssessmentSlideUp.tsx)
  found no `CORE_EIGHT_LABELS` partition, no `<details>` collapse, no
  "Pending data" badge despite the program plan's assertion of all three
  having shipped. Built the partition from scratch: new
  `CORE_EIGHT_LABELS: ReadonlySet<string>` keyed on the 8 weighted-overall
  dimensions per
  [`packages/shared/src/scoring/computeScores.ts`](../../packages/shared/src/scoring/computeScores.ts)
  (the remaining 5 are explicitly weight-0 diagnostic per inline comments
  in the order array). `useMemo` partitions `scores` into `coreScores` +
  `diagnosticScores`; the latter renders inside `<details>` with the
  summary `Diagnostic facets ({N})`. Subtitle added under the header:
  *"Eight-dimension assessment, scored against your site layers."*
  `isPending(item) = item.rating === 'Insufficient Data'` (keys off the
  walkthrough complaint directly; the original `dataSources.length === 0`
  heuristic never fired because `buildResult` populates `dataSources` for
  every component regardless of value). Pending rows render `—` instead of
  a score and a `Pending data` badge instead of `Insufficient Data / 25`.
  FAO/USDA classification override strings (`S2 — Moderately Suitable`,
  `Class III — Suited to cultivation`) preserved unchanged. Scorer
  untouched — partition is presentational only.

- **#5 (IMPLEMENT) nursery / planting catalogue discoverability.** Two
  reuses, no new substrate:
  - **Catalogue half** already discoverable: `MODULE_CARDS['plant-systems'][0]`
    in [`v3/plan/types.ts`](../../apps/web/src/v3/plan/types.ts) already had
    `{ label: 'Plant database', sectionId: 'plan-plant-database' }` routing to
    `PlantDatabaseSiteMatchCard` via the Plan slide-up. Re-verified live.
  - **Nursery ledger half** wired additively:
    - New entry in `MODULE_CARDS['plant-systems']`:
      `{ label: 'Nursery ledger', sectionId: 'nursery-ledger' }`.
    - New `'nursery-ledger'` case in
      [`PlanModuleSlideUp.tsx`](../../apps/web/src/v3/plan/PlanModuleSlideUp.tsx)
      lazy-loads the existing
      [`NurseryLedgerDashboard`](../../apps/web/src/features/dashboard/pages/NurseryLedgerDashboard.tsx)
      and renders it inside the slide-up with the standard
      `{project, onSwitchToMap}` contract.
    - Parallel entry added to `PlanHub` Module 4 actions for the
      Hub-rooted path
      ([`features/plan/PlanHub.tsx`](../../apps/web/src/features/plan/PlanHub.tsx)).
  - Preview-verified: click Plants → click Nursery ledger →
    `<h2>Nursery Ledger</h2>` + Propagation Inventory + Germination
    Calendar sections render inside the slide-up.

- **#8 (IMPLEMENT) auth-guard re-enable.** Single `beforeLoad` guard on
  `appShellRoute` in
  [`routes/index.tsx`](../../apps/web/src/routes/index.tsx):
  unauthenticated visitors redirect to `/login?redirect=<location.href>`
  for every nested route — `/home`, `/new`, `/project/*`,
  `/projects/compare`, `/v3/project/*`, `/v3/components`, etc. Public
  routes (landing `/`, `/login`, `/portal/$slug`, `/report-share/$token`)
  are siblings of `appShellRoute` and stay unaffected. `loginRoute` gains
  `validateSearch` returning `{ redirect?: string }` (optional key, not
  optional value — required for TanStack Router to keep `<Link to="/login">`
  call sites unbroken across LandingPage, AppShell, HeroBoxBreak,
  PathToExcellenceCTA, etc.). `LoginPage.handleSubmit` already consumed
  `search.redirect` and navigated to the decoded destination; no
  LoginPage change needed. Preview-verified:
  - Logged-out `/home` → `/login?redirect=%2Fhome` ✅
  - Logged-out `/new` → `/login?redirect=%2Fnew` ✅
  - Logged-out `/v3/project/anything` →
    `/login?redirect=%2Fv3%2Fproject%2Fanything` ✅
  - Logged-in (`POST /api/v1/auth/register`) `/home` lands cleanly ✅

- **#9 (VERIFY) Create-Account tab toggle.** Click on the Create Account
  tab applies the active state class to that button and changes the
  submit button copy to *"Create Account"*. The earlier walkthrough
  finding of a non-working tab was misled by `document.body.innerText`
  emitting both tab labels regardless of active state — the state is
  class-based, not text-based. No regression; no code change.

## Reused, not built

- `authStore.isAuthenticated()` (via the existing
  `localStorage.getItem('ogden-auth-token')` check already in
  `routes/index.tsx`).
- `NurseryLedgerDashboard` — existing Dashboard surface, mounted into the
  Plan slide-up by sectionId switch; no schema change, no new store.
- `useNurseryStore`, `useSiteData`, `useZoneStore`, propagation
  analysis utilities — all consumed unchanged by the existing
  `NurseryLedgerDashboard`.
- `PlanModuleSlideUp`'s `renderPlanCard` switch — extended with one new
  case, no refactor.
- `LoginPage`'s already-present `search.redirect` consumption.
- `<details>` collapse pattern already established elsewhere.

## Out of scope (deferred per program)

- Gap #7 D5 Operating Dashboard + Adaptive Recommendations beyond what
  already shipped (D-track).
- Gap #10 backend sync of the 26 localStorage-only stores (D-track
  adjacent; not blocking showcase v1).
- Scorer-level changes to the 13-dimension `computeScores.ts` — the UX
  partition is the agreed close.
- Branch rebase / push — pending the Phase 0 verification + per-task
  commits (see "Next" below).

## Verification

- `apps/web` `tsc --noEmit` (with `NODE_OPTIONS=--max-old-space-size=8192`)
  clean on all touched files (`LandAssessmentSlideUp.tsx`,
  `v3/plan/types.ts`, `v3/plan/PlanModuleSlideUp.tsx`,
  `features/plan/PlanHub.tsx`, `routes/index.tsx`). One pre-existing
  error in `StepBoundary.tsx:365` (`unknown` → `ReactNode`) unchanged —
  flagged on the prior session as foreign WIP.
- Live preview verifications above all pass with zero
  `preview_console_logs level=error` entries.

## Next

Phase 1 — site canon for "Three Streams Farm" at
`wiki/entities/three-streams-farm.md`. Opens its own brainstorm cycle.

ADR footer appended: [[decisions/2026-05-20-olos-new-user-journey-walkthrough]].
