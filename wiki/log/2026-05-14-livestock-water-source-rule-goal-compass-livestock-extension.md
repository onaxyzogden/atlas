# 2026-05-14 — Livestock water source rule + Goal Compass livestock extension


Three arcs in one session, all on `feat/atlas-permaculture`.

**(1) Water-source rule for grazing paddocks.** User asked what counts
as a "suitable water source for livestock" — the Plan stage gave no
guidance, and a free-text `waterPointNote` on a paddock alone was
silently accepted by the welfare audit. Defined the canonical set in
[apps/web/src/features/livestock/waterSource.ts](../apps/web/src/features/livestock/waterSource.ts):
placed `water_tank` / `well_pump` / `rain_catchment` utilities,
`water_tank` / `well` / `water_pump_house` structures, or a
`WaterNode` of kind `storage` or `catchment`. Bands: ≤100 m good /
≤200 m fair / >200 m poor / null missing. `nearestWaterSource()`
exposes a single shared distance computation used by both the
draw-time PaddockTool hint copy and the audit-time
`WelfareAccessAuditCard`. Added vitest coverage (10/10 pass).

**(2) Four follow-up bugs surfaced during field test.**
  (a) "Place a water source →" CTA on the Act-stage audit card
      dispatched a `plan.*` tool id, but only `PlanDrawHost` listens
      for those — wired `useNavigate({ to: '/v3/project/$projectId/plan' })`
      then `setActiveTool(WATER_TANK_PLAN_TOOL_ID)` so the CTA crosses
      stages.
  (b) Deleting a water node from `PlanSelectionFloater` was a no-op
      under `case 'water'` — replaced with
      `useWaterSystemsStore.getState().removeWaterNode(item.id)`.
      The store already re-points dependent overflow edges, so the
      old "deferred to WaterNetworkCard" comment was the bug.
  (c) `Above-ground tank` placed via the Plan stage stored as a
      `WaterNode` with `kind: 'storage'` — invisible to the audit,
      which only scanned utilities + structures. Extended
      `nearestWaterSource()` to take a 4th `waterNodes: WaterNode[]`
      arg and include `storage` + `catchment` (skipping `swale` and
      `sink`).
  (d) Paddock-pill click in `PlanSelectionFloater` opened nothing.
      Diagnosed via dev-console eval to a synchronous throw at
      [apps/web/src/v3/plan/layers/inlineEditSchemas.ts:322](../apps/web/src/v3/plan/layers/inlineEditSchemas.ts)
      — `pd.species[0]` on legacy paddocks lacking the `species`
      field. React's synthetic event handler swallowed the throw,
      so `open()` was never reached. Guarded with `pd.species?.[0]
      ?? 'sheep'` plus defensive defaults on `pd.name` and
      `pd.fencing` for other potentially-legacy records.

**(3) Goal Compass extension for livestock-based regenerative farm.**
User asked to "develop a Goal tree for a livestock-based regenerative
farm". Goal Compass (commit `8a0a75d2`) already supports six
project-type archetypes, but `REGENERATIVE_FARM` only covered
cash-crop yield, soil health, and water cycle — no livestock criteria
— and the intervention catalog had just two livestock entries
(`poultry-coop`, `small-ruminant-paddock`), neither sufficient for a
livestock-led farm. Per user direction, extended the existing
archetype rather than adding a new one:
  • Appended a fourth `livestock-enterprise` sub-goal to
    `REGENERATIVE_FARM` in
    [apps/web/src/v3/plan/data/goalTreeTemplates.ts](../apps/web/src/v3/plan/data/goalTreeTemplates.ts)
    with four measurable criteria: paddocks active (count, target 8
    by year 3), welfare-audit pass % (target 100% by year 3),
    annual marketable protein (lbs, 5,000 by year 5), and annual
    livestock revenue (USD, 20,000 by year 5). Welfare-pass-%
    criterion description echoes the audit rule verbatim so the goal
    tab and the audit card tell the same story.
  • Added 5 interventions to
    [apps/web/src/v3/plan/data/interventionCatalog.ts](../apps/web/src/v3/plan/data/interventionCatalog.ts):
    `permanent-perimeter-fence` (access, enabler), `cattle-rotational-grazing`
    (subdivision; prereqs perimeter + cover-crop-rebuild + keyline-access-track;
    min 20 ac), `paddock-water-network` (water; closes 70% of welfare-pass-pct
    in year 1, matching the ≤100 m rule), `livestock-shelter-windbreak`
    (trees; closes shelter portion at +25% pass-pct), and
    `pasture-renovation-overseed` (soil; lifts protein + revenue via
    forage-quality uplift).
  • Backfilled `poultry-coop` and `small-ruminant-paddock` so they
    also score on the new livestock criteria — otherwise the
    greedy sequencer would have preferred new entries solely because
    legacy ones looked empty against the new sub-goal.
  • Runtime verification via preview eval confirmed
    `REGENERATIVE_FARM.subGoals.length === 4`, all 4 livestock
    criteria have ≥2 contributing interventions, and catalog total is
    20.

**(4) Goal Tree template picker defaulted to "Homestead".** User
selected element on the live preview. Root cause in
[apps/web/src/v3/plan/cards/goal-compass/GoalTreeTab.tsx](../apps/web/src/v3/plan/cards/goal-compass/GoalTreeTab.tsx):
the picker drove its `value` off `project.projectType`, which on the
`mtc` project is `null` — so `asTemplateKey(null)` fell back to
`'homestead'`. But `goalTreesByProject.mtc.archetype` was
`'regenerative-farm'` — the steward had already switched templates
via `switchTemplate()`, and the picker simply wasn't reading it.
Added `archetypeToTemplateKey()` that reverse-maps via
`GOAL_TREE_TEMPLATES[k].archetype` (the two namespaces diverge —
archetypes use hyphens, keys use underscores), and made the picker
prefer the loaded tree's archetype, falling back to project type then
`'homestead'`. Verified in preview: picker now reads "Regenerative
farm" with the live tree's parent goal "Profitable regenerative farm"
rendering below.

**Verification.** `npx tsc --noEmit` clean throughout. Full vitest
suite `npx vitest run` — 727/727 pass across 49 files (only this
session's additions touch livestock; the rest is regression
coverage).
