# 2026-05-10 — Observe always-inert CTA audit (11 buttons deleted)


Follow-on to commits `acabaec` (slide-up tab restructure) and `4105ba4`
(option-B sweep of newly-inert dashboard CTAs). An audit across all v3
stages found 11 buttons that had **always** been inert — never wired,
not just orphaned by the restructure. All 11 sit in Observe; Plan and
Act stages were clean.

Inventory (10 files):

- Dashboards (5): `MacroclimateDashboard` "Go to next: Site Analysis",
  `SectorsDashboard` "Go to next: Site Analysis", `SwotDashboard`
  "Create action plan from synthesis" + "Export synthesis summary",
  `HumanContextDashboard` "View full design implications".
- Details (6): `EcologicalDetail` "View all actions", `HydrologyDetail`
  "View all risks" + "View design overlay", `SectorCompassDetail`
  "Add to design plan", `TerrainDetail` "Create transect",
  `SwotDiagnosisReport` "Add to design plan", `SwotJournal`
  "Add journal entry".

Decision: **delete all 11** as a uniform rule — *"if a CTA has no live
target, delete it."* Decorative interactivity is an anti-pattern;
wiring would require inventing targets (no action-plan generator,
no export pipeline, no overlay route); and delete matches precedent
from commit `4105ba4`. The `Create transect` button was the only one
with a real backing surface (the tools-panel draw tool), but the draw
tool is already one click away — the header duplicate added zero
pathway, so option A (delete uniformly) shipped.

Side cleanup: dropped now-unused `ArrowRight` imports from
`MacroclimateDashboard.tsx` and `HumanContextDashboard.tsx`, and
unused `Plus` imports from `SectorCompassDetail.tsx` and
`TerrainDetail.tsx`.

Verification: tsc clean, dev-preview spot-check on each
dashboard/detail surface.

ADR: [2026-05-10 atlas-observe-inert-cta-audit](decisions/2026-05-10-atlas-observe-inert-cta-audit.md).
