# 2026-06-01 -- Act as-built deviation loop: a steward records reality-vs-plan in Act; it surfaces in Plan without mutating Plan

**Status:** accepted (partial -- Slices 1-4 of 5 shipped) | **Branch:** `feat/atlas-permaculture` | **Surface:** Atlas web (`apps/web`) + `@ogden/shared`
**Commits:** `fea7d1d6` (Slice 1 substrate) -> `9ceba563` (Slice 2 thinnest end-to-end loop) -> `26dc308b` (wiki) -> `bff6a8ba` (Slice 3 reconciliation card) -> `f96478ca` (Slice 4 paddock/zone/structure fan-out); not pushed (branch externally rebased; commit-only)
**Entity:** [[entities/act-tier-shell]] | **Log:** [[log/2026-06-01-atlas-act-asbuilt-deviation-slice1-2]]
**Builds on:** [[decisions/2026-05-31-atlas-observe-datapoint-objective-link]], [[decisions/2026-05-31-atlas-act-record-observation-emits-datapoint]]

## Context

"Issue 2" was originally scoped as *edit placed sectors / features / elements in Act*
and was deferred from the prior session because it was mis-scoped. Act tools only
**LOG** events (harvest / livestock move / maintenance); they cannot author geometry,
so "Act-placed elements" is an empty set -- there is nothing in Act to edit. Through a
design session the intent was reframed to a **closed-loop as-built deviation**: during
ACT a steward records that reality has *diverged* from the Plan design on a specific
placed feature (crop area now; paddock / structure / zone later), as an attribute fix
(and, later, a recorded shape deviation), WITHOUT mutating the Plan store from Act. The
change is written to Observe as a divergent data point that surfaces in Plan as a
reconciliation card offering "Apply to design" or "Keep plan".

Exploration found the load-bearing machinery **already wired** -- this is an extension,
not a rebuild:

- The Act execution panel already builds an `ObserveDataPoint` and calls
  `recordDataPoint()` (the first Act->Observe write path, shipped 2026-05-31).
- `usePlanRevisionFlagSync` (mounted per-project in `V3ProjectLayout`) already reads
  active data points with a degraded `statusOutput`, maps their `domainId` to objectives
  via `resolveAllDomainsForObjective`, and forces the cyclical-review trigger.
- Plan already surfaces divergence: the `ObjectiveCard` divergence pill +
  `CyclicalReviewBanner` (Revise / Confirm) in `ObjectiveDetailPanel`.

So the remaining work was (1) a substrate that lets a data point *point at a feature* and
*carry a typed diff*, and (2) the Act affordance that emits one. The loop then closes with
**zero trigger-layer changes**.

Amanah Gate: land-stewardship reconciliation; no riba / gharar. Clean.

## Decisions

1. **As-built deviation, NOT Act-edits-Plan.** The recorded change never mutates the Plan
   store from Act. It is written to Observe as a divergent `ObserveDataPoint`. The only
   Plan-store mutation -- "Apply to design" -- lands later in Slice 3, IN Plan, on an
   explicit steward click. This preserves the ADR-7 invariant "Act adds, it does not edit
   Plan decisions" (Plan geometry already renders `editable={false}` inside Act).

2. **Reference the specific placed feature via `sourceFeatureRef: { kind, id }`.** New
   `AsBuiltFeatureKind = z.enum(["paddock","cropArea","structure","zone"])` +
   `ObserveSourceFeatureRefSchema`; an optional `sourceFeatureRef` field on
   `ObserveDataPointSchema`, `.nullable().default(null)` -- additive, so every existing
   persisted point validates unchanged.

3. **Carry the as-planned / as-built diff in `measurementValue` via a typed companion
   `AsBuiltDiffSchema`.** `measurementValue` is `z.unknown()`, so no schema break. The
   diff is a discriminated union on `kind`: `attribute` (`{ field, label?, asPlanned,
   asBuilt }`) and `geometry` (`{ field:"geometry", asPlanned/asBuilt with
   areaM2? / note? / capturedGeometry? }`). A safe-parse guard `asAsBuiltDiff(v):
   AsBuiltDiff | null` gives the Plan reconciliation card (Slice 3) a pinned shape to read.

