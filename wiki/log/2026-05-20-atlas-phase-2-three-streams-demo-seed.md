# 2026-05-20 — Phase 2: Three Streams Farm curated demo seed (Artifact A)

Branch `feat/atlas-permaculture`. Phase 2 of the Apricot-Lane-inspired OLOS
showcase program ([[log/2026-05-20-atlas-apricot-lane-showcase-program]]):
instantiate the Three Streams Farm canon ([[entities/three-streams-farm]],
ratified in Phase 1 — [[log/2026-05-20-atlas-phase-1-three-streams-canon]])
as a loadable, fully-populated OLOS project — Artifact A of the three-layer
program. Substrate is what Phase 3 portal scenes read from and what Phase 4
template extracts.

## Outcome

Two new SQL migrations + one new client-side dev seeder + one new shared
constant. A logged-in user landing on Three Streams Farm now traverses
Observe → Plan → Goal Compass → Act → Monitor with every surface populated.

### Migration `029_builtin_three_streams_farm.sql` (server-side, comprehensive)

Single transactional migration following the `017_builtin_sample_project.sql`
pattern verbatim — one comprehensive builtin-project migration rather than
the plan's four-file split, matching the existing codebase precedent.
Idempotent: every row uses `INSERT … ON CONFLICT (id) DO NOTHING` on pinned
sentinel UUIDs (family `00000000-0000-0000-0000-0000df35eNNN` for design
features, `00000352e0NN` for spiritual zones, `0000ed3500NN` for project
relationships).

Sections A–G:

- **A. project row** at sentinel `00000000-0000-0000-0000-000000357320`,
  `is_builtin=true`, parcel boundary from canon bbox `[-79.9145, 43.5560] →
  [-79.9055, 43.5640]`, `conservation_auth_id='3520'`, ~180 acres,
  `address='Lot 14, Concession 6 (geographic Trafalgar / now Town of
  Milton), Halton Region, ON'`, metadata JSONB with
  bioregion/county/legalDescription/soilNotes/showcaseProgram subobject.
- **B. 6 project_layers** (elevation, soils, watershed, wetlands_flood,
  land_cover, climate) with `source_api` strings sourced verbatim from the
  canon Observe-module → adapter mapping (NRCan HRDEM, OMAFRA CanSIS, OHN,
  Conservation Halton regulated area O.Reg. 162/06, AAFC Annual Crop
  Inventory, ECCC normals via Georgetown WWTP); elevation + climate use
  the canonical snake_case key set per migration 018; remaining four use
  017's camelCase summary shape.
- **C. terrain_analysis** scalar row — rolling 4–8 % slope band, South
  dominant aspect, mixed N/E secondary, consistent with the chosen Sixteen
  Mile Creek headwaters parcel.
- **D. site_assessment** with `score_breakdown` JSONB reflecting Y2 state
  (recovering but still-degraded cropland baseline); overall 68.0; FAO
  `S2 — Moderately Suitable` / USDA `Class III — Suited to cultivation`;
  confidence `medium`.
- **E. ~22 design_features**: Y0 baseline fields (east + west cropland),
  Y1 (keyline swales on contour, riparian buffers on the three tributaries,
  cover-crop blocks), Y2 (orchard block, cow-calf pasture, mobile poultry
  paddock, nursery propagation tunnel, kitchen garden, pole barn, egg-pack
  room, rainwater cistern, farm access lanes, north + west hedgerows),
  Y3+ planned (silvopasture savanna, woodlot extension).
- **F. 2 spiritual_zones**: musalla at central tributary creek confluence
  with qibla_bearing 55.85°, gathering circle near homestead.
- **G. 8 project_relationships** edges — Needs & Yields integration graph
  (livestock manure → orchard fertility; cover crop → soil OM; riparian
  buffer → baseflow → pasture; hedgerow → pollinator habitat; ponds →
  microclimate; propagation tunnel → planting pipeline; keyline swales →
  infiltration).

### Migration `030_three_streams_regeneration_trajectory.sql` (server-side, 24-month MDPI trajectory)

24 `regeneration_events` rows ramping Y0 baseline (2024) → Y1 (2025) → Y2
(2026 current) on MDPI Apricot Lane Y0/5/9-cadence shape. Phase fields map
to the `regeneration_events` CHECK-constraint vocabulary
(`stabilize_erosion` / `improve_drainage` / `build_organic_matter` /
`introduce_perennials`); calendar-year tag carried in
`observations.cohortYear` JSONB key so 2024 / 2025 / 2026 trajectories
re-aggregate cleanly downstream of the check-constraint:

