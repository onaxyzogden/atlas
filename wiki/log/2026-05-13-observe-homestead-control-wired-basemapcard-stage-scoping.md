# 2026-05-13 — Observe: homestead control wired + BaseMapCard stage-scoping


**Closed.** Two coupled bugs gated the Permaculture-zone tool on Observe.

**Cause A — Observe never exposed a Place-homestead control.** The Mollison
Zone 0 anchor lives in `homesteadStore.byProject[projectId]` and is the
only gate the Permaculture-zone tool checks. `DiagnoseMap` accepts a
`homestead?: HomesteadControl` prop that renders Place/Move/Clear buttons,
and legacy `DiagnosePage` wired it correctly — but `ObserveLayout` did
not. The home icon visible in the steward's screenshot was a
Built-Environment **structure** (residence/outbuilding owned by
`builtEnvironmentStoreV2`), not the Zone 0 anchor — a different concept
sharing iconography.

**Cause B — partitioned-key inconsistency on the projectId fallback.**
`ObserveLayout` normalised a missing route param to `'mtc'` to keep BE
writes/reads aligned with PlanLayout and ActLayout. `ObserveTools` did
not — it read `byProject[null]` (always undefined → tool disabled) while
any homestead written elsewhere landed under `'mtc'`. Same shape of bug
the ObserveLayout header comment already warns about for BE entities.

**Fix.**
- `apps/web/src/v3/observe/ObserveLayout.tsx` — imported
  `useHomesteadStore` + `HomesteadMarker`, selected `byProject[id]` /
  `setHomestead` / `clearHomestead`, passed a `homestead={{ enabled,
  hasHomestead, onPlace, onClear, legendNote }}` prop to `<DiagnoseMap>`
  mirroring the DiagnosePage shape, and mounted `<HomesteadMarker>` as a
  child of the map when an anchor exists. Also passed
  `<BaseMapCard stage="observe" />` so the legend hides Plan-only
  computed overlays.
- `apps/web/src/v3/observe/tools/ObserveTools.tsx` — aligned the
  projectId fallback to `'mtc'` (matching ObserveLayout / PlanLayout /
  ActLayout). Read side now matches the write side.
- `apps/web/src/v3/components/DiagnoseMap.module.css` — moved the
  `.toolbar` (homestead Place/Move/Clear buttons) from bottom-right to
  top-right with `z-index: 2` so it no longer hides under Import/Export.

**BaseMapCard stage-scoping (paired refinement).**
- `apps/web/src/v3/plan/canvas/BaseMapCard.tsx` — added an optional
  `stage?: 'observe' | 'plan' | 'act'` prop and a `STAGE_HIDDEN` table.
  Only the Plan-stage *computed* overlays (`sunPath`, `zoneRings`,
  `scheduledMoves` — rendered by `PlanSunPathOverlay`,
  `PlanZoneRingsOverlay`, `PlanScheduledMovesOverlay`) are stage-bound;
  hidden on Observe + Act where those layers aren't mounted. The
  steward-drawn annotation toggles (`sectors`, `wind`, `hazards`,
  `views`, `zones`, `water`, `topography`, `builtEnvironment`,
  `observeAnnotations`) stay visible on every stage because
  `ObserveAnnotationLayers` is mounted on all three.
- Renamed four legend labels for geometry clarity now that several share
  "rings/sectors" vocabulary: `sectors` → "Solar sectors
  (sunrise→south→sunset wedges)"; `zones` → "Zones (use-frequency rings
  — drawn or textbook)"; `sunPath` → "Sun path (hourly trajectory
  traces)"; `zoneRings` → "Design audit rings (Z1·Z2·Z3 around tagged
  Zone-0 elements)".
- `apps/web/src/v3/plan/PlanLayout.tsx`,
  `apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx` — pass
  `stage="plan"`. `apps/web/src/v3/act/ActLayout.tsx` — passes
  `stage="act"`.

**Verification.** `tsc --noEmit` clean. Live preview at
`/v3/project/mtc/observe`: homestead toolbar mounts top-right, Place
flow drops the red "0" marker, Permaculture-zone tool tile flips from
disabled→enabled immediately (same Zustand selector, same `'mtc'` key
on both sides). Clear → tool re-disables. Hard-reload persists
(homestead store is `persist`-ed). Legacy `/v3/project/mtc/diagnose`
unchanged.

**Deferred.** (a) Whether a BE residence structure should auto-derive a
Zone 0 anchor (steward's mental model suggests yes; conflating the two
concepts is a design call, not a bug fix — flag for an ADR). (b)
Pruning the now-unreachable `!projectId` branch in `ObserveTools` — left
for a separate cleanup pass to keep this diff minimal.
