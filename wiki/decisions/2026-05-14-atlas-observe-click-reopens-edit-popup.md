---
title: Observe — single-click on drawn feature reopens its edit popup
date: 2026-05-14
status: accepted
stage: observe
module: annotation-form
---

# Observe — single-click on drawn feature reopens its edit popup

## Context

When a steward finishes drawing a feature in Observe (pasture, conventional
crop, sector, BE entities, etc.), the create popup opens automatically —
`AnnotationFormSlideUp` for non-BE kinds, `InlineFeaturePopover` for BE kinds.
After the popup closes, clicking the same feature on the map only set selection
state: halo + `SelectionFloater` appeared, but the steward had to click the
floater's **Edit** button to reopen the form. Two clicks to do what they had
just done with zero clicks during the draw flow.

## Decision

Single-click on any existing drawn feature in Observe now reopens the same
popup that appeared on first draw, in addition to setting selection. The
routing reuses `SelectionFloater.onEdit`'s exact branching — BE inline popover
via `openBeInlineEditByObserveKind`, slide-up form for everything else — so no
new dispatch table.

Guards:

1. Skip when a draw tool is active (`useMapToolStore.activeTool` truthy) —
   the steward is mid-creation, not re-editing.
2. Skip when the form is already open for the same `{kind, id}` (idempotent
   re-click; avoids resetting dirty field state).
3. Require `projectId` (no namespace context, no save target).

Shift-click (multi-select toggle) and double-click (read-only detail panel)
are unchanged. The `SelectionFloater` continues to render and handles multi-
select bulk delete / clear.

## Scope

Observe only. Plan stage already opens its inline popover on `mousedown` via
`PlanObserveSelectionHandler` for BE features visible from Observe, and
Plan-native design elements never had a creation popup to re-open.

## Files changed

- `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx`
  — added `useAnnotationFormStore`, `useMapToolStore`, and
  `openBeInlineEditByObserveKind` imports; extended the per-layer `onClick`
  handler with the popup reopen after `setSelection`.
