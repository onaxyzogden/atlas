# 2026-05-14 — Observe: single-click reopens drawn feature's edit popup


Closed a two-click gap in the Observe annotation flow: after the create popup
closed, re-selecting a drawn feature on the map only set selection — the
steward had to press the floater's Edit button to reopen the form. Click now
reopens the same popup that appeared on first draw, with BE kinds routing to
`InlineFeaturePopover` and the rest to `AnnotationFormSlideUp`, reusing
`SelectionFloater.onEdit`'s branching verbatim. Guarded against active draw
tools, idempotent re-clicks on an already-open form, and missing projectId.
Shift-click, double-click, and the SelectionFloater are untouched. Plan stage
unaffected — its BE features already open on mousedown via
`PlanObserveSelectionHandler`, and Plan-native design elements have no
creation popup to re-open.

Files: [apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx](../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx).
Decision: [decisions/2026-05-14-atlas-observe-click-reopens-edit-popup.md](decisions/2026-05-14-atlas-observe-click-reopens-edit-popup.md).
