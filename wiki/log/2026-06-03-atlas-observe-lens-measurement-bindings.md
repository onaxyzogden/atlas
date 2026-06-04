# 2026-06-03 -- Observe lens: live numbers into all six specialised viz (typed proof-slot binding + read-side compiler)

**Branch:** `feat/atlas-permaculture`
**Commits:** P1 (prior session -- shared contract), P2 `db806872` (read-side
builders + liveBundle wire; P4 partial-degrade guards folded in), P3 `7d1c910c`
(catalog bindings + MTC seed captures, 6 lenses). **Commit-only, not pushed.**
ADR [[decisions/2026-06-03-atlas-observe-lens-measurement-bindings]].

## Context

The predecessor work [[log/2026-06-03-atlas-observe-lens-live-data-toggle]] wired
the `module-bar` Observe lens onto live `ObserveDataPoint` data and made live the
default, but left every lens's six specialised charts degrading to
`specialised: { type: 'none' }` -- seeded `measurementValue` is only
`{label,note}`, so there was no live numeric series. This session closes that
documented seam. Operator decisions: (1) full per-domain measurement model,
(2) numbers sourced from proof items already captured in Act
(`FieldActionProofItem.loggedResult`) -- no new capture UI, (3) all six lenses now.

Amanah gate: hifz (operational land-stewardship instrumentation); no riba/gharar.
Clean.

## What shipped

**P1 -- shared producer contract (prior commit)**
- NEW `packages/shared/src/schemas/observe/lensMeasurement.schema.ts` --
  `MeasurementVizField` (closed 10-member enum, 1:1 with the viz arrays), one Zod
  payload schema per structured-row vizField (infiltration, water source, soil
  pH, elevation zone, slope, wind observation, microclimate, capacity, consent,
  suggested task), `VIZ_FIELD_PAYLOAD` record, `MeasurementBindingSchema`,
  safe-read `parseLensMeasurement`.
- EDIT `schemas/fieldAction/proofSchema.schema.ts` -- optional
  `measurementBinding` on `ProofSchemaSlotSchema` (no migration; passthrough).

**P2 -- read-side compiler + wire (`db806872`)**
- NEW `apps/web/src/v3/observe/lens/lensData/specialisedBuilders.ts` -- pure,
  store-free compiler. `SlotResolver` injected; `collectByVizField` groups a
  lens's proof items by resolved vizField; `parseRows<T>` flat-maps each row's
  `loggedResult` through the payload schema (Zod `.filter` does not narrow, so
  flatMap + inline ternary). Per-viz builders compute presentation read-side:
  `buildInfiltration` (min-max x + good/moderate/risk band), `buildSlopeBreakdown`
  (pct = areaM2/total), `buildWindRose` (8-bin compass histogram, mean m/s ->
  km/h), `buildCapacityBars` (threshold colour), `buildPhData` (conditional
  om/compaction spread), + sources/elevation/microclimate/consent/suggested-task.
  `buildSpecialisedForLens(lensId, proofItems, getSlot)` dispatches -> real union
  member when >=1 bound row, else honest `{ type: 'none' }`.
- EDIT `lensData/liveBundle.ts` -- `LiveBundleInput.getSlot?` (defaults to no-op
  resolver), collect `lensProofItems` from active points, replace the hard-coded
  `{ type: 'none' }` with `buildSpecialisedForLens(...)`; hook passes
  `getSlot: getMeasurementSlot`.
- EDIT `packages/shared/src/constants/fieldAction/proofSchemas.ts` --
  `BOUND_SLOTS_BY_ID` Map + `getMeasurementSlot(slotId)` resolver.
- P4 (folded in): `types.ts` relax `PhRow.om?`/`compaction?`; `components.tsx`
  guard the `SoilSpecialised` OM/compaction spans for pH-only partial rows. Other
  optional reads verified already-guarded. Mock payloads supply every field ->
  mock byte-unaffected.
- NEW `lensData/__tests__/specialisedBuilders.test.ts` -- bounded; degrade +
  each lens's real member + derived fields.

**P3 -- catalog bindings + seed captures (`7d1c910c`)**
- EDIT `proofSchemas.ts` -- NEW `observe-measurement` catalog entry, ten
  `logged_result` slots (`required: false`, ASCII), one per vizField, each with
  its `measurementBinding`.
- EDIT `apps/web/src/data/builtinObserveDataPoints.ts` -- optional `proofs?` on
  `ObserveSeedRow`, threaded through `buildBuiltinObserveDataPoints` into real
  `FieldActionProofItem`s. MTC captures: creek hydrology (3 infiltration 46/24/9
  + 2 sources), soil field (3 pH -- 2 full, 1 pH-only partial), topography (3
  elevation zones + 3 slope bands 12000/11000/5000 -> 43/39/18), climate (7 wind
  obs SW/W/S/NW + 2 microclimates), people (3 capacity 45/70/30 + 2 consent),
  access (3 suggested tasks).
- EDIT `lensData/__tests__/liveBundle.test.ts` -- pass `getMeasurementSlot`;
  assert each lens's real `specialised.type` + derived fields + a no-resolver
  honest-`none` case.

## Verification

- **tsc:** `@ogden/shared` + `apps/web` `tsc --noEmit` (8 GB heap, temp file in
  package dir, never piped through `head`) -- EXIT 0, zero errors.
- **Bounded vitest (`--pool=forks`, 15s):** `specialisedBuilders.test.ts` +
  `liveBundle.test.ts` green (six real members from the MTC seed, slope pct
  `[43,39,18]`, wind SW freq 3, partial-pH om undefined, no-resolver -> none).
- **Live preview gate, `preview_eval` DOM port 5200** (`preview_screenshot` hung
  -- [[project-screenshot-hang]] -- DISCLOSED; DOM reads used as proof). On
  `/v3/project/mtc/observe` Live mode, all six lenses render their real chart:
  Water (INFILTRATION 46/24/9 Good/Moderate/Risk + source inventory), Climate
  (WIND ROSE 8 petals + microclimates 0.6/1.2 ha), Living (SOIL PH BY ZONE with
  Creek-edge pH-only partial-degrade), Foundation (ELEVATION ZONES 1.4 ha + SLOPE
  43/39/18%), Human (READINESS 45/70/30 + consent), Infrastructure (SUGGESTED
  FIRST OBSERVATIONS HIGH/MEDIUM/LOW).

## Commit shape

Explicit-path commits (`git add -- <paths>`, `git commit -F <file>`; heredoc
stdin does NOT feed `-F -`, so the message was written to a temp file then
`rm -f`). The externally-rebased branch's out-of-band process raced the staging
-- three foreign files (`stages/design-observation-log-review.md` + two wiki
files) appeared staged mid-run and were `git restore --staged` before commit
([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]]).
`mockData.ts` untouched; legacy exports intact ([[feedback-no-deletion]]). Not
pushed (a push needs a fetch + divergence check the operator has not requested).
CSRA untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only.

## State after

All six live lenses render real specialised charts from seeded proof captures on
MTC; real projects light up as stewards capture measurement-bound proofs; lenses
with no bound captures keep the honest empty-state. The `{ type: 'none' }` seam
is now a real read-side compiler against a typed `@ogden/shared` capture contract.
**Deferred (documented):** the scalar/`dimension` capture mode is carried on the
binding but unconsumed -- structured-row `logged_result` covers all six current
viz; scalar aggregation plugs in later with no contract change. A future producer
task would author the `measurementBinding` slots onto the REAL Act field-action
schemas (beyond the `observe-measurement` demo catalog entry) so live stewardship
captures feed the charts directly.
