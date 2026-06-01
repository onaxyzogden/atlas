# 2026-06-01 -- Act as-built deviation loop: Slices 1-3 (substrate + cropArea end-to-end + Plan reconciliation card)

**Branch.** `feat/atlas-permaculture` (two explicit-path commits `fea7d1d6` Slice 1
substrate -> `9ceba563` Slice 2 loop; rebased out-of-band, divergence-checked; **not
pushed**). First two slices of the closed-loop **as-built deviation** feature
([[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]]): in Act a steward records that
reality has diverged from the Plan design on a placed feature; the edit is written ONLY to
Observe as a divergent `ObserveDataPoint`, and the existing `usePlanRevisionFlagSync` closes
the loop with zero trigger-layer changes so Plan lights its divergence pill +
`CyclicalReviewBanner`. Preserves "Act adds, it does not edit Plan decisions" (the only
Plan-store mutation, "Apply to design", lands in Plan in Slice 3).

## Slice 1 -- substrate (`fea7d1d6`, 13 files, +502/-17)

`@ogden/shared`:
- `schemas/observe/dataPoint.schema.ts`: `AsBuiltFeatureKind = z.enum(["paddock","cropArea",
  "structure","zone"])`; `ObserveSourceFeatureRefSchema = z.object({ kind, id })`; optional
  `sourceFeatureRef: ...nullable().default(null)` on `ObserveDataPointSchema` (additive --
  existing data validates unchanged). Typed `AsBuiltDiffSchema` (discriminated union on
  `kind`: `attribute` `{field,label?,asPlanned,asBuilt}` / `geometry` `{field:"geometry",
  asPlanned/asBuilt with areaM2?/note?/capturedGeometry?}`) carried in the `z.unknown()`
  `measurementValue`, plus an `asAsBuiltDiff(v): AsBuiltDiff | null` safe-parse guard.
- `relationships/featureRefDomain.ts` (NEW): `domainForFeatureKind` -- cropArea ->
  `plants-food`, paddock -> `animals-livestock`, structure -> `built-infrastructure`,
  zone -> `land-base`. The small explicit map that lands the divergence on the right
  objective by DOMAIN overlap (NOT an overload of the objective resolvers). Each mapped
  domain is asserted present in the domain catalog + overlapping >= 1 objective by the test.
- `index.ts`: barrel exports for the new types / schema / guard / map.

`apps/web`:
- `store/observeDataPointStore.ts`: persist `version 2 -> 3` (additive `sourceFeatureRef:
  null` backfill; the v1->v2 step added `sourceObjectiveId`); new `acknowledgeDataPoint(
  projectId, id)` -- soft-supersede (flips the existing `isSuperseded:true`, no hard delete,
  drops the point from active selectors so the pill/banner clear).
- `ActTierExecutionPanel.tsx` + a few test fixtures (`routeToDataPoint.ts`,
  `observationSource` / `temporalSeries` / `observeFreshness` / `supersession` tests): +1/+2
  touches to carry the new `sourceFeatureRef` field.

Tests (NEW): `schemas/observe/__tests__/asBuiltDiff.test.ts` (10 -- attribute/geometry
round-trip + guard rejects), `relationships/__tests__/featureRefDomain.test.ts` (6 -- every
kind maps to a catalog domain overlapping >= 1 objective), `store/__tests__/
observeDataPointStore.asBuilt.test.ts` (6 -- emit / acknowledge / v2->v3 migration).

## Slice 2 -- thinnest end-to-end loop, cropArea attribute-only (`9ceba563`, 10 files, +976)

New `apps/web/src/v3/act/asBuilt/`:
- `recordAsBuiltDeviation.ts`: builds the `ObserveDataPoint` (`domainId:
  domainForFeatureKind(kind)`, `sourceType:'divergence_evidence'`,
  `statusOutput:'needs_investigation'`, `sourceFeatureRef:{kind,id}`, centroid
  `locationGeometry`, `measurementValue: diff`, `capturedBy:'act-as-built'`) and calls
  `recordDataPoint`. Also exports `polygonCentroid`.
