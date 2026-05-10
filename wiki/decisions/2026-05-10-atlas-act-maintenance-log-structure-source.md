# 2026-05-10 — Act Maintain module: MaintenanceLogCard structure-source surfacing

## Context

Phase 3 of the Act-stage structure popover
([2026-05-10-atlas-act-structure-popover](2026-05-10-atlas-act-structure-popover.md))
let stewards log a maintenance event from a placed structure (every
structure type has `'maintenance'` in `getActionsForType`). The handoff
writes a `MaintenanceEvent` with
`sourceKind: 'structure'`, `sourceId: <structure.id>`.

[`MaintenanceLogCard`](../../apps/web/src/features/act/MaintenanceLogCard.tsx)
already filtered by `projectId` only (no `sourceKind` exclusion) and
grouped by `${sourceKind}::${sourceId}`, so structure-source events
**did** show up — but `sourceLabel()` was a hard if/else over
`'earthwork'` vs (else) `'storage'`. A `'structure'` event fell into the
else branch, looked up the structureId in `storageInfra`, found nothing,
and rendered as **"(deleted storage)"**. Events surfaced but were
mislabeled.

The form's "Feature kind" select only offered `earthwork` and `storage`,
so stewards could not log a structure maintenance event directly from
the card — they had to go through the popover. Asymmetric with
`StructureYieldCard` (the 2026-05-10 sibling card on the Harvest module)
which both surfaces popover-logged entries **and** offers a self-service
form.

## Decision

Read **and** write parity:

1. **Read-side fix.** `sourceLabel()` gains a `kind === 'structure'`
   branch that resolves through `useStructureStore.structures` and
   `STRUCTURE_TEMPLATES`, returning `${icon} ${s.name || tpl.label}`.
   Missing-structure fallback: `(deleted structure)` — matches the
   storage / earthwork fallback shape.

2. **Write-side fix.** The "Feature kind" select gains a third option
   (`<option value="structure">`); `sourceOptions` becomes a three-way
   ternary that maps project structures to `{ id, label: icon + name }`
   when the active kind is `'structure'`. Every structure type is
   maintenance-eligible (per `getActionsForType`), so no narrowing is
   needed on the structure list.

3. **Empty-state copy** updated to mention the structure-popover entry
   point alongside the existing earthwork "Log water check" tool path.

No schema or store changes. No persist version bump. `MaintenanceEvent`'s
`sourceKind: 'structure'` already shipped in Phase 3.

## Files

| File | Action |
|---|---|
| `apps/web/src/features/act/MaintenanceLogCard.tsx` | EDIT — structure source kind: read-side label, write-side form options, empty-state copy, docstring |

## Verification

- `tsc --noEmit` (8 GB heap) — exit 0 for the touched files. (Three
  pre-existing TS2339 errors in `v3/observe/modules/swot-synthesis/*.tsx`
  remain in concurrent in-flight working-tree work; not introduced by
  this change.)
- Manual click-test deferred to operator smoke (same Phase 3 limitation;
  basemap tiles unavailable in dev).

## Related

- [2026-05-10 atlas-act-structure-popover](2026-05-10-atlas-act-structure-popover.md) — Phase 3 popover that produces the structure-source events this card now labels correctly.
- [2026-05-10 atlas-act-structure-yield-card](2026-05-10-atlas-act-structure-yield-card.md) — sibling card on the Harvest module; this ADR brings the Maintain module's read+write surface to parity.
