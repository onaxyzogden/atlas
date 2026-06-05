-- 030_three_streams_regeneration_trajectory.sql
-- 2026-05-20 — Phase 2 builtin: Three Streams Farm 24-month regeneration trajectory
--
-- Background:
--   Migration 029 instantiated Three Streams Farm as a builtin project. The
--   Phase-2 acceptance gate requires that RegenerationMonitorCard renders a
--   visibly upward trajectory across the seeded 24 months — without that,
--   the showcase can't demonstrate the A-series monitoring engine working.
--
--   Cadence follows the MDPI Apricot Lane Farms Y0/5/9 sampling pattern
--   (referenced in wiki/log/2026-05-20-olos-new-user-journey-walkthrough.md
--   and wiki/log/2026-05-19-atlas-b5-beneficial-organism-habitat.md):
--     - Y0 (2024) baseline: full protocol sample across all metrics
--     - Y1 (2025) quarterly: intervention milestones + observation rounds
--     - Y2 (2026) quarterly through current (2026-05): second-round MDPI
--       sampling showing measurable trajectory improvement vs Y0 baseline
--
--   Soil OM: 1.4-1.9% Y0 → 2.6-3.1% Y2 (pasture half), 2.1-2.4% Y2 (cropped half)
--   Bird-species richness: 11 spp Y0 → 17 spp Y2 (riparian + hedgerow recovery)
--   Worm casts: 0-2/m² Y0 row-crop → 4-6/m² Y1 cover-crop → 8-12/m² Y2 pasture
--   Infiltration rate: 12 mm/hr Y0 → 28 mm/hr Y2 (subsoiled + root + livestock impact)
--
--   Idempotent: every INSERT uses pinned ids + ON CONFLICT DO NOTHING.
--
-- CHECK constraint vocabulary (per migration 015):
--   event_type        ∈ {'observation', 'intervention', 'milestone', 'photo'}
--   intervention_type ∈ {'mulching_priority', 'compost_application',
--                        'cover_crop_candidate', 'silvopasture_candidate',
--                        'food_forest_candidate', 'other'} | NULL
--   phase             ∈ {'stabilize_erosion', 'improve_drainage',
--                        'build_organic_matter', 'introduce_perennials'} | NULL
--   progress          ∈ {'planned', 'in_progress', 'completed', 'observed'} | NULL
--
--   Calendar-year tagging (Y0/Y1/Y2) lives in observations.cohortYear, not phase.

