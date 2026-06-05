# MapLibre marker hover fix + temporary Command Centre unlock

**Date:** 2026-05-24
**Branch:** `feat/atlas-permaculture`

Two small same-session compass/map touch-ups.

## 1. MapLibre marker hover-scale clobbered positioning (bug fix)

**Symptom (steward-reported):** hovering a Command Centre objective marker made
it jump to the map's top-left corner and stay there until the next pan/zoom.

**Root cause:** MapLibre positions a DOM marker by writing the *entire*
`transform` onto the marker's own element each frame
(`translate(-50%,-50%) translate(x,y) rotateX(0) rotateZ(0)`). The
`mouseenter` handler set `el.style.transform = 'scale(1.15)'` on that **same**
element, replacing the whole string and erasing the positioning `translate` →
the marker rendered at the container origin. `mouseleave` set `scale(1)` (still
no translate), so it stayed parked until MapLibre's next position write restored
it.

**Fix:** move the hover scale onto an inner `pin` child; the outer element
MapLibre owns now never carries a transform of ours. The outer element
shrink-wraps the same 26px/30px pin (`line-height:0`), so geometry is unchanged
and clicks still bubble from the pin. Found and fixed in **both** files with the
identical pattern:
- `apps/web/src/v3/command/ObjectiveMapMarkers.tsx` (the reported markers)
- `apps/web/src/v3/components/overlays/FieldFlagOverlay.tsx`

The other DOM-marker overlays (`HomesteadMarker`, `SpotlightPulse`, GPS/measure
tools) don't hover-transform, so they were unaffected (verified by grep for
`.style.transform = scale`). Reusable lesson: **never write `transform` on a
MapLibre marker element — always scale an inner child.**

Commit `80f2b9d3` (2 files).

## 2. Temporary Command Centre unlock ("unlock for now")

Steward asked to enter the Observe Command Centre without all objectives
verified. The center-unlock gate
([[decisions/2026-05-24-atlas-observe-command-centre]]) is driven by a single
`ready` flag in `StageCompassPage.tsx` (passed as `commandCentre={{ ready }}`),
which controls the wheel center hotspot's clickability, its `forceConverged`
glow, and the `onEnter()` navigation. The Command Centre page itself has no
guard, so flipping `ready` is the only change needed.

Forced `ready = data.views.length > 0` (was
`… && data.views.every((v) => v.progress.pct === 100)`), marked **TEMP** with
the exact one-line revert in a comment. Commit `e615c6da` (1 file).

## Covenant / preservation

Both changes are pure presentation/behaviour — no schema, store, data model, or
migration; no riba/gharar/CSRA/salam/financing framing. The unlock is gated by a
single flag and trivially revertible. Per
[[feedback-commit-immediately-on-rebased-branches]] each slice was committed by
name the moment it verified.

## Verification

`corepack pnpm --filter @ogden/web run typecheck` at the 3-error pre-existing
baseline (`StepBoundary.tsx:365`; two `HostUnion*` test types) — no new errors.
Live preview not run (MapLibre canvas hangs screenshots — documented standard);
the marker fix is verified by the DOM mechanism (inner-child scale leaves
MapLibre's transform untouched) and the steward's own report of the symptom.
