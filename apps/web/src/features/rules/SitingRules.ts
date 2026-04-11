/**
 * SitingRules — rule definitions, types, and constants for the
 * design intelligence layer.
 *
 * Each rule checks a condition and returns violations with
 * severity, explanation, suggested fix, and data-source traceability.
 */

/* ------------------------------------------------------------------ */
/*  Severity & Category types                                          */
/* ------------------------------------------------------------------ */

export type RuleSeverity = 'error' | 'warning' | 'info';

export type RuleCategory =
  | 'setback' | 'slope' | 'solar' | 'privacy' | 'buffer'
  | 'water' | 'conflict' | 'access'
  | 'frost' | 'drainage' | 'flood' | 'wind'
  | 'circulation' | 'spiritual' | 'grazing' | 'ecological';

export type RuleWeightCategory =
  | 'ecological' | 'hydrological' | 'structural'
  | 'agricultural' | 'experiential' | 'spiritual';

/** Maps each granular RuleCategory to its weight slider category */
export const RULE_CATEGORY_TO_WEIGHT: Record<RuleCategory, RuleWeightCategory> = {
  setback: 'structural',
  slope: 'structural',
  solar: 'structural',
  privacy: 'experiential',
  buffer: 'experiential',
  water: 'hydrological',
  conflict: 'structural',
  access: 'structural',
  frost: 'agricultural',
  drainage: 'hydrological',
  flood: 'hydrological',
  wind: 'structural',
  circulation: 'experiential',
  spiritual: 'spiritual',
  grazing: 'agricultural',
  ecological: 'ecological',
};

/* ------------------------------------------------------------------ */
/*  Violation interface                                                */
/* ------------------------------------------------------------------ */

export interface RuleViolation {
  ruleId: string;
  severity: RuleSeverity;
  category: RuleCategory;
  title: string;
  /** Plain-language explanation — the "why it matters" text */
  description: string;
  /** Actionable fix suggestion */
  suggestion: string;
  affectedElementId: string;
  affectedElementName: string;
  needsSiteVisit: boolean;
  /** Weight category for priority slider adjustment */
  ruleWeightCategory: RuleWeightCategory;
  /** Environmental data layer or source that informed this rule */
  dataSource: string;
}

/* ------------------------------------------------------------------ */
/*  Constants — Setbacks (meters)                                      */
/* ------------------------------------------------------------------ */

export const SETBACK_RULES = {
  front: 15,
  side: 6,
  rear: 10,
  riparian: 30,
  wetland: 120,
  well_septic: 30,
  livestock_spiritual: 50,
  guest_privacy: 25,
};

/* ------------------------------------------------------------------ */
/*  Constants — Slope (degrees)                                        */
/* ------------------------------------------------------------------ */

export const SLOPE_RULES = {
  structure_max: 25,
  structure_warn: 15,
  road_max: 15,
  road_warn: 10,
};

export const GRAZING_SLOPE_RULES = {
  max: 15,
  warn: 10,
};

/* ------------------------------------------------------------------ */
/*  Constants — Solar orientation                                      */
/* ------------------------------------------------------------------ */

export const SOLAR_RULES = {
  preferred_aspects: ['S', 'SE', 'SW'],
  dwelling_types: ['cabin', 'earthship', 'yurt', 'greenhouse'],
};

/* ------------------------------------------------------------------ */
/*  Constants — Frost                                                  */
/* ------------------------------------------------------------------ */

export const FROST_RULES = {
  /** Crop types sensitive to frost pockets */
  sensitive_types: ['orchard', 'food_forest', 'vineyard', 'nursery'] as string[],
  /** Cold air drainage risk ratings that trigger warnings */
  risk_threshold: 'high' as const,
};

/* ------------------------------------------------------------------ */
/*  Constants — Flood zone                                             */
/* ------------------------------------------------------------------ */

export const FLOOD_SETBACK_RULES = {
  /** Structure types that must not be in flood zones */
  restricted_types: [
    'cabin', 'earthship', 'yurt', 'dwelling', 'prayer_space',
    'classroom', 'bathhouse', 'workshop', 'storage',
  ] as string[],
};

/* ------------------------------------------------------------------ */
/*  Constants — Drainage                                               */
/* ------------------------------------------------------------------ */

export const DRAINAGE_RULES = {
  /** Crop types that require good drainage */
  sensitive_types: ['orchard', 'food_forest', 'vineyard', 'garden_bed'] as string[],
  /** Drainage classes considered poor */
  poor_classes: ['poor', 'very poor', 'poorly drained', 'very poorly drained'] as string[],
};

/* ------------------------------------------------------------------ */
/*  Constants — Wind shelter                                           */
/* ------------------------------------------------------------------ */

