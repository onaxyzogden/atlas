# 2026-05-10 — Machinery inventory server persistence + Act structure-yield card


Two related Plan/Act follow-ups landed on `feat/atlas-machinery-backend`
(auto-branched by pre-commit hook):

**Machinery server persistence** (`d3aa272`). Plan Module 6 lifted from
local-only zustand-persist to API-backed CRUD. Five pieces:
migration `025_machinery_items.sql`; shared zod schema
`machineryItem.schema.ts`; Fastify `/api/v1/machinery-items`
list/create/update/delete; `apiClient.ts` endpoints; new
`useServerMachineryInventory` hook bridging zustand mutations to the
API (called from `PlanLayout`, skipped for the `mtc` fallback id).
Same pattern as `useServerStructures`. Local store stays as the
in-memory source of truth for the rendered UI; the hook keeps it in
sync with the server.

Side rider in the same commit: `terrain3d` view promoted from a v1
placeholder case to a real vision-canvas codepath in
`PlanLayout.tsx` alongside `vision`/`phase-1`/`phase-2`. The
controller itself shipped on a previous commit; this is the routing
toggle.

**Act Harvest module — `StructureYieldCard`** (`7b03b87`). Closes the
deferred Phase-3 follow-up where harvest entries with
`sourceKind === 'structure'` (greenhouse pilot via
`ActStructurePopover.actions.startHarvestLog`) fell into an empty
`cropAreaId` bucket and silently never rendered. New card mirrors
`LivestockYieldCard` — reads `harvestLogStore` filtered to
structure-source entries and groups by `structureId`. Slotted into
the `harvest` Act module beside `Harvest log` (lazy-loaded in
`ActModuleSlideUp`).

ADRs: [2026-05-10 atlas-machinery-server-persistence](decisions/2026-05-10-atlas-machinery-server-persistence.md), [2026-05-10 atlas-act-structure-yield-card](decisions/2026-05-10-atlas-act-structure-yield-card.md).
