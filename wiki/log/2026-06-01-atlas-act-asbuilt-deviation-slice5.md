# 2026-06-01 -- Act as-built deviation loop: Slice 4 live-verify + Slice 5 (geometry shape-deviation capture)

**Branch.** `feat/atlas-permaculture` (two explicit-path commits: `8983ab6d` select-field
raw-value Apply fix; `a6d356b4` Slice 5, 7 files, +320/-4; rebased out-of-band,
divergence-checked; **not pushed**, commit-only). Closes the closed-loop **as-built
deviation** feature ([[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]]) -- all 5 of
5 slices now shipped.

## Phase A -- Slice 4 live-verify (the defect)

Slice 4 (`f96478ca`) shipped with typecheck + unit tests green but was never live-verified.
This session exercised the round-trip on localhost (mtc project, real hand-drawn paddocks).
Verification surfaced a **real defect**: a select-valued attribute Apply wrote the human
option label (e.g. "Food forest") instead of the enum code ("food_forest"), corrupting the
entity prop. Root cause: `buildAttributeDiff` carries display labels in `asPlanned`/`asBuilt`
(for the card), but `applyAsBuiltDiff` wrote `diff.asBuilt` straight to the store.

**Fix (`8983ab6d`):** the attribute diff now also carries `asPlannedRaw` / `asBuiltRaw` -- the
un-labeled stored codes -- and `applyAsBuiltDiff` prefers the raw value when scalar
(`isScalar(diff.asBuiltRaw) ? diff.asBuiltRaw : diff.asBuilt`). Schema gained the two optional
raw fields (additive, no break). The honesty gate held: stop Phase A, fix, re-verify, then
Slice 5. Two new regression tests (cropArea writes `food_forest`; structure maps raw
`subtype` -> `existing.subtype`).

## Phase B -- Slice 5 (`a6d356b4`)

Geometry shape-deviation capture, the final slice. A steward toggles "Shape differs on the
ground" in `ActAsBuiltPopover`, adds a note + OPTIONAL approximate as-built area, and Records;
the popover emits a `geometry` `AsBuiltDiff` instead of an attribute diff. NO polygon redraw,
NO Plan mutation -- shape divergence is recorded as evidence only ("fix attributes, not shape").

### Changes

- `act/asBuilt/geometryDiff.ts` (NEW): pure `buildGeometryDiff(plannedAreaM2, note,
  asBuiltAreaM2?)` -- returns null when blank note AND no area (a bare toggle records nothing);
  rounds areas to whole m2; omits null/NaN planned area. `asPlanned: { areaM2? }`,
  `asBuilt: { note?, areaM2? }`. Mirrors `attributeDiff.ts`'s pure-helper + unit-test pattern.
- `act/asBuilt/ActAsBuiltPopover.tsx`: `shapeDiffers` / `geomNote` / `asBuiltAreaInput` state
  (reset per opened feature in the seed effect); a "Shape differs" toggle + (when on) note
  textarea + optional area number input below the attribute fields; planned area via
  `parcelAreaM2(resolved.geometry)` (`../../../lib/geo.js`). `onSave` branches: when the
  geometry path is "armed" (toggle on AND note-or-area given) it takes PRECEDENCE -- one Save =
  one data point, so attribute edits in the same form are ignored -- builds via
  `buildGeometryDiff` and records; else the existing attribute path runs byte-identically.
  `canSave` widened to `Boolean(projectId) && (geometryArmed || hasChanges)`.
- `act/asBuilt/ActAsBuiltPopover.module.css`: `.shapeSection` / `.toggleRow` / `.textarea`.
- `plan/strata/AsBuiltReconciliationCard.tsx`: the existing read-only `geometry` branch now
  renders an area delta line when both areas are present -- `93131 m2 -> 650 m2 (-92481 m2)`,
  reusing `.diffChange/.asPlanned/.arrow/.asBuilt` + a new `.areaDelta`; `formatAreaDelta`
  helper. Still Keep-only (`canApplyDiff` rejects geometry -- no Apply button).
- `plan/strata/AsBuiltReconciliationCard.module.css`: `.areaDelta`.

### Verification

- `apps/web` + `@ogden/shared` `tsc --noEmit` exit 0.
- Vitest: `geometryDiff` 6 + extended `asBuiltReconciliationCard` 16 (was 14 -- geometry delta +
  note + Keep-only; note-only no-delta) + `applyAsBuiltDiff` 13 (incl. the raw-value
  regressions) + `attributeDiff` 8 -- all green (43 in the four as-built suites).
- **Live-verified (localhost, mtc project):** drove the popover via a temporary dev hook
  (the maplibre layer-delegated click is unreachable from preview tooling -- documented
  limitation; hook reverted before commit). Toggled "Shape differs" on `mtc-paddock-1`, note
  "north edge ~3 m short of plan" + area 650 -> Record -> `localStorage` shows a `geometry`
  divergent point: `asPlanned.areaM2: 93131` (real `parcelAreaM2` of the drawn polygon),
  `asBuilt: { areaM2: 650, note }`, `domainId: animals-livestock`,
  `sourceFeatureRef.kind: paddock`, `statusOutput: needs_investigation`. Plan
  `s6-yield-flows` card rendered "SHAPE DIFFERS / 93131 m2 -> 650 m2 (-92481 m2) / note /
  Recorded -- no Apply in v1 / KEEP PLAN" with NO Apply button. Keep soft-superseded the point
  (`isSuperseded: true`), cleared the card, and left the paddock geometry unchanged
  (no Plan mutation). Dev-injected point removed afterward; reload clean.

## Loop complete

All 5 slices shipped. The Act -> Observe -> Plan as-built deviation loop now covers all four
feature kinds (cropArea / paddock / zone / structure) for attribute fixes AND geometry (shape)
evidence. The only Plan-store mutation is the steward's explicit "Apply to design" click
(attributes only) in Plan; geometry is read-only evidence (no redraw affordance in v1).

## Discipline

Explicit-path commits (`git add --` per file), `Compare-Object` confirmed staged == intended
(empty diff) for the 7-file Slice 5 set, foreign-WIP never-edit list untouched (the tree carries
substantial uncommitted foreign WIP -- financial files, DesignMap/DiagnoseMap/OperateMap,
graphify-out, many plan/strata CSS modules -- none staged). Committed immediately on the rebased
branch, commit-only (no push). ASCII-only; JS/JSON apostrophes double-quoted. No legacy
components deleted.
