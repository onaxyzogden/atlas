/**
 * Financial modeling engine — type definitions.
 *
 * All financial outputs are estimates with explicit assumptions.
 * Numbers are in USD unless otherwise noted.
 */

import type { ZoneCategory } from '../../../store/zoneStore.js';
import type { StructureType } from '../../../store/structureStore.js';
import type { PathType } from '../../../store/pathStore.js';
import type { UtilityType } from '../../../store/utilityStore.js';
import type { CropAreaType } from '../../../store/cropStore.js';
import type { FenceType } from '../../../store/livestockStore.js';

// ── Scenario Levels ──

export type ScenarioLevel = 'low' | 'mid' | 'high';

// ── Cost Range (low / mid / high) ──

export interface CostRange {
  low: number;
  mid: number;
  high: number;
}

/** Create a CostRange where mid = average of low and high */
export function costRange(low: number, high: number): CostRange {
  return { low, mid: Math.round((low + high) / 2), high };
}

// ── Cost Line Items ──

export interface CostLineItem {
  id: string;
  name: string;
  sourceType: 'zone' | 'structure' | 'paddock' | 'path' | 'utility' | 'crop';
  sourceId: string;
  category: string;
  phase: string;
  phaseName: string;
  cost: CostRange;
  confidence: 'high' | 'medium' | 'low';
  assumptions: string[];
  unitCost?: { amount: number; unit: string; quantity: number };
}

// ── Enterprise & Revenue ──

export type EnterpriseType =
  | 'livestock'
  | 'orchard'
  | 'market_garden'
  | 'retreat'
  | 'education'
  | 'agritourism'
  | 'carbon'
  | 'grants';

export interface RevenueStream {
  id: string;
  name: string;
  enterprise: EnterpriseType;
  description: string;
  annualRevenue: CostRange;
  rampSchedule: Record<number, number>; // year -> multiplier 0.0..1.0
  startYear: number;
  maturityYear: number;
  confidence: 'high' | 'medium' | 'low';
  assumptions: string[];
  seasonalDistribution?: number[];
}

// ── Cashflow ──

export interface YearlyCashflow {
  year: number;
  capitalCosts: CostRange;
  operatingCosts: CostRange;
  revenue: CostRange;
  netCashflow: CostRange;
  cumulativeCashflow: CostRange;
}

// ── Break-Even ──

export interface BreakEvenResult {
  breakEvenYear: { low: number | null; mid: number | null; high: number | null };
  tenYearROI: CostRange;
  peakNegativeCashflow: CostRange;
}

// ── Mission Scoring ──

export interface MissionWeights {
  financial: number;
  ecological: number;
  spiritual: number;
  community: number;
}

export interface MissionScore {
  overall: number;
  financial: number;
  ecological: number;
  spiritual: number;
  community: number;
}

// ── Regional Configuration ──

export type CostRegion =
  | 'us-midwest'
  | 'us-northeast'
  | 'us-southeast'
  | 'us-west'
  | 'ca-ontario'
  | 'ca-bc'
  | 'ca-prairies';

export const REGION_LABELS: Record<CostRegion, string> = {
  'us-midwest': 'US Midwest',
  'us-northeast': 'US Northeast',
  'us-southeast': 'US Southeast',
  'us-west': 'US West',
  'ca-ontario': 'Ontario, Canada',
  'ca-bc': 'British Columbia',
  'ca-prairies': 'Canadian Prairies',
};

// ── Site Context (from siteDataStore layers) ──

export interface SiteContext {
  growingSeasonDays: number;
  hardinessZone: string;
  meanSlopeDeg: number;
  maxSlopeDeg: number;
  predominantAspect: string;
  country: 'US' | 'CA';
}

export const DEFAULT_SITE_CONTEXT: SiteContext = {
  growingSeasonDays: 150,
  hardinessZone: '5b',
  meanSlopeDeg: 5,
  maxSlopeDeg: 15,
  predominantAspect: 'S',
  country: 'US',
};

// ── All-Features Input Bundle ──

export interface AllFeaturesInput {
  zones: Array<{ id: string; projectId: string; name: string; category: ZoneCategory; areaM2: number; phase?: string }>;
  structures: Array<{ id: string; projectId: string; name: string; type: StructureType; phase: string }>;
  paddocks: Array<{ id: string; projectId: string; name: string; areaM2: number; fencing: FenceType; species: string[]; phase: string }>;
  paths: Array<{ id: string; projectId: string; name: string; type: PathType; lengthM: number; phase: string }>;
  utilities: Array<{ id: string; projectId: string; name: string; type: UtilityType; phase: string }>;
  crops: Array<{ id: string; projectId: string; name: string; type: CropAreaType; areaM2: number; phase: string }>;
}

// ── Aggregated Output ──

export interface FinancialModel {
  projectId: string;
  computedAt: string;
  region: CostRegion;
  costLineItems: CostLineItem[];
  revenueStreams: RevenueStream[];
  totalInvestment: CostRange;
  annualRevenueAtMaturity: CostRange;
  cashflow: YearlyCashflow[];
  breakEven: BreakEvenResult;
  enterprises: EnterpriseType[];
  missionScore: MissionScore;
  assumptions: string[];
}

// ── Database Types ──

export interface ZoneCostBenchmark {
  costPerAcre: CostRange;
  description: string;
}

export interface FenceCostBenchmark {
  costPerMetre: CostRange;
}

export interface PathCostBenchmark {
  costPerMetre: CostRange;
}

export interface UtilityCostBenchmark {
  systemCost: CostRange;
}

export interface CropCostBenchmark {
  establishmentPerAcre: CostRange;
}

export interface RegionalCostBenchmarks {
  zones: Partial<Record<ZoneCategory, ZoneCostBenchmark>>;
  fencing: Record<FenceType, FenceCostBenchmark>;
  paths: Record<PathType, PathCostBenchmark>;
  utilities: Record<UtilityType, UtilityCostBenchmark>;
  crops: Record<CropAreaType, CropCostBenchmark>;
  structureMultiplier: number;
}

export interface RevenueDrivers {
  unitBasis: string;
  annualPerUnit: CostRange;
  rampYears: number;
  rampCurve: number[];
  seasonalFactor: boolean;
  description: string;
}

export interface RegionalRevenueBenchmarks {
  enterprises: Record<EnterpriseType, RevenueDrivers>;
}