- `ActAsBuiltPopover.tsx` + `ActAsBuiltPopover.module.css`: anchored popover that reuses
  `buildCropEditSchema(crop, NOOP_UPDATE, [])` for the field set ONLY -- `NOOP_UPDATE` never
  mutates `cropStore`. Save -> `buildAttributeDiff` -> if non-null, `recordAsBuiltDeviation`.
  role="dialog"; note copy "Recorded to Observe as a divergence - does not change the Plan."
- `actAsBuiltPopoverStore.ts`: Act-scoped singleton popover store (mirrors
  `actStructurePopoverStore`) -- sidesteps the `inlineFormStore` module-singleton collision
  and works on the default tier-shell (which does not mount `InlineFeaturePopover`).
- `attributeDiff.ts`: pure `buildAttributeDiff` / `labelForValue` (one changed field ->
  scalar; select -> human option label; many -> one bundled `key+key` diff).
- `layers/ActFeatureClickHandler.tsx`: crop-area click seam on `plan-data-poly-fill`
  (mirrors `ActStructureClickHandler`); opens the popover at the click point.
- `tier-shell/ActTierShell.tsx`: +4 lines -- mount `ActFeatureClickHandler` +
  `ActAsBuiltPopover` (clean diff, no foreign WIP).

Tests (NEW): `asBuilt/__tests__/attributeDiff.test.ts` (8), `asBuilt/__tests__/
recordAsBuiltDeviation.test.ts` (8), `observe/dashboard/revision/__tests__/
planRevisionFlag.asBuilt.test.ts` (4 -- an active `plants-food` divergent point forces the
`s6-yield-flows` flag via the two pure functions the hook composes).

## Key finding -- the project-type-dependent objective id (load-bearing for Slice 3)

The gate's `s6-yield-flows` is the STATIC skeleton stratum-6 id (null-type / legacy projects,
`useProjectObjectives` Level-3 fallback). **Regenerative_farm projects resolve different
stratum-6 ids** -- `s6-monitoring` / `rf-s6-biodiversity-monitoring` /
`rf-s6-enterprise-integration` -- each owning `plants-food`. The loop forces whichever
objectives OWN `plants-food` (domain overlap, not a hardcoded id), so the cropArea divergence
works for BOTH project types; only the lit id differs. **Slice 3's card must read by domain
overlap, never a hardcoded id.**

## Verification

- apps/web + `@ogden/shared` tsc exit 0.
- 42 tests green (Slice 1: 10 + 6 + 6 = 22; Slice 2: 8 + 8 + 4 = 20; re-run at wiki-write
  time: web 4 files / 26, shared 2 files / 16).
