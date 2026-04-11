/**
 * utilityAnalysis — pure helper functions for utility intelligence:
 * solar output estimation, off-grid readiness score, dependency mapping.
 */

import type { Utility, UtilityType } from '../../store/utilityStore.js';
import type { BuildPhase } from '../../store/phaseStore.js';

/* ------------------------------------------------------------------ */
/*  Solar Output Estimation                                            */
/* ------------------------------------------------------------------ */

export interface SolarEstimate {
  panelCount: number;
  panelAreaM2: number;
  dailyKwh: number;
  annualKwh: number;
  avgIrradiance: number;
}

export function estimateSolarOutput(panelCount: number, avgIrradiance = 4.5): SolarEstimate {
  const panelAreaM2 = panelCount * 2.0; // ~2m2 per residential panel
  const efficiency = 0.18;
  const dailyKwh = panelAreaM2 * avgIrradiance * efficiency;
  return {
    panelCount,
    panelAreaM2,
    dailyKwh,
    annualKwh: dailyKwh * 365,
    avgIrradiance,
  };
}

/* ------------------------------------------------------------------ */
/*  Off-Grid Readiness Score                                           */
/* ------------------------------------------------------------------ */

export interface OffGridBreakdown {
  label: string;
  value: number;
  max: number;
  detail: string;
}

export interface OffGridReadiness {
  score: number;
  rating: string;
  breakdown: OffGridBreakdown[];
}

const ENERGY_TYPES: UtilityType[] = ['solar_panel', 'battery_room', 'generator'];
const WATER_TYPES: UtilityType[] = ['water_tank', 'well_pump', 'rain_catchment'];

export function computeOffGridReadiness(
  utilities: Utility[],
  sunTrapAreaPct: number | null,
  detentionAreaPct: number | null,
): OffGridReadiness {
  // Solar opportunity (0-33)
  const sunScore = sunTrapAreaPct != null ? Math.min(33, Math.round((sunTrapAreaPct / 60) * 33)) : 0;
  const sunDetail = sunTrapAreaPct != null ? `${sunTrapAreaPct.toFixed(0)}% sun-trap coverage` : 'No microclimate data';

  // Water catchment (0-33)
  const waterUtilCount = utilities.filter((u) => WATER_TYPES.includes(u.type)).length;
  const detentionScore = detentionAreaPct != null ? Math.min(16, Math.round((detentionAreaPct / 30) * 16)) : 0;
  const utilityWaterScore = Math.min(17, waterUtilCount * 6);
  const waterScore = detentionScore + utilityWaterScore;
  const waterDetail = `${waterUtilCount} water utilities placed, ${detentionAreaPct != null ? detentionAreaPct.toFixed(0) + '% detention' : 'no watershed data'}`;

  // Utility coverage (0-34)
  const energyCount = utilities.filter((u) => ENERGY_TYPES.includes(u.type)).length;
  const energyCoverage = Math.min(17, energyCount * 6);
  const waterCoverage = Math.min(17, waterUtilCount * 6);
  const coverageScore = energyCoverage + waterCoverage;
  const coverageDetail = `${energyCount} energy + ${waterUtilCount} water systems`;

  const total = sunScore + waterScore + coverageScore;
  const rating = total >= 80 ? 'Excellent' : total >= 60 ? 'Good' : total >= 40 ? 'Moderate' : 'Low';

  return {
    score: total,
    rating,
    breakdown: [
      { label: 'Solar Opportunity', value: sunScore, max: 33, detail: sunDetail },
      { label: 'Water Catchment', value: waterScore, max: 33, detail: waterDetail },
      { label: 'Utility Coverage', value: coverageScore, max: 34, detail: coverageDetail },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Infrastructure Dependency Map                                      */
/* ------------------------------------------------------------------ */

export interface DependencyRule {
  dependent: UtilityType;
  requires: UtilityType[];
  reason: string;
}

export const UTILITY_DEPENDENCIES: DependencyRule[] = [
  { dependent: 'greywater', requires: ['water_tank'], reason: 'Greywater system requires water tank for supply' },
  { dependent: 'septic', requires: ['water_tank'], reason: 'Septic system requires water infrastructure' },
  { dependent: 'battery_room', requires: ['solar_panel'], reason: 'Battery storage requires solar generation' },
  { dependent: 'lighting', requires: ['solar_panel'], reason: 'Lighting requires power source' },
  { dependent: 'laundry_station', requires: ['water_tank', 'greywater'], reason: 'Laundry requires water and drainage' },
  { dependent: 'rain_catchment', requires: ['water_tank'], reason: 'Catchment should feed into storage' },
];

export interface DependencyViolation {
  utility: Utility;
  missingType: UtilityType;
  reason: string;
}

const PHASE_ORDER: Record<string, number> = {
  'Phase 1': 1,
  'Phase 2': 2,
  'Phase 3': 3,
  'Phase 4': 4,
};

export function checkDependencyViolations(utilities: Utility[]): DependencyViolation[] {
  const violations: DependencyViolation[] = [];
  const typesByPhase = new Map<string, Set<UtilityType>>();

  for (const u of utilities) {
    const phase = u.phase || 'Phase 1';
    if (!typesByPhase.has(phase)) typesByPhase.set(phase, new Set());
    typesByPhase.get(phase)!.add(u.type);
  }

  for (const u of utilities) {
    const rule = UTILITY_DEPENDENCIES.find((d) => d.dependent === u.type);
    if (!rule) continue;

    const uPhaseOrder = PHASE_ORDER[u.phase] ?? 1;

    for (const reqType of rule.requires) {
      // Check if required type exists in same or earlier phase
      let found = false;
      for (const [phase, types] of typesByPhase) {
        if ((PHASE_ORDER[phase] ?? 1) <= uPhaseOrder && types.has(reqType)) {
          found = true;
          break;
        }
      }
      if (!found) {
        violations.push({
          utility: u,
          missingType: reqType,
          reason: rule.reason,
        });
      }
    }
  }

  return violations;
}

/* ------------------------------------------------------------------ */
/*  Phase Grouping                                                     */
/* ------------------------------------------------------------------ */

export function groupByPhase(utilities: Utility[]): Map<string, Utility[]> {
  const groups = new Map<string, Utility[]>();
  for (const u of utilities) {
    const phase = u.phase || 'Unassigned';
    if (!groups.has(phase)) groups.set(phase, []);
    groups.get(phase)!.push(u);
  }
  return groups;
}
