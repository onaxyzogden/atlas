# ADR: Observe-lens specialised viz read live numbers via a typed proof-slot measurement binding + read-side compiler

**Date:** 2026-06-03
**Status:** accepted (Phases 1-5 complete; verified live via preview_eval)
**Branch:** `feat/atlas-permaculture` (Phase commits P1 prior, P2 `db806872`, P3 `7d1c910c`; P4 folded into P2; **not pushed**)

## Context

The predecessor ADR [[decisions/2026-06-03-atlas-observe-lens-live-data-toggle]]
wired the `module-bar` Observe lens (`apps/web/src/v3/observe/lens/`) onto each
project's live `ObserveDataPoint` substrate and made live the default. It left
ONE documented seam: the six rich specialised visualizations (water infiltration
+ sources, soil pH bars, topography elevation zones + slope breakdown, climate
wind rose + microclimates, human capacity + consent, infrastructure suggested
tasks) had no live numeric source -- seeded `measurementValue` is only
`{label,note}` (schema `unknown`) -- so the live bundle emitted
`specialised: { type: 'none' }` for every lens and rendered an honest empty-viz
note. This follow-on closes that seam: surface real numbers into all six lenses,
sourced from proof items already captured in the Act field-action flow, with NO
new capture UI.

**Operator decisions (this session):**
1. **Full per-domain measurement model** (not a single generic numeric trend).
2. Numbers come from **proof items already captured**
   (`FieldActionProofItem.loggedResult`) -- no new capture UI.
3. **All six lenses** land in this deliverable (not a single vertical slice).

**Why a typed binding, not unit-string matching.** A projected
`ObserveDataPoint` proof item carries `slotId` + `loggedResult` but NOT the slot
label, and `slotId` is not globally unique across proof schemas
(`proofSchemaId` lives on the parent `FieldAction`, not on the projected point).
So label/unit string matching is structurally unreliable. The rich viz also need
structured / grouped / directional fields a flat scalar cannot express (`phData`
= pH+OM+compaction per zone; `windRose` = dir+freq+speed). The compiler-checked
answer is to declare an explicit **`measurementBinding`** on the proof *slot*
(design-time, static) that names exactly which lens viz field a capture feeds,
and to carry multi-field rows in the existing `loggedResult` payload (precedent:
`compostReading.schema.ts`).

## Decision

**1. Producer contract lives in `@ogden/shared`.** New schema file
`packages/shared/src/schemas/observe/lensMeasurement.schema.ts` defines:
- `MeasurementVizField` -- a CLOSED 10-member enum keyed 1:1 to the viz arrays in
  `apps/web/src/v3/observe/lens/types.ts`: `water.infiltrationData`,
  `water.sources`, `soil.phData`, `topography.elevationZones`,
  `topography.slopeBreakdown`, `climate.windRose`, `climate.microclimates`,
  `human.capacityBars`, `human.consentItems`, `infrastructure.suggestedTasks`.
- one Zod **payload schema per structured-row vizField** (the capture/wire
  contract): `InfiltrationReadingSchema {zone,rate}`, `WaterSourceReadingSchema
  {label,sourceType,status,confidence,divergence?}`, `SoilPhReadingSchema
  {zone,ph(0-14),om?,compaction?}`, `ElevationZoneReadingSchema
  {label,areaM2,aspect,use}`, `SlopeReadingSchema {band,areaM2}`,
  `WindObservationSchema {dir(8-point),speedMs}` (freq DERIVED),
  `MicroclimateReadingSchema {label,sizeHa?,character,risk}`,
  `CapacityReadingSchema {label,pct(0-100)}`, `ConsentReadingSchema
  {label,status,weeks?}`, `SuggestedTaskReadingSchema {label,domain,priority}`.
- the `VIZ_FIELD_PAYLOAD` record + a safe-read
  `parseLensMeasurement(vizField, loggedResult)` (mirroring the `asAsBuiltDiff`
  safe-read idiom), and `MeasurementBindingSchema {lens, vizField, zoneKey?,
  dimension?, order?}`.

**2. The binding is one optional field on the proof SLOT.**
`ProofSchemaSlotSchema` (`schemas/fieldAction/proofSchema.schema.ts`) gains an
optional `measurementBinding`. No store migration is needed -- all three relevant
schemas are passthrough, and a slot without a binding simply never feeds a viz
(zero regression for un-migrated schemas).

**3. Slot resolver indexes the catalog.**
`packages/shared/src/constants/fieldAction/proofSchemas.ts` gains a
`BOUND_SLOTS_BY_ID` Map + `getMeasurementSlot(slotId)` over
`FIELD_ACTION_PROOF_SCHEMAS`, plus a NEW catalog entry `observe-measurement`
carrying ten `logged_result` slots (`required: false`, ASCII copy), one per
vizField, each with its `measurementBinding`.

**4. Read-side compiler is pure + store-free.** NEW
`apps/web/src/v3/observe/lens/lensData/specialisedBuilders.ts` -- a pure "compiler"
that turns captured proof items into the six `Specialised` payloads. `getSlot` is
injected as a param (`SlotResolver`) so the module stays React/store-free and
unit-testable. `collectByVizField` groups a lens's proof items by resolved
vizField; `parseRows<T>` flat-maps each row's `loggedResult` through the payload
schema (`.filter` does NOT narrow Zod `SafeParseReturn`, so a `flatMap` + inline
ternary is used). Per-viz builders compute the PRESENTATION fields read-side from
the lens palette + thresholds: `buildInfiltration` (min-max normalised x + status
band good/moderate/risk), `buildSlopeBreakdown` (pct = areaM2 / total),
`buildWindRose` (8-bin compass histogram: freq = count, speed = mean m/s -> km/h),
`buildCapacityBars` (threshold colour >=70 green / <40 red), `buildPhData`
(conditional om/compaction spread for partial rows), and the rest.
`buildSpecialisedForLens(lensId, proofItems, getSlot)` dispatches to the lens
payload, emitting its real union member when >=1 bound row resolves for the
primary field, else the honest `{ type: 'none' }` degrade (a partial row -- e.g.
pH with no OM -- is allowed; the renderer guards the optional spans).

