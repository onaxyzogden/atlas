# 2026-05-21 — Phase 2.5: Three Streams Y2 livestock substrate seed (Slice A)

Branch `feat/atlas-permaculture`. Slice A of the combined Phase 2.5 + Phase 5
plan. Phase 2 ([[log/2026-05-20-atlas-phase-2-three-streams-demo-seed]])
deliberately deferred livestock substrate pending the parallel-session B-track
rotation-engine work; that work has now landed
(`rotationEngine.ts` + `livestockRevenue.ts` + `RotationScheduleCard.tsx` +
`LivestockMoveCard.tsx`, commit `6a61d6cf`). Phase 2.5 closes the substrate
gap so the Three Streams demo's Act + Monitor surfaces render real paddocks /
rotation timeline / move log and the Y2 goal-tree gate
`livestock-rotation-spine-presence-pct ≥ 90 %` lights up.

Per canon ([[entities/three-streams-farm]] § Species & Guild Canon): Y2 state
is 80-head Black Angus / Devon-cross cow-calf on 3-day rotational moves through
12 paddock cells with a ~33-day rest per cell, plus a 200-bird mobile poultry
flock following at a 3-day lag. Sheep arrive Y4 — omitted from the Y2 seed.

## Outcome

One new SQL migration + an extended client-side seeder + a deterministic
readiness verification test.

### Migration `038_three_streams_paddock_grid.sql` (server-side)

Subdivides the Y2 cow-calf pasture (the north strip,
`[-79.9140..-79.9060] × [43.5615..43.5638]`) into 12 paddock cells as
`design_features`. Each row: `feature_type='zone'`, `subtype='paddock'`,
pinned sentinel UUIDs `…0000df35ad01 .. ad0c` (distinct from the `e0` series
used by 029), `phase_tag='p2'`, `sort_order` 30–41, properties carrying
`grazingCellGroup='cowcalf-Y2'`, 1-based `sequenceOrder`, `targetGrazeDays=3`,
`targetRestDays=33`, `parentZone='zone_pasture_cowcalf'`. Idempotent via
`ON CONFLICT (id) DO NOTHING`. Geometry tiles the parent pasture polygon west→
east in 12 equal lon bands (each `-79.914 + (i−1)·0.000667` wide) across the
full `43.5615..43.5638` lat span. Poultry follow at a 3-day lag is represented
client-side in the seeder, not as separate cells here.

### Client-side seeder `seedThreeStreamsFarm.ts` extension (web)

Added a `seedLivestock(projectId)` block invoked after the nursery seed and
before the localStorage sentinel write. It writes three stores:

1. **`useLivestockStore.addPaddock` ×12** — paddocks referencing the 12
   seeded `design_features` (geometry mirrors the migration polygons),
   `species:['cattle']`, `grazingCellGroup:'cowcalf-Y2'`, `fencing:'electric'`,
   `pastureQuality:'fair'`, `areaM2:50000`, `stockingDensity:2`,
   `guestSafeBuffer:true`, `phase:'Perennials + Livestock'`.
2. **`useRotationPlanStore.setPlan` + `setPlanOptions`** — a 12-cell
   RotationPlan (`sequenceOrder` 0-based, `targetGrazeDays:3`,
   `targetRestDays:33`, `cellGroup:'cowcalf-Y2'`), `startDateISO:'2026-05-01'`,
   `horizonCycles:4`.
3. **`useLivestockMoveLogStore.addEvent`** — a representative Y2 cow-calf
   3-day-cadence move sequence (`headCount:80`) plus poultry `move_in` events
   at the 3-day lag, so `LivestockMoveCard` renders a populated log.

The seeder then calls `pushRotationSequenceToSpine(projectId)` — exactly what a
real UI rotation edit triggers — projecting 12 cells × 4 cycles = 48
`source:'rotation-sequence'` WorkItems onto the spine.

**Sentinel bump v1 → v2.** Idempotency keys move to
`ecosystem-farm-seeded@v2:<projectId>` / `three-streams-seeded@v2`, so existing
v1-seeded browsers re-run once to gain the livestock substrate, then settle.

### Verification test `seedThreeStreamsLivestock.test.ts` (web)

New `apps/web/src/dev/__tests__/seedThreeStreamsLivestock.test.ts`
reconstructs the seeder's exact shape (12 `cowcalf-Y2` paddocks, 12-cell plan,
`startDateISO '2026-05-01'`, `horizonCycles 4`) rather than importing the
seeder — the seeder's livestock helpers are private and pull the full project
store graph. Mirroring the committed constants verbatim means any drift
between fixture and seeder surfaces as a failing assertion. Two cases:

