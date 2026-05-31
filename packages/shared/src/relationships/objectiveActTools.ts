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
 * constants/plan/catalogues/universal.ts. Absent ids fall through to
 * `STRATUM_ACT_TOOLS_DEFAULT`.
 *
 * Coverage principle (operator decision, 2026-05-31): every checklist item
 * that has a real, mountable map-draw tool (a `MapToolId` handled by
 * ObserveDrawHost / PlanDrawHost) is backed by a rail tool here. Pure-analysis,
 * decision, or data-import items (e.g. "identify slope gradients and aspects",
 * "assess total water demand", legal/title items) have NO draw tool by nature
 * and are intentionally left uncovered - noted as "gap:" against each objective.
 * Every tool id below is verified to mount a real draw tool; every id resolves
 * in the app-layer ACT_TOOL_CATALOG (guarded by objectiveActTools.test.ts).
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
