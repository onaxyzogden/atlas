---
title: Observe — Zones overlay decoupling + permaculture-zone anchor discoverability
date: 2026-05-15
status: accepted
stage: observe
module: permaculture-zones / map-overlays
---

# Observe — Zones overlay decoupling + permaculture-zone anchor discoverability

## Context

A steward reported the BaseMapCard → Overlays → **Zones** checkbox "does
nothing": drawn permaculture rings did not show/hide. Live reproduction in
preview proved the toggle *wiring* was correct (the `observe-anno-human-zones-
fill`/`-line` layers flipped `visible`↔`none`), but exposed three real,
compounding defects.

1. **Master AND-gate.** `ObserveAnnotationLayers` computed per-spec
   visibility as `visible && (spec.toggleKey ? subToggles[spec.toggleKey]
   : true)`, where `visible` = the separate `observeAnnotations` master.
   BaseMapCard presents Zones (and sectors/wind/water/hazards/views/
   topography/builtEnvironment) as **independent** overlay rows, so when a
   steward's persisted `observeAnnotations` was `false` the Zones checkbox
   could never change anything — exactly "toggle does nothing."
2. **Snapshot anchor reads as a bug.** A saved `PermacultureZone.anchorPoint`
   is a snapshot copied at create time (so rings survive the homestead being
   moved/cleared — `humanContextStore.ts`). Moving the homestead/Zone-0 pin
   afterward correctly does not move the rings, but nothing explained why or
   offered a way to relocate them.
3. **Off-viewport anchor.** The Observe map auto-fits the parcel boundary.
   A zone anchored km from the parcel (old/derived anchor) renders its rings
   *and* the draggable gold/teal edit markers entirely off-screen, with no
   affordance to reach them — and with no homestead drift, defect-2's button
   stays hidden, so the steward is fully stuck.

## Decision

**1. Decouple toggled overlays from the `observeAnnotations` master.**
Per-spec visibility is now `spec.toggleKey ? subToggles[spec.toggleKey] :
visible`. A spec with its own `toggleKey` is gated **solely** by its
independent overlay row; specs with no `toggleKey` (steward points/notes)
remain under the `observeAnnotations` master. Applied at both gating sites in
`ObserveAnnotationLayers.tsx`; comments there and in `BaseMapCard.tsx`
updated. (Landed in HEAD via the in-flight `feat/atlas-permaculture`
work-tree; documented here for rationale.)

**2. Keep snapshot semantics; fix discoverability.** Snapshot anchor + the
`2026-05-13` residence-derivation ADR are unchanged. When the Permaculture
Zone tool is armed and the effective homestead has drifted >1 m from the
saved anchor, the popover explains the snapshot behaviour and offers a
one-click **"Re-anchor zones to homestead"** button
(`updatePermacultureZone(id, { anchorPoint, anchorSource })`).

**3. Auto-recenter an off-viewport zone.** On tool-arm — and whenever the
anchor changes (re-anchor, drag) — if the zone anchor is outside the current
map bounds, `map.flyTo({ center: anchor })`. Scoped to while the zone tool is
active, so it never steals a normal pan.

Options 2 + 3 chosen over making the zone live-follow the pin: the steward
explicitly elected to keep the snapshot model and close the discoverability
gap instead.

## Files changed

- `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx`
  — gating expression at both sites + comments (in HEAD).
- `apps/web/src/v3/plan/canvas/BaseMapCard.tsx` — overlay-scoping comment
  reflects the decoupled semantics.
- `apps/web/src/v3/observe/components/draw/PermacultureZoneTool.tsx`
  — drift detection + re-anchor button; off-viewport `flyTo` effect.

## Verification

- `tsc --noEmit` clean (re-run post-edit, exit 0).
- `vitest run` — full suite green (815/815 at time of the toggle fix).
- Preview (mtc): toggle decoupling proven with master OFF + zones ON →
  layers `visible` (pre-fix forced `none`); re-anchor button appears on
  drift, click updates `anchorPoint`, notice clears; arming the tool with an
  off-parcel anchor recenters the map (`center` == anchor, markers on-canvas)
  — screenshot-confirmed. Original mtc data restored after testing.

## Scope / non-goals

Observe only. No store/schema change. Snapshot semantics intentionally
preserved (not live-follow). Unrelated in-flight ecology/vegetation work-tree
changes were excluded from the commit.
