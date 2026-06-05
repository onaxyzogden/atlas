# 2026-06-01 -- Act as-built deviation loop: Slice 4 (fan-out to paddock + zone + structure)

**Branch.** `feat/atlas-permaculture` (one explicit-path commit `f96478ca`, 9 files,
+519/-49; rebased out-of-band, divergence-checked; **not pushed**, commit-only). Fourth
slice of the closed-loop **as-built deviation** feature
([[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]]). Slices 1-3 shipped the loop for
the **cropArea** kind only; Slice 4 fans the exact same loop out to the remaining three
placed-feature kinds -- **paddock, zone, structure** -- with NO trigger-layer changes.

## Why this was small

The substrate was already kind-generic from Slice 1: `domainForFeatureKind`,
`recordAsBuiltDeviation`, `actAsBuiltPopoverStore` (its payload already carries `kind`),
`buildAttributeDiff`, `AsBuiltDiffSchema`, and `acknowledgeDataPoint` all handle every kind.
Only two seams were cropArea-only: **entity resolution** in the Act popover, and the
**Apply switch** in the Plan card. One genuine non-uniformity exists and is now contained to a
single tested helper -- structure's attribute->patch mapping is nested, unlike the three flat
polygon kinds.

## Changes (`f96478ca`)

- `act/layers/ActFeatureClickHandler.tsx`: `KIND_MAP { crop: cropArea, paddock, zone }` widens
  the `plan-data-poly-fill` click + hover seam from `=== 'crop'` to `k in KIND_MAP`; opens the
  popover with the resolved kind. Structures stay OUT -- their dedicated inspector owns them.
- `act/asBuilt/ActAsBuiltPopover.tsx`: subscribes to all four stores unconditionally (Rules of
  Hooks), then a `useMemo` resolves the entity + Plan field schema per `active.kind`
  (`buildCropEditSchema` / `buildPaddockEditSchema` / `buildZoneEditSchema` /
  `buildBuildingEditSchema`). `NOOP_UPDATE` is now parameterless (`(): void => {}`) so it is
  assignable to every builder's update-fn param; `buildBuildingEditSchema` takes no update-fn and
  is never `onSave`d. New `featureCentroid(geometry)` returns `polygonCentroid` for Polygon, the
  first ring for MultiPolygon (zone), the point for Point (structure), else null -> the popover
  falls back to the click anchor. Header generalizes to `entity.name ?? entity.label`. `onSave`
  passes the resolved `kind` + `id` to `recordAsBuiltDeviation`. `InlineFormPayload` is typed from
  `plan/draw/inlineFormStore.js` (NOT re-exported by `inlineEditSchemas.ts`).
- `act/ActStructurePopover.tsx` (+ `.module.css`): a "Record as-built change" `primaryBtn`
  (gated on `projectId`) hands off to `useActAsBuiltPopoverStore.getState().open({ kind:'structure',
  id: active.structureId, anchor })` then closes the inspector. `structureId` IS the V2 entity id,
  so the as-built popover resolves the `BuiltEnvironmentEntity` directly from
  `useBuiltEnvironmentStoreV2.entities`.
- `plan/strata/applyAsBuiltDiff.ts` (NEW): the one tested place holding per-kind Apply mapping
  (mirrors `featureRefDomain`'s "small explicit map" philosophy). `applyAsBuiltDiff(kind, id, diff)`
  -- cropArea/paddock/zone patch FLAT `{ [field]: value }` via `updateCropArea`/`updatePaddock`/
  `updateZone`; structure patches NESTED via `updateMetadata` (`label`/`notes` top-level,
  `subtype` -> `existing.subtype`, `phase` -> `proposed.phase`; the V2 store shallow-merges both
  blocks). `canApplyDiff(diff, kind)` requires a SINGLE SCALAR attribute field -- rejecting bundled
  multi-field (`a+b`) diffs for EVERY kind (a deliberate hardening of the existing cropArea path),
  geometry diffs, and the geometry-coupled structure dims (`widthM`/`depthM`/`rotationDeg`/
  `heightM`, a Slice 5 concern).
- `plan/strata/AsBuiltReconciliationCard.tsx`: drops `useCropStore`; routes Apply through
  `canApplyDiff` + `applyAsBuiltDiff`. No testid / JSX change. `FEATURE_LABEL` already mapped all
  four kinds.
- `act/ActLayout.tsx`: parity mount of `ActFeatureClickHandler` + `ActAsBuiltPopover` in the legacy
  StageShell path (they were tier-shell-only) so the loop, incl. the structure hand-off, works in
  both shells.

## Verification

- `apps/web` + `@ogden/shared` `tsc --noEmit` exit 0.
- New tests: `plan/strata/__tests__/applyAsBuiltDiff.test.ts` (11 -- per-kind patch shape +
  `canApplyDiff` accept/reject matrix; `@vitest-environment happy-dom` so the persisted stores
  rehydrate) + extended `asBuiltReconciliationCard.test.tsx` (14, was 10 -- paddock `updatePaddock`,
  zone `updateZone`, structure nested `updateMetadata`, structure-dim Keep-only). Both green.
- Full `apps/web` suite: my two suites pass. Six unrelated suites fail
  (`planConflict`, `compassGating`, `planWorkPackage`, observe `objectives`, `actWorkItemModule`,
  `syncManifest`) -- all foreign in-flight WIP (a module-taxonomy rename `built-infrastructure`->
  `build` etc., and new unclassified `ogden-protocols` / `ogden-act-evidence` /
  `ogden-plan-tension-banner` stores). None touch the as-built files; the working tree shows that
  foreign WIP (Protocol* components, financial files, DesignMap/DiagnoseMap/OperateMap) is
  uncommitted and untouched by this commit.
- **Not yet live-verified** (localhost round-trip per kind with real screenshot/preview_eval
  evidence) -- deferred to the next session per the Preview Verification discipline.

## Discipline

Explicit-path commit (`git add --` the 9 files), `Compare-Object` confirmed staged == intended
(empty diff), foreign-WIP never-edit list untouched, committed immediately on the rebased branch,
commit-only (no push). ASCII-only; JS/JSON apostrophes double-quoted. No legacy components deleted.
