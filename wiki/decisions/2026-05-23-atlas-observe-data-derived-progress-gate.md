# ADR: Data-derived Observe progress + soft Observe→Plan gate

**Date:** 2026-05-23
**Status:** accepted

**Context:**
The Observe-stage progress segments shown in two places — the bottom
`ObserveModuleBar` and the header `LevelNavigator` carousel — were
**decorative**. Both read the same `pillarTasks` from `LevelNavigator`
context, and that data was hardcoded in `V3LevelNavBridge.tsx` as 5
placeholder "Phase B" tasks per module, all permanently `observe_to_do`.
Nothing reflected what the steward had actually done. We need progress to
advance only when the steward completes a real, meaningful step
("activation event") so we can guide them to finish the essentials of
Observe before moving to Plan. The same gating idea applies later to
Plan→Act, but this effort covers **Observe only**.

**Decision:**
Four locked choices (steward-confirmed via AskUserQuestion):

1. **Soft gate + override** — Plan shows a dismissible overlay listing "N
   objectives left" with a **"Continue anyway"** escape hatch. Navigation
   is **never** hard-blocked; routes stay open. This is guidance.
2. **Data-derived only** — each objective is a **pure predicate** over real
   persisted store data. No manual toggles, no separate progress store.
3. **Required subset** — each module flags 1+ *required* objectives; Observe
   is "complete" when all required objectives are done. Optional objectives
   raise the % but don't gate.
4. **Observe only** this round.

Architecture:

- **Pure engine** `v3/observe/progress/objectives.ts` — `ObserveProgressInput`
  data bag, `OBSERVE_OBJECTIVES: Record<ObserveModule, ObserveObjective[]>`,
  `evaluateModule` / `evaluateObserve`. No React, no store imports — unit-tested
  exactly like the existing `modules/**/derivations.ts`. Each `PillarTask` gets
  `columnId: complete ? 'observe_done' : 'observe_to_do'` so it drops straight
  into `LevelNavigator`'s existing `taskColorFn` color logic.
- **React/store layer** `v3/observe/progress/useObserveProgress.ts` — subscribes
  to **raw** fields of each domain store (per the zustand selector-stability
  rule, [[2026-04-26-zustand-selector-stability]]), assembles the input bag in a
  single `useMemo`, calls `evaluateObserve`.
- **Override store** `store/stageGateOverrideStore.ts` — persisted, per-project
  `boolean` ("steward chose to continue to Plan despite incomplete Observe").
- **`StageGateOverlay`** mounted in `PlanLayout` — renders the soft gate.
- **`V3LevelNavBridge`** feeds real `pillarTasks` + a `gateIndicators` diamond
  after `swot-synthesis`; the rendering layer (`LevelNavigator`,
  `LevelNavigatorSegments`, `ObserveModuleBar`) needed **zero** changes.
- **`ObserveReadyCue`** now ticks from the same derived progress.

One required objective per module: human-context = property boundary drawn;
built-environment = ≥1 built feature; macroclimate-hazards = ≥1 hazard or
sector; topography = ≥1 contour or vertical marker; earth-water-ecology = ≥1
earthwork/water-line/soil-sample/ecology-obs; sectors-zones = ≥1 zone or
vegetation patch; swot-synthesis = ≥1 SWOT entry. Each also carries 1–3
optional objectives.

**Consequences:**
- Progress is automatically **reactive and persistent** — it rides the existing
  persisted Zustand stores; the only new persistence is the tiny gate-override
  flag. No migration.
- The manual `observeHowChecksStore` / `MODULE_GUIDANCE` How-checks remain
  **guidance only** — they never drove progress and still don't.
- Predicates are pure, so adding/retuning an objective is a one-line edit +
  unit test.
- Plan→Act gating is a deliberate **follow-up** — the engine generalizes but
  this round wires Observe only.
