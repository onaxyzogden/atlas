/**
 * nurseryAnalysis — pure-function analysis for Nursery Ledger dashboard.
 *
 * Germination calendars, microclimate scoring, readiness tracking, stock summaries.
 */

import { PROPAGATION_BY_SPECIES, type PropagationInfo } from './propagationData.js';
import type { PropagationBatch, GrowthStage } from '../../store/nurseryStore.js';
import type { LandZone } from '../../store/zoneStore.js';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface GerminationCalendarEntry {
  speciesId: string;
  commonName: string;
  sowMonth: number;      // 0-11
  sowMonthLabel: string;
  germinationDays: string;
  transplantMonth: number;
  transplantMonthLabel: string;
  stratificationNote: string;
}

export interface NurseryMicroclimatScore {
  zoneId: string;
  zoneName: string;
  sunExposure: number;   // 0-100
  frostRisk: number;     // 0-100 (lower = better)
  windShelter: number;   // 0-100
  overallScore: number;  // 0-100
}

export interface ReadinessEntry {
  batchId: string;
  species: string;
  stage: GrowthStage;
  quantity: number;
  daysRemaining: number;
  expectedReadyDate: string;
  destinationZone: string | null;
  isOverdue: boolean;
}

export interface StockSummary {
  totalBatches: number;
  totalQuantity: number;
  bySpecies: { species: string; quantity: number; batches: number }[];
  byStage: { stage: GrowthStage; quantity: number }[];
  byMethod: { method: string; quantity: number }[];
  seedSavingCount: number;
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseFrostMonth(dateStr: string): number {
  const lower = dateStr.toLowerCase();
  for (let i = 0; i < MONTH_LABELS.length; i++) {
    if (lower.includes(MONTH_LABELS[i]!.toLowerCase())) return i;
  }
  const full = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  for (let i = 0; i < full.length; i++) {
    if (lower.includes(full[i]!)) return i;
  }
  return 3;
}

/* ================================================================== */
/*  Core Functions                                                     */
/* ================================================================== */

/**
 * Compute optimal sowing windows from frost dates + species germination temps.
 */
export function computeGerminationCalendar(
  climate: {
    last_frost_date?: string;
    first_frost_date?: string;
    growing_season_days?: number;
  } | null,
): GerminationCalendarEntry[] {
  const lastFrostMonth = parseFrostMonth(climate?.last_frost_date ?? 'Apr 28');
  const entries: GerminationCalendarEntry[] = [];

  for (const info of Object.values(PROPAGATION_BY_SPECIES)) {
    // Indoor sowing: stratification days before last frost + germination period
    const stratWeeks = Math.ceil(info.stratificationDays / 7);
    const sowMonthOffset = Math.ceil((info.stratificationDays + info.daysToGermination[0]) / 30);
    const sowMonth = (lastFrostMonth - sowMonthOffset + 12) % 12;

    // Transplant: after last frost + hardening off period
    const transplantMonth = (lastFrostMonth + 1) % 12;

    const stratNote = info.stratificationDays > 0
      ? `${info.stratificationDays} days cold stratification (${stratWeeks} weeks at ${info.germinationTempC.min}\u00b0C)`
      : 'No stratification required';

    entries.push({
      speciesId: info.speciesId,
      commonName: info.commonName,
      sowMonth,
      sowMonthLabel: MONTH_LABELS[sowMonth] ?? 'Jan',
      germinationDays: `${info.daysToGermination[0]}\u2013${info.daysToGermination[1]} days at ${info.germinationTempC.optimal}\u00b0C`,
      transplantMonth,
      transplantMonthLabel: MONTH_LABELS[transplantMonth] ?? 'May',
      stratificationNote: stratNote,
    });
  }

  // Sort by sow month
  entries.sort((a, b) => a.sowMonth - b.sowMonth);
  return entries;
}

/**
 * Score nursery zones by microclimate suitability.
 */
export function computeNurseryMicroclimate(
  zones: LandZone[],
  microclimate: {
    sun_trap_count?: number;
    frost_risk_high_pct?: number;
    wind_shelter_pct?: number;
  } | null,
): NurseryMicroclimatScore[] {
  const nurseryZones = zones.filter(
    (z) => z.category === 'food_production' && z.primaryUse.toLowerCase().includes('nursery'),
  );

  // If no explicit nursery zones, check for any nursery crop area designation
  if (nurseryZones.length === 0) return [];

  return nurseryZones.map((z) => {
    // Base scores from microclimate data (or reasonable defaults)
    const sunExposure = microclimate?.sun_trap_count != null
      ? Math.min(100, (microclimate.sun_trap_count / 3) * 100)
      : 65;
    const frostRisk = microclimate?.frost_risk_high_pct != null
      ? microclimate.frost_risk_high_pct
      : 25;
    const windShelter = microclimate?.wind_shelter_pct != null
      ? microclimate.wind_shelter_pct
      : 50;

    const overallScore = Math.round(
      sunExposure * 0.35 + (100 - frostRisk) * 0.4 + windShelter * 0.25,
    );

    return {
      zoneId: z.id,
      zoneName: z.name,
      sunExposure: Math.round(sunExposure),
      frostRisk: Math.round(frostRisk),
      windShelter: Math.round(windShelter),
      overallScore,
    };
  });
}

/**
 * Track readiness for each propagation batch.
 */
export function computeReadinessTracking(
  batches: PropagationBatch[],
  zones: LandZone[],
): ReadinessEntry[] {
  const now = Date.now();
  const zoneMap = new Map(zones.map((z) => [z.id, z.name]));

  return batches.map((b) => {
    const readyDate = new Date(b.expectedReadyDate).getTime();
    const daysRemaining = Math.ceil((readyDate - now) / (1000 * 60 * 60 * 24));
    const info = PROPAGATION_BY_SPECIES[b.species];

    return {
      batchId: b.id,
      species: info?.commonName ?? b.species,
      stage: b.stage,
      quantity: b.quantity,
      daysRemaining: Math.max(daysRemaining, 0),
      expectedReadyDate: b.expectedReadyDate,
      destinationZone: b.destinationZoneId ? (zoneMap.get(b.destinationZoneId) ?? null) : null,
      isOverdue: daysRemaining < 0 && b.stage !== 'ready_to_plant',
    };
  });
}

/**
 * Summarize stock by species, stage, and method.
 */
export function computeStockSummary(batches: PropagationBatch[]): StockSummary {
  const bySpecies = new Map<string, { quantity: number; batches: number }>();
  const byStage = new Map<GrowthStage, number>();
  const byMethod = new Map<string, number>();
  let seedSavingCount = 0;
  let totalQuantity = 0;

  for (const b of batches) {
    totalQuantity += b.quantity;

    // By species
    const sp = bySpecies.get(b.species) ?? { quantity: 0, batches: 0 };
    sp.quantity += b.quantity;
    sp.batches += 1;
    bySpecies.set(b.species, sp);

    // By stage
    byStage.set(b.stage, (byStage.get(b.stage) ?? 0) + b.quantity);

    // By method
    byMethod.set(b.method, (byMethod.get(b.method) ?? 0) + b.quantity);

    if (b.seedSaving) seedSavingCount++;
  }

  const info = PROPAGATION_BY_SPECIES;

  return {
    totalBatches: batches.length,
    totalQuantity,
    bySpecies: Array.from(bySpecies.entries()).map(([species, data]) => ({
      species: info[species]?.commonName ?? species,
      quantity: data.quantity,
      batches: data.batches,
    })),
    byStage: Array.from(byStage.entries()).map(([stage, quantity]) => ({ stage, quantity })),
    byMethod: Array.from(byMethod.entries()).map(([method, quantity]) => ({ method, quantity })),
    seedSavingCount,
  };
}
