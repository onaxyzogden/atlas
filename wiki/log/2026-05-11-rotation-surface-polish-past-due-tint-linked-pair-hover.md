# 2026-05-11 — Rotation surface polish (past-due tint + linked-pair hover)


Shipped two deferred items from same-day sibling ADRs. (L)
PlanScheduledMovesOverlay now tags pastDue = soonest < today on each
destination feature; TEXT_LAYER paint uses data-driven case
expressions to swap text colour to #a3401d and halo to #f5cbb8 when
past-due. (E) RotationScheduleCard gains hoveredLinkedId state; rows
with a linkedEventId wire hover handlers and the symmetric predicate
hoveredLinkedId === ev.id || hoveredLinkedId === ev.linkedEventId
applies .linkedPairHighlight (warm tint + #c4a265 left-border) to
both legs. Applied to per-paddock logged-moves rows and the
Structure-moves tail. Paint + CSS depth only — no schema/store
changes. npm run typecheck clean; preview reload shows zero new
console errors. Addenda filed in
wiki/decisions/2026-05-11-atlas-plan-scheduled-moves-overlay.md and
wiki/decisions/2026-05-11-atlas-livestock-rotate-linked-pair.md.
