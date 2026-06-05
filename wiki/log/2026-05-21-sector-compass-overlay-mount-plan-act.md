# 2026-05-21 — Mount SectorCompassOverlay on Plan + Act stages

**Branch.** `feat/atlas-permaculture`.
Bug-fix follow-up to
[2026-05-21 — Retire legacy DiagnosePage + DiscoverPage; drop wind/hazards/views matrix keys](2026-05-21-retire-diagnose-discover-pages-and-orphan-matrix-keys.md).

**Bug.** User reported: *"Overlay visibility button for sector compass
does not function."* The "Sector compass" row in the BaseMapCard legend
appears on Observe, Plan, and Act (no entry in `STAGE_HIDDEN` excludes
`sectors`), but `<SectorCompassOverlay>` was only mounted in
`ObserveLayout.tsx`. Toggling on Plan or Act was a visual no-op — the
matrix-toggle store updated but no component subscribed to render the
HUD.

**Fix.** Mounted `<SectorCompassOverlay projectId={id} />` inside the
`DiagnoseMap` children block of both `PlanLayout.tsx` (next to
`InlineFeaturePopover`, before `CoverCropPopoverEditor`) and
`ActLayout.tsx` (next to `InlineFeaturePopover`, before
`PlanSelectionFloater`). Matches the pattern already established for
sector-family overlays per the BaseMapCard `STAGE_HIDDEN` comment block
(lines 46–56): "All are mounted on Observe + Plan + Act — those rows
stay everywhere."

**Edits.**

- [`apps/web/src/v3/plan/PlanLayout.tsx`](../../apps/web/src/v3/plan/PlanLayout.tsx)
  — added import + mount.
- [`apps/web/src/v3/act/ActLayout.tsx`](../../apps/web/src/v3/act/ActLayout.tsx)
  — added import + mount.

**Verification.**

- `npm run typecheck` — zero new errors; same 6 pre-existing baseline
  errors carry over (StepBoundary, pasture-fence overload pair,
  vegetationResolver, two HostUnion test files).

**Branch hygiene.** Working tree also contained unrelated uncommitted
edits to `DecisionTriad.tsx` and `clickDeleteDirectSelect.ts` left over
from prior sessions; only the two layout files for this fix were staged.
