# 2026-06-10 -- Observe lens: wire real data to all panels (live path)

**Branch:** `main` (canonical; externally rebased out-of-band -- NOT pushed)
**Commits:** `d0ad3866` (P1), `a3ef3b32` (P2), `66337f16` (P3), `bf9c773b` (P4) -- all explicit-pathspec
**Scope:** `apps/web/src/v3/observe/lens/` live bundle path only; `mockData.ts` + `tokens.ts` byte-untouched; foreign "epitaxy" WIP (ActTierShell.tsx, actToolCatalog.ts, DesignElementLayers.tsx, objectiveActTools.ts) untouched throughout.

## Brief

"Wire data to all observe panels" -- close every remaining mock/placeholder/absent
data gap in the lens dashboard's LIVE path so all panels render real store-derived
data, honestly degraded when a source is empty. Operator decisions (AskUserQuestion):
Timeline tab = wire real series; derived row fields = derive honestly from real
metadata, nothing invented.

## What shipped

### P1 `d0ad3866` -- DataPointRow live fields

`toDataPoint(p, ctx)` gained a `RowContext` (nowMs, supersedesById map, two injected
resolvers). New honest derivations, all pure: proof pills from `proofItems` by
`proofType` (photos / gpsPoints / gpsTraces; measurements = measurement +
logged_result as "N reading(s)"; `document` deliberately NOT counted -- commented);
`sourceTask` via `resolveActionTitle` (FieldAction id->title map, feed-denormalized
titles survive deletion); `planObjective` via `findObjectiveGlobally`;
`supersedesId` from a prebuilt reverse map; `divergenceAge` when divergent; exported
`deriveConfidence(p)` (high = sensory/spatial AND data proof; low = zero proofs;
else medium -- replaces the hardcoded 'medium', an intended honesty change);
`tags` from real metadata only (sourceType tag, 'field log', 'georeferenced').
`DataPointRow` renders the Source/Objective grid only when either resolves.

### P2 `a3ef3b32` -- field-log feed merge

Exported pure `mergeFeedProjections(points, feedEntries, resolveDomain)`: dedupes on
the schema-designated `sourceFeedEntryId` key, projects the rest through the shared
`routeToDataPoint` (same union the dashboard's `useDomainPoints` renders), drops
unresolvable feedKeys. Hook subscribes `useObserveFeedStore`. Live lens counts/pins
now match the dashboard union (intended behaviour change).

### P3 `66337f16` -- real Timeline series (headline)

The fabricated inline `TEMPORAL_DATA` const is GONE from `components.tsx`.
`LensDataBundle` gained required `temporal: Partial<Record<ObserveLensId, LensTemporal>>`
(both constructors supply it). NEW pure `lensData/temporalBuilders.ts`
(`buildTemporalForLens`): candidate series from bound `logged_result` rows
(water.infiltrationData, soil.phData, climate.windRose with m/s -> km/h,
human.capacityBars) AND from bound scalar `measurement` items (slot label + unit
metric; unbound items skipped -- slotIds are not globally unique, charting them
would fabricate trends). Cycle label from the carrying point's cycleId
(0 -> 'Baseline'), date `MMM yy`, one series per lens (most points wins, tie ->
earliest first capture), ascending, null under 2 points. Mock visuals stay
pixel-identical via `MOCK_TEMPORAL` moved VERBATIM into `mockBundle.ts`.
TemporalView empty-copy split: 'all' keeps "Select a lens...", lens-selected-but-
empty shows "No measurement series for this lens yet". Honest MTC seed outcome
pinned by test: temporal keys exactly [climate, human, living, water]
(7-pt wind / 3-pt capacity / 3-pt pH / 3-pt infiltration, all Baseline May 26);
foundation + infrastructure honestly absent (their bound viz fields are structural
inventories, excluded by design).

### P4 `bf9c773b` -- cycle number + history from observeCycleStore

`LiveBundleInput.cycleStates?` (absent -> exact status quo). Pure exported
`buildCycleHistory(points, cycleStates, nowMs)`: project is "in" cycle k+1 where
k = max(store counters, point stamps) -- preserves fresh-project -> Cycle 1;
history rows 0..k-1 with Baseline/Cycle N labels, per-cycle point counts,
endedDaysAgo from the latest per-domain advance INTO the next cycle (fallback 0).
Per-domain advances aggregated project-level (commented); history is currently
unrendered by any lens component, populated for contract completeness. Hook
subscribes `useObserveCycleStore((s) => s.byProject[projectId])`.

## Verification

- `tsc --noEmit` EXIT 0 (8GB heap) after every phase.
- Bounded vitest (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]): 71/71 green across 4 files, re-confirmed on
  the final committed tree. Includes NEW `temporalBuilders.test.ts` (8 tests) and
  end-to-end pins over the REAL MTC seed bundle (full water series values, cycle
  history fallback/advance/store-ahead cases).
- **Live DOM proof NOT obtainable**: the sandboxed preview renderer wedged
  mid-module-load on BOTH the live `/v3/project/mtc/observe` route and the
  map-free mock `/v3/prototype/observe-lens` route, across three clean
  single-instance server starts with the API up ([[project-screenshot-hang]];
  same environmental hang as the 2026-06-10 slide-up restyle iteration 2).
  Disclosed per CLAUDE.md -- no screenshot claimed. Static proof: grep confirms
  `TEMPORAL_DATA` no longer exists in `components.tsx` (the fabricated Oct-24
  chart cannot render) and TemporalView reads `useLensData().temporal` with the
  honest empty states; the pinned bundle tests prove the live MTC outcome over
  the real builder.

## Accepted micro-deltas (mock mode)

1. gpsTraces pill now renders on the one mock row carrying `gpsTraces: 4`
   (mock author supplied the value; row gates on > 0).
2. Empty-copy split on never-charted lenses (was a single "Select a lens" line).

## Deferred

- `document` proofs excluded from pills (commented follow-up).
- Scalar measurements without slot bindings do not chart until producers author
  bindings (touches shared constants -- out of scope).
- Cycle label conventions diverge: temporal/history use Baseline/Cycle N,
  DataPointRow keeps `Cycle ${cycleId + 1}` -- documented in code, not "fixed".

Amanah: read-side wiring of land-observation data, no finance framing -- clean
([[fiqh-csra-erased-2026-05-04]]).