4. **The feature-kind -> Observe domain map is what closes the loop -- and it is a SMALL
   EXPLICIT map, not an overload of the objective resolvers.**
   `relationships/featureRefDomain.ts` `domainForFeatureKind(kind)`:
   - `cropArea  -> plants-food`          (lands the divergence on the s6-yield-flows override)
   - `paddock   -> animals-livestock`    (s6-yield-flows override)
   - `structure -> built-infrastructure` (s3-systems-baseline override)
   - `zone      -> land-base`            (s2-land-baseline override; zones have no dedicated domain, so the broad always-present land-baseline landing)
   A data point surfaces on a Plan objective only when its `domainId` overlaps that
   objective's mapped domains (`getObjectiveObserveDomains` / `resolveAllDomainsForObjective`).
   This map is THE correctness piece; keeping it separate from the objective resolvers keeps
   the feature-kind concept out of already-complex code and makes it independently unit-testable.

5. **Acknowledge = soft-supersede, not delete.** New
   `acknowledgeDataPoint(projectId, id)` store mutator flips the EXISTING
   `isSuperseded: true` field (no hard delete -- preserves divergence history, and reuses
   the active-selector machinery so the pill + banner clear on the next
   `usePlanRevisionFlagSync` pass). Persist `version 2 -> 3` backfills
   `sourceFeatureRef: null` (the v1 -> v2 step added `sourceObjectiveId`).

6. **Reuse the Plan field set but swap the mutator to a NO-OP.** `ActAsBuiltPopover`
   reuses `buildCropEditSchema(crop, NOOP_UPDATE, [])` for its field set + initial values
   ONLY; `NOOP_UPDATE` never touches `cropStore`. Save diffs the edits
   (`buildAttributeDiff` -- one changed field -> a scalar `asPlanned`/`asBuilt`; a select
   -> its human option label; several -> one bundled `key+key` diff) and emits ONE
   divergent point via `recordAsBuiltDeviation` (`sourceType:'divergence_evidence'`,
   `statusOutput:'needs_investigation'` -- the lightest divergent status that forces the
   flag-sync; centroid `locationGeometry`; the `AsBuiltDiff` in `measurementValue`). An
   Act-scoped singleton popover store (`actAsBuiltPopoverStore`, mirroring
   `actStructurePopoverStore`) avoids the `inlineFormStore` module-singleton collision and
   works on the default tier-shell, which deliberately does NOT mount `InlineFeaturePopover`.

## The project-type-dependent objective id (load-bearing for Slice 3)

The Slice 2 verification gate names `s6-yield-flows` as the objective whose divergence pill
lights. That literal is the **static skeleton** stratum-6 id -- the id null-type / legacy
projects resolve via the `useProjectObjectives` Level-3 fallback. **Regenerative_farm
projects resolve DIFFERENT stratum-6 ids** -- `s6-monitoring`,
`rf-s6-biodiversity-monitoring`, `rf-s6-enterprise-integration` -- and each of those owns
the `plants-food` domain. Because the loop forces whichever objectives OWN `plants-food`
(domain overlap, not a hardcoded id), the cropArea divergence works for BOTH project types;
only the *lit objective id* differs. This was verified live on a static-skeleton project
(dd) and a regenerative_farm project (Halton Hills).

**Implication for Slice 3:** the `AsBuiltReconciliationCard` MUST read its divergent points
by DOMAIN overlap (the real `getObjectiveObserveDomains` / `resolveAllDomainsForObjective`
resolver), never a hardcoded `s6-yield-flows`, or it will silently render nothing on
regen-farm projects. The mechanism is already robust across project types; the card must not
re-introduce a hardcoded id.

## Alternatives considered

- **Let Act edit the Plan store directly** -- rejected; violates ADR-7. The reconciliation
  gate living in Plan is the whole point.
- **Overload the objective -> domain resolvers to teach them feature kinds** -- rejected; a
  small explicit `featureRefDomain` map keeps feature-kind logic out of the objective
  resolvers and is independently testable.
- **Hard-delete the data point on acknowledge** -- rejected; soft-supersede preserves the
  divergence history and reuses the existing `isSuperseded` selectors (the pill / banner
  already clear on superseded points).
- **A new schema field for the diff instead of `measurementValue`** -- unnecessary;
  `measurementValue` is `z.unknown()`, and a typed safe-parse guard gives the Plan card a
  pinned shape without a schema break.

## Consequences

- `observeDataPointStore` persist `version 2 -> 3` (additive `sourceFeatureRef` backfill).
- `recordAsBuiltDeviation` reuses the store's proximity supersession (a new same-domain
  capture within 10m of an active one supersedes it) via the centroid geometry, so one
  feature keeps one active divergence (latest wins).
- The loop closes with ZERO trigger-layer changes: the new divergent points slot straight
  into `usePlanRevisionFlagSync`.
