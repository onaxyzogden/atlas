/**
 * forestAnalysis — pure-function analysis for Forest Hub dashboard.
 *
 * Existing vegetation, forestry zones, carbon stock, silvopasture, tree health.
 */

import type { LandZone } from '../../store/zoneStore.js';
import type { CropArea } from '../../store/cropStore.js';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface VegetationBreakdown {
  className: string;
  pct: number;
}

export interface ForestryZone {
  zoneId: string;
  zoneName: string;
  category: string;
  areaM2: number;
  sunExposure: number;
  frostRisk: number;
  windShelter: number;
}

export interface CarbonStockEstimate {
  currentSOC: number;        // tC/ha
  potentialSOC: number;      // tC/ha
  annualSeqRate: number;     // tC/ha/yr
  projection10yr: {
    noChange: number;
    moderate: number;
    intensive: number;
  };
  totalAreaHa: number;
}

export interface SilvopastureOpportunity {
  zoneId: string;
  zoneName: string;
  areaM2: number;
  suitabilityScore: number;
  recommendation: string;
}

export interface TreeHealth {
  healthIdx: number;
  label: string;
  ndvi: number;
  fbRatio: string;
  myc: number;
  nutrients: string;
  soilMoisture: string;
  om: number;
  canopy: number;
}

/* ================================================================== */
/*  Core Functions                                                     */
/* ================================================================== */

/**
 * Extract forest/woodland classes from NLCD/AAFC land cover.
 */
export function computeExistingVegetation(
  landCover: { classes?: Record<string, number>; tree_canopy_pct?: number | string } | null,
): VegetationBreakdown[] {
  if (!landCover?.classes) return [];

  const forestClasses = [
    'Deciduous Forest', 'Evergreen Forest', 'Mixed Forest',
    'Shrub/Scrub', 'Woody Wetlands', 'Herbaceous',
  ];

  const result: VegetationBreakdown[] = [];
  for (const [cls, pct] of Object.entries(landCover.classes)) {
    if (forestClasses.some((fc) => cls.toLowerCase().includes(fc.toLowerCase()) || fc.toLowerCase().includes(cls.toLowerCase()))) {
      result.push({ className: cls, pct: typeof pct === 'number' ? pct : 0 });
    }
  }

  // If no specific forest classes found, include all classes for context
  if (result.length === 0) {
    for (const [cls, pct] of Object.entries(landCover.classes)) {
      result.push({ className: cls, pct: typeof pct === 'number' ? pct : 0 });
    }
  }

  return result.sort((a, b) => b.pct - a.pct);
}

/**
 * Filter zones for forestry, enrich with microclimate if available.
 */
export function computeForestryZones(
  zones: LandZone[],
  microclimate: {
    sun_trap_count?: number;
    frost_risk_high_pct?: number;
    wind_shelter_pct?: number;
  } | null,
): ForestryZone[] {
  const forestryZones = zones.filter(
    (z) => z.category === 'conservation' ||
      (z.category === 'food_production' && (
        z.primaryUse.toLowerCase().includes('forest') ||
        z.primaryUse.toLowerCase().includes('agroforest') ||
        z.primaryUse.toLowerCase().includes('silvopasture') ||
        z.primaryUse.toLowerCase().includes('windbreak')
      )),
  );

  return forestryZones.map((z) => ({
    zoneId: z.id,
    zoneName: z.name,
    category: z.category,
    areaM2: z.areaM2,
    sunExposure: microclimate?.sun_trap_count != null ? Math.min(100, (microclimate.sun_trap_count / 3) * 100) : 65,
    frostRisk: microclimate?.frost_risk_high_pct ?? 25,
    windShelter: microclimate?.wind_shelter_pct ?? 50,
  }));
}

/**
 * Carbon stock from soil_regeneration + land cover.
 */
