/**
 * Ecosystem Services Valuation + Wetland Function — Sprint BE
 *
 * Pure frontend computation of annual ecosystem service value ($/ha/yr) for a
 * site, derived from already-fetched land cover, wetland, soil, and canopy
 * layers plus Sprint R carbon sequestration rate.
 *
 * Methodology: simplified InVEST-style per-biome ESV coefficients drawn from
 * de Groot et al. (2012) Ecosystem Services and Costs of Land-Use Change and
 * Costanza et al. (2014) updated global ESV synthesis. Values are USD 2020
 * equivalents and intended for relative comparison rather than absolute
 * market valuation.
 *
 * Wetland Function (Cowardin-style): lightweight classifier from wetland
 * cover fraction + drainage class + soils organic matter, mapping to the
 * five Cowardin (1979) hydrogeomorphic categories used by the USFWS NWI.
 *
 * References:
 *   - de Groot, R. et al. (2012) — Ecosystem Service Values update
 *   - Costanza, R. et al. (2014) — Changes in global ecosystem services
 *   - Cowardin, L. (1979) — Classification of Wetlands and Deepwater Habitats
 *   - Natural Capital Project InVEST 3.14 (model simplifications)
 */

export type WetlandFunctionClass =
  | 'Palustrine (forested)'
  | 'Palustrine (emergent)'
  | 'Palustrine (shrub)'
  | 'Riverine'
  | 'Lacustrine'
  | 'None';

export interface EcosystemValuation {
  servicesUsdHaYr: {
    carbonStorage: number;
    pollination: number;
    waterRegulation: number;
    waterQuality: number;
    habitatProvision: number;
    erosionControl: number;
    recreation: number;
  };
  totalUsdHaYr: number;
  totalUsdYr: number | null; // total × site acreage (if provided)
  dominantService: keyof EcosystemValuation['servicesUsdHaYr'];
  narrative: string;
}

export interface WetlandFunction {
  class: WetlandFunctionClass;
  functionScore: number; // 0–100 composite of water quality, habitat, flood attenuation
  primaryFunctions: string[];
  narrative: string;
}

/* ------------------------------------------------------------------ */
/*  Ecosystem Service Valuation (InVEST / de Groot style)              */
/* ------------------------------------------------------------------ */

export function computeEcosystemValuation(inputs: {
  treeCanopyPct: number | null;
  wetlandPct: number | null;
  riparianBufferM: number | null;
  organicMatterPct: number | null;
  isCropland: boolean | null;
  carbonSeqTonsCO2HaYr: number | null;
  propertyAcres: number | null;
  socialCostCarbonUsdPerTon?: number; // default $50 (conservative)
}): EcosystemValuation {
  const canopy = (inputs.treeCanopyPct ?? 0) / 100;
  const wetland = (inputs.wetlandPct ?? 0) / 100;
  const riparian = Math.min(1, (inputs.riparianBufferM ?? 0) / 30); // 30 m = full buffer
  const om = inputs.organicMatterPct ?? 0;
  const isCrop = inputs.isCropland === true;
  const scc = inputs.socialCostCarbonUsdPerTon ?? 50;

  // Carbon storage — social cost × sequestration flux
  const carbonStorage = Math.round((inputs.carbonSeqTonsCO2HaYr ?? 0) * scc);

  // Pollination — forest + grassland + cropland edge effect (de Groot temperate biome ~$100/ha forest)
  const pollination = Math.round(
    canopy * 120 +                                // forest pollinator habitat
    (isCrop ? 250 * canopy : 0) +                 // adjacent cropland pollination uplift
    (1 - canopy - wetland) * (isCrop ? 0 : 60),   // grassland/pasture baseline
  );

  // Water regulation (flood attenuation + baseflow) — wetlands dominate
  const waterRegulation = Math.round(
    wetland * 5000 +                              // wetland flood buffering
    canopy * 220 +                                // forest interception
    riparian * wetland * 1500,                    // riparian wetland synergy
  );

  // Water quality regulation — nutrient removal, sediment trapping
  const waterQuality = Math.round(
    wetland * 2500 +
    riparian * 1800 +
    (om > 3 ? 200 : om > 2 ? 100 : 0),            // healthy soils filter
  );

  // Habitat provision / biodiversity support
  const habitatProvision = Math.round(
    canopy * 500 +
    wetland * 3000 +
    (1 - canopy - wetland - (isCrop ? 1 : 0)) * (isCrop ? 0 : 180),
  );

  // Erosion & soil formation
  const erosionControl = Math.round(
    canopy * 300 +
    (1 - canopy - wetland) * 80 +
    (om > 3 ? 250 : om > 2 ? 150 : 50),
  );

  // Recreation / aesthetic
  const recreation = Math.round(
    canopy * 280 +
    wetland * 600 +
    (canopy + wetland > 0.1 ? 200 : 0),
  );

  const services = {
    carbonStorage,
    pollination,
    waterRegulation,
    waterQuality,
    habitatProvision,
    erosionControl,
    recreation,
  };
  const totalUsdHaYr = Object.values(services).reduce((a, b) => a + b, 0);
  const totalUsdYr = inputs.propertyAcres != null
    ? Math.round(totalUsdHaYr * (inputs.propertyAcres / 2.471)) // acres → ha
    : null;

  // Dominant service
  let dominantService: keyof typeof services = 'carbonStorage';
  let maxVal = -Infinity;
  for (const [k, v] of Object.entries(services) as [keyof typeof services, number][]) {
    if (v > maxVal) { maxVal = v; dominantService = k; }
  }

  const narrative = buildEsvNarrative(totalUsdHaYr, dominantService, wetland, canopy);

  return {
    servicesUsdHaYr: services,
    totalUsdHaYr,
    totalUsdYr,
    dominantService,
    narrative,
  };
}

