// objectiveActTools.ts
//
// Explicit per-objective map of which Act map tools a Plan tier objective
// "calls for". Drives the Act tier-shell bottom rail: selecting an objective
// reveals exactly the tools that objective needs, and field logs (harvest /
// water / livestock) become objective-conditional rather than always-on.
//
// This is net-new product data authored explicitly (not derived from the
// Observe-domain mapping or shown-all). It returns catalogue-id STRINGS only
// (e.g. 'contour', 'paddocks', 'harvest') so the file stays in packages/shared
// with no app-layer deps; the app-layer catalogue
// (apps/web/src/v3/act/tier-shell/actToolCatalog.ts) joins these ids to labels,
// icons, and the real MapToolId each arms.
//
// Two layers of resolution, mirroring objectiveObserveDomains.ts:
//   1. Per-objective override (`OBJECTIVE_ACT_TOOLS_OVERRIDE`) — the explicit,
//      ordered tool list for an objective.
//   2. Per-tier default (`STRATUM_ACT_TOOLS_DEFAULT`) — a defensive backstop
//      used when an objective carries no override.
//
// Order matters: the rail groups tools by category in catalogue order, but the
// override list documents intent per objective. Non-spatial objectives
// (s1-vision, s1-stewardship) resolve to `[]`, which the rail renders as an
// empty state.

import type {
  PlanStratumObjective,
  PlanStratumId,
} from '../schemas/plan/planStratumObjective.schema.js';

/**
 * Per-tier default tool sets — used when an objective has no override.
 * Conservative and small; the per-objective override is the primary surface.
 */
export const STRATUM_ACT_TOOLS_DEFAULT: Readonly<
  Record<PlanStratumId, readonly string[]>
> = {
  's1-project-foundation': [],
  's2-land-reading': ['contour', 'drainage', 'soil', 'vegetation', 'erosion'],
  's3-systems-reading': [
    'roads',
    'power',
    'water-lines',
    'gates',
    'fencing',
    'buildings',
  ],
  's4-foundation-decisions': ['roads', 'gates', 'fencing', 'buildings'],
  's5-system-design': ['water-lines', 'tanks', 'wells', 'water'],
  's6-integration-design': [
    'crops',
    'orchards',
    'paddocks',
    'beds',
    'compost',
    'harvest',
    'livestock',
  ],
  's7-phasing-resourcing': ['buildings', 'barns', 'tanks'],
} as const;

/**
 * Per-objective override. The explicit, ordered tool list each objective
 * "calls for", scoped to that objective's OWN checklist (not the whole
 * stratum). Keyed by the REAL objective ids in
 * constants/plan/catalogues/universal.ts (universal baseline) and
 * constants/plan/catalogues/silvopasture.ts (the silvopasture primary +
 * secondary livestock objectives, added 2026-06-01). Absent ids fall through
 * to `STRATUM_ACT_TOOLS_DEFAULT`.
 *
 * Coverage principle (operator decision, 2026-05-31): every checklist item
 * that has a real, mountable map-draw tool (a `MapToolId` handled by
 * ObserveDrawHost / PlanDrawHost) is backed by a rail tool here. Pure-analysis,
 * decision, or data-import items (e.g. "identify slope gradients and aspects",
 * "assess total water demand", legal/title items) have NO draw tool by nature
 * and are intentionally left uncovered - noted as "gap:" against each objective.
 * Every tool id below is verified to mount a real draw tool; every id resolves
 * in the app-layer ACT_TOOL_CATALOG (guarded by actToolCoverage.test.ts).
 */
export const OBJECTIVE_ACT_TOOLS_OVERRIDE: Readonly<
  Record<string, readonly string[]>
