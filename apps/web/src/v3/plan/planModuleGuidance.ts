/**
 * Plan module guidance — Permaculture-Scholar WHY/HOW copy keyed by
 * UniversalDomain (slice 3b+3c). Extracted from PlanChecklistAside.tsx
 * during the UniversalDomain cutover so non-rail surfaces (Plan Stage
 * Compass) can reuse the same grounded copy without importing component
 * code.
 *
 * Collision groups (canonical insertion order — locked by slice-1
 * vitest):
 *   access-circulation   ← [dynamic-layering, zone-circulation]
 *   built-infrastructure ← [structures-subsystems, machinery]
 *   ecology              ← [regeneration-monitor, habitat-allocation,
 *                          biodiversity-monitor]
 * For collision domains, `how` is the canonical-order concatenation of
 * the colliding modules' `how` arrays; `why` is first-wins.
 *
 * Unauthored domain cells ship empty (`why:''`, `how:[]`) and accumulate
 * as a content-authoring backlog. See ADR
 * 2026-05-26-atlas-universal-domain-step3-cutover.
 */

import type { GuidanceCardData } from '../_shared/components/GuidanceCard.js';
import type { UniversalDomain } from '@ogden/shared';

const EMPTY: GuidanceCardData = { why: '', how: [] };

export const PLAN_MODULE_GUIDANCE: Record<UniversalDomain, GuidanceCardData> = {
  'vision-intent': {
    // ← goal-compass
    why: 'Goal Compass lets the steward declare measurable success criteria and have a deterministic sequencing engine propose a phased, costed, labor-budgeted plan against a curated permaculture intervention catalog (Mollison, Yeomans, Holmgren P1: Observe & interact).',
    how: [
      'Your goal tree and site profile come from Stage 0 (True North) — revisit it there to refine them.',
      'Click Generate to materialise BuildPhase + PhaseTask rows into the shared phase store.',
      'Open Criteria forecast to see projected values at Year 1 / 3 / 5 / 7 / 10 / 20.',
    ],
  },
  'land-base': EMPTY,
  'climate': {
    // ← cross-section-solar
    why: 'The vertical transect reveals competition for light between layers and checks solar access for passive heating, solar panels, and photosynthesis (Mollison, Designer\'s Manual ch.4).',
    how: [
      'Draw a cross-section along the primary sun-facing slope.',
      'Enable the Solar Overlay to confirm winter sun angles are unobstructed.',
      'Adjust canopy heights in the Plant Systems module to resolve shading conflicts.',
    ],
  },
  'topography': EMPTY,
  'hydrology': {
    // ← water-management
    why: 'Water design is a directed graph: catchments shed → storage retains → swales spread → sinks absorb. Per Permaculture Scholar (2026-05-07): every node must declare an overflow target so excess flows along the topographic slope rather than disappearing off-site (Mollison, Designers\' Manual ch.7; Holmgren P2: Catch and store energy).',
    how: [
      'List catchments first — roofs, paved areas, pasture — with surface coefficients.',
      'Add storage and swale nodes; pick an overflow target for every one.',
      'Open Network & balance to see total yield, retained volume, and orphans.',
    ],
  },
  'soil': {
    // ← soil-fertility
    why: 'Per Permaculture Scholar (2026-05-07): soil fertility is the "digestive system" of the design and must be diagnosed before it is amended. OSU PDC mandates jar-test, percolation, and pH as the bare-minimum baseline; Holmgren P6 (Produce no waste) requires that every fertility unit have both a feedstock source and a destination.',
    how: [
      'Open Soil baseline first: enter jar-test %, percolation, and pH to surface limiting factors.',
      'Add fertility infrastructure (composters, hugelkultur beds, worm bins) on the designer tab.',
      'Wire waste vectors between zones, structures, crops, and fertility units.',
      'Open Closed-loop graph to verify no fertility unit is orphaned (no flows attached).',
    ],
  },
  'ecology': {
    // ← regeneration-monitor (first) + habitat-allocation + biodiversity-monitor
    why: 'Regeneration is only real if it is measured over time. The Apricot Lane Farms model rests on a peer-reviewed MDPI 9-year longitudinal soil study (Year 0 / 5 / 9 sampling of microbial biomass, soil organic matter, and water-stable aggregates) — without dated, per-zone sampling a steward cannot tell whether the land is actually improving or only appears to be (Holmgren P4: Apply self-regulation and accept feedback).',
    how: [
      // regeneration-monitor
      'Log dated observation samples per metric and per management zone — soil organic matter %, living cover %, infiltration %, microbial biomass, aggregate stability, bulk density.',
      'Read each metric\'s trajectory against the goal-tree target line and deadline-year marker.',
      'Act on lagging verdicts: where the curve is below trajectory, revisit the upstream water, soil, or plant module before the deadline year.',
      // habitat-allocation
      'Draw conservation, buffer, and water-retention zones on the map — their area is what counts toward the habitat set-aside.',
      'Read the allocation gauge: allocated % vs the goal-tree target line (regen-habitat-pct, default 10%), with the shortfall in hectares when under.',
      'Record the discrete habitat features you commit to — wildlife pond, owl boxes, hawk perches, hedgerow length — so the inventory matches the drawn land.',
      // biodiversity-monitor
      'Log dated biodiversity samples per management zone — native vegetative cover %, invasive-species pressure %, distinct bird & pollinator species count, beneficial-predator activity index.',
      'Read each metric\'s trajectory against the goal-tree target line and deadline-year marker, on the Year 0 / 5 / 9 monitoring cadence.',
      'Act on lagging native-cover or invasive-pressure curves: where recovery is below trajectory, revisit the habitat allocation and corridor design before the deadline year.',
    ],
  },
  'plants-food': {
    // ← plant-systems
    why: 'Tree placement follows the patterns of water flow and access (Mollison, Designers\' Manual ch.10; OSU PDC, Tree Influence on Watershed). Pick species against site context, place guilds on the parcel where water and access already lead, then track the 30-year succession arc.',
    how: [
      'Use the site-match score to filter species against the project\'s hardiness band.',
      'Place each guild centroid on the parcel diagram in line with water flow and zones.',
      'Step through the succession scenarios (Year 1 / 5 / 10 / 20 / 30+) to check light by layer.',
    ],
  },
  'animals-livestock': {
    // ← livestock
    why: 'Subdivision and livestock sit at rank 7 of Yeomans\' Scale of Permanence — fence lines and animal cells are designed *after* climate, landform, water, access, and structures are settled, because they consume the slowest-to-change layers (Mollison, Designers\' Manual ch.8; Yeomans, Water for Every Farm). Locking in cell shapes before water and access exist forces expensive re-fencing later. The Product Chain sub-section extends this onto the post-farm-gate flow (slaughter → cold chain → market) so the herd / flock is designed against the actual off-take it has to feed, not in isolation.',
    how: [
      'Confirm water lines and access tracks exist on the design before drawing paddock cells.',
      'Size cells to the herd / flock\'s daily grazing demand and target rest period.',
      'Site shelters and water points so each cell has both within reasonable walking distance.',
      'In the Product Chain tabs, place slaughter / cold-chain / market nodes so capacity and demand size against bird or carcass volume — not the other way round.',
    ],
  },
  'built-infrastructure': {
    // ← structures-subsystems (first) + machinery
    why: 'Structures (Yeomans rank 5) and their subsystems (rank 6: power, water, sanitation) are placed *after* climate, landform, water, and access are settled — locking dwellings before water lines and roads forces expensive retrofits (Yeomans, Water for Every Farm; Mollison, Designers\' Manual ch.13). Cabin, yurt, earthship, greenhouse, prayer space, and utility infrastructure all sit on this rank pair.',
    how: [
      // structures-subsystems
      'Confirm Water and Zone & Circulation are settled before placing dwellings.',
      'Drop a Structure point on the parcel; pick its type, phase, and rotation.',
      'Group utility subsystems (well, water tank, solar array, pump house, compost station) near the structures they feed.',
      // machinery
      'Inventory the machinery the project will actually run — sizes and turning radii.',
      'Lay out access tracks and gates wide enough for the largest expected vehicle.',
      'Verify each paddock, structure, and field has a reachable access path before locking phases.',
    ],
  },
  'access-circulation': {
    // ← dynamic-layering (first) + zone-circulation
    why: 'Yeomans\' nine ranks decide order: Climate → Landform → Water → Access → Structures → Subsystems → Soil → Vegetation → Fauna. Per Permaculture Scholar (2026-05-07): collapsing Access + Structures is a Keyline violation; visualising ordering and warning when prerequisites are skipped is what the module must do (Mollison ch.5; Holmgren P8 Integrate rather than segregate).',
    how: [
      // dynamic-layering
      'Open Permanence scales for the rank-by-rank rollup of element counts.',
      'Open Permanence ladder to see proportional bars + any ordering warnings.',
      'Resolve violations top-down: design the missing higher-rank layer before adding more elements below it.',
      // zone-circulation
      'Tag each drawn zone with its Z-level in the Zone level layer tab.',
      'Tag each drawn path with daily / weekly / occasional / rare in the Path frequency tab.',
      'Open Overview & validation to verify high-frequency paths reach Z1 / Z2.',
    ],
  },
  'energy-resources': EMPTY,
  'people-governance': EMPTY,
  'economics-capacity': {
    // ← phasing-budgeting
    why: 'Design from patterns to details (Holmgren P7): phasing matches implementation scale to available labour, capital, and ecological readiness — avoiding overwhelm.',
    how: [
      'Sequence earthworks and water systems before planting phases.',
      'Assign seasonal task windows to match climate rhythms.',
      'Use the Labor & Budget rollup to stress-test each phase against capacity.',
    ],
  },
  'risk-compliance': {
    // ← principle-verification
    why: 'Apply self-regulation and accept feedback (Holmgren P4): checking the design against all 12 Holmgren principles catches blind spots before implementation begins.',
    how: [
      'Work through the Holmgren checklist with the full design in front of you.',
      'Flag any principle scoring less than 3 for a design review.',
      'Document the rationale for each score as a project record.',
    ],
  },
  'monitoring-records': EMPTY,
};
