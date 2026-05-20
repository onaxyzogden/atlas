# 2026-04-25 — §9 OrientationFeedback in StructurePropertiesModal (commit `1001813`)


Feature → live solar-orientation feedback card mounted inside
`StructurePropertiesModal` directly under the rotation slider. As the
steward drags the orientation control, the card updates with tone-coded
feedback on how far the structure's long axis sits from true East–West
(the passive-solar baseline in both hemispheres) and a rough estimate
of winter-exposure loss. Includes a one-click "Snap to optimal" button
for the off-axis case.

**Files:**
- `apps/web/src/features/structures/StructurePropertiesModal.tsx` —
  optional `lat?: number` on `NewPlacementProps`, derive `lat` from
  `props.structure.center[1]` (edit) or `props.lat` (new), inline
  `<OrientationFeedback>` mount after the rotation control, +
  `OrientationFeedback` component appended (~150 lines)
- `apps/web/src/components/panels/DesignToolsPanel.tsx` —
  thread `lat={pendingStructureCenter[1]}` for new placement
- `packages/shared/src/featureManifest.ts` —
  `place-rotate-resize-structures` (§9, P2) `partial` → `done`

**Heuristic:**
- `optimalRot` = `0` when `widthM >= depthM` (long-side East–West
  baseline), `90` when steward has flipped which dimension is "long"
- `offsetDeg` = absolute distance (0–90°) from optimal, modulo 180
- `lossPct` = `1 − cos²(offsetDeg)` × 100 (steward-facing estimate,
  not a building-physics simulation)
- Tone bands: ≤15° good (green), ≤35° fair (gold), >35° poor (coral)
- Hemisphere copy: NH → "long side faces south", SH → "north";
  derived from `lat` sign

**Manifest scoping note:** the candidate I proposed referenced a
`building-orientation-tools` slug that doesn't exist in §9 (only
`setback-slope-solar-orientation-warnings`, already done). Mapped to
the closest real partial — `place-rotate-resize-structures` (P2) —
since the inline orientation feedback clearly graduates the rotation
control's UX.

**Verification:** `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192
npx tsc --noEmit` exits clean. Selective stage of 3 files only — used
`git checkout HEAD -- packages/shared/src/featureManifest.ts` to
quarantine an unrelated working-tree change at line 440 before
re-applying the §9 line, ensuring a single-purpose commit.
