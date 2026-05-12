# 2026-05-11 — Plan module bar on every view + per-view scope plumbing

## Context

`PlanLayout.tsx` previously gated `<PlanModuleBar />` behind
`isVisionCanvas`, so the 11-module rail (Layering / Water / Zones /
Structures / Machinery / Livestock / Plants / Soil / Cross-section /
Phasing / Principles) only appeared on the **Current Land** view. The
four other top-tab views (Vision, Year 1, Year 5, 3D Terrain) swap in
`VisionLayoutCanvas` with floating panels and lost the rail entirely —
stewards had to bounce back to *Current* to open any Plan module.

The user's intent (confirmed 2026-05-11): same 11 modules on every
view, with **content scoped to that view's year** where the underlying
data model supports it.

## Decision

Render `PlanModuleBar` unconditionally on all 5 Plan views, and ship
the plumbing every card needs to consume the active view:

| Piece | File | Purpose |
|---|---|---|
| Context + provider + hook | `apps/web/src/v3/plan/PlanViewContext.tsx` | `usePlanView()` returns the active `PlanView` ('current' / 'vision' / 'phase-1' / 'phase-2' / 'terrain3d'). Provider wraps the whole Plan stage at `PlanLayout`. |
| Module scope classifier | same file — `PLAN_MODULE_SCOPE` map | Each of the 11 Plan modules is tagged `'phased'` or `'time-invariant'`. Drives badge mode + future filtering. |
| Phase-cap filter hook | `apps/web/src/v3/plan/usePhaseCappedEntities.ts` | Mirrors the Yeomans cap logic from `DesignElementScenegraphLayer` for any entity exposing `state` + optional `proposed.phase`. Returns un-capped on `current` / `vision` / `terrain3d`. |
| View badge chip | `apps/web/src/v3/plan/PlanViewBadge.tsx` | Header chip in every slide-up. Phased modules show year label (gold / blue / purple); time-invariant modules show muted "All years · time-invariant" regardless of view. |
| Shared slide-up slot | `apps/web/src/v3/_shared/moduleNav/ModuleSlideUp.tsx` | New optional `headerExtra` prop renders inside the title block. Plan injects `<PlanViewBadge />`; Act / Observe ignore it. |
| Plumbing wire | `PlanLayout.tsx` | Wraps the rendered tree in `<PlanViewProvider view={activeView}>` and removes the `isVisionCanvas ? null :` guard around `<PlanModuleBar />`. |

### Module scope classifications

| Scope | Modules | Why |
|---|---|---|
| `phased` | Layering, Water, Livestock, Plants, Soil, Phasing, Principles | Card content can in principle be filtered by Yeomans phase or by `phaseStore`-phase. |
| `time-invariant` | Zones, Structures, Machinery, Cross-section | Backing stores have no phase axis at all — zone polygons, machinery items, and transect geometry are project-wide constants. |

### What this ship does NOT include

Per-card data **filtering** for phased modules (the "Phase B" body of
the original plan) is deferred. The chip on `phase-1` / `phase-2`
currently advertises a year cap that the underlying card data does
not yet honour, because each phase-aware module needs a per-store
translator:

- `WaterNode.phase` is a `phaseStore` phase id, **not** a Yeomans
  `PhaseKey` — water cards need a `phaseStore → Yeomans` mapping
  before `usePhaseCappedEntities` can apply.
- `livestockStore`, `machineryInventoryStore`, `polycultureStore`
  have no phase field at all — they would need new data shape or a
  derived-from-design-elements adapter.
- Only `builtEnvironmentStoreV2` and `designElementsStore` already
  carry `proposed.phase` in the Yeomans sense; those are the canonical
  starting point for the follow-up.

This is called out so the next session inherits a clean Phase B
backlog — the plumbing is wired, only the per-card filtering bodies
remain.

## Consequences

- Rail visible on every Plan view; no more bouncing back to Current
  to open a module from Vision / Year 1 / Year 5 / 3D Terrain.
- Every Plan slide-up shows a view badge in the header — stewards see
  the scope of the data they're looking at without having to inspect
  the URL or top-tab strip.
- Time-invariant modules (Zones, Structures, Machinery, Cross-section)
  declare themselves as such via the muted chip, so users don't expect
  Year-1-cap effects that will never materialize there.
- `ModuleSlideUp` gained an optional `headerExtra` slot — Act and
  Observe stages remain unchanged (they pass nothing).
- Follow-up Phase B work is now isolated to per-card filter logic;
  no more provider / context plumbing.

## References

- Plumbing: `apps/web/src/v3/plan/PlanViewContext.tsx`,
  `usePhaseCappedEntities.ts`, `PlanViewBadge.tsx`,
  `PlanViewBadge.module.css`
- Wires: `apps/web/src/v3/plan/PlanLayout.tsx`,
  `PlanModuleSlideUp.tsx`, `_shared/moduleNav/ModuleSlideUp.tsx`
- Canonical filter pattern reused:
  `apps/web/src/v3/builtEnvironment/layers/DesignElementScenegraphLayer.tsx:144`
- Plan: `~/.claude/plans/c-users-my-own-axis-downloads-ogden-lan-gleaming-pumpkin.md`
