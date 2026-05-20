# 2026-05-13 — Needs & Yields audit card polish (CTA + resource swatches)


**Closed.** Follow-up to the same-day scaffold commit `b2dc9411` that
lifted the existing orphan-output / unmet-input / closed-loop /
integration-score audit from the legacy `RelationshipsRail` into the
Plan slide-up. Two polish passes shipped under `8d3e016e`:

1. **"Open map editor →" CTA** rendered in the card hero as a gold
   pill. `PlanModuleSlideUp.renderPlanCard` now threads `onClose` down
   into `NeedsYieldsAuditCard.onSwitchToMap` (only this card consumes
   it — every other card stays on the `noop` default). Clicking the
   CTA closes the slide-up so the steward can reach the legacy
   `RelationshipsRail` socket flow on the canvas. Browser-verified:
   `dialogOpen: false` after click; canvas + module bar visible.

2. **Per-resource color swatches** on the orphan/unmet chip flow. New
   inline `RESOURCE_COLOR` map (13 resources — browns/ambers for
   animal+fire flows, greens for soil+plant flows, blues for water,
   violet for pollination) feeds small `ResourceSwatch` +
   `ResourceChip` components rendering as coloured pills instead of
   the comma-separated names of the v1 scaffold. Easier scan when
   several flagged entities share resource types.

Files: `apps/web/src/v3/plan/PlanModuleSlideUp.tsx`,
`apps/web/src/v3/plan/cards/principle-verification/NeedsYieldsAuditCard.tsx`.
HMR clean. Closes the recommended next-session item from the prior
debrief.
