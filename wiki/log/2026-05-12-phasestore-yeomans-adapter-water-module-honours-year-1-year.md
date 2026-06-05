# 2026-05-12 — phaseStore→Yeomans adapter; Water module honours Year 1 / Year 5 cap


**Motive.** Yesterday's "module bar on every view" ship gave each phased
module a year-cap chip ("Year 1 · capped at water"), but the chip
lied: most Plan-module cards read project-axis stores (water,
livestock, soil) whose `phase` field is a `phaseStore.BuildPhase.id`
(UUID), not a Yeomans `PhaseKey`. The cap couldn't reach the data.

**Change.**

- **Schema.** `phaseStore.BuildPhase` gains optional `yeomansCap?: PhaseKey`.
  Default seeds populate it (order 1→water, 2→buildings, 3→subdivision,
  4→soil). Persist version 2→3 migration backfills the same.
- **Adapter hook.** New
  [`apps/web/src/v3/plan/usePhaseStoreCappedEntities.ts`](../apps/web/src/v3/plan/usePhaseStoreCappedEntities.ts)
  — generic filter for entities tagged with a phaseStore id. Looks up
  the phase, reads `yeomansCap`, applies `PHASE_VIEW_CAP` for the
  active view. Uncapped on current / vision / terrain3d.
- **Phasing UI.** `PhasingMatrixCard` gains a Yeomans-cap chip row
  inside each phase column (8 PhaseKey chips + Uncapped pill). One
  click → `usePhaseStore.updatePhase(id, { yeomansCap })`.
- **Water module retrofit.** WaterCatchmentsCard / WaterStorageCard /
  WaterNetworkCard wrap their project-scoped WaterNode lists in the
  adapter. Storage card's overflow-target dropdown stays uncapped
  on purpose — caps are presentational, not data-deletion.

**Outcome.** Year 1 / Year 5 chips on Water cards are honest. A
WaterNode assigned to "Phase 3" (default cap `subdivision`)
disappears from Year 1 and Year 5 views; returns on Vision / Current.
Stewards override the default cap per phase from the Phasing matrix
card. `tsc --noEmit` clean for the change (2 pre-existing
Plan3DSelectionHandler errors unrelated).

**Decision:** [`wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md`](decisions/2026-05-12-plan-phasestore-yeomans-adapter.md)

**Deferred Phase B:** Livestock / Soil retrofits await store audits;
Plants module needs a product-design conversation (polycultureStore
has no phase axis); Principles rollup re-design pending; Phasing's own
Scale-matrix card uses `designLayer` not `yeomansCap`, bridge later.