export const WIND_SHELTER_RULES = {
  /** Minimum sheltered area % for dwelling comfort */
  min_shelter_pct: 20,
  dwelling_types: ['cabin', 'earthship', 'yurt', 'tent_glamping'] as string[],
};

/* ------------------------------------------------------------------ */
/*  Constants — Sacred / quiet zone buffers (meters)                   */
/* ------------------------------------------------------------------ */

export const SACRED_NOISE_BUFFER = {
  roads: 80,
  livestock: 50,
  infrastructure: 40,
};

/* ------------------------------------------------------------------ */
/*  Constants — Guest circulation                                      */
/* ------------------------------------------------------------------ */

export const CIRCULATION_RULES = {
  /** Path types that guests use */
  guest_path_types: ['arrival_sequence', 'pedestrian_path', 'quiet_route'] as string[],
  /** Path types for service/livestock that should not cross guest paths */
  service_path_types: ['service_road', 'farm_lane', 'animal_corridor', 'grazing_route'] as string[],
  /** Project types where circulation rules apply */
  applicable_project_types: ['retreat_center', 'moontrance'] as string[],
};

/* ------------------------------------------------------------------ */
/*  Constants — Flow accumulation for water features                   */
/* ------------------------------------------------------------------ */

export const FLOW_ACCUMULATION_RULES = {
  /** Minimum mean accumulation index for reliable water feature fill */
  min_accumulation: 15,
  /** Zone categories considered water features */
  water_zone_types: ['water_retention'] as string[],
  /** Minimum distance (m) from structures for spillway clearance */
  spillway_clearance: 30,
};

/* ------------------------------------------------------------------ */
/*  Rule catalog — metadata for the Catalog tab                        */
/* ------------------------------------------------------------------ */

export interface RuleCatalogEntry {
  ruleId: string;
  title: string;
  description: string;
  defaultSeverity: RuleSeverity;
  weightCategory: RuleWeightCategory;
  dataSource: string;
  category: RuleCategory;
}

