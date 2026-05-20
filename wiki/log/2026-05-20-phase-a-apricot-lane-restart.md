# 2026-05-20 — Phase A restart (Apricot Lane stress-test)

Branch `feat/atlas-permaculture` advanced from `5d57542b` → `acf42b1f`.

## Context

Prior session recorded Phase A–D as complete; on-disk audit at session start
(branch HEAD `f83df5c1`) showed no Phase A–D artifacts survived an external
rebase. User directed restart with per-sub-phase conventional commits,
`Co-Authored-By: Claude Opus 4.7`, fetch+check-divergence after every commit,
and push only at the phase boundary.

## Commits

- **`b729abcb`** — `feat(export): monetize ecosystem services in Capital Partner Summary` (Phase A.2)
  - `packages/shared/src/schemas/export.schema.ts` (+19 / -1)
  - `apps/web/src/lib/ecosystemValuation.ts` (+47)
  - `apps/web/src/features/export/CapitalPartnerSummaryExport.tsx` (+19)
  - `apps/api/src/services/pdf/templates/capitalPartnerSummary.ts` (+42)
- **`acf42b1f`** — `feat(mobile): promote Next Best Action above the fold on Observe` (Phase A.3)
  - `apps/web/src/pages/MobileProjectShell.tsx` (+10 / -5)

A.1 marked obsolete (v3 IA already consolidates intelligence via
`LandVerdictCard` + `ObserveChecklistAside`).

## Verification

- Shared build clean, API tsc clean, API tests 558 / 3 skipped.
- Web tsc clean for A-touched files; pre-existing `precedesAuto` errors are out
  of A scope.
- Web tests: full suite green up to environmental worker-OOM (unrelated).

## Decision

See [decisions/2026-05-20-atlas-phase-a-apricot-lane-decision-layer.md](../decisions/2026-05-20-atlas-phase-a-apricot-lane-decision-layer.md).

## Next

Phases B, B.5, C, D remain to be redone from scratch in future sessions
(generative Design Map, agent registry + rotation engine, J-curve + SOM
trajectory).
