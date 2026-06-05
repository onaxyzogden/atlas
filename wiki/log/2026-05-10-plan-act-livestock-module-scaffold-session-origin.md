# 2026-05-10 — Plan + Act Livestock module scaffold (session origin)


Retrospective log entry. The initial scaffolding pass that catalysed the
Livestock surfaces now present in both Plan and Act stages happened in a
planning-mode session on the `feat/atlas-permaculture` branch. The session
closed the Module-3 zones-scholar ADR deferral
("paddock rotation belongs in a future Subdivision/Livestock module per
Yeomans Scale of Permanence") by:

- Adding `'livestock'` to `PlanModule` (slot between Zones and Plants) and
  `ActModule` (slot between Maintain and Harvest) in `apps/web/src/v3/{plan,act}/types.ts`
  — declaratively widens the `MODULE_CARDS` map and label tables so the
  module-bar / checklist-aside / tools components pick the new entries up
  with no further wiring.
- Wiring the 15 existing `apps/web/src/features/livestock/` cards into
  `PlanModuleSlideUp` / `ActModuleSlideUp` via lazy imports + a thin
  inline adapter (`<Card projectId={project.id} />`) — no new components,
  no new stores; `useLivestockStore` remains the source of truth.

Plan sub-tabs: land-fit · multi-species planner · paddock cell design ·
fencing · mobile tractor zones · welfare phasing · biosecurity + guest
buffers.

Act sub-tabs: rotation schedule · pasture utilization · forage quality ·
browse pressure · predator hotspots · welfare access audit · animal
corridors. (`ForageQualitySeasonalCard` is the one card that takes
`{project}` instead of `{projectId}` — adapter handles the variance.)

This scaffold was extended in later sessions through a stack of commits
(`cef275e`, `61c62ed`, `ffde429`, `3a80ed1`, `90e2843`, `7b03b87`,
`13e2e27`) that added the Farm-Scholar adjudication pass (specialization /
fence-line / carrying-capacity), Manitoba Schedule A subcategories,
per-paddock `pastureQuality` stocking input, the map-first Paddock polygon
tool, and the LivestockYieldCard in the Act slide-up.
