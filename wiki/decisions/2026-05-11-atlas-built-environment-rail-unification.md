# 2026-05-11 — Built Environment tool rail unification (Observe + Plan)

## Context

The Observe stage's `BUILT ENVIRONMENT` left-rail group and the Plan stage's
`STRUCTURES & SUBSYSTEMS` group surfaced the same `BUILT_ENVIRONMENT_KINDS`
registry but diverged visibly on three axes:

1. **Header label**: "Built Environment" vs "Structures & Subsystems".
2. **Extra legacy items**: Plan prepended two generic tools (`Structure`,
   `Utility run`) with no Observe counterpart and no remaining authoring role
   now that the kind-specific tools cover every case.
3. **Icons + label casing**: Observe carried a hand-tuned bespoke override
   layer (`BESPOKE_BE_TOOLS`) for 8 kinds to compensate for two weak registry
   icons (`septic.icon = Droplets`, collides with `bathhouse`/`water-tank`;
   `fence.icon = Minus`, a single line). Plan rendered registry order with
   `spec.icon` directly, so the two rails looked different. Three kinds also
   had Title-Case labels (`Septic`, `Power Line`, `Buried Utility`) while
   the rest of the registry was Sentence-case.

User direction: "these two set of tools should be the same."

## Decision

One source of truth, registry-driven, identical in both rails.

- **Header**: `PLAN_MODULE_FULL_LABEL['structures-subsystems'] = 'Built Environment'`.
  Short label `'Structures'` retained for the bottom-bar tile (real estate).
  The module *key* `structures-subsystems` is unchanged — cascade risk too
  large; only the human-visible label is renamed.
- **Legacy items dropped from Plan rail**: generic `Structure` and
  `Utility run` no longer surface. Their tool components
  (`StructureTool.tsx`, `UtilityRunTool.tsx`), their `case` branches in
  `PlanDrawHost`, and their `MapToolId` union entries stay dormant per
  the "no deletion in revamps" rule — re-enableable without code archaeology.
- **Icons fixed in the registry**, not at the consumer:
  `septic.icon: 'Droplets' → 'Recycle'`, `fence.icon: 'Minus' → 'Fence'`.
  The bespoke override layer is deleted — every kind resolves through
  `spec.icon` only.
- **Label casing normalised in the registry**:
  `Septic → Septic / leach field`, `Power Line → Power line`,
  `Buried Utility → Buried utility`.
- **Shared list**: new `apps/web/src/v3/_shared/builtEnvironmentTools.ts`
  exports `BE_ICON_MAP` and `BE_TOOL_ITEMS` (`{ kind, label, Icon }[]`
  derived from `Object.values(BUILT_ENVIRONMENT_KINDS)`). Both
  `ObserveTools` and `PlanTools` import the list and differ only on
  the per-stage toolId prefix:
  - Observe: `` `observe.built-environment.${kind}` ``
  - Plan:    `` `plan.structures-subsystems.be.${kind}` ``
  (Plan's `be.<kind>` prefix preserved so `PlanDrawHost`'s prefix-match
  dispatcher keeps working unchanged.)

## Files changed

- `packages/shared/src/builtEnvironmentKinds.ts` — 2 icons, 3 labels.
- `apps/web/src/v3/_shared/builtEnvironmentTools.ts` — **new** shared module.
- `apps/web/src/v3/observe/tools/ObserveTools.tsx` — bespoke layer deleted,
  imports shared list, Lucide imports pruned.
- `apps/web/src/v3/plan/PlanTools.tsx` — local `PLAN_BE_TOOLS` deleted,
  imports shared list, legacy `Structure` + `Utility run` entries removed,
  Lucide imports pruned.
- `apps/web/src/v3/plan/types.ts` — `PLAN_MODULE_FULL_LABEL`
  `structures-subsystems` value flipped.

## Intentionally not changed

- `PlanDrawHost` case branches for `plan.structures-subsystems.structure`
  and `...utility-run` — kept dormant.
- `StructureTool.tsx`, `UtilityRunTool.tsx` — preserved on disk.
- `MapToolId` union entries for the two legacy ids — kept.
- The module key `structures-subsystems` — only the human label is renamed.

## Verification

`tsc --noEmit` clean. DOM eval on both stages confirms 31 identical tool
items in identical order with identical labels and icon glyphs:

```
Building · Cabin · Yurt · Tent / Glamping · Prayer Pavilion · Pavilion ·
Classroom · Bathhouse · Earthship · Workshop · Lookout · Barn · Greenhouse ·
Shed · Animal Shelter · Compost Station · Well · Septic / leach field ·
Water Tank · Pump House · Solar Array · Power line · Buried utility · Fence ·
Gate · Driveway · Machinery Shed · Fuel Station · Equipment Yard ·
Fire Circle · Parking
```

## Consequences

Adding a new BE kind to `BUILT_ENVIRONMENT_KINDS` now surfaces it in both
stage rails automatically, with one icon string in the registry serving as
the sole presentation knob. Stage parity for this surface is contract-level,
not convention-level.
