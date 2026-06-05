# 2026-05-13 — V1 Observe draw: Cancel discards provisional entity


Closed the broader provisional-entity leak across 20 V1 Observe draw
tools (BuildingTool / WellTool / SepticTool / PowerLineTool /
BuriedUtilityTool / FenceTool / GateTool / ExistingDrivewayTool /
NeighbourPinTool / HouseholdPinTool / AccessRoadTool / FrostPocketTool
/ HazardZoneTool / ContourLineTool / HighPointTool / DrainageLineTool
/ WatercourseTool / EcologyZoneTool / SoilSampleTool / SwotTagTool).
ADDENDUM 6 had moved the create call ahead of the form-open, so the
slide-up's `close()`-on-Cancel left default-labeled phantoms behind.

Approach: payload flag + dispatch table.
`AnnotationFormActive.discardOnCancel?: boolean` set by post-draw
flows; slide-up's onCancel looks up
`FIELD_REMOVERS[kind](existingId)` when present. Edit-from-dashboard
and SelectionFloater paths leave the flag unset (no-op Cancel).
`FIELD_REMOVERS` is a `Record<AnnotationKind, (id) => void>` so adding
a new kind without a remover is a build error.

Verified: 10/10 new vitest cases pass for the dispatch contract; full
project tsc clean; dev server renders without console errors.

ADR: [wiki/decisions/2026-05-13-cancel-discards-provisional-entity.md](decisions/2026-05-13-cancel-discards-provisional-entity.md).

Follow-up audit (same day): the 21st annotation kind, `sector`, was
inspected and is intentionally out of scope. `SunWindWedgeTool` is a
save-on-click popover (no provisional stub written before the steward
presses Save), and the sector schema's `save` is edit-only — so the
slide-up create path is structurally unreachable for sectors. No
remediation needed; scope note appended to the ADR.