- Live (localhost, dev server): a real `recordAsBuiltDeviation` write flipped
  `isForced(s6-yield-flows)` false -> true reactively; the objective divergence pill ("1
  DIVERGENCE") + `CyclicalReviewBanner` (REVISE / CONFIRM) rendered in the Plan DOM;
  removing the point cleared both. **Screenshot captured** (pill + banner visible) after
  dismissing a 6-deep stratum-unlock modal queue left over from an earlier wholesale
  completion. Loop also exercised on a regenerative_farm project (Halton Hills) -- divergence
  forced via domain overlap on its own stratum-6 ids.
- Injected dev test points removed afterward (only the two `capturedBy:'act-as-built'`
  points across project keys `75cfb3ed` + `c6eccdaf`); reload confirmed clean
  (has75:false / hasDd:false), which also proved the loop's clear-half.

## Discipline

Explicit-path commits, guarded by `Compare-Object` (intended 10 == staged 10 for Slice 2);
foreign WIP (`DesignMap.tsx`, `financialStore.ts`, etc.) confirmed still ` M` and uncommitted
post-commit ([[feedback-no-deletion]]); committed immediately on the rebased branch
([[feedback-commit-immediately-on-rebased-branches]]); not pushed ([[project-branch-rebase]]);
screenshot honesty ([[project-screenshot-hang]]); CSRA model untouched
([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.

Entity [[entities/act-tier-shell]]; ADR [[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]];
builds on [[decisions/2026-05-31-atlas-observe-datapoint-objective-link]] +
[[decisions/2026-05-31-atlas-act-record-observation-emits-datapoint]]. Pending: Slices 4-5.

## Slice 3 -- Plan reconciliation card (`bff6a8ba`, 4 files, +642 insertions)

New `apps/web/src/v3/plan/strata/AsBuiltReconciliationCard.tsx` + `.module.css`:
- Reads active, non-superseded data points where `sourceFeatureRef != null`, `statusOutput` is
  divergent (`needs_investigation` / `major_constraint` / `potential_disqualifier`), and
  `domainId in new Set(resolveAllDomainsForObjective(objective))`. NEVER hardcodes an objective
  id -- reads by domain overlap only (project-type-finding from Slice 2 verified: works on both
  static-skeleton and regen-farm project types).
- Parses `measurementValue` via `asAsBuiltDiff(point.measurementValue): AsBuiltDiff | null`.
- Renders amber-tone `<aside data-testid="plan-asbuilt-reconciliation-card">`: header
  (AlertTriangle + "AS-BUILT DIVERGENCE" + count badge), one `<DeviationItem>` per point.
- `DeviationItem`: kind badge (CROP AREA / PADDOCK / ...), timestamp, field label, diff block
  (`asPlanned` struck through + arrow + `asBuilt` in bold for `attribute`; read-only geometry
  note for `geometry`). Buttons: "APPLY TO DESIGN" (amber, `canApply = kind==='attribute' &&
  featureRef.kind==='cropArea'`) and "KEEP PLAN" (always). All hooks called before any early
  return (Rules of Hooks compliance).
- Apply: `updateCropArea(featureRef.id, { [diff.field]: diff.asBuilt })` +
  `acknowledgeDataPoint(projectId, point.id)`. Keep: `acknowledgeDataPoint` only. Both clear
  the card reactively on the next Zustand selector pass.
- `ObjectiveDetailPanel.tsx`: +2 lines to import + mount the card below `CyclicalReviewBanner`.

Tests: `plan/strata/__tests__/asBuiltReconciliationCard.test.tsx` (10 -- renders/filters/
both actions). Lucide-react CJS multi-instance React crash in the vitest environment fixed by
`vi.mock('lucide-react', () => ({ AlertTriangle: () => null, ... }))` at the top of the file.

## Verification (Slice 3)

- apps/web tsc exit 0 (confirmed before commit).
- 10/10 tests green: renders when matching point, attribute asPlanned/asBuilt displayed,
  renders nothing when no points / superseded / no sourceFeatureRef, Apply+Keep both for
  attribute; Keep only for geometry; Apply calls updateCropArea with correct patch + acknowledges;
  Keep does not call updateCropArea + acknowledges.
- Live (localhost:5202, `feat/atlas-permaculture` bff6a8ba, fresh Vite cold start after
  clearing both `apps/web/node_modules/.vite` and `packages/shared/node_modules/.vite`):
  Vite stale cache confirmed cleared (10 live exports including `asAsBuiltDiff` visible via
  dynamic import in browser). Test deviation point injected directly via
  `useObserveDataPointStore.getState().recordDataPoint(...)` (domainId "plants-food",
  statusOutput "needs_investigation", kind "attribute", field "name", asPlanned "Apple
  Orchard", asBuilt "Pear Orchard"). Navigated to
  `/v3/project/mtc/plan/stratum/s6-integration-design/objective/s6-yield-flows` via
  pushState. **Screenshot confirmed:** AS-BUILT DIVERGENCE card visible with CROP AREA badge,
  "Apple Orchard -> Pear Orchard" diff, APPLY TO DESIGN + KEEP PLAN buttons, divergence count
  2 in middle panel. Apply: card cleared, count 2->1, `isSuperseded:true` confirmed in
  `byProject` store. Keep: second injected point (species diff), card cleared, count 2->1,
  `isSuperseded:true`, `cropsUnchanged:true`. Full round-trip verified.
