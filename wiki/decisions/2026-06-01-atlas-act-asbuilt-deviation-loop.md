# 2026-06-01 -- Act as-built deviation loop: a steward records reality-vs-plan in Act; it surfaces in Plan without mutating Plan

**Status:** accepted (Slices 1-6 shipped; Slice 6 = geometry capture-and-apply) | **Branch:** `feat/atlas-permaculture` | **Surface:** Atlas web (`apps/web`) + `@ogden/shared`
**Commits:** `fea7d1d6` (Slice 1 substrate) -> `9ceba563` (Slice 2 thinnest end-to-end loop) -> `26dc308b` (wiki) -> `bff6a8ba` (Slice 3 reconciliation card) -> `f96478ca` (Slice 4 paddock/zone/structure fan-out) -> `8983ab6d` (select-field raw-value Apply fix, found during Slice 4 live-verify) -> `a6d356b4` (Slice 5 geometry shape-deviation capture) -> `6ff06b0e` (Slice 6 geometry capture-and-apply); not pushed (branch externally rebased; commit-only)
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
- Tests green across all slices. Slice 1: `asBuiltDiff` 10 + `featureRefDomain` 6 +
  `observeDataPointStore.asBuilt` 6 = 22. Slice 2: `attributeDiff` 8 +
  `recordAsBuiltDeviation` 8 + `planRevisionFlag.asBuilt` 4 = 20. Slice 3-5:
  `asBuiltReconciliationCard` 16 + `applyAsBuiltDiff` 13 + `geometryDiff` 6.
  apps/web + `@ogden/shared` tsc exit 0.

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
  - **Live-verified (2026-06-01):** the Slice 4 round-trip was exercised on localhost (mtc
    project). Verification surfaced a REAL defect -- a select-valued attribute Apply wrote the
    human option label (e.g. "Food forest") instead of the enum code ("food_forest"), corrupting
    the entity prop, because `buildAttributeDiff` carries display labels in `asPlanned`/`asBuilt`
    while `applyAsBuiltDiff` wrote `asBuilt` straight to the store. **Fixed in `8983ab6d`:** the
    attribute diff now also carries `asPlannedRaw` / `asBuiltRaw` (the un-labeled stored codes),
    and `applyAsBuiltDiff` prefers the raw value when scalar. The honesty gate held (stop, fix,
    re-verify before Slice 5).
