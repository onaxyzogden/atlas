# Shared module-nav primitives — unify Plan/Act slide-up + bar

**Date:** 2026-05-11
**Scope:** `apps/web/src/v3/_shared/moduleNav/`, `apps/web/src/v3/plan/`, `apps/web/src/v3/act/`
**Status:** Closed for Plan + Act. Observe deferred (descoped mid-implementation by steward).

## Problem

Plan and Act stages each carried their own copy of the bottom-anchored
module slide-up and module-bar tile row. The two were already
visually aligned (brand-gold eyebrow + title, rounded tiles with gold
active border, grouped-tab pattern in Plan, 280ms `slideUp`
animation) but lived as parallel code:

- `v3/plan/PlanModuleSlideUp.{tsx,module.css}`
- `v3/plan/PlanModuleBar.{tsx,module.css}`
- `v3/act/ActModuleSlideUp.{tsx,module.css}`
- `v3/act/ActModuleBar.{tsx,module.css}`

Drift was already visible — Observe (a third stage built off the same
template) had diverged on tab grouping and tile chrome. Every CSS
tweak meant editing two or three files; the cost of keeping them in
lockstep was rising.

## Decision

Extract two generic primitives into
[apps/web/src/v3/_shared/moduleNav/](../../apps/web/src/v3/_shared/moduleNav):

- **`ModuleSlideUp`** — owns scrim, sheet, header (eyebrow + title),
  the grouped-tab row, focus trap, and Suspense fallback. Card body
  is supplied via a `renderCard(sectionId)` render prop. Tabs render
  group labels when `card.group` changes vs. the previous tab and
  apply a faint gold underline (`rgba(--color-gold-rgb, 0.35)`,
  hover 0.6) on grouped tabs.
- **`ModuleBar<TModule extends string>`** — generic tile row. Click
  semantics (inactive → select; active+closed → open slide-up;
  active+open → close slide-up) live in the shared component. The
  status indicator inside each tile is a render prop
  (`renderTileIndicator?`) so a future Observe migration can keep its
  per-task subseg pills inside the shared tile chrome. Telemetry is
  exposed via `onTileInteraction(module, eventType)` and used by Act.

Both wrap the existing
[`useFocusTrap`](../../apps/web/src/components/ui/useFocusTrap.ts) hook
that Plan was already consuming — Observe's hand-rolled escape
listener is the looser implementation and is not what we want
generalised.

Three thin wrappers remain:

- [PlanModuleSlideUp.tsx](../../apps/web/src/v3/plan/PlanModuleSlideUp.tsx) — lazy plan-card imports + `renderPlanCard` switch.
- [PlanModuleBar.tsx](../../apps/web/src/v3/plan/PlanModuleBar.tsx) — passes `PLAN_MODULES`, label map, `toolbarLabel="Plan modules"`.
- [ActModuleSlideUp.tsx](../../apps/web/src/v3/act/ActModuleSlideUp.tsx) — lazy act-card imports + `renderActCard` switch.
- [ActModuleBar.tsx](../../apps/web/src/v3/act/ActModuleBar.tsx) — same shape; threads `useActTelemetry` through `onTileInteraction`.

Legacy CSS modules deleted:

- `apps/web/src/v3/plan/PlanModuleSlideUp.module.css`
- `apps/web/src/v3/plan/PlanModuleBar.module.css`
- `apps/web/src/v3/act/ActModuleSlideUp.module.css`
- `apps/web/src/v3/act/ActModuleBar.module.css`

## Observe deferred

Mid-implementation the steward reverted the Observe wrapper edits.
Observe stays on its existing local
[`v3/observe/components/ModuleSlideUp.{tsx,module.css}`](../../apps/web/src/v3/observe/components/ModuleSlideUp.tsx)
and
[`ObserveModuleBar.{tsx,module.css}`](../../apps/web/src/v3/observe/components/ObserveModuleBar.tsx)
for now. The shared primitives are already shaped to accept Observe
when that migration is picked back up — `renderTileIndicator` is the
seam for the `.cardProgress` task-status subsegments, and
`OBSERVE_MODULE_CARDS` can gain an optional `group?` field without a
breaking change.

## Verification

- `pnpm --filter @ogden/web typecheck` — clean for changed files
  (`_shared/moduleNav/`, both Plan wrappers, both Act wrappers).
  Preexisting errors on the branch (`matrixTogglesStore`,
  `DesignElementGlbLayer` removal, `MapToolId` enum) are unrelated
  to this change.
- Live preview dev server (`5200`) reloads cleanly. Browser
  pixel-level slide-up verification is recommended before merge but
  was not run to completion in-session (screenshot tool timeouts);
  the CSS is byte-identical to the Plan source it was copied from,
  so the visible delta is expected to be zero for Plan and Act.

## Follow-ups

- Optional: revisit Observe migration once the steward has spare
  bandwidth — the render-prop seam is in place.
- Optional: promote `eyebrow` string to a typed enum if a fourth
  stage shows up.