function buildEsvNarrative(
  total: number,
  dominant: keyof EcosystemValuation['servicesUsdHaYr'],
  wetland: number,
  canopy: number,
): string {
  const totalTier =
    total > 8000 ? 'very high' :
    total > 4000 ? 'high' :
    total > 1500 ? 'moderate' : 'modest';
  const dominantLabel: Record<keyof EcosystemValuation['servicesUsdHaYr'], string> = {
    carbonStorage: 'carbon sequestration',
    pollination: 'pollination services',
    waterRegulation: 'flood attenuation and baseflow',
    waterQuality: 'water quality regulation',
    habitatProvision: 'habitat provision and biodiversity support',
    erosionControl: 'erosion control',
    recreation: 'recreation and aesthetic value',
  };
  const context =
    wetland > 0.1 ? 'Wetlands drive most of the ecosystem service value — preserve hydrology.' :
    canopy > 0.3 ? 'Forest canopy is the primary value driver — prioritize retention.' :
    'Open/cultivated land — values are modest; adding hedgerows, buffers, or pond could raise ESV significantly.';
  return `Site provides ${totalTier} ecosystem service value (~$${total.toLocaleString()}/ha/yr), led by ${dominantLabel[dominant]}. ${context}`;
}

/* ------------------------------------------------------------------ */
/*  Wetland Function (Cowardin-style classifier)                      */
/* ------------------------------------------------------------------ */

export function classifyWetlandFunction(inputs: {
  wetlandPct: number | null;
  nearestStreamM: number | null;
  drainageClass: string | null;
  treeCanopyPct: number | null;
  organicMatterPct: number | null;
  riparianBufferM: number | null;
}): WetlandFunction {
  const wetland = inputs.wetlandPct ?? 0;
  if (wetland < 1) {
    return {
      class: 'None',
      functionScore: 0,
      primaryFunctions: [],
      narrative: 'No significant wetland coverage detected at this site.',
    };
  }
  const drainage = (inputs.drainageClass ?? '').toLowerCase();
  const canopy = inputs.treeCanopyPct ?? 0;
  const streamM = inputs.nearestStreamM ?? 99999;
  const om = inputs.organicMatterPct ?? 0;
  const riparian = inputs.riparianBufferM ?? 0;

  // Cowardin classification (simplified — NWI uses hydrology + substrate + vegetation)
  let cls: WetlandFunctionClass;
  if (streamM < 50) cls = 'Riverine';
  else if (drainage.includes('poor') && canopy > 25) cls = 'Palustrine (forested)';
  else if (drainage.includes('poor') && canopy > 5) cls = 'Palustrine (shrub)';
  else if (drainage.includes('poor')) cls = 'Palustrine (emergent)';
  else if (om > 5 && canopy < 10) cls = 'Lacustrine';
  else cls = 'Palustrine (emergent)';

  // Primary functions per class (Brinson hydrogeomorphic crosswalk)
  const functionsByClass: Record<WetlandFunctionClass, string[]> = {
    'Palustrine (forested)': ['Carbon storage', 'Wildlife habitat', 'Water quality filtration', 'Flood attenuation'],
    'Palustrine (emergent)': ['Waterfowl habitat', 'Nutrient cycling', 'Flood storage', 'Groundwater recharge'],
    'Palustrine (shrub)': ['Edge habitat', 'Nutrient uptake', 'Sediment trapping'],
    'Riverine': ['Streamflow regulation', 'Sediment transport', 'Fish habitat', 'Riparian connectivity'],
    'Lacustrine': ['Open water habitat', 'Carbon burial', 'Aquatic biodiversity'],
    'None': [],
  };

  // Function score: composite of wetland %, riparian buffer, soil OM
  const wetScore = Math.min(40, wetland * 4);         // 10% wetland = 40
  const ripScore = Math.min(25, riparian / 30 * 25);  // 30 m buffer = 25
  const omScore = Math.min(15, om * 3);               // 5% OM = 15
  const connScore = streamM < 100 ? 20 : streamM < 500 ? 10 : 0;
  const functionScore = Math.round(wetScore + ripScore + omScore + connScore);

  const tier = functionScore >= 70 ? 'high' : functionScore >= 40 ? 'moderate' : 'low';
  const narrative = `${cls} wetland with ${tier} functional integrity (score ${functionScore}/100). Primary functions: ${functionsByClass[cls].join(', ')}.`;

  return {
    class: cls,
    functionScore,
    primaryFunctions: functionsByClass[cls],
    narrative,
  };
}
