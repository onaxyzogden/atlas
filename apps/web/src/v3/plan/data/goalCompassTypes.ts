/**
 * Shared types for Goal Compass — goal tree, site profile, interventions.
 *
 * Citation shape mirrors `substitutionCatalog.ts` so the Plan stage carries
 * one consistent grounding idiom across data files.
 */

import type { PhaseKey } from '../types.js';

export type CitationKind = 'book' | 'standard' | 'journal' | 'practice-guide';

export interface Citation {
  source: string;
  year: number;
  kind: CitationKind;
  note?: string;
}

export type CostRegion = 'us-midwest' | 'ca-ontario' | 'global';

export interface CostRange {
  low: number;
  mid: number;
  high: number;
  perAcre?: boolean;
}

export interface MaterialLine {
  label: string;
  quantityPerAcre?: number;
  unit: string;
  notes?: string;
}

export type CriterionUnit = 'pct' | 'gallons' | 'lbs' | 'usd' | 'kwh' | 'count';

export interface SuccessCriterion {
  id: string;
  description: string;
  unit: CriterionUnit;
  target: number;
  deadlineYear: number;
}

export interface SubGoal {
  id: string;
  title: string;
  narrative?: string;
  criteria: SuccessCriterion[];
}

export interface GoalTree {
  archetype: 'homestead' | 'regenerative-farm' | 'retreat' | 'education' | 'conservation' | 'multi-enterprise';
  parentGoal: {
    id: string;
    title: string;
    narrative: string;
  };
  subGoals: SubGoal[];
}

export type SiteRequirement =
  | { kind: 'slopeMaxPct'; value: number }
  | { kind: 'slopeMinPct'; value: number }
  | { kind: 'minAcres'; value: number }
  | { kind: 'soilCompaction'; values: ('low' | 'med' | 'high')[] }
  | { kind: 'waterPosture'; values: ('rainfed' | 'irrigated' | 'pond-fed' | 'mixed')[] }
  | { kind: 'climateZone'; values: string[] }
  | { kind: 'landform'; values: string[] };

export interface CriterionContribution {
  criterionId: string;
  contributionPerAcre?: number;
  contributionFixed?: number;
  appliesAtYearOffset: number;
}

export interface MaturityStep {
  yearOffset: number;
  functionalPct: number;
}

export type InterventionCategory =
  | 'earthworks'
  | 'water'
  | 'soil'
  | 'vegetation'
  | 'livestock'
  | 'structures'
  | 'access';

export interface Intervention {
  id: string;
  name: string;
  description: string;
  category: InterventionCategory;
  yeomansPhase: PhaseKey;
  prerequisites: string[];
  siteRequirements: SiteRequirement[];
  laborHrsPerAcre?: number;
  laborFixedHrs?: number;
  costRangeUSD: CostRange;
  materials: MaterialLine[];
  durationMonths: number;
  maturityCurve: MaturityStep[];
  criterionContributions: CriterionContribution[];
  spatialFootprintAcres?: {
    perPerson?: number;
    minimum?: number;
    fractionOfParcel?: number;
  };
  seasonConstraints?: ('spring' | 'summer' | 'fall' | 'winter')[];
  designLayer?: 'earthworks' | 'water' | 'vegetation' | 'structures';
  sources: Citation[];
  region?: CostRegion;
}

export type FacetProvenance = 'observe' | 'manual' | null;

export interface Facet<T> {
  value: T | null;
  provenance: FacetProvenance;
  observeFieldRef?: string;
  notedAt?: string;
}

export type SoilCompaction = 'low' | 'med' | 'high';
export type WaterPosture = 'rainfed' | 'irrigated' | 'pond-fed' | 'mixed';

export interface Household {
  adults: number;
  children: number;
}

export interface SiteProfile {
  projectId: string;
  acres: Facet<number>;
  climateZone: Facet<string>;
  primaryLandform: Facet<string>;
  avgSlopePct: Facet<number>;
  currentLandCover: Facet<string>;
  soilCompaction: Facet<SoilCompaction>;
  waterPosture: Facet<WaterPosture>;
  hazards: Facet<string[]>;
  household: Facet<Household>;
}

export function emptyFacet<T>(): Facet<T> {
  return { value: null, provenance: null };
}

export function emptySiteProfile(projectId: string): SiteProfile {
  return {
    projectId,
    acres: emptyFacet<number>(),
    climateZone: emptyFacet<string>(),
    primaryLandform: emptyFacet<string>(),
    avgSlopePct: emptyFacet<number>(),
    currentLandCover: emptyFacet<string>(),
    soilCompaction: emptyFacet<SoilCompaction>(),
    waterPosture: emptyFacet<WaterPosture>(),
    hazards: emptyFacet<string[]>(),
    household: emptyFacet<Household>(),
  };
}

export const CATALOG_VERSION = 'goal-compass-v1-2026-05-14';
