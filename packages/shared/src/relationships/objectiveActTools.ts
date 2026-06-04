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
    'flow-connector',
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
    'flow-connector',
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

  // ---------- HOMESTEAD (primary-only, 15 objectives) ----------
  // Authored 2026-06-03 (Act-coverage audit remediation R1). Homestead is the
  // active vertical-slice primary; before this every hms-* objective fell
  // through to the coarse STRATUM_ACT_TOOLS_DEFAULT (e.g. animal-husbandry
  // surfaced only water-lines/tanks; the s1 needs survey surfaced nothing).
  // Every tool id below is grounded in a real hms-* checklist item AND a
  // mountable ACT_TOOL_CATALOG tool; pure strategy / decision / financial
  // objectives resolve to [] with a gap: note, mirroring s4-direction and
  // silv-s7-financial-viability. Candidate mappings — operator-reviewable like
  // the silvopasture set.

  // S1 — household needs & self-sufficiency: needs inventory / targets /
  // household agreement are text-decision; project-level vision capture is
  // served by the universal s1-vision form arms also present on every
  // homestead. gap: all.
  'hms-s1-household-needs': [],
  // S2 — household resource flows: c3 maps on-site organic outputs / greywater
  // available for fertility cycling (source->sink flow). gap: c1/c2/c4/c5/c6
  // consumption / waste / energy recording (no draw tool).
  'hms-s2-resource-flows': ['flow-connector'],
  // S2 — existing productive capacity: inventory existing plantings (vegetation
  // + standing orchard trees), water storage tanks, fertility/compost infra,
  // animal-infra fencing, soil condition. gap: c2 condition/yield (analysis).
  'hms-s2-productive-capacity': [
    'vegetation',
    'orchards',
    'tanks',
    'compost',
    'fencing',
    'soil',
  ],
  // S2 — surrounding landscape context & vectors: neighbour land-use/practice
  // pins, prevailing-wind drift sector, upstream watercourse, pest/weed
  // pressure hazard zones. gap: c6 opportunities (recording).
  'hms-s2-landscape-vectors': [
    'neighbour-pin',
    'wind-sector',
    'watercourse',
    'hazard-zone',
  ],
  // S3 — household water quality & potability: water-source field logs +
  // rainwater catchment surfaces. gap: c1/c2/c3 lab tests, c5 seasonality,
  // c6 potability status (analysis/recording).
  'hms-s3-water-quality': ['water', 'catchment'],
  // S4 — food production strategy: which foods / methods / targets / order are
  // decisions; spatial layout is drawn under hms-s5-food-zones-layout. gap: all.
  'hms-s4-food-production-strategy': [],
  // S4 — whole-homestead fertility strategy: c1 composting approach (compost),
  // c2 maps on-site organic inputs for cycling (flow). gap: c3 mulch, c4 animal
  // integration, c5 cover crop, c6 input-reduction (decisions).
  'hms-s4-fertility-strategy': ['compost', 'flow-connector'],
  // S4 — energy & shelter resilience strategy: heating / power / threshold
  // assessments and decisions; systems are designed under
  // hms-s5-energy-shelter-systems. gap: all.
  'hms-s4-energy-shelter-resilience': [],
  // S5 — food production zones & garden layout: the core spatial design — beds
  // (kitchen/annual/herb), crop areas, perennial orchards, production zones,
  // protected-growing building, compost integration, mulch paths.
  'hms-s5-food-zones-layout': [
    'zone',
    'beds',
    'crops',
    'orchards',
    'buildings',
    'compost',
    'path',
  ],
  // S5 — energy & shelter systems: stove/shelter buildings, backup-power
  // placement, woodshed/fuel-store barn. gap: c2 insulation spec (decision).
  'hms-s5-energy-shelter-systems': ['buildings', 'power', 'barns'],
  // S5 — animal husbandry infrastructure (conditional): housing barns, runs /
  // grazing paddocks, predator-exclusion fencing, manure compost, stock-water
  // reticulation + tanks.
  'hms-s5-animal-husbandry': [
    'barns',
    'paddocks',
    'fencing',
    'compost',
    'water-lines',
    'tanks',
  ],
  // S6 — self-sufficiency feedback loop: designs the provision / gap tracking
  // SYSTEM (record format, review rhythm) — non-spatial. gap: all.
  'hms-s6-self-sufficiency-feedback': [],
  // S7 — provision phasing: yield-speed / ecological-readiness sequencing
  // decisions. gap: all.
  'hms-s7-provision-phasing': [],
  // S7 — household budget & input reduction: ordinary spend-baseline /
  // reduction milestones (Amanah-clean, no financial product) — non-spatial.
  // gap: all.
  'hms-s7-budget-input-reduction': [],
  // S7 — adaptive management protocol: review cycle / decision triggers /
  // contingency — non-spatial. gap: all.
  'hms-s7-adaptive-management': [],

  // ---------- REGENERATIVE FARM (primary-only, 13 objectives) ----------
  // Authored 2026-06-03 (Act-coverage audit remediation R1, second type). Before
  // this every rf-* objective fell through to the coarse STRATUM_ACT_TOOLS_DEFAULT
  // — and the misfit was severe: the S3 nutrient-cycling / pest objectives showed
  // the s3-systems-reading access/utilities default (roads/power/gates/fencing),
  // the S4 fertility / biodiversity STRATEGY objectives showed roads/gates/fencing,
  // and the S5 fertility-system / windbreaks objectives showed the s5 water set
  // (water-lines/tanks/wells). Each tool id below is grounded in a real rf-*
  // checklist item AND a mountable ACT_TOOL_CATALOG tool; pure decision / strategy
  // / financial objectives resolve to [] with a gap: note, mirroring the homestead
  // and silvopasture sets. Candidate mappings — operator-reviewable.

  // S1 — enterprise mix & priorities: enterprise inventory, priority tiers,
  // interdependencies, sequencing, timelines, capacity fit — all decisions.
  // Project-level vision capture is the universal s1-vision form arms. gap: all.
  'rf-s1-enterprise-mix': [],
  // S2 — land health & degradation: c1 map erosion (sheet/rill/gully), c2/c7
  // compaction + soil loss/contamination sampling, c8 drainage problems
  // (waterlogging/salt scald/hardpan), c3 weed burden by zone (vegetation cover).
  // gap: c4 historical forensics, c5 landscape vectors (own objective below),
  // c6 land-use history, c9 prioritisation (research / decision).
  'rf-s2-land-health': ['erosion', 'soil', 'drainage', 'vegetation'],
  // S2 — surrounding landscape context: c1/c2 neighbour land-use + spray/runoff
  // risk pins, c5 landscape pest/weed pressure sources (hazard), c3 landscape
  // catchment + watercourse context, c4 wildlife corridors. gap: c6 opportunities
  // (recording).
  'rf-s2-landscape-context': [
    'neighbour-pin',
    'hazard-zone',
    'catchment',
    'watercourse',
    'wildlife-sector',
  ],
  // S3 — nutrient cycling & organic matter: c1/c5/c6 decomposer + OM variation +
  // biological indicators (soil sampling), c4 existing composting / fertility
  // infrastructure (compost + fertility-unit), c2 organic-matter inputs entering
  // the system (source->sink flow). gap: c3 loss pathways (analysis).
  'rf-s3-nutrient-cycling': ['soil', 'compost', 'fertility-unit', 'flow-connector'],
  // S3 — pest, disease & weed pressure: c1 map weed species by zone (vegetation),
  // c6 natural predator / beneficial presence (wildlife), c5 landscape pressure
  // sources (hazard). gap: c2 pest inventory (no draw tool), c3 disease history,
  // c4 ecological drivers, c7 prioritisation (record / decision).
  'rf-s3-pest-pressure': ['vegetation', 'wildlife-sector', 'hazard-zone'],
  // S4 — whole-farm fertility strategy: c2 design compost production system
  // (compost), c1 map on-site organic inputs for closed-loop cycling (flow).
  // Mirrors hms-s4-fertility-strategy. gap: c3 animal integration, c4 cover
  // crops, c5 input-reduction targets, c6 monitoring (decisions).
  'rf-s4-fertility-strategy': ['compost', 'flow-connector'],
  // S4 — biodiversity & habitat infrastructure strategy: a SITING + commitment
  // decision (design deferred to S5 per scopeNotes), and siting is spatial — c2
  // native-habitat zones (wild margins / corridors / riparian), c3 raptor &
  // predator habitat zones (wildlife), c4 minimum wild-zone commitments
  // (buffer/zone). gap: c1 readiness goals, c5 indicator species, c6 invasive
  // strategy (decisions).
  'rf-s4-biodiversity-strategy': ['zone', 'wildlife-sector', 'vegetation', 'buffer-ring'],
  // S5 — integrated fertility system: c1 compost production infrastructure
  // (compost), c2 compost application by zone (fertility-unit), c3 animal
  // integration rotation (paddocks), c4 cover-crop / green-manure rotation by
  // field block (crops), c6 nutrient monitoring protocol (transect). gap: c5
  // external-input substitution plan (decision).
  'rf-s5-fertility-system': ['compost', 'fertility-unit', 'paddocks', 'crops', 'transect'],
  // S5 — windbreaks, shelterbelts & plantings: c1 siting vs prevailing-wind
  // sectors (wind), c2/c7 multi-strata planting structure + layout (vegetation),
  // c4/c5 wildlife corridor connectivity + raptor habitat (wildlife), c6 wildfire
  // mitigation green buffer + firebreak (fire + buffer). gap: c3 species
  // selection, c8 coppicing / management (decisions).
  'rf-s5-windbreaks': [
    'vegetation',
    'wind-sector',
    'wildlife-sector',
    'fire-sector',
    'buffer-ring',
  ],
  // S6 — whole-farm biodiversity monitoring protocol: c2 design monitoring
  // transects / sampling zones (transect). gap: c1 indicators, c3 frequency,
  // c4 recording methods, c5 response triggers (decisions).
  'rf-s6-biodiversity-monitoring': ['transect'],
  // S6 — enterprise integration & feedback loops: the closed-loop core — c1/c2
  // waste-to-input matrix + verified closed loop (flow-connector), c4 fertility
  // transfer animal->crop zone (paddocks + crops). gap: c3 operational
  // sequences, c5 decision triggers, c6 calendar, c7 records (decisions).
  'rf-s6-enterprise-integration': ['flow-connector', 'paddocks', 'crops'],
  // S7 — enterprise sequencing & phasing logic: launch order, enabling
  // dependencies, revenue bridge, go/no-go — non-spatial decisions. gap: all.
  'rf-s7-enterprise-sequencing': [],
  // S7 — whole-farm cash flow staging: revenue / cost timeline, gap strategy,
  // viability thresholds — financial, Amanah-clean (c5 confirms no capital
  // formation / investor-structure content; no riba / advance-sale). gap: all.
  'rf-s7-cash-flow': [],

  // ---------- MARKET GARDEN (primary-only, 24 objectives) ----------
  // Authored 2026-06-03 (Act-coverage audit remediation R1, third type). Before
  // this every mgd-* objective fell through to the coarse STRATUM_ACT_TOOLS_DEFAULT
  // with the same misfit class seen on regen-farm: S3 water-quality / pest showed
  // the s3-systems access/utilities default, the S4 strategy objectives showed
  // roads/gates/fencing, and the S5 infrastructure objectives showed the s5 water
  // set rather than bed / compost / wash-pack tools. Each tool id below is grounded
  // in a real mgd-* checklist item AND a mountable ACT_TOOL_CATALOG tool; pure
  // decision / sales / financial / scheduling objectives resolve to [] with a gap:
  // note. The CSA Amanah scopeNotes flags on the s1 sales/channel objectives are
  // untouched — those objectives are off-site decisions and map to [] regardless.
  // Candidate mappings — operator-reviewable.

  // S1 — production targets & sales model: yield/revenue targets + sales-model
  // choice (incl. CSA, Amanah-flagged in scopeNotes) — an off-site decision.
  // Project-level vision capture is the universal s1-vision form arms. gap: all.
  'mgd-s1-production-targets-sales': [],
  // S1 — growing-system philosophy: no-dig / bio-intensive / scale ethos — a
  // design-philosophy decision, non-spatial. gap: all.
  'mgd-s1-growing-system-philosophy': [],
  // S1 — market channels & customer base: channel mix + CSA membership model
  // (Amanah-flagged) — an off-site market decision. gap: all.
  'mgd-s1-market-channels': [],
  // S2 — soil fertility & bed potential: soil sampling / fertility baseline
  // (soil), drainage + workability constraints (drainage), bed-suitability
  // sampling transects (transect). gap: aspect / history (record / decision).
  'mgd-s2-soil-fertility-bed-potential': ['soil', 'drainage', 'transect'],
  // S2 — water access & irrigation potential: watercourse + spring sources,
  // catchment context, existing storage capacity, bore / well points. gap:
  // licensing / quantity assessment (decisions).
  'mgd-s2-water-access-irrigation': [
    'watercourse',
    'spring',
    'catchment',
    'storage',
    'wells',
  ],
  // S2 — landscape vectors: neighbour land-use + spray/runoff risk pins, hazard
  // sources, prevailing-wind exposure (wind), catchment runoff context. gap:
  // opportunities (recording).
  'mgd-s2-landscape-vectors': ['neighbour-pin', 'hazard-zone', 'wind-sector', 'catchment'],
  // S3 — irrigation water quality & supply: source mapping (watercourse / spring)
  // and water-quality / supply observation logging (water). gap: testing results
  // (record / analysis).
  'mgd-s3-irrigation-water-quality': ['watercourse', 'spring', 'water'],
  // S3 — pest, disease & weed pressure: weed / volunteer cover by area
  // (vegetation), beneficial / predator presence (wildlife), landscape pressure
  // sources (hazard), soil-borne pathogen sampling (soil). gap: pest inventory /
  // history (record / decision).
  'mgd-s3-pest-disease-weed-pressure': ['vegetation', 'wildlife-sector', 'hazard-zone', 'soil'],
  // S4 — crop rotation & bed layout: lay out growing beds (beds), assign crop
  // families / rotation groups (crops), define rotation blocks / sections (zone).
  // gap: rotation calendar logic (decision).
  'mgd-s4-crop-rotation-bed-layout': ['beds', 'crops', 'zone'],
  // S4 — irrigation strategy: route mains / drip / sprinkler lines (water-lines),
  // define irrigation zones / blocks (zone). gap: scheduling logic (decision).
  'mgd-s4-irrigation-strategy': ['water-lines', 'zone'],
  // S4 — fertility strategy: compost production system (compost), amendment
  // application units (fertility-unit), green-manure / cover-crop rotation
  // (crops), on-site input cycling (flow). gap: input-reduction targets (decision).
  'mgd-s4-fertility-strategy': ['compost', 'fertility-unit', 'crops', 'flow-connector'],
  // S4 — IPM strategy: habitat / insectary plantings (vegetation), beneficial
  // habitat zones (wildlife), perimeter buffer / barrier strips (buffer-ring).
  // gap: thresholds / intervention ladder (decisions).
  'mgd-s4-ipm-strategy': ['vegetation', 'wildlife-sector', 'buffer-ring'],
  // S4 — post-harvest handling: site wash/pack + cold-storage structures
  // (buildings / barns), water / tank requirements (tanks). gap: throughput /
  // workflow design (decision).
  'mgd-s4-post-harvest-handling': ['buildings', 'barns', 'tanks'],
  // S5 — bed & growing infrastructure: build out beds (beds), assign crops
  // (crops), pathways between beds (path), protected-cropping / cover plantings
  // (vegetation), tunnels / greenhouse structures (buildings). gap: materials
  // spec (decision).
  'mgd-s5-bed-growing-infrastructure': ['beds', 'crops', 'path', 'vegetation', 'buildings'],
  // S5 — irrigation system build: install supply lines (water-lines), commission
  // irrigation zones (zone). gap: controller / scheduling (decision).
  'mgd-s5-irrigation-system': ['water-lines', 'zone'],
  // S5 — wash/pack & cold storage: build wash-pack + cold-store structures
  // (buildings / barns), holding tanks (tanks). gap: equipment list (decision).
  'mgd-s5-wash-pack-cold-storage': ['buildings', 'barns', 'tanks'],
  // S5 — fertility & composting infrastructure: compost production bays
  // (compost), amendment storage / application units (fertility-unit). gap:
  // recipe / process spec (decision).
  'mgd-s5-fertility-composting-infrastructure': ['compost', 'fertility-unit'],
  // S5 — propagation & nursery: nursery / propagation structure (buildings),
  // propagation beds / benches (beds). gap: schedule / inputs (decision).
  'mgd-s5-propagation-nursery': ['buildings', 'beds'],
  // S6 — crop & yield monitoring: log harvest records by bed / crop (harvest),
  // monitoring transects / sampling (transect). gap: yield-analysis protocol
  // (decision).
  'mgd-s6-crop-yield-monitoring': ['harvest', 'transect'],
  // S6 — sales & revenue tracking: revenue / margin tracking — financial,
  // Amanah-clean (ordinary book-keeping, no financial product). gap: all.
  'mgd-s6-sales-revenue-tracking': [],
  // S6 — adaptive management: review cycle / decision triggers / contingency —
  // non-spatial. gap: all.
  'mgd-s6-adaptive-management': [],
  // S7 — crop calendar: succession-planting sequences by crop (crops), frost /
  // season window constraints (frost-pocket), expected harvest windows
  // (harvest). gap: labour scheduling (decision).
  'mgd-s7-crop-calendar': ['crops', 'frost-pocket', 'harvest'],
  // S7 — financial viability: break-even / cash-flow budgeting — financial,
  // Amanah-clean (MGD-S7.5, no riba / advance-sale). gap: all.
  'mgd-s7-financial-viability': [],
  // S7 — season start-up readiness: pre-season soil readiness check (soil). gap:
  // task / supply checklist (record / decision).
  'mgd-s7-season-startup-readiness': ['soil'],

  // ---------- ORCHARD (25 primary + 5 secondary, 30 objectives) ----------
  // Authored 2026-06-03 (Act-coverage audit remediation R1, fourth type). Before
  // this every orch-* objective fell through to the coarse STRATUM_ACT_TOOLS_DEFAULT
  // with the familiar misfit (S3 rootzone/pest showed access-utilities, S4/S5
  // perennial design showed roads/fencing or the water-line set instead of
  // orchard / vegetation / frost tools). Each tool id below is grounded in a real
  // orch-* checklist item AND a mountable ACT_TOOL_CATALOG tool; pure selection /
  // succession / financial / sequencing decisions resolve to [] with a gap: note.
  // The 5 orch-sec-* objectives are standalone ADDITIVE objectives that surface
  // when orchard is a SECONDARY type (same situation that forced silvopasture-
  // secondary overrides), so they are wired here too. The 4 ORCHARD_SECONDARY_PATCHES
  // inject items into universal objectives (s4-water-strategy / s5-soil-improvement /
  // s2-ecology / s7-phase1) which already carry universal overrides — no work here.
  // Candidate mappings — operator-reviewable.

  // S1 — species & design philosophy: orchard archetype / ethos — a design
  // decision. Project vision capture is the universal s1-vision form arms. gap: all.
  'orch-s1-species-philosophy': [],
  // S1 — production intent: scale / yield / market intent — a decision. gap: all.
  'orch-s1-production-intent': [],
  // S1 — provenance & sourcing: nursery / rootstock procurement strategy — an
  // off-site sourcing decision. gap: all.
  'orch-s1-provenance-sourcing': [],
  // S2 — existing tree cover & canopy: map existing trees / canopy (vegetation),
  // any existing orchard blocks (orchards). gap: condition assessment (record).
  'orch-s2-tree-cover': ['vegetation', 'orchards'],
  // S2 — frost & cold-air drainage: frost-pocket siting, cold-air drainage paths
  // (drainage), aspect / solar exposure (sun-sector). gap: history (record).
  'orch-s2-frost-drainage': ['frost-pocket', 'drainage', 'sun-sector'],
  // S2 — landscape context: neighbour land-use + spray/drift risk pins, hazard
  // sources, prevailing-wind exposure (wind), catchment context, wildlife
  // corridors / pollinator habitat (wildlife). gap: opportunities (record).
  'orch-s2-landscape-context': [
    'neighbour-pin',
    'hazard-zone',
    'wind-sector',
    'catchment',
    'wildlife-sector',
  ],
  // S3 — root-zone depth & soil: soil sampling (soil), drainage / waterlogging
  // constraints (drainage), depth / suitability transects (transect). gap:
  // amendment needs (decision).
  'orch-s3-rootzone-depth': ['soil', 'drainage', 'transect'],
  // S3 — water availability: source mapping (watercourse / spring), catchment
  // context, existing storage capacity. gap: licensing / demand calc (decisions).
  'orch-s3-water-availability': ['watercourse', 'spring', 'catchment', 'storage'],
  // S3 — pest & disease pressure: host / weed cover (vegetation), beneficial /
  // predator presence (wildlife), landscape pressure sources (hazard), soil-borne
  // pathogen sampling (soil). gap: pest inventory / history (record / decision).
  'orch-s3-pest-disease-pressure': ['vegetation', 'wildlife-sector', 'hazard-zone', 'soil'],
  // S4 — species & cultivar mix: selection / proportion decision; the spatial
  // siting executes in S5 planting-layout. gap: all (selection).
  'orch-s4-species-mix': [],
  // S4 — water strategy: route supply lines (water-lines), size storage (storage).
  // gap: scheduling / volumes (decision).
  'orch-s4-water-strategy': ['water-lines', 'storage'],
  // S4 — guild & companion planting strategy: understorey / support-species
  // plantings (vegetation), beneficial / pollinator habitat (wildlife). gap:
  // species selection (decision).
  'orch-s4-guild-planting': ['vegetation', 'wildlife-sector'],
  // S4 — succession & replacement management: temporal management decision
  // (replanting cadence, generational succession) — non-spatial. gap: all.
  'orch-s4-succession-management': [],
  // S4 — pest & disease management strategy: habitat / insectary plantings
  // (vegetation), beneficial habitat (wildlife). gap: spray / IPM protocol
  // (decision).
  'orch-s4-pest-disease-management': ['vegetation', 'wildlife-sector'],
  // S5 — planting layout: lay out orchard blocks / rows (orchards), define
  // blocks / management zones (zone), site away from frost pockets (frost-pocket).
  // gap: spacing math (decision).
  'orch-s5-planting-layout': ['orchards', 'zone', 'frost-pocket'],
  // S5 — guild plan: place orchard guild blocks (orchards), understorey / support
  // plantings (vegetation). Carries legacyCardSectionId 'plan-guild-builder'.
  // gap: species list (decision).
  'orch-s5-guild-plan': ['orchards', 'vegetation'],
  // S5 — establishment irrigation: install supply lines (water-lines), holding
  // tanks for establishment watering (tanks). gap: emitter spec (decision).
  'orch-s5-establishment-irrigation': ['water-lines', 'tanks'],
  // S5 — access & harvest infrastructure: harvest / service paths (path), access
  // roads (roads), packing / storage structures (buildings). gap: equipment
  // (decision).
  'orch-s5-access-harvest': ['path', 'roads', 'buildings'],
  // S5 — tree protection: deer / stock fencing (fencing), guard / shelter buffer
  // rings (buffer-ring). gap: materials (decision).
  'orch-s5-tree-protection': ['fencing', 'buffer-ring'],
  // S6 — phenological monitoring: frost / bud-burst window tracking (frost-pocket),
  // harvest logging (harvest), monitoring transects (transect). gap: schedule
  // (decision).
  'orch-s6-phenological-monitoring': ['frost-pocket', 'harvest', 'transect'],
  // S6 — pest & disease monitoring: scouting transects (transect), beneficial /
  // predator monitoring (wildlife). gap: thresholds (decision).
  'orch-s6-pest-disease-monitoring': ['transect', 'wildlife-sector'],
  // S6 — adaptive management: review cycle / decision triggers — non-spatial.
  // gap: all.
  'orch-s6-adaptive-management': [],
  // S7 — planting & establishment sequencing: phasing / readiness gate — a
  // sequencing decision. gap: all.
  'orch-s7-planting-establishment': [],
  // S7 — succession plan: long-term generational replanting plan — a planning
  // decision. gap: all.
  'orch-s7-succession-plan': [],
  // S7 — financial viability: establishment-to-bearing cash-flow / break-even —
  // financial, Amanah-clean (ORCH-S7.6, no riba / advance-sale). gap: all.
  'orch-s7-financial-viability': [],

  // --- orchard SECONDARY (additive, surface when orchard is a secondary type) ---
  // S2 — climate & chill-hour fit: frost / chill window siting (frost-pocket),
  // heat / solar exposure (sun-sector), climate-hazard exposure (hazard). gap:
  // cultivar shortlisting (decision).
  'orch-sec-s2-climate-chill-fit': ['frost-pocket', 'sun-sector', 'hazard-zone'],
  // S4 — species & pollination partners: cultivar / rootstock / pollination-
  // partner selection — a selection decision. gap: all.
  'orch-sec-s4-species-pollination': [],
  // S5 — guild layout: place multilayer guild blocks (orchards), support-species
  // plantings (vegetation), guild management zones (zone). Carries
  // legacyCardSectionId 'plan-guild-builder'. gap: light-budget math (decision).
  'orch-sec-s5-guild-layout': ['orchards', 'vegetation', 'zone'],
  // S6 — perennial care commitment: pruning / IPM regime + labour commitment —
  // a management commitment / resourcing decision. gap: all.
  'orch-sec-s6-perennial-care': [],
  // S6 — harvest pathway: harvest logging (harvest), pack / storage / value-add
  // structures (buildings). gap: destination / value-add channel (decision).
  'orch-sec-s6-harvest-pathway': ['harvest', 'buildings'],

  // --- livestock_operation (primary) ---
  // Before this block the lvs-* objectives fell through STRATUM_ACT_TOOLS_DEFAULT
  // with the familiar misfit: S2/S3 forage & water reading surfaced the coarse
  // access-utilities / water-line sets instead of pasture / paddock / stock-water
  // tools, and S5 paddock / fencing / handling design surfaced roads/fencing
  // generically rather than the paddocks/gates/barns family. Mirrors the
  // silvopasture livestock vocabulary (paddocks, pasture, fencing, gates, barns).
  // S1 — enterprise vision: species / enterprise / production intent — a vision
  // decision. gap: all.
  'lvs-s1-enterprise-vision': [],
  // S1 — production goals: scale / output / capacity targets — a targets
  // decision. gap: all.
  'lvs-s1-production-goals': [],
  // S1 — welfare ethic: animal-welfare standard commitment — a values decision.
  // gap: all.
  'lvs-s1-welfare-ethic': [],
  // S2 — forage base: map forage / pasture communities by zone (pasture),
  // condition & weed/toxic species (vegetation), seasonal-availability sampling
  // (transect).
  'lvs-s2-forage-base': ['pasture', 'vegetation', 'transect'],
  // S2 — stock-water sources: inventory natural & built sources — streams
  // (watercourse), springs (spring), dams/ponds (storage), bores/wells (wells),
  // rainwater tanks (tanks), existing reticulation (water-lines).
  'lvs-s2-stock-water-sources': [
    'watercourse',
    'spring',
    'storage',
    'wells',
    'tanks',
    'water-lines',
  ],
  // S2 — existing infrastructure: inventory fencing (fencing), yards / sheds /
  // shelters (barns, buildings), gateways (gates), laneways (path).
  'lvs-s2-existing-infrastructure': ['fencing', 'barns', 'buildings', 'gates', 'path'],
  // S3 — carrying capacity: forage dry-matter productivity per zone (pasture),
  // seasonal-yield sampling (transect). gap: stocking-ceiling math (decision).
  'lvs-s3-carrying-capacity': ['pasture', 'transect'],
  // S3 — health baseline: regional disease / parasite pressure is desk research,
  // but soil / forage mineral-status sampling that drives deficiency planning is
  // a real sampling act (soil). gap: disease & vet-support survey (research).
  'lvs-s3-health-baseline': ['soil'],
  // S3 — predator & hazard risk: predator species by zone (wildlife), boundary /
  // neighbour-stock incursion vectors (neighbour-pin), climate & fire hazards
  // (hazard-zone, fire-sector).
  'lvs-s3-predator-risk': ['wildlife-sector', 'hazard-zone', 'neighbour-pin', 'fire-sector'],
  // S4 — species & breed: species / breed commitment — a selection decision.
  // gap: all.
  'lvs-s4-species-breed': [],
  // S4 — stocking rate: stocking rate / herd structure — a formula-driven
  // decision. gap: all.
  'lvs-s4-stocking-rate': [],
  // S4 — grazing system: continuous / rotational / cell grazing method — a
  // method decision (the spatial layout is sited in s5). gap: all.
  'lvs-s4-grazing-system': [],
  // S4 — stock-water strategy: source development (wells), reticulation approach
  // (water-lines), storage / header tanks (storage, tanks). gap: peak-demand math
  // (decision).
  'lvs-s4-stock-water-strategy': ['water-lines', 'storage', 'tanks', 'wells'],
  // S5 — paddock layout: subdivide paddocks / cells (paddocks), gateways (gates),
  // laneways (path), sacrifice / stand-off areas (zone).
  'lvs-s5-paddock-layout': ['paddocks', 'gates', 'path', 'zone'],
  // S5 — fencing & water: perimeter / subdivision fencing (fencing), reticulation
  // pipe runs (water-lines), troughs / header tanks (tanks), storage (storage).
  'lvs-s5-fencing-water': ['fencing', 'water-lines', 'tanks', 'storage'],
  // S5 — handling & shelter: yards / race / crush (barns), shade / wet / wind
  // shelter (buildings). gap: throughput design (decision).
  'lvs-s5-handling-shelter': ['barns', 'buildings'],
  // S5 — feed budget: month-by-month feed budget / conserved-feed & drought
  // reserve — a budgeting decision. gap: all.
  'lvs-s5-feed-budget': [],
  // S6 — herd health: health calendar / breeding plan / records — a protocol
  // decision. gap: all.
  'lvs-s6-herd-health': [],
  // S6 — nutrient cycling: dung distribution via grazing (paddocks), manure
  // capture / composting (compost), pasture recovery & overseeding (pasture),
  // nutrient-balance monitoring (transect), nutrient flow into cropping / orchard
  // (flow-connector).
  'lvs-s6-nutrient-cycling': ['paddocks', 'compost', 'pasture', 'transect', 'flow-connector'],
  // S6 — biosecurity: predator-deterrent fencing & night housing (fencing,
  // barns), boundary / shared-water / neighbour-stock controls (neighbour-pin).
  'lvs-s6-biosecurity': ['fencing', 'barns', 'neighbour-pin'],
  // S7 — herd build-up: sequence infrastructure before stock, phased build-up &
  // go/no-go gates — a sequencing decision. gap: all.
  'lvs-s7-herd-buildup': [],
  // S7 — break-even: establishment-to-cashflow break-even — financial,
  // Amanah-clean (ordinary break-even, no riba / advance-sale). gap: all.
  'lvs-s7-break-even': [],
  // S7 — marketing: products / processing / sales channels (incl. meat-share /
  // herd-share / CSA advance-subscription surfaced in the catalogue with the
  // bay-ma-laysa-indak Amanah scopeNotes flag, routed to Scholar Council) -- an
  // off-site marketing decision. gap: all.
  'lvs-s7-marketing': [],

  // --- livestock_operation SECONDARY (additive, surface when livestock is a secondary type) ---
  // The 3 LIVESTOCK_SECONDARY_PATCHES inject into universal objectives
  // (s4-water-strategy, s5-soil-improvement, s5-access) that already carry
  // overrides, so they need no entry here.
  // S1 — enterprise intent: species / enterprise / host-relationship intent — a
  // decision. gap: all.
  'lvs-sec-s1-enterprise-intent': [],
  // S3 — carrying-capacity fit: host grazeable forage by zone (pasture), weed /
  // toxic-plant presence (vegetation), seasonal-availability sampling (transect),
  // available-area delineation (zone).
  'lvs-sec-s3-carrying-capacity-fit': ['pasture', 'vegetation', 'transect', 'zone'],
  // S4 — species & stocking: species / stocking rate / grazing system & feed
  // budget — a selection / decision set. gap: all.
  'lvs-sec-s4-species-stocking': [],
  // S4 — stock infrastructure: fencing (fencing), handling yards / loading
  // (barns), shelter (buildings), reticulation confirmation (water-lines).
  'lvs-sec-s4-stock-infrastructure': ['fencing', 'barns', 'buildings', 'water-lines'],
  // S5 — integration timing: animal-impact sequencing & spatial flow — paddock /
  // cell footprint (paddocks), impact-window zones (zone), leader-follower
  // laneways (path).
  'lvs-sec-s5-integration-timing': ['paddocks', 'zone', 'path'],
  // S6 — health & biosecurity: predator-deterrent fencing & night housing
  // (fencing, barns), host-interface separation / quarantine zones (zone),
  // neighbour / shared-water vectors (neighbour-pin).
  'lvs-sec-s6-health-biosecurity': ['fencing', 'barns', 'zone', 'neighbour-pin'],
  // S6 — nutrient integration: map manure / nutrient flows into host crops /
  // orchard / pasture (flow-connector), manure as compost substrate (compost),
  // dung distribution & graze/rest/exclusion zones (paddocks, zone).
  'lvs-sec-s6-nutrient-integration': ['flow-connector', 'compost', 'paddocks', 'zone'],

  // --- conservation (primary) ---
  // Sixth per-type catalogue. Before this the con-* objectives fell through
  // STRATUM_ACT_TOOLS_DEFAULT: the S2/S3 ecological surveys (baseline condition,
  // degradation, invasive distribution, hydrology, wildlife, fire) surfaced the
  // coarse access-utilities / water-line sets instead of the vegetation /
  // wildlife-sector / erosion / fire-sector / transect ecology tools, and the S5
  // restoration design (planting, habitat, water-regime, fencing) surfaced
  // roads/fencing generically. Reuses the regen-farm / silvopasture ecology
  // vocabulary (vegetation, wildlife-sector, transect, erosion, fire-sector).
  // S1 -- conservation intent & outcome targets: reference state / target species
  // / habitat targets / timeframes -- a vision & target-setting decision. gap: all.
  'con-s1-conservation-intent': [],
  // S1 -- intervention philosophy & non-negotiables: passive vs active spectrum +
  // acceptable / prohibited methods -- a philosophy decision. gap: all.
  'con-s1-intervention-philosophy': [],
  // S1 -- land tenure & conservation covenant: legal instrument / covenant
  // selection -- an off-site legal decision. gap: all.
  'con-s1-tenure-covenant': [],
  // S2 -- baseline ecological condition: vegetation condition score (vegetation),
  // map condition zones high/mod/poor/degraded (zone), repeatable diversity
  // sampling (transect), function indicators birds/pollinators (wildlife-sector).
  'con-s2-baseline-condition': ['vegetation', 'zone', 'transect', 'wildlife-sector'],
  // S2 -- degradation history & causes: map legacy soil loss (erosion), compaction
  // / nutrient loading (soil), drainage alterations (drainage), chemical-residue /
  // contamination legacy (hazard-zone). gap: land-use-history research.
  'con-s2-degradation-history': ['erosion', 'soil', 'drainage', 'hazard-zone'],
  // S2 -- landscape ecological context: surrounding land use within 5km
  // (neighbour-pin), wildlife corridors & pest pressure (wildlife-sector), native
  // seed sources (vegetation), drinking-water catchment contamination (catchment).
  'con-s2-landscape-context': ['neighbour-pin', 'wildlife-sector', 'vegetation', 'catchment'],
  // S2 -- invasive species distribution: map invasive plants & weed fronts by zone
  // (vegetation), invasive / feral animals (wildlife-sector), invasion vectors
  // (hazard-zone). gap: priority ranking & control-window timing (decisions).
  'con-s2-invasive-distribution': ['vegetation', 'wildlife-sector', 'hazard-zone'],
  // S3 -- hydrology & water-regime degradation: map artificial drainage
  // (drainage), watercourse modifications (watercourse), drained / lost wetlands
  // (sink), diversion channels / altered flow paths (runoff-path).
  'con-s3-water-regime-degradation': ['drainage', 'watercourse', 'sink', 'runoff-path'],
  // S3 -- soil biology & seed bank: biological-activity & seed-bank / mycorrhizae
  // sampling (soil), degraded-vs-reference variation sampling (transect). gap:
  // passive-viability verdict (decision).
  'con-s3-soil-biology-seedbank': ['soil', 'transect'],
  // S3 -- wildlife presence, movement & habitat use: fauna survey + movement
  // corridors / breeding habitat / missing elements (wildlife-sector), camera /
  // call / transect survey method (transect).
  'con-s3-wildlife-presence': ['wildlife-sector', 'transect'],
  // S3 -- fire history & regime: map fuel load & fire risk by zone (fire-sector),
  // fire-adapted vegetation communities (vegetation). gap: historical-frequency
  // research & appropriate-regime verdict (decision).
  'con-s3-fire-history': ['fire-sector', 'vegetation'],
  // S4 -- restoration priority zones & sequence: rank zones by ecological leverage
  // + delineate bridgehead zones (zone). gap: cause-before-symptom sequencing &
  // resource allocation (decisions).
  'con-s4-restoration-priority-zones': ['zone'],
  // S4 -- native species selection & provenance: planting palette / provenance /
  // seed sources / succession sequence -- a species-selection decision (the
  // spatial planting plan is sited in s5). gap: all.
  'con-s4-native-species-provenance': [],
  // S4 -- pest & invasive species strategy: methods / prioritisation / sequence /
  // triggers / control windows -- a strategy decision (control infrastructure is
  // sited in s5). gap: all.
  'con-s4-pest-invasive-strategy': [],
  // S4 -- water regime restoration strategy: site drain-blocking locations
  // (drainage), wetland reinstatement scope (sink), watercourse realignment /
  // de-channelisation (watercourse). gap: consents (off-site).
  'con-s4-water-regime-restoration': ['drainage', 'sink', 'watercourse'],
  // S4 -- fire management strategy: identify fire-tool zones & exclusion zones
  // (fire-sector), exclusion / protection delineation (zone). gap: burn frequency
  // & permits (decisions / off-site).
  'con-s4-fire-management-strategy': ['fire-sector', 'zone'],
  // S5 -- native planting plan & revegetation: map planting zones by palette &
  // succession stage (vegetation, zone), establishment-support irrigation
  // (water-lines). gap: density specs (decision).
  'con-s5-native-planting-plan': ['vegetation', 'zone', 'water-lines'],
  // S5 -- pest & invasive control infrastructure: buffer treatment zones at
  // boundaries / vectors (buffer-ring), trap / bait-station network areas (zone),
  // access routes for checking & maintenance (path). gap: signage spec (decision).
  'con-s5-pest-control-infrastructure': ['buffer-ring', 'zone', 'path'],
  // S5 -- water regime restoration infrastructure: drain-blocking structures
  // (drainage), wetland reinstatement earthworks bunding/grading (sink, swale),
  // watercourse realignment / de-channelisation works (watercourse).
  'con-s5-water-regime-infrastructure': ['drainage', 'sink', 'swale', 'watercourse'],
  // S5 -- wildlife habitat infrastructure: place nest boxes / perches / refuge
  // structures (wildlife-sector), corridor planting to connect habitat patches
  // (vegetation).
  'con-s5-wildlife-habitat-infrastructure': ['wildlife-sector', 'vegetation'],
  // S5 -- fencing & exclusion: map stock / predator / boundary fencing (fencing),
  // gate placement for management access (gates), wildlife crossing points
  // (wildlife-sector).
  'con-s5-fencing-exclusion': ['fencing', 'gates', 'wildlife-sector'],
  // S6 -- ecological monitoring: lay out vegetation transects / quadrats / photo
  // points (transect), fauna survey methods (wildlife-sector). gap: frequency /
  // scoring / trigger thresholds (decisions).
  'con-s6-ecological-monitoring': ['transect', 'wildlife-sector'],
  // S6 -- pest & invasive monitoring: weed reinvasion mapping (vegetation), pest
  // animal index method (wildlife-sector), reinvasion-mapping method (transect).
  // gap: trigger thresholds & early-warning system (decisions).
  'con-s6-pest-monitoring': ['vegetation', 'wildlife-sector', 'transect'],
  // S6 -- fire management monitoring: fuel-load assessment by zone (fire-sector),
  // post-fire vegetation-recovery transects (transect). gap: fire-weather
  // thresholds & record-keeping (decisions).
  'con-s6-fire-monitoring': ['fire-sector', 'transect'],
  // S6 -- external relations & compliance: reporting schedules / consent-condition
  // tracking / neighbour communication / complaints -- an admin & reporting
  // protocol. gap: all.
  'con-s6-external-relations-compliance': [],
  // S7 -- phase 1 priorities: leverage ranking + cause-before-symptom sequencing
  // confirmations + go/no-go criteria -- a sequencing decision. gap: all.
  'con-s7-phase1-priorities': [],
  // S7 -- long-term timeline & milestones: 5 / 10 / 25-year ecological milestone
  // targets -- a long-term planning decision. gap: all.
  'con-s7-longterm-timeline': [],
  // S7 -- ongoing funding & stewardship resourcing: grants / carbon & biodiversity
  // credits / volunteer programme / annual requirement -- an off-site funding
  // decision. The carbon / biodiversity-credit surface (c3) is an environmental-
  // market instrument flagged for Scholar Council review (potential gharar in
  // credit trading); it is encoded as catalogue content, not actioned here, and
  // maps to [] regardless. gap: all.
  'con-s7-funding-resourcing': [],
  // S7 -- adaptive management protocol: annual review / decision triggers /
  // escalation / documentation -- a review-protocol decision. gap: all.
  'con-s7-adaptive-management': [],
  // S7 -- volunteer & community stewardship: programme structure / partnerships /
  // citizen science / safety / liability -- a programme & admin decision. gap: all.
  'con-s7-volunteer-stewardship': [],

  // --- off_grid (primary) ---
  // Seventh per-type catalogue. Before this the ofg-* objectives fell through
  // STRATUM_ACT_TOOLS_DEFAULT: the S2/S3 site & systems surveys (water sources,
  // energy potential, access road, fire/evacuation, water quality, food
  // conditions) and the S5 infrastructure design block (water / energy / shelter
  // / food / comms systems) surfaced the coarse access-utilities set instead of
  // the source / structure / climate-sector / production families this
  // life-safety-systems catalogue calls for. The grounded acts concentrate in
  // S2-S3 (surveys) and S5 (infrastructure); S1 philosophy/redundancy/site
  // decisions, the S4 strategy/redundancy band, S6 monitoring-protocol design,
  // and the S7 sequencing/logistics/habitation gates are decisions -> [].
  // Amanah: every off_grid objective is life-safety resilience (water, energy,
  // shelter, food, comms, emergency response); no sales channel, advance
  // purchase, or financing instrument -> nothing engages riba or gharar.
  // S1 -- resilience philosophy & independence targets: target-setting design
  // gate against which all systems are sized -- a philosophy decision. gap: all.
  'ofg-s1-resilience-philosophy': [],
  // S1 -- critical systems & redundancy: criticality classification + redundancy
  // / downtime requirements -- a classification decision. gap: all.
  'ofg-s1-critical-systems-redundancy': [],
  // S1 -- site selection & access strategy: assess access road quality &
  // constraints (roads), materials-delivery / emergency-vehicle turning & load
  // (parking). gap: legal access / easements / service-centre distance (research).
  'ofg-s1-site-selection-access': ['roads', 'parking'],
  // S2 -- water sources & year-round yield: map springs (spring), streams
  // (watercourse), rainfall catchment area (catchment), bore / well yield test
  // (wells). gap: per-person demand calc (analysis).
  'ofg-s2-water-sources-yield': ['spring', 'watercourse', 'catchment', 'wells'],
  // S2 -- energy generation potential: solar peak-sun / shading (sun-sector),
  // wind (wind-sector), micro-hydro flow & head (watercourse), biomass / wood
  // fuel capacity (vegetation). gap: demand & generation-gap calc (analysis).
  'ofg-s2-energy-generation-potential': ['sun-sector', 'wind-sector', 'watercourse', 'vegetation'],
  // S2 -- access road & emergency route: survey route surface & alternate route
  // (roads, path), seasonal flooding / snow / fire-access closure points
  // (hazard-zone). gap: bridge / culvert load rating (research).
  'ofg-s2-access-road-emergency-route': ['roads', 'path', 'hazard-zone'],
  // S2 -- fire risk & evacuation: fire risk & rating by zone (fire-sector), fuel
  // load / vegetation type (vegetation), evacuation routes & passability (path),
  // fire-prone-landscape proximity (hazard-zone). gap: response-time record.
  'ofg-s2-fire-risk-evacuation': ['fire-sector', 'vegetation', 'path', 'hazard-zone'],
  // S3 -- water quality & treatment: pin & annotate quality tests at each source
  // -- springs (spring), streams (watercourse), bore / well (wells). gap:
  // treatment-train selection (design, sited in s5).
  'ofg-s3-water-quality-treatment': ['spring', 'watercourse', 'wells'],
  // S3 -- energy demand vs. generation balance: critical / household demand,
  // monthly mapping, worst-case gap, storage requirement -- a quantification /
  // analysis objective; generation potential already mapped in s2. gap: all.
  'ofg-s3-energy-demand-balance': [],
  // S3 -- communications & emergency connectivity: pin nearest repeater /
  // emergency-services / neighbour reference points (neighbour-pin). gap: signal
  // coverage & technology-option assessment (invisible / decision).
  'ofg-s3-communications-connectivity': ['neighbour-pin'],
  // S3 -- food production potential & storage conditions: frost-free window
  // (frost-pocket), production-potential zones (zone). gap: reserve-weeks target
  // & preservation-capacity calc (analysis).
  'ofg-s3-food-production-storage-conditions': ['frost-pocket', 'zone'],
  // S4 -- water system strategy & redundancy: primary / backup source, storage
  // days, treatment type, manual fallback -- a redundancy-strategy decision; the
  // physical system is sited in s5. gap: all.
  'ofg-s4-water-system-redundancy': [],
  // S4 -- energy system strategy & redundancy: generation type, battery days,
  // backup generator sizing, load management -- a sizing / redundancy decision;
  // infrastructure sited in s5. gap: all.
  'ofg-s4-energy-system-redundancy': [],
  // S4 -- food security & storage strategy: reserve target, production targets,
  // preservation approach, emergency resupply -- a strategy decision; production
  // infrastructure sited in s5. gap: all.
  'ofg-s4-food-security-storage': [],
  // S4 -- emergency communications & response strategy: comms method, contact
  // list, medical / fire protocols, resident training (HARD GATE) -- a protocol
  // & training decision; comms infrastructure sited in s5. gap: all.
  'ofg-s4-emergency-comms-response': [],
  // S4 -- shelter resilience & thermal performance strategy: thermal standard,
  // primary / backup heating, insulation, fuel reserve -- a performance-spec
  // decision; shelter infrastructure sited in s5. gap: all.
  'ofg-s4-shelter-thermal-performance': [],
  // S5 -- water system infrastructure: bore pump / spring capture (wells,
  // spring), rainwater tank array (tanks), pressurised distribution (water-lines).
  // gap: manual-fill & local-repairability specs (spec detail).
  'ofg-s5-water-system-infrastructure': ['wells', 'spring', 'tanks', 'water-lines'],
  // S5 -- energy system infrastructure: solar array orientation / shading
  // (sun-sector), inverter / charge-controller / critical-load circuit (power),
  // battery & generator housing (buildings), generator fuel storage (tanks).
  'ofg-s5-energy-system-infrastructure': ['sun-sector', 'power', 'buildings', 'tanks'],
  // S5 -- shelter & thermal infrastructure: the dwelling envelope & insulation
  // (dwellings), passive solar gain (sun-sector), heating fuel storage (tanks).
  // gap: airtightness / thermal-bridging construction specs (spec detail).
  'ofg-s5-shelter-thermal-infrastructure': ['dwellings', 'sun-sector', 'tanks'],
  // S5 -- food production & storage infrastructure: garden beds (beds), orchard
  // (orchards), animal infrastructure (paddocks), root cellar / cool room /
  // preservation building (buildings). gap: inventory-tracking system (admin).
  'ofg-s5-food-production-infrastructure': ['beds', 'orchards', 'paddocks', 'buildings'],
  // S5 -- communications & emergency infrastructure: comms / first-aid / fire
  // building (buildings), antenna & backup power supply (power), assembly point
  // & signage (note). gap: PLB activation protocol (procedure).
  'ofg-s5-communications-emergency-infrastructure': ['buildings', 'power', 'note'],
  // S6 -- systems performance & redundancy monitoring: indicators (tank / battery
  // / fuel / food-reserve), thresholds, frequency, log format -- a monitoring-
  // protocol design attached to already-sited features. gap: all.
  'ofg-s6-systems-performance-monitoring': [],
  // S6 -- emergency preparedness & response monitoring: seasonal access / comms /
  // contact / fire-risk re-assessment & drill schedules -- a scheduling protocol;
  // the road & fire risk were mapped in s2. gap: all.
  'ofg-s6-emergency-preparedness-monitoring': [],
  // S6 -- adaptive management protocol: seasonal review, decision triggers,
  // failure response, 3-year review (Principle 9 exception) -- a review-protocol
  // decision. gap: all.
  'ofg-s6-adaptive-management': [],
  // S7 -- systems establishment sequence: install / commission order + per-system
  // go/no-go hard gates (HARD GATE: no habitation before water / energy / shelter
  // / comms pass) -- a sequencing decision. gap: all.
  'ofg-s7-systems-establishment-sequence': [],
  // S7 -- resourcing & supply chain: materials calendar, lead times, resupply
  // schedule, minimum critical inventory -- a logistics / scheduling decision
  // (Amanah-clean: no financing instrument). gap: all.
  'ofg-s7-resourcing-supply-chain': [],
  // S7 -- phased habitation: habitability thresholds (HARD GATE, independently
  // verified), temporary living, cohort go/no-go, resident acceptance -- a
  // sequencing / gate decision. gap: all.
  'ofg-s7-phased-habitation': [],

  // ----------------------------------------------------------- AGRITOURISM (34)
  // Eighth per-type catalogue wired (audit remediation R1), after off_grid.
  // 34 ag-* primary objectives (29 v1.0 + 5 eco-resort / glamping extension
  // committed out-of-band 2026-06-03: AG-S3.7, AG-S4.9, AG-S5.9, AG-S5.10,
  // AG-S7.8). No standalone secondary layer, no patches -> primary-only wiring.
  // Before this the objectives fell through STRATUM_ACT_TOOLS_DEFAULT: the S2/S3
  // arrival / hospitality / sensory / emergency / carrying-capacity surveys and
  // the S5 accommodation / dining / sanitation / dispersed-siting / servicing
  // design block surfaced the coarse access-utilities set instead of the access
  // (roads/parking/gates/path), structure (buildings/dwellings/barns/tanks),
  // climate-sector (fire/wind-sector/hazard-zone) and zoning (zone/buffer-ring/
  // fencing) families the checklists call for. Grounded-candidate method: every
  // id maps to a real checklist item AND exists in ACT_TOOL_CATALOG; pure
  // decision / financial / scheduling / protocol objectives get an intentional [].
  // Amanah: AG-S4.8 (revenue model) carries the membership / season-pass Amanah
  // scopeNote (bay` ma laysa `indak / gharar -- membership-benefit-not-advance-
  // purchase, routed to Scholar Council) IN THE CATALOGUE; the Act layer maps it
  // to [] so NO act surface engages the sales instrument -- the correct outcome,
  // mirroring market_garden's CSA-flagged s1 and livestock's CSA-flagged s7.
  // 19 tool-bearing + 15 intentional [] = 34.
  //
  // S1 -- vision / capacity / regulatory: experience proposition, guest-capacity
  // numbers, permits & licensing -- foundation decisions, no spatial act. gap: all.
  'ag-s1-experience-vision': [],
  'ag-s1-visitor-capacity': [],
  'ag-s1-regulatory-framework': [],
  // S2 -- arrival experience: road quality / signage, parking, entry gate &
  // driveway, arrival-route safety hazards. roads/parking/gates/path + hazard-zone.
  'ag-s2-arrival-experience': ['roads', 'parking', 'gates', 'path', 'hazard-zone'],
  // S2 -- existing hospitality infra: inventory accommodation (rooms / cabins /
  // outbuildings), kitchen, bathrooms, gathering spaces. buildings/dwellings/barns.
  'ag-s2-hospitality-infra': ['buildings', 'dwellings', 'barns'],
  // S2 -- surrounding landscape & vectors: map land uses within 2km, drinking-
  // water catchment contamination, spray-drift / nuisance, visual / noise notes.
  'ag-s2-landscape-context': ['neighbour-pin', 'catchment', 'hazard-zone', 'note'],
  // S2 -- seasonal operational patterns: peak / off-peak season, farm-guest
  // calendar conflicts -- a scheduling read, no spatial act. gap: all.
  'ag-s2-seasonal-patterns': [],
  // S3 -- guest water & sanitation demand: source yield for combined farm+guest
  // demand, storage. source tools + storage (sanitation septic has no tool).
  'ag-s3-water-sanitation-demand': ['spring', 'watercourse', 'wells', 'storage'],
  // S3 -- noise / privacy / sensory environment: visual amenity & screening from
  // guest areas, odour-source drift relative to guest zones, recorded notes.
  'ag-s3-sensory-environment': ['note', 'vegetation', 'wind-sector'],
  // S3 -- emergency access & safety: emergency-vehicle & evacuation routes, fire
  // risk, terrain / machinery / animal hazards. roads/path + fire-sector/hazard-zone.
  'ag-s3-emergency-access': ['roads', 'path', 'fire-sector', 'hazard-zone'],
  // S3 -- existing food-production capacity: inventory gardens / orchards /
  // animals + storage infra feeding the guest dining vision.
  'ag-s3-food-production-capacity': ['crops', 'orchards', 'beds', 'paddocks', 'buildings'],
  // S3 -- ecological carrying capacity under visitor pressure (eco-resort ext):
  // soil compaction, trail erosion, sensitive habitats / wildlife corridors to
  // exclude or buffer, protected vs sacrificial ground.
  'ag-s3-ecological-carrying-capacity': ['soil', 'erosion', 'wildlife-sector', 'buffer-ring', 'zone'],
  // S4 -- guest zones & circulation strategy: accessible zones, circulation
  // route, hard boundaries between guests and farm operations.
  'ag-s4-circulation-strategy': ['zone', 'path', 'buffer-ring', 'fencing'],
  // S4 -- hospitality service model: accommodation / dining / programming offer
  // & service standards -- a service-design decision, no spatial act. gap: all.
  'ag-s4-service-model': [],
  // S4 -- farm-to-guest food strategy: enterprise-to-menu mapping, sourcing &
  // preparation -- a strategy decision (production sited in S3.6 survey). gap: all.
  'ag-s4-food-strategy': [],
  // S4 -- safety, emergency & compliance framework: fire-evacuation plan, hazard-
  // identification map. fire-sector/hazard-zone/path (food-safety / liability admin
  // have no spatial act).
  'ag-s4-safety-compliance': ['fire-sector', 'hazard-zone', 'path'],
  // S4 -- booking, pricing & revenue model: pricing / booking terms / viability +
  // the membership / season-pass instrument (c7-c11). A financial / sales decision
  // -> []; the Amanah membership flag lives in the catalogue scopeNote (bay` ma
  // laysa `indak / gharar, Scholar Council), and mapping to [] keeps any act
  // surface clear of the sales instrument. gap: all (intentional, Amanah-aware).
  'ag-s4-revenue-model': [],
  // S4 -- guest-to-production biosecurity & buffers (eco-resort ext): buffer
  // distances / physical separation, arrival-hygiene crossing points, contamination-
  // pathway zoning. buffer-ring/fencing/gates/zone.
  'ag-s4-biosecurity-zoning': ['buffer-ring', 'fencing', 'gates', 'zone'],
  // S5 -- guest accommodation & retreat infra: accommodation layout (rooms /
  // cabins / glamping). dwellings/buildings.
  'ag-s5-accommodation': ['dwellings', 'buildings'],
  // S5 -- guest dining & food-service infra: farm kitchen, dining area, cool room
  // / dry store. buildings/barns.
  'ag-s5-dining-infra': ['buildings', 'barns'],
  // S5 -- guest programming & activity infra: tour route & walking trails,
  // workshop / demonstration & outdoor event spaces. path/buildings/zone.
  'ag-s5-programming-infra': ['path', 'buildings', 'zone'],
  // S5 -- guest bathroom & sanitation infra: bathroom layout, hot-water system,
  // waste reticulation. buildings/tanks/water-lines.
  'ag-s5-sanitation-infra': ['buildings', 'tanks', 'water-lines'],
  // S5 -- visitor safety & emergency infra: evacuation route marking, fire
  // equipment, emergency-vehicle access points, hazard signage.
  'ag-s5-safety-infra': ['path', 'fire-sector', 'roads', 'hazard-zone'],
  // S5 -- dispersed low-impact siting & landscape integration (eco-resort ext):
  // locate units against the carrying-capacity map, inter-unit spacing, low-impact
  // foot-path access. dwellings/zone/path/buffer-ring.
  'ag-s5-dispersed-siting': ['dwellings', 'zone', 'path', 'buffer-ring'],
  // S5 -- decentralised servicing & dark-sky / quiet (eco-resort ext): point-of-
  // use rainwater capture & reticulation, off-grid power. tanks/water-lines/
  // catchment/power.
  'ag-s5-decentralised-servicing': ['tanks', 'water-lines', 'catchment', 'power'],
  // S6 -- visitor experience feedback & quality monitor: survey / satisfaction /
  // repeat-visit metrics -- a monitoring-protocol design, no field act. gap: all.
  'ag-s6-experience-feedback': [],
  // S6 -- external relations & compliance monitor: compliance calendar, neighbour
  // & complaint relations -- an admin protocol, no spatial act. gap: all.
  'ag-s6-compliance-monitoring': [],
  // S6 -- farm-to-guest integration loop: track farm produce used in guest dining
  // each season -> a harvest field log.
  'ag-s6-food-integration': ['harvest'],
  // S6 -- capacity & operational load monitor: actual-vs-intended guest numbers,
  // infrastructure-load & staff-workload indicators, threshold triggers -- a
  // monitoring-protocol design, no field act. gap: all.
  'ag-s6-load-monitoring': [],
  // S7 -- hospitality staffing & training: roles, certifications, recruitment
  // timeline -- an HR decision, no spatial act. gap: all.
  'ag-s7-staffing-training': [],
  // S7 -- booking system & reservation infra: platform / payment / confirmation
  // process -- a systems decision, no spatial act. gap: all.
  'ag-s7-booking-system': [],
  // S7 -- phased launch & financial viability: soft-launch hard gate, revenue
  // ramp, go/no-go -- a phasing / financial decision, no spatial act. gap: all.
  'ag-s7-phased-launch': [],
  // S7 -- adaptive management protocol: annual review, decision triggers,
  // documentation -- a review protocol, no spatial act. gap: all.
  'ag-s7-adaptive-management': [],
  // S7 -- seasonal-occupancy resilience (eco-resort ext): off-season maintenance,
  // staffing cycle, cash-flow buffering -- operational planning (explicitly NOT a
  // sales surface per its scopeNote), no spatial act. gap: all.
  'ag-s7-seasonal-resilience': [],
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
