# 2026-05-21 — SectorCompass dock swap (bottom-right) + Vision-canvas mount

**Branch.** `feat/atlas-permaculture`.
Follow-up to
[2026-05-21 — Mount SectorCompassOverlay on Plan + Act stages](2026-05-21-sector-compass-overlay-mount-plan-act.md).

**User reports.**

1. *"move sector compass to bottom right while moving the
   SiteIntelligence import/export buttons elsewhere"* — the Sector
   compass HUD was at `bottom: 92px` (above the stacked Import/Export
   buttons), not in the actual bottom-right corner.
2. *"Sector compass not appearing in Plan stage"* — the prior fix
   mounted `<SectorCompassOverlay>` only inside the `DiagnoseMap`
   branch of `PlanLayout.tsx`, but Plan has a second canvas
   (`VisionLayoutCanvas`, used for vision / terrain3d views) which
   does not route through that branch.

**Fix.**

Dock swap (all `position: absolute`, `z-index: 3`):

| Component | Before | After |
|---|---|---|
| `SectorCompassOverlay` | `right: 12px; bottom: 92px` | `right: 12px; bottom: 12px` |
| `ExportButton` | `right: 12px; bottom: 12px` | `left: 12px; bottom: 12px` |
| `ImportSiteIntelButton` | `right: 12px; bottom: 52px` | `left: 12px; bottom: 52px` |

Both Import/Export popovers also flipped from `right: 0` to `left: 0`
so they open to the right of the now-bottom-left buttons (instead of
opening left toward the screen edge).

Vision-canvas mount: imported `SectorCompassOverlay` in
[`apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx`](../../apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx)
next to `InlineFeaturePopover`. With this, the HUD now renders on:

- Observe (all modules) — `ObserveLayout.tsx`
- Plan / Current Land — `PlanLayout.tsx` DiagnoseMap branch
- Plan / Vision Layout (incl. terrain3d) — `VisionLayoutCanvas.tsx`
- Act — `ActLayout.tsx`

**Files.**

- [`apps/web/src/v3/observe/components/overlays/SectorCompassOverlay.module.css`](../../apps/web/src/v3/observe/components/overlays/SectorCompassOverlay.module.css)
- [`apps/web/src/v3/observe/components/ExportButton.module.css`](../../apps/web/src/v3/observe/components/ExportButton.module.css)
- [`apps/web/src/v3/observe/components/ImportSiteIntelButton.module.css`](../../apps/web/src/v3/observe/components/ImportSiteIntelButton.module.css)
- [`apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx`](../../apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx)

**Verification.**

- `npm run typecheck` — zero new errors; same 6 pre-existing baseline
  errors carry over.

**Branch hygiene.** Working tree had unrelated uncommitted edits
elsewhere (`WaterRouterCard.tsx`, untracked `features/vegetation/`,
etc.); staged only the four files for this fix.
