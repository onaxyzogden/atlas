# 2026-05-10 — MaintenanceLogCard: structure-source surfacing (read+write parity)


Sibling pass to today's `StructureYieldCard`, this time on the Maintain
module. The Phase-3 structure popover already writes maintenance events
with `sourceKind: 'structure'` and `sourceId: <structure.id>`, and
`MaintenanceLogCard` already grouped them correctly (the filter only
checks `projectId`, the group key is `${sourceKind}::${sourceId}`).
The bug was in display: `sourceLabel()` was a hard `earthwork`-vs-else
branch that fell into the storage lookup, found nothing, and rendered
structure events as **"(deleted storage)"**.

Read-side fix: new `kind === 'structure'` branch resolves through
`useStructureStore` + `STRUCTURE_TEMPLATES`, returning `${icon} ${name}`
with `(deleted structure)` fallback. Write-side parity: third
`<option value="structure">` on the "Feature kind" select, three-way
ternary in `sourceOptions` mapping project structures to
`{ id, label: icon + name }` (every structure type is maintenance-
eligible per `getActionsForType`, so no narrowing needed). Empty-state
copy updated to mention the structure-popover entry point alongside
the existing earthwork tool path.

No schema or store changes; no persist version bump.

ADR:
[2026-05-10 Act Maintain — MaintenanceLogCard structure-source](decisions/2026-05-10-atlas-act-maintenance-log-structure-source.md).
