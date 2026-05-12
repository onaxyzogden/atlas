# 2026-05-12 — phaseStore → Yeomans adapter + Water module cap

## Context

The Plan-stage view chips ("Year 1 · capped at water" / "Year 5 ·
capped at buildings") shipped on 2026-05-11 advertised a cap the
module data did not actually honour. Reason: most Plan-module cards
read **project-axis** stores (`waterSystemsStore`, `livestockStore`,
soil stores) whose `phase` field — when present — is a
`phaseStore.BuildPhase.id` (a UUID), not a Yeomans `PhaseKey`. The
canonical `usePhaseCappedEntities` hook only works on entities that
already expose `state` + `proposed.phase` in the `PhaseKey` sense
(`builtEnvironmentStoreV2`, `designElementsStore`) — those are the
Vision-Layout canvas's domain, and no Plan slide-up card reads them.

## Decision

Extend `phaseStore.BuildPhase` with an optional
`yeomansCap?: PhaseKey` and ship a second filter hook,
`usePhaseStoreCappedEntities`, that bridges the project axis to the
Yeomans axis:

```
entity.phase (BuildPhase.id)
  → phaseStore.phases.find(id)
    → phase.yeomansCap (PhaseKey | undefined)
      → compare against PHASE_VIEW_CAP[view]
```

| Piece | File | Purpose |
|---|---|---|
| Schema field | `apps/web/src/store/phaseStore.ts` | `yeomansCap?: PhaseKey` on `BuildPhase`. |
| Default seeds | same file — `DEFAULT_PHASES` | Phase 1→`water`, 2→`buildings`, 3→`subdivision`, 4→`soil`. |
| Persist migration v2→v3 | same file | Backfills `yeomansCap` from `order` for legacy projects so existing localStorage payloads honour the chip immediately. |
| Adapter hook | `apps/web/src/v3/plan/usePhaseStoreCappedEntities.ts` | Generic filter: any entity with `phase?: string \| null` flows through; view is uncapped on `current` / `vision` / `terrain3d`; `phase-1` / `phase-2` apply `phaseIndex(yeomansCap) <= phaseIndex(PHASE_VIEW_CAP[view])`. |
| Phasing UI | `apps/web/src/features/plan/PhasingMatrixCard.tsx` | Per-phase Yeomans-cap chip row (8 PhaseKey chips + Uncapped pill) inside the phase column cell. |
| Water retrofit | `WaterCatchmentsCard.tsx`, `WaterStorageCard.tsx`, `WaterNetworkCard.tsx` | Each wraps its project-scoped WaterNode list in `usePhaseStoreCappedEntities`. Storage card keeps the overflow-target dropdown uncapped (caps are presentational, not data-deletion). |

### Defaults

| Phase order | Default `yeomansCap` | Rationale |
|---|---|---|
| 1 (Year 0–1) | `water` | Climate, landshape, water shaping happen in the first year. |
| 2 (Year 1–3) | `buildings` | Access + trees + buildings settle by year 3. |
| 3 (Year 3–5) | `subdivision` | Fencing / paddock subdivision lands by year 5. |
| 4 (Year 5+) | `soil` | Long-tail soil refinement. |

Phases with non-default `order` (custom user phases) leave
`yeomansCap` undefined; the adapter treats undefined as **uncapped**
so legacy phases don't disappear after the migration.

### Why caps are presentational, not data-deletion

The Water Storage card keeps `targets` (the overflow-destination
dropdown) reading the raw, un-capped list of project WaterNodes. A
node hidden by the cap on the *current* view is still a valid graph
target. The cap is a *what-am-I-looking-at-right-now* lens, not a
mutation. Authors of future cap-aware cards should follow the same
rule: filter what the steward sees, never what they can wire to.

## Consequences

- Year 1 / Year 5 chips on Water module cards are now honest. Open a
  WaterNode assigned to "Phase 3" (default `subdivision` cap), switch
  to Year 1, and that node disappears from the ledger; switch to Year
  5, it disappears too (subdivision > buildings); switch to Vision or
  Current, it returns.
- Stewards can override the default Yeomans cap per phase from the
  Phasing module (Plan · Module 7 · Phasing matrix) — the chip row
  inside each phase row of the phase×season table.
- `phaseStore` persist version bumped 2 → 3 with a migration; existing
  localStorage projects load with sensible default caps.
- Time-invariant modules (Zones, Structures, Machinery, Cross-section)
  remain unchanged — their stores don't carry a phase field at all.

## Follow-ups (deferred)

- **Livestock** retrofit — `livestockStore` audit pending; if entities
  carry a phaseStore phase id, wire `usePhaseStoreCappedEntities` the
  same way. If not, add a phase field or accept the time-invariant
  chip for that module.
- **Soil** retrofit — same audit for soil stores.
- **Phasing module's own cards** — `PhasingScaleMatrixCard` groups by
  `designLayer` (Yeomans-keyline category), not `yeomansCap`. Bridge
  later once the relationship between the two axes is reviewed with
  the Permaculture Scholar.
- **Principles rollup** — depends on which entity types it should cap;
  redesign once adapter has more callers.
- **Plants** — `polycultureStore` has no natural phase axis at all;
  product-design decision needed before applying any cap.

## Manual verification step (deferred)

`tsc --noEmit` clean for these changes (the 2 pre-existing
`Plan3DSelectionHandler.tsx` errors are unrelated). A live preview
probe requires a project with WaterNodes assigned to a BuildPhase
whose `yeomansCap` differs from the active view's cap — for the MTC
seed fixture, no WaterNodes currently carry a `phase` value, so the
visible effect is **uncapped on every view**. To observe filtering:

1. In the Water module, add a catchment.
2. Set its phase to "Phase 3" (cap = `subdivision`).
3. Switch to Year 1 — the catchment disappears (cap exceeds
   `PHASE_VIEW_CAP['phase-1']` = `water`).
4. Switch to Vision or Current — it returns.

## References

- Plumbing: `apps/web/src/v3/plan/usePhaseStoreCappedEntities.ts`
- Schema + migration: `apps/web/src/store/phaseStore.ts`
- Phasing UI: `apps/web/src/features/plan/PhasingMatrixCard.tsx`
- Water retrofits:
  `apps/web/src/v3/plan/cards/water-management/WaterCatchmentsCard.tsx`,
  `WaterStorageCard.tsx`, `WaterNetworkCard.tsx`
- Companion hook: `apps/web/src/v3/plan/usePhaseCappedEntities.ts`
- Prior ADR: `wiki/decisions/2026-05-11-plan-module-bar-all-views.md`
