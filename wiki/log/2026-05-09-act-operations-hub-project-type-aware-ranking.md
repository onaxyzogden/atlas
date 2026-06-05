# 2026-05-09 — Act Operations Hub project-type-aware ranking


Made the Act stage's right-rail Operations Hub re-rank `TodaysPriorities` and `AlertsPanel` items by per-project-type module affinity. No new cards, no new tools, no new stores — the signal is consumed at the sort step right before each panel slices to its display cap. Decision recorded in [decisions/2026-05-09-atlas-act-operations-hub-project-type-aware-ranking.md](decisions/2026-05-09-atlas-act-operations-hub-project-type-aware-ranking.md).

### Files

- Created `apps/web/src/v3/act/data/projectTypeModuleAffinity.ts` — single hard-coded `Record<PlanProjectTypeKey, readonly ActModule[]>` table + `getModuleAffinityRank(type, module)` helper.
- Edited `apps/web/src/v3/act/ops/TodaysPriorities.tsx` — added `module: ActModule | null` and `_appendOrder` to each row; tagged rows by source (`fieldTasks.category` mapped via `fieldTaskModule()`, maintenance→'maintain', harvest+succession→'harvest', events→'network'); affinity sort fires only when `effectiveType` is set; slice to 8.
- Edited `apps/web/src/v3/act/ops/AlertsPanel.tsx` — same row tagging (hazards→'review', paddocks→'livestock'); sort by `(severity, affinityRank, _appendOrder)` with affinity tier active only under `effectiveType`; slice to 5.
- Consumed the upstream-same-day `useEffectivePlanProjectType` hook for the project-type lens — no additional source of truth introduced.

### Verification

- TypeScript: `tsc --noEmit` clean.
- Dev preview at port 5200, with seeded test items spanning all six modules:
  - **MTC fallback** (`projectType: null`) — original frost alert renders alone in `Alerts`, priorities empty. Source-append order, affinity sort short-circuits. Regression check ✓.
  - **Real project, homestead** — priorities reorder to `maintain, maintain, harvest, network, network, review`. Alerts: high-severity fencing first; within medium, livestock water-point ranks above review hazard.
  - **Real project, conservation** — priorities reorder to `review, maintain, maintain, network, network, harvest`. Alerts: within medium, hazard (review=0) promoted above water-point (livestock=5).
  - **Real project, picker cleared** (`hasInteracted: true, selectedType: null`) — affinity sort short-circuits, source-append order fully restored.
  - **Plan-side regression** — `PlanProjectTypeCard` renders all six options + homestead checklist via the shared hook with no observable behavior change.

### Risks accepted

- v1 affinity rankings are best-guess; tunable in one constant. Doc'd at the top of `projectTypeModuleAffinity.ts`.
- Source→module tagging covers the live `fieldTask.category` values; unmapped categories return `null` and sink to bottom — fine for now, separate clean-up not in scope.