export function computeCarbonStock(
  soilRegen: {
    current_soc_tcha?: number;
    potential_soc_tcha?: number;
    annual_seq_rate_tcha_yr?: number;
  } | null,
  landCover: { tree_canopy_pct?: number | string } | null,
  totalAreaM2: number,
): CarbonStockEstimate {
  const currentSOC = soilRegen?.current_soc_tcha ?? 45;
  const potentialSOC = soilRegen?.potential_soc_tcha ?? 75;
  const annualSeqRate = soilRegen?.annual_seq_rate_tcha_yr ?? 0.5;
  const canopyPct = parseFloat(String(landCover?.tree_canopy_pct ?? '30'));
  const totalAreaHa = totalAreaM2 / 10000;

  // Tree density bonus: higher canopy = more above-ground carbon
  const canopyBonus = (canopyPct / 100) * 15;

  return {
    currentSOC: Math.round(currentSOC + canopyBonus),
    potentialSOC: Math.round(potentialSOC),
    annualSeqRate,
    projection10yr: {
      noChange: Math.round((currentSOC + canopyBonus) * totalAreaHa),
      moderate: Math.round((currentSOC + canopyBonus + annualSeqRate * 10) * totalAreaHa),
      intensive: Math.round((currentSOC + canopyBonus + annualSeqRate * 2 * 10) * totalAreaHa),
    },
    totalAreaHa: Math.round(totalAreaHa * 10) / 10,
  };
}

/**
 * Intersect livestock and forestry zones for silvopasture opportunities.
 */
export function computeSilvopastureOpportunities(
  zones: LandZone[],
  soilRegen: {
    silvopasture_suitability?: number;
    intervention_recommendations?: string[];
  } | null,
): SilvopastureOpportunity[] {
  const livestockZones = zones.filter((z) => z.category === 'livestock');
  const forestryZones = zones.filter(
    (z) => z.category === 'conservation' || z.category === 'food_production',
  );

  if (livestockZones.length === 0 || forestryZones.length === 0) return [];

  const suitability = soilRegen?.silvopasture_suitability ?? 60;
  if (suitability < 50) return [];

  // Return livestock zones that could integrate trees
  return livestockZones.map((z) => ({
    zoneId: z.id,
    zoneName: z.name,
    areaM2: z.areaM2,
    suitabilityScore: Math.round(suitability),
    recommendation: suitability >= 75
      ? 'High potential: integrate shade trees at 50-100 trees/ha'
      : 'Moderate potential: start with shelterbelts along fence lines',
  }));
}

/**
 * Tree health index from soils + land cover data (extracted from old dashboard).
 */
export function computeTreeHealthIndex(
  soils: { organic_matter_pct?: number | string; drainage_class?: string; ph_range?: string } | null,
  landCover: { tree_canopy_pct?: number | string } | null,
): TreeHealth {
  const omRaw = parseFloat(String(soils?.organic_matter_pct ?? ''));
  const om = isFinite(omRaw) ? omRaw : 4.5;
  const canopyRaw = parseFloat(String(landCover?.tree_canopy_pct ?? ''));
  const canopy = isFinite(canopyRaw) ? canopyRaw : 45;
  const drain = (soils?.drainage_class ?? '').toLowerCase();
  const ph = soils?.ph_range ?? '';

  const omBonus = om >= 5 ? 15 : om >= 3 ? 10 : om >= 1 ? 6 : 2;
  const drainBonus = drain.includes('well') ? 8 : drain.includes('poor') ? 2 : 5;
  const healthIdx = Math.min(Math.max(Math.round(55 + (canopy / 100 * 20) + omBonus + drainBonus), 0), 99);

  const ndvi = Math.round((canopy / 100) * 0.9 * 100) / 100;
  const wellDrained = drain.includes('well');
  const fbRatio = (om >= 5 && wellDrained) ? '4.2:1' : om >= 3 ? '3.2:1' : '1.8:1';
  const mycOm = om >= 5 ? 20 : om >= 3 ? 15 : 5;
  const mycDrain = wellDrained ? 8 : 0;
  const myc = Math.min(Math.max(50 + mycOm + mycDrain, 0), 95);

  let nutrients = 'Balanced';
  if (ph) {
    if (/^[45]\./.test(ph)) nutrients = 'Slightly Acidic';
    else if (/^[89]\./.test(ph)) nutrients = 'Alkaline';
  }

  const soilMoisture = wellDrained ? '18\u201322' : drain.includes('poor') ? '30\u201340' : '24\u201330';
  const label = healthIdx >= 90 ? 'OPTIMAL' : healthIdx >= 75 ? 'GOOD' : 'MONITOR';

  return { healthIdx, label, ndvi, fbRatio, myc, nutrients, soilMoisture, om, canopy };
}