INSERT INTO regeneration_events (
  id, project_id, author_id,
  event_type, intervention_type, phase, progress,
  title, notes,
  event_date, area_ha, observations
)
VALUES
  -- ──────────────────────────────────────────────────────────────────
  -- Y0 (2024) baseline — 6 MDPI-protocol sample observations
  -- ──────────────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-0000ee350001', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y0 baseline — soil organic matter survey',
    'MDPI-protocol soil sampling across cropped + pasture halves at 0-15 cm and 15-30 cm depth. 12 sample points (6 per half). Lab analysis at A&L Canada. Baseline confirms degraded continuous-corn signature: OM 1.4-1.9% on cropped half, 2.4-2.8% on pasture half. Plow pan documented at 18 cm on cropped half via penetrometer.',
    '2024-04-12'::date, 73.0,
    '{"cohortYear":"Y0","metric":"soil_organic_matter","samplePoints":12,"mean_om_pct_cropped":1.65,"mean_om_pct_pasture":2.6,"plowPanDepthCm":18,"protocol":"MDPI Apricot Lane Y0/5/9","labRef":"A&L Canada"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350002', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y0 baseline — bird-species richness transect',
    'Spring breeding-bird survey, 6 point counts across the parcel (3 on cropped half, 3 on pasture half). Single observer, 8-min counts, 50 m radius. 11 species detected total — dominant: red-winged blackbird, killdeer, savannah sparrow. No riparian-obligate species (kingfisher, swamp sparrow). No woodland species. Diversity flat across the cropped half.',
    '2024-05-22'::date, 73.0,
    '{"cohortYear":"Y0","metric":"bird_species_richness","total":11,"crop_half":7,"pasture_half":8,"shared":4,"method":"6x 8-min point counts","protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350003', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y0 baseline — earthworm + macro-invertebrate counts',
    '20x20 cm spade-sample method, 16 points across the parcel. Cropped half: 0-2 earthworms/sample (mean 0.8/m² extrapolated). Pasture half: 6-10/sample (mean 8.4/m²). No anecic species on cropped half. No millipedes, low spider diversity. Flag: cropped half biology nearly absent.',
    '2024-05-28'::date, 73.0,
    '{"cohortYear":"Y0","metric":"soil_biology","worms_m2_cropped":0.8,"worms_m2_pasture":8.4,"anecic_present_cropped":false,"anecic_present_pasture":true,"method":"20x20cm spade","protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350004', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y0 baseline — water infiltration rate',
    'Double-ring infiltrometer, 8 locations (4 per half). Cropped half: 9-14 mm/hr mean 11.8 mm/hr — consistent with plow pan + low OM. Pasture half: 22-31 mm/hr mean 26.4 mm/hr. After 30 min, cropped sites pooled visibly. Indicates surface runoff risk on 2-yr/24-hr storm events.',
    '2024-06-08'::date, 73.0,
    '{"cohortYear":"Y0","metric":"infiltration_rate_mm_per_hr","mean_cropped":11.8,"mean_pasture":26.4,"method":"double-ring infiltrometer 8 sites","protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350005', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y0 baseline — pollinator visitation transect',
    '30-min transects along three permanent waypoints (cropped centre, pasture centre, north windbreak). Cropped half: 4 honey bees, 0 native bees, 1 hover fly. Pasture half: 14 honey bees, 8 bumble bees, 3 hover flies, 1 mason bee. Windbreak edge: 22 honey bees, 11 bumble bees, 6 hover flies. Cropped half functionally pollinator-empty.',
    '2024-07-14'::date, 73.0,
    '{"cohortYear":"Y0","metric":"pollinator_visitation","cropped_total":5,"pasture_total":26,"windbreak_total":39,"method":"3x 30-min transects","protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350006', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y0 baseline — water-retention capacity (gravimetric)',
    'Gravimetric soil water content, 16 samples at 0-15 cm + 15-30 cm. Cropped half field capacity 22-26% by weight. Pasture half 28-33%. Water-retention capacity differential drives Y1 cover-crop priority on cropped half.',
    '2024-09-15'::date, 73.0,
    '{"cohortYear":"Y0","metric":"water_retention_pct_by_weight","mean_cropped":24.2,"mean_pasture":30.1,"method":"gravimetric 16 samples","protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb),

  -- ──────────────────────────────────────────────────────────────────
  -- Y1 (2025) — water + cover phase (8 events, quarterly + key interventions)
  -- ──────────────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-0000ee350007', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'intervention', 'other', 'stabilize_erosion', 'completed',
    'Y1 keyline survey + swale earthworks complete',
    'Two contour keyline swales cut on the steeper sub-watersheds (west + east branches). 290 m + 300 m, 1.0-1.1% slope, subsoiled to 35 cm. Planted comfrey + black locust along uphill berm (west) and comfrey + sea buckthorn (east). First spring 2025 storm runoff captured — visible drawdown into adjacent infiltration zones.',
    '2025-04-22'::date, 1.2,
    '{"cohortYear":"Y1","interventionGroup":"water","swaleLengthM":590,"plantedSpecies":["comfrey","black locust","sea buckthorn"]}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350008', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'intervention', 'other', 'stabilize_erosion', 'completed',
    'Y1 riparian buffers established on all three tributaries',
    'Three riparian buffers seeded along the on-lot reach of each Sixteen Mile Creek tributary, 30 m setback per Conservation Halton O.Reg. 162/06. West branch: red-osier dogwood + nannyberry + crack willow + reed canary grass (410 m). Central branch: red-osier dogwood + elderberry + silver maple + sedge mix (480 m). East branch: red-osier dogwood + serviceberry + staghorn sumac + native grass mix (290 m). Total 1180 m of channel buffered.',
    '2025-05-08'::date, 4.7,
    '{"cohortYear":"Y1","interventionGroup":"water","bufferChannelLengthM":1180,"setbackM":30,"branches":3}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350009', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y1 Q2 worm-cast count — early swale-adjacent recovery',
    'Cropped-half spade samples adjacent to new swales: 3-5 worms/sample (mean 3.8/m² up from 0.8/m² Y0). Distal samples unchanged. Effect localized to subsoiled + planted strip. Encouraging early signal.',
    '2025-06-30'::date, 1.0,
    '{"cohortYear":"Y1","metric":"soil_biology","worms_m2_adjacent":3.8,"worms_m2_distal":0.9,"baselineCompare":"Y0 cropped half = 0.8"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350010', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'intervention', 'cover_crop_candidate', 'build_organic_matter', 'completed',
    'Y1 cover-crop drilled: oats + tillage radish + peas (east field)',
    'Spring/summer catch-crop on the east-field former corn ground. 2.9 ha seeded after a light disc. Tap-root performance against the plow pan was the question — by mid-September the radish biomass was visible above 60 cm tall and the soil cracks down to 28-32 cm. Tillage radish winter-killed as expected; root channels left intact for spring planting.',
    '2025-08-10'::date, 2.9,
    '{"cohortYear":"Y1","interventionGroup":"cover","speciesMix":["oats","tillage radish","field peas"],"radishBiomassHeightCm":60,"cracksToDepthCm":30}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350011', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'intervention', 'cover_crop_candidate', 'build_organic_matter', 'completed',
    'Y1 cover-crop drilled: winter rye + crimson clover + hairy vetch (west field)',
    'Overwinter cover on the west-field former corn ground. 3.2 ha drilled after final corn harvest. Achieved 90% germination by November freeze-up. Standing at green-up Spring 2026 — biomass strong, vetch holding through April. Plan: roller-crimp + plant orchard interplant directly into the residue April 2026.',
    '2025-09-20'::date, 3.2,
    '{"cohortYear":"Y1","interventionGroup":"cover","speciesMix":["winter rye","crimson clover","hairy vetch"],"germinationPct":90,"residueStrategy":"roller-crimp + plant-through"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350012', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y1 Q4 infiltration spot-check — swale-adjacent vs distal',
    'Double-ring infiltrometer, 4 sites adjacent to swales + 4 distal control. Adjacent: 18-24 mm/hr mean 20.6 mm/hr (up from Y0 cropped 11.8). Distal: 12-15 mm/hr mean 13.2. Effect tracks subsoiled + planted strip only at this point — broader uplift expected post-cover-crop residue.',
    '2025-11-05'::date, 0.5,
    '{"cohortYear":"Y1","metric":"infiltration_rate_mm_per_hr","mean_swale_adjacent":20.6,"mean_distal":13.2,"baselineCompare":"Y0 cropped = 11.8"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350013', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y1 spring 2025 bird survey — first riparian-obligate detection',
    'Repeat of Y0 6-point breeding-bird transect. Total 13 species (up from 11). New: swamp sparrow (central branch buffer), kingfisher (west branch). Pasture half: addition of bobolink — possibly transient. Cropped half still flat at 7 species. Encouraging early riparian response on the just-seeded buffers.',
    '2025-05-21'::date, 73.0,
    '{"cohortYear":"Y1","metric":"bird_species_richness","total":13,"new_species":["swamp sparrow","kingfisher","bobolink"],"baselineCompare":"Y0 = 11"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350014', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'milestone', NULL, 'stabilize_erosion', 'completed',
    'Y1 close — water + cover phase complete',
    'Yeomans cap closes Y1 at water + cover: keyline swales (590 m), riparian buffers (1180 m), cover-crop on both former corn fields (6.1 ha total). Visible localized recovery in worm counts + infiltration on swale-adjacent strips. Conservation Halton compliance verified for all in-corridor work — no permit-required deviations. Ready for Y2 livestock + perennial integration.',
    '2025-12-15'::date, 6.1,
    '{"cohortYear":"Y1","milestoneType":"phase_close","yeomansCapClosed":"water"}'::jsonb),

  -- ──────────────────────────────────────────────────────────────────
  -- Y2 (2026) — livestock + perennial start (10 events through 2026-05 current)
  -- ──────────────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-0000ee350015', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'milestone', NULL, 'introduce_perennials', 'completed',
    'Y2 Q1 — pole barn + egg-pack room complete; cistern online',
    'Yeomans Y2 cap (buildings) lands: pole barn shell + roof + roll-up door complete by 2026-03-12; egg-pack room finish-out complete by 2026-03-30. 22,000 L rainwater cistern plumbed off the pole barn roof, first-flush diverter installed, screening + insect netting at all inlets. Spring runoff captured.',
    '2026-03-30'::date, 0.08,
    '{"cohortYear":"Y2","milestoneType":"structure_complete","structures":["pole_barn","egg_pack_room","cistern_22000L"]}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350016', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'milestone', NULL, 'introduce_perennials', 'completed',
    'Y2 Q2 — first orchard block planted (apple + pear + plum)',
    '68 trees planted on the south-facing bench (Liberty + GoldRush apple, Harrow Sweet pear, Superior plum). Roller-crimped into Y1 winter-rye + clover residue per Y1 plan — the standing mulch held weed pressure to negligible through May. Comfrey + alfalfa understorey seeded between rows. Initial deer pressure responded to 8-foot electric mesh perimeter.',
    '2026-04-25'::date, 1.2,
    '{"cohortYear":"Y2","milestoneType":"perennials_planted","trees":68,"areaHa":1.2,"varieties":["liberty apple","goldrush apple","harrow sweet pear","superior plum"],"understorey":["comfrey","alfalfa"]}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350017', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'milestone', NULL, NULL, 'completed',
    'Y2 Q2 — cow-calf herd lands (80 head Black Angus / Devon-cross)',
    'First commercial herd arrived 2026-05-04: 80 head total (62 cows + 18 calves, with 2 bulls leasing through breeding window). Rotation discipline started immediately on 3-day moves through 12 paddock cells across the north pasture strip. Mobile water trough + shade structure tracking the herd. First-month gain visibly on-track for grass-finished targets.',
    '2026-05-04'::date, 7.8,
    '{"cohortYear":"Y2","milestoneType":"livestock_arrival","herd":{"cows":62,"calves":18,"bulls":2},"rotationDays":3,"paddockCells":12,"breed":"Black Angus / Devon-cross"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350018', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'milestone', NULL, NULL, 'completed',
    'Y2 Q2 — mobile poultry follow online (3-day lag)',
    'Egg-mobile + 200-bird layer flock + 3 broiler shelters arrived 2026-05-15. Follow-cycle locked in at 3-day lag behind the cow-calf herd. Electric netting paddocks reset with each move. Pest-predation observation: flies down ~60% in herd-front paddocks within the first follow cycle.',
    '2026-05-15'::date, 7.8,
    '{"cohortYear":"Y2","milestoneType":"livestock_arrival","flock":{"layers":200,"broilers_shelters":3},"followLagDays":3,"observation":"fly_reduction_pct_60"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350019', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y2 second-round MDPI sampling — soil organic matter',
    'Repeat of Y0 12-point soil sampling. Cropped half (post-Y1 cover crops, pre-pasture conversion): OM 2.1-2.4% (mean 2.25%, up from 1.65% Y0). Pasture half (no intervention yet, baseline for Y2+ livestock impact): OM 2.6-3.1% (mean 2.85%, up from 2.6% Y0 — within sampling noise). Clear cropped-half recovery signal from Y1 cover-crop work; pasture-half effect of Y2 livestock not yet expressible.',
    '2026-04-10'::date, 73.0,
    '{"cohortYear":"Y2","metric":"soil_organic_matter","samplePoints":12,"mean_om_pct_cropped":2.25,"mean_om_pct_pasture":2.85,"baselineCompare":{"Y0_cropped":1.65,"Y0_pasture":2.6},"protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350020', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y2 second-round MDPI sampling — bird-species richness',
    'Repeat of Y0 6-point breeding-bird transect. Total 17 species (up from 11 Y0, 13 Y1). New since Y1: yellow warbler (central buffer), common yellowthroat (west buffer), eastern kingbird (north hedgerow), tree swallow (pole barn nesting). Bobolink confirmed breeding in pasture (transient last year — now resident with nest sites). Cropped half still lagging at 9 species but climbing.',
    '2026-05-22'::date, 73.0,
    '{"cohortYear":"Y2","metric":"bird_species_richness","total":17,"new_species":["yellow warbler","common yellowthroat","eastern kingbird","tree swallow"],"breedingConfirmed":["bobolink"],"baselineCompare":{"Y0":11,"Y1":13},"protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350021', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y2 second-round MDPI sampling — earthworm + macro-invertebrate counts',
    '20x20 cm spade samples, 16 points. Cropped half (post-Y1 cover): 4-6/sample mean 4.6/m² (up from 0.8 Y0, 3.8 Y1 adjacent). Pasture half (first-month under cow-calf rotation): 9-13/sample mean 11.2/m² (up from 8.4 Y0). Anecic species present on cropped half for first time. Spider diversity visibly up on the cover-crop residue.',
    '2026-05-25'::date, 73.0,
    '{"cohortYear":"Y2","metric":"soil_biology","worms_m2_cropped":4.6,"worms_m2_pasture":11.2,"anecic_present_cropped":true,"baselineCompare":{"Y0_cropped":0.8,"Y0_pasture":8.4},"protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350022', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y2 second-round MDPI sampling — infiltration rate',
    'Double-ring infiltrometer, 8 sites mirroring Y0. Cropped half: 18-32 mm/hr (mean 24.8 mm/hr, up from 11.8 Y0). Pasture half: 30-44 mm/hr (mean 36.8 mm/hr, up from 26.4 Y0). The cropped-half jump is the most striking trajectory shift in the dataset — the combination of subsoil swale work + tillage-radish channels + cover residue is delivering 2.1x Y0 baseline.',
    '2026-05-28'::date, 73.0,
    '{"cohortYear":"Y2","metric":"infiltration_rate_mm_per_hr","mean_cropped":24.8,"mean_pasture":36.8,"baselineCompare":{"Y0_cropped":11.8,"Y0_pasture":26.4},"trajectoryMultiplier":{"cropped":2.1,"pasture":1.4},"protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350023', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Y2 pollinator visitation — first-pass post-orchard-establishment',
    '3x 30-min transects mirroring Y0 waypoints + new orchard-block waypoint. Cropped half: 14 honey bees, 4 bumble bees, 2 native bees, 3 hover flies (up from 5 total Y0). Pasture half: 31 honey bees, 18 bumble bees, 5 hover flies, 3 mason bees, 1 leafcutter (up from 26 Y0). New orchard-block waypoint: 46 honey bees, 22 bumble bees, 8 mason bees, 4 hover flies, 2 leafcutters — strong response to orchard bloom + cover-residue understory.',
    '2026-05-30'::date, 73.0,
    '{"cohortYear":"Y2","metric":"pollinator_visitation","cropped_total":23,"pasture_total":58,"orchard_total":82,"baselineCompare":{"Y0_cropped":5,"Y0_pasture":26},"protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee350024', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    'milestone', NULL, 'introduce_perennials', 'in_progress',
    'Y2 mid-arc reflection — trajectory through current',
    'Two-year window from Y0 (April 2024) to current (May 2026) shows measurable improvement on every MDPI-protocol axis: soil organic matter cropped half +36% (1.65 → 2.25%), bird-species richness +55% (11 → 17 spp), earthworm density cropped half +475% (0.8 → 4.6/m²), infiltration cropped half +110% (11.8 → 24.8 mm/hr), pollinator visitation cropped half +360% (5 → 23 individuals). Three Streams Farm in a credibly tracking the MDPI Apricot Lane Y0→Y5 trajectory shape, well within model expectations at Y2.',
    '2026-05-30'::date, 73.0,
    '{"cohortYear":"Y2","milestoneType":"trajectory_reflection","trajectorySummary":{"om_cropped_pct_gain":36,"bird_richness_pct_gain":55,"worms_cropped_pct_gain":475,"infiltration_cropped_pct_gain":110,"pollinator_cropped_pct_gain":360},"protocol":"MDPI Apricot Lane Y0/5/9"}'::jsonb)

ON CONFLICT (id) DO NOTHING;
