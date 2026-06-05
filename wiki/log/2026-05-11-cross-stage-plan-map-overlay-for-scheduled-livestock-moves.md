# 2026-05-11 — Cross-stage Plan-map overlay for scheduled livestock moves


**Motive.** Plan-stage map showed the design (paddocks, structures)
but not the *plans* the steward had scheduled against them in Act
stage. Closing the loop the other direction: Act-stage features
already surface on Plan; Act-stage *plans* should too.

**Change.**
- `matrixTogglesStore` v10→v11: added `scheduledMoves` boolean
  (default off) to the legend-toggled overlay set.
- New `PlanScheduledMovesOverlay.tsx`: reads
  `scheduledLivestockMoveStore` unfulfilled plans, groups by
  destination (paddock | structure), renders one `📅 N · YYYY-MM-DD`
  badge at the destination's centroid (paddock polygon centroid or
  structure `center` anchor).
- Mounted on the Current branch of `PlanLayout` after
  `PlanSunPathOverlay`; legend entry added to `BaseMapCard`
  (`#5a8a6a` swatch).
- Read-only — click/hover behaviour deferred; editing still happens
  on the Act-stage Rotation Schedule card.

**Verification.** `tsc --noEmit` clean.

**ADR.** [2026-05-11-atlas-plan-scheduled-moves-overlay](decisions/2026-05-11-atlas-plan-scheduled-moves-overlay.md).