- **Shipped (Slice 5, `a6d356b4`):** geometry shape-deviation capture. A steward toggles "Shape
  differs on the ground" in `ActAsBuiltPopover`, adds a note + OPTIONAL approximate as-built area,
  and Records; the popover emits a `geometry` `AsBuiltDiff` (asPlanned.areaM2 from
  `parcelAreaM2(feature.geometry)`; asBuilt `{ note, areaM2? }`) instead of an attribute diff.
  Geometry takes PRECEDENCE over attribute edits on Save (one Save = one data point). There is NO
  polygon redraw and NO Plan mutation -- shape divergence is recorded as evidence only, matching
  "fix attributes, not shape."
  - **New `geometryDiff.ts`** pure helper `buildGeometryDiff(plannedAreaM2, note, asBuiltAreaM2?)`:
    null when blank note AND no area; rounds areas to whole m2; omits null/NaN planned area. 6 unit
    tests (the pure-helper + unit-test pattern from `attributeDiff.ts`).
  - `ActAsBuiltPopover` gains `shapeDiffers` / `geomNote` / `asBuiltAreaInput` state (reset per
    opened feature), a "Shape differs" toggle + note textarea + optional area input, an `onSave`
    geometry-precedence branch, and a widened `canSave` (the geometry path saves with a note even
    when no attribute changed). The attribute flow is byte-identical when the toggle is off.
  - `AsBuiltReconciliationCard` geometry branch renders the area delta ("93131 m2 -> 650 m2
    (-92481 m2)", `formatAreaDelta`) when both areas are present, plus the note, read-only with
    Keep only (`canApplyDiff` already rejects geometry -- no Apply button).
  - **Tests:** `geometryDiff` 6 + extended `asBuiltReconciliationCard` 16 (was 14 -- geometry delta
    + note + Keep-only; note-only no-delta). `applyAsBuiltDiff` 13 (includes the raw-value
    regressions) + `attributeDiff` 8 unbroken. apps/web + `@ogden/shared` tsc exit 0.
  - **Live-verified (2026-06-01):** paddock "shape differs" -> geometry divergent point (real
    planned area 93131 m2, domain `animals-livestock`, `sourceFeatureRef.kind:'paddock'`) -> Plan
    card shows "SHAPE DIFFERS / 93131 m2 -> 650 m2 (-92481 m2) / note / no Apply, Keep only" ->
    Keep soft-supersedes the point, paddock geometry unchanged. Dev-injected point removed; the Act
    popover store dev hook (used because the maplibre layer click is unreachable from preview
    tooling) was reverted before commit.
- **Shipped (Slice 6, `6ff06b0e`):** geometry CAPTURE-and-APPLY -- the deferred "Plan re-draw"
  affordance. A steward redraws the REAL as-built polygon in Act and Plan can apply it to the design,
  closing the shape-reconciliation half of the loop (Slice 5 recorded shape divergence as read-only
  evidence; Slice 6 makes it reconcilable). Two operator forks settled this session: capture path =
  "capture-in-Act then Apply" (over reuse-the-Plan-vertex-editor / full-redraw); kinds = all four.
  - **Invariant preserved.** This adds Act *geometry authoring* but NOT Act *Plan-mutation*: Act only
    writes the captured polygon into an Observe data point as evidence (`asBuilt.capturedGeometry`).
    The single Plan-store mutation remains the explicit Plan-side "Apply to design" click -- identical
    in spirit to the attribute Apply path. "Act adds, it does not edit Plan decisions" holds in letter
    and intent.
  - **Act capture.** `actAsBuiltPopoverStore` gains a transient `capture` sub-state
    (`{ drawing, geometry, areaM2 }` + `startDrawing` / `cancelDrawing` / `setCaptured` / `clearCaptured`;
    `open`/`close` reset it) -- the same store-bridge pattern as `planVertexEditStore`. New
    **`ActAsBuiltDrawHandler.tsx`** (a thin `map`-prop shell, returns null) calls
    `useMapboxDrawTool<Polygon>({ map, mode:'draw_polygon', enabled: capture.drawing, onComplete })`
    where `onComplete(poly) = setCaptured(poly, parcelAreaM2(poly))`; the hook is always called and
    gated by `enabled` (Rules-of-Hooks safe; `enabled:false` mounts no control -- true no-op). Mounted
    after `<ActAsBuiltPopover>` in BOTH shells (`ActTierShell` ~403, `ActLayout` ~252; grep-verified --
    missing one silently no-ops redraw in that shell). `ActAsBuiltPopover` adds a "Redraw shape on map"
    button (`startDrawing`) + a "Shape captured - N m2 / Clear" readout; while `capture.drawing` it
    renders null (yields the canvas) after all hooks, Esc -> `cancelDrawing` (else `close`),
    click-outside early-returns. `geometryArmed = shapeDiffers && (note || areaInput ||
    capture.geometry != null)`; `onSave` passes `capture.geometry` into `buildGeometryDiff`.
  - **`geometryDiff.ts`** gains an optional 4th param `capturedGeometry?: Polygon`: when present it
    stamps `asBuilt.capturedGeometry` and, if no explicit area was typed, derives `asBuilt.areaM2` via
    `parcelAreaM2`. Slice-5 3-arg callers unchanged. The `capturedGeometry` slot was ALREADY in the
    schema (`z.unknown().optional()`) -- NO schema change; shape is enforced by a runtime guard at the
    apply boundary, not by schema coupling to turf's polygon type.
  - **Plan apply.** `applyAsBuiltDiff.ts` gains `asCapturedPolygon(v): Polygon | null` (runtime guard:
    `type==='Polygon'`, `coordinates[0]` ring length >= 4). `canApplyDiff` now lights a geometry diff
    IFF `asCapturedPolygon(diff.asBuilt.capturedGeometry) !== null` (all four kinds; note/area-only
    geometry stays read-only). `applyGeometryDiff` writes geometry + recomputed `areaM2`
    (`parcelAreaM2`, guarded spread -- omit `areaM2` if null) to cropArea/paddock/zone via
    `updateCropArea`/`updatePaddock`/`updateZone`, and routes structure through `updateStructure(id,
    { geometry })` (which feeds `updateGeometry`; `widthM`/`depthM`/`rotationDeg` go stale by design --
    same accepted behavior as the Plan vertex editor). `AsBuiltReconciliationCard` lights "Apply to
    design" for free (it already renders off `canApply`); the read-only label swaps to "As-built shape
    captured -- Apply redraws the design polygon", and for structure adds a caution that apply replaces
    the parametric footprint.
  - **Tests:** `geometryDiff` 9 (+3 -- stamps polygon + derives area; captured-alone is a divergence;
    typed area wins over derived), `applyAsBuiltDiff` 20 (+ accept-all-4-kinds-with-captured, reject
    malformed, a "captured geometry" block: crop/paddock/zone write geometry+areaM2, structure routes
    through an `updateGeometry` spy, no-op on malformed), `asBuiltReconciliationCard` 19 (+ Apply shows
    for captured-polygon geometry + "As-built shape captured" copy; Apply writes the polygon to the crop
    store with numeric areaM2; structure "parametric footprint" caution). apps/web + `@ogden/shared` tsc
    exit 0. `act/asBuilt` + `plan/strata` suites green (144 tests across 18 files). The full vitest run
    hung on unrelated network-bound suites (dead `localhost:3000`) and was stopped; the directly-affected
    directories were run clean as a whole instead.
  - **Verification honesty note:** the new and risky logic -- `applyGeometryDiff`, the `canApplyDiff`
    geometry branch, the card label -- is comprehensively unit-covered (the `applyAsBuiltDiff` suite
    injects a captured polygon and asserts the per-kind geometry+areaM2 store write). A live localhost
    round-trip was NOT driven: the Act capture side requires drawing a polygon on the maplibre canvas,
    which (like the layer clicks documented in Slices 4-5) is unreachable from preview automation, and
    the dev API was down. Per the standing honesty gate this is recorded as unit/typecheck-verified, NOT
    live-verified -- no fabricated status.
- **Loop complete:** all 6 slices shipped; the Act -> Observe -> Plan as-built deviation loop covers
  all four feature kinds (cropArea / paddock / zone / structure) for attribute fixes, geometry (shape)
  evidence, AND geometry capture-and-apply, with the only Plan-store mutation being the steward's
  explicit "Apply to design" click in Plan (attribute values; or the captured as-built polygon for
  geometry diffs).
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