> = {
  // ---------- S1 — Project Foundation ----------
  // Vision/goals/capacity: all 7 items are text/decision capture, served by
  // form-arm tools that open a popup on click. No map-draw tool involved.
  's1-vision': [
    'purpose-statement',
    'success-criteria',
    'labour-inventory',
    'capital-budget',
    'constraints',
    'vision-classify',
    'assumptions',
  ],
  // Map property boundaries on a base layer is the only spatial item, but the
  // legacy 'boundary' measure tool is not mounted on the Act canvas, so there
  // is no draw tool to arm. gap: all items (title/boundary/easements/zoning/
  // water-rights/covenant/permits are legal + data-import).
  's1-boundaries': [],
  // Neighbours and stewards are placeable; authority/indigenous/conflict/comms
  // are non-spatial. gap: c2/c3/c5/c6.
  's1-stakeholders': ['neighbour-pin', 'steward'],

  // ---------- S2 — Land Reading ----------
  // Terrain & topography: contour map, elevation high points, drainage divides,
  // runoff, erosion. gap: c2 slope/aspect (analysis-only, no draw tool).
  's2-terrain': ['contour', 'high-point', 'drainage', 'runoff-path', 'erosion'],
  // Climate & sectors: sun/wind/fire sectors, frost pockets, hazard zones.
  // gap: c1 rainfall averages (data).
  's2-climate': [
    'sun-sector',
    'wind-sector',
    'fire-sector',
    'frost-pocket',
    'hazard-zone',
  ],
  // Existing ecology & habitat: vegetation communities, pasture/grassland,
  // wildlife corridors, water-dependent habitat. gap: c4 connectivity (analysis).
  's2-ecology': ['vegetation', 'pasture', 'wildlife-sector', 'watercourse'],
  // Existing infrastructure & access: full coverage of the 5 items.
  's2-infrastructure': [
    'roads',
    'buildings',
    'power',
    'water-lines',
    'gates',
    'fencing',
  ],

  // ---------- S3 — Systems Reading ----------
  // Water movement & hydrology: surface flows, drainage, catchment, springs,
  // runoff/infiltration. Full coverage.
  's3-hydrology': [
    'watercourse',
    'drainage',
    'catchment',
    'spring',
    'runoff-path',
  ],
  // Soil & subsurface: soil sampling at representative points, sampling
  // transect. gap: c4 drainage class (partly analysis).
  's3-soil': ['soil', 'transect'],

  // ---------- S4 — Foundation Decisions ----------
  // Project direction & feasibility is a pure decision objective. gap: all.
  's4-direction': [],
  // Water strategy: source options + storage. gap: c1 demand, c3 supply choice,
  // c6 conservation/drought (decisions).
  's4-water-strategy': ['catchment', 'spring', 'storage', 'swale', 'tanks', 'wells'],
  // Spatial framework & zones: zone polygons + buffer/transition rings.
  // gap: c4 conflict resolution, c6 confirmation (decisions).
  's4-zones': ['zone', 'buffer-ring'],

  // ---------- S5 — System Design ----------
  // Access & circulation: vehicle roads + pedestrian paths. gap: c4 movement
  // conflicts (analysis).
  's5-access': ['roads', 'path'],
  // Water harvesting & storage infrastructure: swales, storage, tanks,
  // distribution lines, sinks/overflow, wells. gap: c5 materials (decision).
  's5-water-infrastructure': [
    'swale',
    'storage',
    'tanks',
    'water-lines',
    'sink',
    'wells',
  ],
  // Soil improvement: compost, fertility units, monitoring baseline transect.
  // gap: c2/c3 application rates + machinery (decisions).
  's5-soil-improvement': ['compost', 'fertility-unit', 'transect'],

  // ---------- S6 — Integration Design ----------
  // Monitoring & observation: data-collection transects + field notes.
  // gap: indicators/frequency/responsibility/triggers (decisions).
  's6-monitoring': ['transect', 'note'],

  // ---------- S7 — Phasing & Resourcing ----------
  // Phase 1 plan and resource/capacity plan are non-spatial. gap: all.
  's7-phase1': [],
  's7-resource-plan': [],
  // Risk register: spatial risk areas can be flagged as hazard zones.
  // gap: likelihood/contingency/monitoring (register fields).
  's7-risk-register': ['hazard-zone'],

  // =====================================================================
  // SILVOPASTURE — primary + secondary livestock objectives
  // (constants/plan/catalogues/silvopasture.ts). Added 2026-06-01 to wire the
  // new livestock objectives to the legacy paddock / pasture / fence draw
  // tools: the coarse stratum defaults omit paddocks/pasture/fencing at the
  // relevant tiers, and the s6 default would surface crops/orchards/harvest on
  // monitoring objectives. There is NO yard / crush / race / trough draw tool,
  // so handling-facility and trough items are gap-noted throughout. Decision /
  // protocol / standard-setting objectives resolve to [] with a gap: note.
  // =====================================================================

  // ---------- S1 — Project Foundation (all non-spatial) ----------
  // gap: all — enterprise mix, land-improvement philosophy, and welfare
  // standards are species / intent / target / standard decisions, no map draw.
  'silv-s1-enterprise-mix': [],
  'silv-s1-land-improvement-philosophy': [],
  'silv-s1-animal-welfare': [],

  // ---------- S2 — Land Reading ----------
  // Pasture condition & forage species: map pasture communities + vegetation.
  // gap: c2 condition rating, c3/c4 species ID, c5 capacity (formula),
  // c6 seasonality (assessment/data).
  'silv-s2-pasture-condition': ['pasture', 'vegetation'],
  // Existing livestock infrastructure: inventory fencing/gates, supply lines,
  // laneways, shelters. gap: c2 yards, c3 troughs (no yard/trough draw tool).
  'silv-s2-livestock-infrastructure': [
    'fencing',
    'gates',
    'water-lines',
    'buildings',
    'barns',
    'path',
  ],
  // Surrounding landscape & vectors: flag off-site hazard areas + annotate.
  // gap: c1 surrounding land use (no off-site land-use tool), c2-c5 spray /
  // biosecurity / contamination / weed risks (analysis).
  'silv-s2-landscape-context': ['hazard-zone', 'note'],
  // Grazing history & animal impact: map compaction (soil), bare ground / weed
  // (vegetation), sampling transect. gap: c1 records, c5 recovery, c6 baseline.
  'silv-s2-grazing-history': ['soil', 'vegetation', 'transect'],

  // ---------- S3 — Systems Reading ----------
  // Stock water availability: map all source yields. gap: c1 demand (formula),
  // c3 gap analysis, c4 distribution fit, c6 max stocking (analysis).
  'silv-s3-stock-water-availability': [
    'watercourse',
    'spring',
    'tanks',
    'wells',
    'storage',
  ],
  // Soil compaction under grazing: penetrometer points + sampling transect.
  // gap: c3 correlation, c4 subsoil, c5 remediation (analysis/decision).
  'silv-s3-soil-compaction': ['soil', 'transect'],
  // Forage productivity & nutrition: DM-production sampling by zone. gap: c2
  // quality lab, c3 gaps, c4 supplementation, c5 capacity (formula).
  'silv-s3-forage-productivity': ['pasture', 'transect'],

  // ---------- S4 — Foundation Decisions ----------
  // Paddock layout & rotation: the core spatial objective — paddocks + fencing
  // + gates. gap: c3 rotation interval, c6 budget (decisions); c4/c5 carry
  // formulas (stocking density advisory, system capacity auto-satisfying).
  'silv-s4-paddock-layout': ['paddocks', 'fencing', 'gates'],
  // Stock water strategy: source + distribution network. gap: c3 trough points
  // (no trough tool), c4 density, c5 emergency, c6 capacity (decisions).
  'silv-s4-stock-water-strategy': [
    'watercourse',
    'spring',
    'wells',
    'tanks',
    'storage',
    'water-lines',
  ],
  // Forage & pasture improvement: target species zones, fertility, compost.
  // gap: c2 overseeding method, c4 weed control, c5 sequence, c6 targets.
  'silv-s4-forage-improvement': [
    'pasture',
    'vegetation',
    'fertility-unit',
    'compost',
  ],
  // Tree integration: tree placement (orchard tool) within pasture. gap: c1
  // species, c3 density, c4 grazing protection, c5 canopy, c6 fit (decisions).
  'silv-s4-tree-integration': ['orchards', 'vegetation'],
  // Animal health & veterinary protocol: non-spatial. gap: all — health
  // program, vet access, isolation requirements, mortality (decisions).
  'silv-s4-animal-health': [],

  // ---------- S5 — System Design ----------
  // Fencing & paddock infrastructure: subdivision fencing, gates, paddock
  // boundaries. gap: c2 type, c4 boundary spec, c6 sequence (decisions).
  'silv-s5-fencing': ['fencing', 'gates', 'paddocks'],
  // Stock water distribution: pipeline + storage. gap: c2 trough (no tool),
  // c3 valves, c4 pressure, c5 materials, c6 welfare (specs/confirmation).
  'silv-s5-stock-water-distribution': ['water-lines', 'tanks', 'storage'],
  // Shelters & handling: shade shelters + isolation pen (buildings/barns).
  // gap: c1 yards, c2 crush/race (no yard/crush draw tool), c5 welfare.
  'silv-s5-shelters-handling': ['buildings', 'barns'],
  // Tree planting & protection: planting locations (orchard) + protective
  // fencing. gap: c2 method, c4 irrigation, c5 sequence, c6 exclusion.
  'silv-s5-tree-planting': ['orchards', 'fencing'],

  // ---------- S6 — Integration Design ----------
  // Pasture monitoring: condition-scoring transects + field notes. gap: c2
  // frequency, c3 impact design, c4 recovery criteria (decisions).
  'silv-s6-pasture-monitoring': ['transect', 'note'],
  // Animal health monitoring: per-animal, non-spatial. gap: all — indicators,
  // frequency, triggers, records, calendar (decisions).
  'silv-s6-animal-health-monitoring': [],
  // Adaptive management: log management changes (note). gap: c1-c4 stocking /
  // rotation / destocking triggers + annual review (decisions).
  'silv-s6-adaptive-management': ['note'],

  // ---------- S7 — Phasing & Resourcing ----------
  // Livestock establishment: go/no-go sequencing confirmations; the fencing /
  // water / handling artifacts are drawn under the S4-S5 objectives. gap: all.
  'silv-s7-livestock-establishment': [],
  // Stocking buildup: stocking is assigned per paddock as condition improves.
  // gap: c2-c5 increase triggers / target / tree-fit (decisions tied to data).
  'silv-s7-stocking-buildup': ['paddocks'],
  // Enterprise financial viability: break-even is a formula (math only — no
  // advance-sale / CSRA framing). Non-spatial. gap: all.
  'silv-s7-financial-viability': [],
  // Pasture spelling & recovery: recovery-indicator transects + notes. gap:
  // c1 rest period, c3/c4 spelling protocols, c5 tree fit (decisions).
  'silv-s7-pasture-spelling': ['transect', 'note'],

  // ---------- Silvopasture SECONDARY (additive livestock layer) ----------
  // Livestock enterprise intent: rationale / species / labour decisions.
  // gap: all (non-spatial).
  'silv-sec-s1-livestock-intent': [],
  // Forage base & grazing capacity: map forage + baseline sampling. gap: c2
  // seasonality, c3 capacity (formula), c4 constraints, c5 weed/toxic.
  'silv-sec-s3-forage-survey': ['pasture', 'vegetation', 'transect'],
  // Grazing system & rotation framework: paddock/cell layout. gap: c1 method,
  // c3 graze/rest, c4 tree protection, c5 contingency, c6 capacity fit.
  'silv-sec-s4-grazing-design': ['paddocks', 'fencing', 'gates'],
  // Core stock infrastructure: water reticulation, fencing, shade/shelter.
  // gap: c3 yards/race (no tool), c5 sequencing (decision).
  'silv-sec-s4-stock-infrastructure': [
    'water-lines',
    'tanks',
    'fencing',
    'gates',
    'buildings',
    'barns',
  ],
  // Husbandry & welfare framework: non-spatial. gap: all — health, breeding,
  // welfare, halal handling, records (decisions).
  'silv-sec-s4-husbandry-framework': [],
};

/**
 * Resolve the ordered list of Act tool catalogue ids an objective calls for.
 * Per-objective override wins; tier default is the fallback. Returns `[]`
 * when no mapping exists (defensive — a brand-new objective without an entry
 * shows the rail's empty state rather than every tool).
 */
export function getObjectiveActTools(
  objective: PlanStratumObjective,
): readonly string[] {
  const override = OBJECTIVE_ACT_TOOLS_OVERRIDE[objective.id];
  if (override) return override;
  return STRATUM_ACT_TOOLS_DEFAULT[objective.stratumId] ?? [];
}