- **6 Y0 (2024) baseline observations** — soil OM %, bird-species richness,
  earthworm counts per m², water infiltration rate, pollinator visitation,
  water-retention capacity.
- **8 Y1 (2025) events** — keyline swales + riparian buffers
  (intervention rows), Q2 worm-cast count, oats + radish cover crop,
  winter rye + crimson clover cover crop, Q4 infiltration spot-check,
  spring bird survey, Y1-close milestone.
- **10 Y2 (2026) events** — pole barn + cistern milestone, orchard block
  planted, cow-calf herd arrival, mobile poultry online, second-round
  MDPI sampling (OM, bird-richness, soil-biology, infiltration,
  pollinator), trajectory reflection milestone.

Trajectory deltas baked into the seed: cropped-field OM 1.65 → 2.25 % (+36 %),
bird-species richness 11 → 17 (+55 %), cropped-field earthworm density
0.8 → 4.6 / m² (+475 %), cropped-field infiltration 11.8 → 24.8 mm/hr (+110 %),
pollinator visitation 5 → 23 / 10 min (+360 %).

### Client-side seeder `seedThreeStreamsFarm.ts` (web)

New `apps/web/src/dev/seedThreeStreamsFarm.ts` following the
[seedFertilitySample.ts](../../apps/web/src/dev/seedFertilitySample.ts) +
[seedGoalCompassPlan.ts](../../apps/web/src/dev/seedGoalCompassPlan.ts)
debug-handle pattern. Lives behind a `three-streams-seeded@v1`
localStorage sentinel so it runs once per browser; passes `{ force: true }`
for manual replay from `window.__ogdenSeedThreeStreamsFarm()`.

Does four things in order:

1. **Customise the 4 default phases** with canon names + descriptions:
   *Year 0-1 / Water + Cover*, *Year 1-3 / Perennials + Livestock*,
   *Year 3-5 / Polyculture Maturation*, *Year 5+ / Ecosystem Stability*.
   Uses `phaseStore.ensureDefaults(pid)` then iterates + `updatePhase`.
2. **Set Site Profile facets to canon values** — 180 acres, climate
   zone 5b, rolling landform, 5.8 % avg slope, currentLandCover
   `'cropland'`, high soil compaction, rainfed water posture, frost
   dates 05-15 / 10-05, household {2 adults, 2 children}. Drives the
   sequencing engine's acreage budget + intervention selection.
3. **Run `seedGoalCompassPlan(pid)`** to generate canon-grounded
   WorkItems through the real engine
   (`runSequencingEngine` → `scheduleTasksToCalendar` →
   `replaceGoalCompassRows` → `pushGoalCompassToSpine`). Output is
   byte-identical to a real UI generation; idempotent.
4. **Seed 6 nursery propagation batches** (hawthorn whips, elderberry
   cuttings, serviceberry from seed, winter rye + crimson clover seed
   stock, kitchen-garden transplants) via `nurseryStore.addBatch`.
   Per-batch id-equality check so partial re-seed is non-destructive
   of user-authored rows.

**Auto-run hook.** A side-effect import in `main.tsx` registers a
one-shot `useProjectStore.subscribe` listener that fires
`seedThreeStreamsFarm()` the first time the Three Streams project lands
in the local store (after `/api/v1/projects/builtins` hydrates). The
listener unsubscribes itself after firing and also fires immediately if
the project was already in the store at module-init (hot reload,
persisted-store rehydration). Avoids editing the WIP `projectStore.ts`
file — zero circular-import risk.

### Shared constant `THREE_STREAMS_PROJECT_ID`

`packages/shared/src/constants/system.ts` adds:
```typescript
export const THREE_STREAMS_PROJECT_ID = '00000000-0000-0000-0000-000000357320';
```
Re-exported from `@ogden/shared` via the existing `system.js` export.
The seeder + (future) any frontend Three-Streams-detection sites read
this constant rather than hardcoding the sentinel.

## Decisions fixed this phase

- **Two migrations, not four.** Plan called for 018–021 split; existing
  codebase ships builtin-project substrate in one comprehensive migration
  (017). Followed precedent. 030 split is justified — 24 events on MDPI
  cadence is a substantial data block worth its own review surface.
- **Migration numbering reassigned to 029 + 030.** Plan reserved 018–021
  but those slots were already taken by intervening migrations on this
  branch.
- **No habitat-feature / ecology / cover-crop-window client seed.** Out of
  scope per Phase 2 task list; the canon does not require those surfaces
  populated for the Phase 2 walkthrough acceptance. Phase 2.5 or a follow-up
  slice if needed.