**5. Wire at `liveBundle.ts`.** `LiveBundleInput` gains an optional `getSlot`
(defaults to a no-op resolver so the pure core degrades honestly with no
resolver); the hook passes `getSlot: getMeasurementSlot`. The hard-coded
`specialised: { type: 'none' }` is replaced with
`buildSpecialisedForLens(lens.id, lensProofItems, getSlot)` over the lens's active
proof items. `routeToDataPoint.ts` already carries `proofItems` onto the point --
untouched.

**6. Renderer partial-degrade guards.** `types.ts` relaxes `PhRow.om?` /
`PhRow.compaction?` to optional; `components.tsx` `SoilSpecialised` guards the
OM/compaction spans (`{(d.om !== undefined || d.compaction !== undefined) && ...}`)
so a pH-only partial row renders honestly. Other optional reads
(`source.divergence`, `microclimate.size`, `consent.weeks`) were verified already
&&-guarded or backed by required fields. Mock payloads supply every field, so
mock mode is byte-unaffected.

**7. Seed so the demo renders all six.**
`apps/web/src/data/builtinObserveDataPoints.ts` gains an optional `proofs?:
ObserveSeedProof[]` on `ObserveSeedRow`, threaded through
`buildBuiltinObserveDataPoints` into real `FieldActionProofItem`s. The MTC bundle
authors captures for one domain per lens: creek hydrology (3 infiltration
46/24/9 + 2 sources), soil field (3 pH -- two full, one pH-only partial),
topography (3 elevation zones + 3 slope bands 12000/11000/5000 -> 43/39/18 pct),
climate sectors (7 wind obs across SW/W/S/NW + 2 microclimates), people (3
capacity 45/70/30 + 2 consent), access (3 suggested tasks). Real projects light
up as stewards capture; un-bound lenses keep the honest empty-state.

## Consequences

- All six live lenses now render real specialised charts on MTC out of the box;
  the documented `{ type: 'none' }` seam is now a real compiler.
- The binding is design-time + compiler-checked: a new vizField is a payload
  schema + an enum member + a builder, all type-enforced 1:1 against the viz
  arrays. A typo'd vizField fails `tsc`, not silently at runtime.
- A `dimension`/scalar capture mode is carried on the binding but unconsumed
  (documented-deferred) -- the structured-row `logged_result` mode covers all six
  current viz; scalar aggregation (e.g. a single readiness %) plugs in later with
  no contract change.
- No-deletion respected: `mockData.ts` intact (mock mode unchanged);
  `DomainsView`/`DomainsRail`/`LensBar`/`TopBar` + the horizontal
  `RecentObservationsStrip` path stay exported.

## Verification

- **tsc:** `@ogden/shared` + `apps/web` `tsc --noEmit` (8 GB heap, written to a
  temp file in the package dir, never piped through `head`) -> **EXIT 0**, zero
  errors across the new schema, the resolver, the builders, `liveBundle`,
  `types.ts`, `components.tsx`, and the seed.
- **Bounded vitest (`--pool=forks`, 15s timeout):**
  `specialisedBuilders.test.ts` (degrade with no items / unbound; each lens's
  real member + derived fields -- infiltration status + min-max x, slope pct,
  wind-rose freq + km/h, capacity colour, partial-pH degrade) and the rewritten
  `liveBundle.test.ts` (each of the six `domainDetail[lens].specialised.type` is
  its real member from the MTC seed; slope pct `[43,39,18]`; wind SW freq 3;
  partial pH om undefined; a no-resolver case asserting honest `none`) -- green.
- **Live preview gate, `preview_eval` DOM port 5200** (`preview_screenshot` hung
  -- [[project-screenshot-hang]] -- DISCLOSED; DOM reads used as proof). On
  `/v3/project/mtc/observe` in Live mode all SIX lenses render their real
  specialised chart from the seed captures:
  - **Water:** INFILTRATION 46/24/9 mm/hr -> Good/Moderate/Risk bands + WATER
    SOURCE INVENTORY (2 rows).
  - **Climate:** WIND ROSE (8 petals) + MICROCLIMATE ZONES (0.6 / 1.2 ha).
  - **Living:** SOIL PH BY ZONE -- North/Mid full rows, Creek edge pH-only
    (no OM/Compaction span -- partial-degrade proven live).
  - **Foundation:** ELEVATION ZONES (1.4 ha formatting) + SLOPE BREAKDOWN
    43/39/18%.
  - **Human:** READINESS OVERVIEW 45/70/30% + CONSENT & COMPLIANCE.
  - **Infrastructure:** SUGGESTED FIRST OBSERVATIONS (Inspect culvert / Access /
    HIGH; Map fence lines / Infrastructure / MEDIUM; Log water points /
    Monitoring / LOW).

Explicit-path commits, foreign working-tree WIP untouched
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]);
the externally-rebased branch absorbed three foreign files into staging mid-run,
restored before commit ([[project-branch-rebase]]); **not pushed**. CSRA model
untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy; apostrophes
double-quoted/escaped in JS strings. Builds on
[[decisions/2026-06-03-atlas-observe-lens-live-data-toggle]]. Entity
[[entities/observe-dashboard]]. Log:
[[log/2026-06-03-atlas-observe-lens-measurement-bindings]].