- 52 tests green. Slice 1: `asBuiltDiff` 10 + `featureRefDomain` 6 +
  `observeDataPointStore.asBuilt` 6 = 22. Slice 2: `attributeDiff` 8 +
  `recordAsBuiltDeviation` 8 + `planRevisionFlag.asBuilt` 4 = 20. Slice 3:
  `asBuiltReconciliationCard` 10 = 10. apps/web + `@ogden/shared` tsc exit 0.

## Resolved / still-deferred

- **Shipped (Slices 1-2):** the substrate + the thinnest end-to-end loop. An Act crop-area
  attribute edit emits a `plants-food` divergent point; the Plan objective divergence pill +
  `CyclicalReviewBanner` appear live (screenshot-verified on the static-skeleton project; the
  loop was also exercised on a regen-farm project).
- **Shipped (Slice 3, `bff6a8ba`):** `AsBuiltReconciliationCard` in `ObjectiveDetailPanel`
  (below `CyclicalReviewBanner`). Reads by domain overlap (domain overlap, NOT hardcoded id).
  Apply -> `updateCropArea + acknowledgeDataPoint`; Keep -> `acknowledgeDataPoint` only; card
  clears reactively. 10/10 tests. Full round-trip live-verified: card renders, Apply and Keep
  both clear the card + flip `isSuperseded:true`, divergence count decrements, `cropsUnchanged`
  on Keep (screenshots captured).
- **Shipped (Slice 4, `f96478ca`):** fan-out to paddock + zone + structure. The substrate was
  already kind-generic (`domainForFeatureKind`, `recordAsBuiltDeviation`, `actAsBuiltPopoverStore`
  carrying `kind`, `buildAttributeDiff`, `acknowledgeDataPoint`); only **entity resolution** (Act
  popover) and the **Apply switch** (Plan card) were cropArea-only.
  - `ActFeatureClickHandler` `KIND_MAP { crop, paddock, zone }` widens the polygon click seam
    (structures keep their dedicated inspector).
  - `ActAsBuiltPopover` resolves the entity + Plan field schema per kind
    (`buildCropEditSchema` / `buildPaddockEditSchema` / `buildZoneEditSchema` /
    `buildBuildingEditSchema`) with a parameterless `NOOP_UPDATE` (assignable to every builder's
    update-fn param); a `featureCentroid` helper covers Polygon / MultiPolygon (zone) / Point
    (structure), falling back to the click anchor; `onSave` passes the resolved `kind` + `id` to
    `recordAsBuiltDeviation`.
  - `ActStructurePopover` gains a "Record as-built change" hand-off button into the shared
    `actAsBuiltPopoverStore` (the read-only inspector cannot author a diff itself).
  - **New `applyAsBuiltDiff.ts`** is the one tested place holding per-kind Apply mapping (mirrors
    the ADR's `featureRefDomain` "small explicit map" philosophy). cropArea / paddock / zone patch
    FLAT (`{ [field]: value }`); structure is NESTED via `updateMetadata` (`label`/`notes`
    top-level, `subtype` -> `existing.subtype`, `phase` -> `proposed.phase`; the V2 store
    shallow-merges both blocks, so a partial nested patch never wipes siblings). `canApplyDiff`
    requires a SINGLE SCALAR attribute field -- rejecting bundled multi-field (`a+b`) diffs for
    EVERY kind (a deliberate hardening of the existing cropArea path), geometry diffs, and the
    geometry-coupled structure dims (`widthM` / `depthM` / `rotationDeg` / `heightM`, which are a
    Slice 5 "fix shape, not attributes" concern). `AsBuiltReconciliationCard` now routes Apply
    through the dispatcher (no testid/JSX change).
  - `ActLayout` parity mount adds `ActFeatureClickHandler` + `ActAsBuiltPopover` to the legacy
    StageShell path so all four kinds (incl. the structure hand-off) work outside the tier-shell.
  - **Tests:** `applyAsBuiltDiff` (11 -- per-kind patch shape + `canApplyDiff` rejections) +
    extended `asBuiltReconciliationCard` (14, was 10 -- paddock `updatePaddock`, zone `updateZone`,
    structure nested `updateMetadata`, structure-dim Keep-only). apps/web + `@ogden/shared` tsc
    exit 0. Pre-existing foreign-WIP suite failures (module-taxonomy rename + new
    `ogden-protocols` / `ogden-act-evidence` / `ogden-plan-tension-banner` stores) are unrelated
    and untouched.
  - **Not yet live-verified** (localhost round-trip per kind) -- deferred to next session.
- **Deferred to Slice 5 (#32, optional):** shape-deviation (geometry) capture, rendered
  read-only in Plan (no geometry Apply in v1 -- matches "just fix attributes, not shape").
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
