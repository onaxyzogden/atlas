# 2026-05-14 — Wire livestock criteria to live on-map state (Goal Compass)


**Branch.** `feat/atlas-permaculture` · sequel to `357ea51f`.

**Goal.** Close the feedback loop between Plan-stage drawing and the Goal
Compass forecast for the two livestock criteria that can be derived from
current on-map state — `livestock-paddocks-active-count` and
`livestock-welfare-pass-pct`. Stewards should no longer need to type a
baseline; placing paddocks and welfare anchors (shade, shelter, water)
should move the forecast directly.

**Changes.**

- New `apps/web/src/features/livestock/welfarePass.ts` — extracts the
  per-paddock pass predicate (`worst === 'good'` across shade, shelter,
  water — all axes ≤100 m from centroid) into a reusable helper plus a
  project-scoped `welfareSummaryForProject()` roll-up. Same band rule
  the audit card presents, decoupled from its UI so the Goal Compass
  can consume it without coupling.
- `computeForecast()` in
  `apps/web/src/v3/plan/engine/goalCompass/criteriaForecast.ts` now
  accepts an optional `currentValues?: Record<string, number>` map.
  The baseline is added to every yearly point and to the at-deadline
  comparison — interventions stack on top of live state instead of
  starting from implicit zero.
- `CriteriaForecastTab.tsx` reads `useLivestockStore`,
  `useUtilityStore`, `useWaterSystemsStore`, and `useAllStructures()`
  (project-scoped), computes `{ paddockCount, passPct }` via the new
  helper, and threads the resulting `currentValues` map into
  `computeForecast()`.

**Verification (preview).** Recreated the project's tree via the
template picker after clearing the stale persisted entry (the
pre-`8a0a75d2` tree was missing the livestock sub-goal). On the mtc
project with 4 placed paddocks:

- `livestock-paddocks-active-count` row reads `4` constant across all
  years — that's the live baseline showing through with no
  interventions queued.
- `livestock-welfare-pass-pct` row reads `70 / 85 / 95` at Y1/Y3/Y5 —
  live baseline 0 (no paddock currently has all three anchors ≤100 m)
  plus paddock-water-network `+70` Y1, shelter-windbreak `+25` Y2,
  small-ruminant-paddock `+20` Y3 (attenuated by maturity curves).

`tsc --noEmit` clean.

**Deferred.** `WelfareAccessAuditCard` still has its own copy of the
band logic — should be refactored to consume `paddockPassesWelfare()`
next session. Unit tests for `welfareSummaryForProject` not yet added.
