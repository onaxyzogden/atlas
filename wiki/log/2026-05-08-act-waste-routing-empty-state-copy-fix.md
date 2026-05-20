# 2026-05-08 — Act Waste routing empty-state copy fix


Tiny UX fix. The Waste Routing Checklist's empty state in [WasteRoutingChecklistCard.tsx:74](apps/web/src/features/act/WasteRoutingChecklistCard.tsx:74) said "design them in PLAN → Waste Vectors", but the actual location is one level deeper — the Waste-to-resource vectors tab lives under the **Soil & fertility** module ([v3/plan/types.ts:167](apps/web/src/v3/plan/types.ts:167), mounted at [V3PlanPage.tsx:127](apps/web/src/v3/plan/V3PlanPage.tsx:127) and [PlanModuleSlideUp.tsx:149](apps/web/src/v3/plan/PlanModuleSlideUp.tsx:149)). Copy now reads "design them in PLAN → Soil & fertility → Waste-to-resource vectors." Preview-verified on the Maintenance & Operations slide-up Waste-routing tab.
