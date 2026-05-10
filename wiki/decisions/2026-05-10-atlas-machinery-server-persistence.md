# Atlas Plan — Machinery inventory server persistence

**Date:** 2026-05-10
**Branch:** `feat/atlas-machinery-backend`

## Context

Plan Module 6 (Machinery — see
[2026-05-09 atlas-plan-machinery-module](2026-05-09-atlas-plan-machinery-module.md))
shipped with `machineryInventoryStore` as zustand+persist (localStorage
only). Telemetry from Phase-3 testing showed stewards expected
machinery records to follow them across devices the way structures and
guilds do. The local-only store was always intended as a placeholder
until the server table existed.

## Decision

Lift machinery items to the same API-backed pattern the rest of Plan
uses. Five-piece commit:

1. **Migration** — `apps/api/src/db/migrations/025_machinery_items.sql`
   creates `machinery_items` (project FK, soft-delete column, JSON
   `attrs` for type-specific fields).

2. **Shared schema** —
   `packages/shared/src/schemas/machineryItem.schema.ts` is the zod
   contract for `MachineryItem`, `MachineryItemCreate`,
   `MachineryItemUpdate`. Re-exported from `packages/shared/src/index.ts`.

3. **API routes** — `apps/api/src/routes/machinery-items/index.ts`
   ships list (by project) / create / update / delete; mounted in
   `apps/api/src/app.ts`. Mirrors the structures route shape so any
   future bulk import follows the same surface.

4. **Client wiring** — `apps/web/src/lib/apiClient.ts` gains the four
   endpoints; `apps/web/src/hooks/useServerMachineryInventory.ts` is
   the bridge: hydrates the local zustand store on project load and
   patches every subsequent `add/update/remove` through the API
   (debounced, optimistic, last-write-wins on conflict).

5. **Plan layout call site** — `PlanLayout` calls the hook; skipped
   when `id === 'mtc'` (no real server project for the dev fallback).

The local zustand store stays — it remains the source of truth for
the rendered UI; the hook subscribes to its actions and forwards them
to the server. This is the same pattern used by `useServerStructures`
+ `structureStore`.

## Side rider — Terrain3D promoted from placeholder

`PlanLayout.tsx` previously treated `terrain3d` as a v1 placeholder
case in the phase-tab switch. The patch routes it through the same
vision-canvas codepath alongside `vision` / `phase-1` / `phase-2`
so the existing `Terrain3DController` (committed earlier) actually
drapes the canvas over MapLibre 3D terrain. No new files for the
controller itself — that landed on a previous commit.

## Verification

- Migration runs forward against a fresh dev DB.
- API routes return 200 on the four CRUD verbs against a seeded
  project; soft-delete column toggles correctly.
- `useServerMachineryInventory` no-ops when `projectId === 'mtc'`.
- Local store still persists to localStorage as before — server
  hydrate only overwrites on first mount per project.

## Follow-ups

- Bulk-import endpoint (CSV) — deferred until a steward asks.
- Reconcile zustand-persist version bump if the schema diverges from
  the shared Zod schema.

## Related

- [2026-05-09 atlas-plan-machinery-module](2026-05-09-atlas-plan-machinery-module.md) — original module ADR.
- [Database](../entities/database.md) — `machinery_items` is now table 13.