- **Spine-presence (Y2 gate):** after `pushRotationSequenceToSpine`, exactly
  48 `rotation-sequence` rows land on the spine and
  `computeRotationSpinePresencePct(...) === 100` (≥ 90 Y2 gate). ✅
- **Rest-compliance (Y3 target):** `computeRestCompliancePct(...) < 90`. The
  12-cell, 3-graze-day plan honours a 33-day rest, short of cattle's 45-day
  recovery window — a deadlineYear-3 target, correctly *below* the bar in the
  Y2 demo state and explicitly NOT a Y2 regression. ✅

## Decisions fixed this slice

- **Paddock geometry lands server-side as `design_features`, client stores
  hold the operational substrate.** Matches the Phase 2 precedent: only the
  geometry is canonical DB substrate; paddocks / rotation plan / move log are
  client Zustand stores by the existing livestock architecture.
- **Migration numbering 038** — next free after 037 (Phase 4.5
  jurisdiction/registry). Plan text used placeholder 041; reassigned at
  write-time.
- **Sentinel v1 → v2, not a new key namespace.** One-time re-seed for existing
  browsers is acceptable on a builtin showcase (not user data); documented so
  the re-run is expected rather than surprising.
- **Rest-compliance left below 90 %.** Cattle `recoveryDays=45` >
  33-day honoured rest. This is the Y3 target (`deadlineYear 3`); forcing it
  green at Y2 would misrepresent the canon arc. Verified-and-documented, not
  "fixed."

## Reused, not built

- `pushRotationSequenceToSpine` / `seedRotationSequenceWorkItems` /
  `computeRotationSpinePresencePct` — the real spine-sync + readiness path, not
  a hand-coded WorkItem list.
- `useLivestockStore.addPaddock`, `useRotationPlanStore.setPlan` /
  `setPlanOptions`, `useLivestockMoveLogStore.addEvent` — existing store
  mutations.
- 029 builtin design-features pattern (`ON CONFLICT (id) DO NOTHING` on pinned
  sentinel UUIDs); the `df35ad` family extends the `df35e0` series 029 used.
- `RotationScheduleCard` + `LivestockMoveCard` render unchanged from the
  landed B-track engine; the seed only supplies their substrate.

## Out of scope (deferred)

- **Y4 sheep** (40-ewe Katahdin) — canon-future, not Y2.
- **Livestock revenue seeding** into the financial model — the engine exists;
  demo financials are a separate slice if requested.
- **Server-side persistence** of paddocks / rotation / moves — client Zustand
  stores by current architecture; matches Phase 2 precedent.
- **Silvopasture overlay** (Y3+).
- **Phase 5 (Slice B)** — showcase observation loop (visitor telemetry +
  feedback). Next slice of this plan.

## Verification

- `apps/web` `tsc --noEmit` clean (exit 0); no new errors above baseline.
- `vitest run src/dev/__tests__/seedThreeStreamsLivestock.test.ts` — 2/2 pass:
  spine-presence `=== 100`, 48 projected rotation rows, rest-compliance `< 90`.
- DB-level migration apply deferred to the user's dev DB run (local `pnpm`/
  `migrate` env requires `DATABASE_URL`); migration follows 029 byte-shape and
  is syntactically idempotent.

## Commits

- `1e0ffb97` — `feat(api): Phase 2.5 migration 038 — Three Streams Y2 paddock grid`
- `1d175b34` — `feat(web): Phase 2.5 livestock seed — paddocks + rotation plan + move log`
- `f9d233c0` — `test(web): Phase 2.5 A.3 — Three Streams Y2 livestock readiness verification`
- (this) — `docs(wiki): Phase 2.5 log + canon livestock-lineage note`

## Next

- **Phase 5 (Slice B)** — public showcase observation loop: `showcase_visitor_events`
  table + public telemetry route + client event instrumentation + visitor
  `showcase_feedback` capture, all covenant-ratcheted.

ADR back-links: [[log/2026-05-20-atlas-phase-2-three-streams-demo-seed]]
(Phase 2 substrate this slice completes),
[[decisions/2026-05-20-atlas-b3-x-rotation-promotion-criteria]]
(the Y2 promotion gate this seed satisfies),
[[entities/three-streams-farm]] (canon — livestock species + cadence).
