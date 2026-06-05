# 2026-05-10 — Plan-stage earthwork utility-conflict veto


Hard-wired the buried-utility safety check the Built Environment
MODULE_GUIDANCE framing promised: when a steward draws a Plan-stage
earthwork (Swale, Sink — depth >30 cm) whose geometry intersects a
3 m buffer around any `BuriedUtility` line recorded in OBSERVE Module
1, an anchored `UtilityConflictDialog` interrupts the persist-first
flow and demands a free-text acknowledgment before the record lands.
On confirm, the new `utilityConflicts[]` + `utilityAcknowledgment`
fields are persisted alongside the WaterNode and a `#c4422a` halo
renders in `PlanDataLayers` (4 px outline behind the main geometry).
On cancel, the geometry is discarded.

Soft-veto semantics chosen over hard-block: the steward is the
authority on whether the conflict is real (utility was decommissioned,
buffer was overly cautious, etc.). The acknowledgment text is the
audit trail.

Pieces: ADR `wiki/decisions/2026-05-10-plan-earthwork-utility-veto.md`,
`utilityConflicts.ts` helper (turf.buffer + booleanIntersects), the
`useUtilityConflictStore` Zustand singleton, the `UtilityConflictDialog`
anchored popover (red border, AlertTriangle, ESC closes, 3-char
minimum acknowledgment), and wiring in `WaterSwaleTool` (60 cm) +
`WaterSinkTool` (60 cm). Storage tool deferred per ADR — `storageKind`
isn't known until after the form save, so depth is unknowable at
draw-complete time.

Dialog mounted in both `PlanLayout.tsx` and `canvas/VisionLayoutCanvas
.tsx` since each independently hosts `InlineFeaturePopover`.
`elementCatalog.DesignElementSpec` gained an `earthworkDepthCm?: number`
field with ADR-referencing JSDoc; current catalog entries don't yet
populate it (only the per-tool constants drive the gate today) but
the slot is documented for future palette-driven earthworks.

`typecheck` exit 0.
