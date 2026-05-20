# 2026-04-29 — Feasibility Command Center (Dashboard route)


### Context

User feedback flagged the legacy Feasibility view (DecisionSupportPanel rendered under §21) as a "scroll cave" of ~17 visually-equal diagnostic cards. Requested a decision pathway: **Verdict → Blockers → Fit → Execution Reality → Safety Rules → Evidence**, mirroring the LandVerdictCard / DecisionTriad philosophy that already shipped on the companion Dashboard. DecisionSupportPanel had to remain intact for the 260px MapView right rail (narrow context can't carry the new layout).

### Done

- `apps/web/src/features/decision/hooks/useTriageItems.ts` — extracted from `WhatMustBeSolvedFirstCard` so the new strip + rail consume identical triage data.
- `apps/web/src/features/decision/hooks/useTypeFitRanking.ts` — extracted weighted-score ranking from `BestUseSummaryCard`; exports `TypeFit[]`, `currentFit`, `bestFit`, `best/workable/avoid` partitions.
- `apps/web/src/features/decision/hooks/useFeasibilityVerdict.ts` — page-level "so what" hook: composes ranking + triage + financial model into bands `supported | supported-with-fixes | workable | not-recommended`, headline/subhead, mini-metrics, readiness chips.
- `apps/web/src/features/decision/FeasibilityVerdictHero.tsx` (+ module.css) — hero card mirroring `LandVerdictCard`: ScoreCircle, verdict band badge, mini metrics (best use, current direction, labor hrs, capital intensity, break-even, blockers), CTA row (Fix Blocking Issues / Open Design Map / Generate Feasibility Brief).
- `apps/web/src/features/decision/BlockingIssuesStrip.tsx` (+ module.css) — Status × Issue × Why × Action table for the "first" triage tier; "Fix on Map" per row; anchor `#feasibility-blockers` for the hero scroll target.
- `apps/web/src/features/decision/FeasibilityDecisionRail.tsx` (+ module.css) — sticky right rail: Current Verdict, Top Blocker, Next 3 Actions, Readiness chips (land/design/ops/capital/confidence), CTAs.
- `apps/web/src/features/decision/VisionFitAnalysisCard.tsx` (+ module.css) — per-requirement fit rows for `currentFit`, replacing the inline FitResultRow used by the legacy panel.
- `apps/web/src/features/decision/FeasibilityCommandCenter.tsx` (+ module.css) — orchestrator: header → hero → blockers strip → 2-col body (Fit & Readiness | Execution Reality) + sticky rail → Design Rules section → `<details>` Methodology drawer (collapsed by default; holds legacy WhatMustBeSolvedFirstCard + MissingInformationChecklistCard). Layout grid `minmax(0, 1fr) 280px`, collapses at 1100px; inner body grid collapses at 960px. Lazy-loads child cards.
- `apps/web/src/features/decision/WhatMustBeSolvedFirstCard.tsx` — replaced inline `useMemo` with `useTriageItems(project)` (no visual change).
- `apps/web/src/features/decision/BestUseSummaryCard.tsx` — replaced inline ranking with `useTypeFitRanking(project)` (no visual change).
- `apps/web/src/features/dashboard/DashboardRouter.tsx:224` — swapped `DecisionSupportPanel` → `FeasibilityCommandCenter` for the `'feasibility'` case.

### Verified

- `npm run typecheck` — clean for all new code.
- `npm run lint` — exit 0 (project's grounding gate).
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` — clean (1m 9s; PWA precache regenerated, 495 entries).
- Browser verification at 1440×900: hero (81/100, "Homestead Feasibility", "Supported with Required Fixes" badge, mini metrics, CTA row), blockers strip ("ALL CLEAR" state), 2-col body (Best Use Summary | Capital × Ops Intensity), sticky rail (Current Verdict, Top Blocker, Next 3 Actions, Readiness chips). No JS console errors — only pre-existing a11y contrast warnings from sibling components.

### Deferred

- **`Generate Feasibility Brief` CTA** — placeholder; needs export pipeline wiring.
- **DecisionSupportPanel slim-down** — legacy panel still serves the 260px MapView rail; long-term it could be reduced further but out of scope here.
- **Same recipe for sibling pages** — user said the Verdict→Blockers→Fit→Execution→Rules→Evidence philosophy applies to all major pages; Feasibility shipped first as the template.

### Recommended next session

- Apply the same hero/blocker/2-col/rail recipe to the next-most-cluttered Dashboard route (likely Hydrology or Ecological).
- Or — wire the real "Generate Feasibility Brief" exporter (PDF or markdown) so the hero CTA isn't a placeholder.
- Or — slim DecisionSupportPanel for the MapView rail by removing cards that the Command Center now owns (de-dup the 260px column).