export const RULE_CATALOG: RuleCatalogEntry[] = [
  // Structural
  { ruleId: 'slope-structure', title: 'Structure slope limit', description: 'Structures on slopes above 15\u00b0 face foundation challenges; above 25\u00b0 is prohibitive.', defaultSeverity: 'warning', weightCategory: 'structural', dataSource: 'Elevation Layer', category: 'slope' },
  { ruleId: 'slope-road', title: 'Road slope limit', description: 'Roads on slopes above 10\u00b0 are difficult; above 15\u00b0 requires engineering.', defaultSeverity: 'warning', weightCategory: 'structural', dataSource: 'Elevation Layer', category: 'slope' },
  { ruleId: 'solar-orientation', title: 'Solar orientation', description: 'Dwellings on south/SE-facing aspects capture more passive solar gain.', defaultSeverity: 'info', weightCategory: 'structural', dataSource: 'Elevation Layer', category: 'solar' },
  { ruleId: 'wind-shelter', title: 'Wind exposure', description: 'Dwellings in exposed areas face higher heating costs and structural wind load.', defaultSeverity: 'warning', weightCategory: 'structural', dataSource: 'Microclimate (Tier 3)', category: 'wind' },
  { ruleId: 'well-septic-distance', title: 'Well-septic separation', description: 'Wells and septic systems must maintain 30m minimum separation.', defaultSeverity: 'error', weightCategory: 'structural', dataSource: 'Feature Geometry', category: 'setback' },
  { ruleId: 'access-to-dwelling', title: 'Dwelling access road', description: 'Dwellings require vehicle access via main or secondary road.', defaultSeverity: 'warning', weightCategory: 'structural', dataSource: 'Feature Geometry', category: 'access' },
  { ruleId: 'no-access-paths', title: 'No access paths', description: 'Placed structures need at least one road or path for access.', defaultSeverity: 'warning', weightCategory: 'structural', dataSource: 'Feature Geometry', category: 'access' },
  { ruleId: 'no-emergency-access', title: 'Emergency access', description: 'Multiple structures need a designated emergency access route.', defaultSeverity: 'info', weightCategory: 'structural', dataSource: 'Feature Geometry', category: 'access' },
  { ruleId: 'dwelling-needs-water', title: 'Dwelling water source', description: 'Dwellings require water infrastructure (well or tank).', defaultSeverity: 'warning', weightCategory: 'structural', dataSource: 'Feature Geometry', category: 'water' },
  { ruleId: 'dwelling-needs-septic', title: 'Dwelling septic', description: 'Dwellings require a septic system.', defaultSeverity: 'warning', weightCategory: 'structural', dataSource: 'Feature Geometry', category: 'setback' },
  { ruleId: 'dwelling-needs-power', title: 'Dwelling power source', description: 'Dwellings need a solar array or generator for power.', defaultSeverity: 'info', weightCategory: 'structural', dataSource: 'Feature Geometry', category: 'conflict' },

  // Hydrological
  { ruleId: 'flood-zone', title: 'Flood zone placement', description: 'Structures in mapped flood zones risk damage and may be uninsurable.', defaultSeverity: 'error', weightCategory: 'hydrological', dataSource: 'Wetlands & Flood Layer', category: 'flood' },
  { ruleId: 'drainage-orchard', title: 'Orchard drainage', description: 'Orchards in poorly drained soil risk root rot and reduced yields.', defaultSeverity: 'warning', weightCategory: 'hydrological', dataSource: 'Soils Layer', category: 'drainage' },
  { ruleId: 'flow-accumulation', title: 'Water feature flow', description: 'Water features in low flow-accumulation areas may not fill reliably.', defaultSeverity: 'info', weightCategory: 'hydrological', dataSource: 'Watershed Derived (Tier 3)', category: 'water' },
  { ruleId: 'livestock-water-source', title: 'Livestock water', description: 'Livestock paddocks need water tank or well within reach.', defaultSeverity: 'error', weightCategory: 'hydrological', dataSource: 'Feature Geometry', category: 'water' },
  { ruleId: 'water-structure-clearance', title: 'Spillway clearance', description: 'Water features need minimum distance from structures for spillway safety.', defaultSeverity: 'warning', weightCategory: 'hydrological', dataSource: 'Feature Geometry', category: 'water' },

  // Agricultural
  { ruleId: 'frost-pocket', title: 'Frost pocket risk', description: 'Cold air pooling in terrain hollows increases frost events for sensitive crops.', defaultSeverity: 'warning', weightCategory: 'agricultural', dataSource: 'Terrain Analysis (Tier 3)', category: 'frost' },
  { ruleId: 'slope-grazing', title: 'Grazing slope limit', description: 'Paddocks on slopes above 15\u00b0 cause erosion and animal stress.', defaultSeverity: 'warning', weightCategory: 'agricultural', dataSource: 'Elevation Layer', category: 'grazing' },

  // Experiential
  { ruleId: 'guest-privacy-buffer', title: 'Guest privacy', description: 'Guest accommodations near dwellings need visual screening or separation.', defaultSeverity: 'info', weightCategory: 'experiential', dataSource: 'Feature Geometry', category: 'privacy' },
  { ruleId: 'guest-safe-livestock', title: 'Guest-safe livestock', description: 'Paddocks near guest areas need guest-safe buffer designation.', defaultSeverity: 'warning', weightCategory: 'experiential', dataSource: 'Feature Geometry', category: 'buffer' },
  { ruleId: 'guest-circulation-conflict', title: 'Guest route conflict', description: 'Guest arrival paths should not cross service or livestock routes.', defaultSeverity: 'warning', weightCategory: 'experiential', dataSource: 'Feature Geometry', category: 'circulation' },

  // Spiritual
  { ruleId: 'sacred-noise-road', title: 'Sacred zone road buffer', description: 'Spiritual zones need acoustic separation from roads.', defaultSeverity: 'warning', weightCategory: 'spiritual', dataSource: 'Feature Geometry', category: 'spiritual' },
  { ruleId: 'sacred-noise-livestock', title: 'Sacred zone livestock buffer', description: 'Spiritual zones need separation from livestock for noise and odor.', defaultSeverity: 'warning', weightCategory: 'spiritual', dataSource: 'Feature Geometry', category: 'spiritual' },
  { ruleId: 'sacred-noise-infrastructure', title: 'Sacred zone infrastructure buffer', description: 'Spiritual zones need separation from infrastructure noise sources.', defaultSeverity: 'info', weightCategory: 'spiritual', dataSource: 'Feature Geometry', category: 'spiritual' },
  { ruleId: 'prayer-qibla-alignment', title: 'Qibla alignment', description: 'Prayer spaces should be oriented toward the Qibla direction.', defaultSeverity: 'info', weightCategory: 'spiritual', dataSource: 'Qibla Library', category: 'spiritual' },
  { ruleId: 'livestock-spiritual-buffer', title: 'Livestock-spiritual buffer', description: 'Livestock paddocks and spiritual zones need 50m minimum buffer.', defaultSeverity: 'info', weightCategory: 'spiritual', dataSource: 'Feature Geometry', category: 'buffer' },

  // Ecological
  // (reserved for future rules — wetland encroachment, habitat corridor breaks, etc.)
];