- **No featured landing-page treatment.** Task 2.6 explicitly skipped per
  the approved plan — revisit when Phase 3 portal lands; portal CTAs can
  deep-link directly to Three Streams, making landing-page polish
  redundant.
- **B-track livestock substrate deferred to Phase 2.5** per plan, after
  the parallel-session livestock-rotation-engine / livestockRevenue work
  lands. Phase 2 seeds non-livestock substrate; paddock + rotation-plan
  seeding waits.
- **Wired auto-run via subscription, not direct projectStore edit.**
  Avoids touching the WIP `projectStore.ts` modified file and removes the
  circular-import question entirely. Seeder-side `useProjectStore.subscribe`
  fires on the same project-lands-in-store signal `seedBuiltinObserveData`
  uses for 351 House, but from outside the store module.

## Reused, not built

- 017 migration pattern (Section A-I template, `ON CONFLICT (id) DO NOTHING`
  on pinned sentinel UUIDs).
- 018 canonical snake_case layer-key set for elevation + climate.
- 015 regeneration_events CHECK-constraint vocabulary.
- `seedGoalCompassPlan` engine path — runs the real sequencing + spine
  push, not a hand-coded WorkItem list.
- `phaseStore.ensureDefaults(projectId)` 4-phase scaffold; seeder
  overrides name/description in place.
- `siteProfileStore.setFacet(projectId, key, value, 'manual')` real
  setters per facet; built through the store, not test fixtures.
- `nurseryStore.addBatch(batch)` per-row, idempotent via id-equality.
- `is_builtin=true` flag → automatic surfacing in `/projects/builtins`
  and `/v3/project` listing.
- `seedBuiltinObserveData` auto-run pattern (subscribe + queueMicrotask
  + idempotency flag); not edited, mirrored alongside.
- `__ogden*` debug-handle convention from existing seeders.

## Out of scope (deferred per plan)

- Phase 2.5 — livestock substrate (paddocks, rotation plan, moves) until
  parallel-session B-track rotation-engine work lands and the spine
  contracts settle.
- Phase 3 — public-portal scrollytelling at `/showcase/three-streams`.
- Phase 4 — template extraction + clone flow.
- Live adapter re-fetch — vendored `summary_data` per 017 convention;
  `data_date` honestly stamps Y0 baseline (2024-Q1) or Y2-current
  (2026-Q2) per row.
- MDPI Y5 / Y9 forward projections — referenced in canon, surfaced in
  Phase 3 portal as forward scenes; not seeded as events.
- Habitat features, ecology succession overrides, planting-calendar
  cover-crop windows — Phase 2.5 or follow-up slice if a walkthrough
  re-run flags them.
- Refactoring the modified-WIP `projectStore.ts` or
  `routes/projects/index.ts` beyond the zero edits this seeder needed.

## Verification

- `apps/web` `tsc --noEmit` (with `--max-old-space-size=8192`) clean on
  all touched files. The sole error is the pre-existing
  `StepBoundary.tsx(365,7)` `unknown → ReactNode` foreign-WIP error
  noted in earlier session logs as tolerated baseline.
- `seedThreeStreamsFarm.ts` imports resolve against `@ogden/shared`
  (THREE_STREAMS_PROJECT_ID re-exported via existing `system.js` export
  line in `packages/shared/src/index.ts`).
- Migrations follow 017 byte-shape and 018 canonical-key convention;
  syntactically safe. End-to-end DB validation deferred to user's
  dev DB run — local `pnpm`/`npm run migrate` unavailable this session
  (env requires `DATABASE_URL` + `JWT_SECRET`).
- Phase 2 walkthrough re-run (Task 2.7) — deferred to a follow-up
  session that has a running dev DB + preview server; the substrate
  itself is in place to make the re-run cheap once the env is up.

## Next

- **Task 2.7 follow-up session** — apply migrations on a fresh dev DB,
  load Three Streams in the preview, re-run the 5/20 walkthrough,
  amend the walkthrough ADR with per-stage verdicts against the
  populated showcase project.
- **Phase 2.5** — livestock substrate (paddocks, rotation plan,
  projected moves) once the parallel-session B-track engine lands.
- **Phase 3** — public-portal scrollytelling. Opens its own brainstorm
  cycle.

ADR back-links: [[decisions/2026-05-20-olos-new-user-journey-walkthrough]]
(walkthrough that scoped the gap-set Phase 0 closed) and
[[log/2026-05-20-atlas-apricot-lane-showcase-program]] (program plan
that scoped this Phase 2).
