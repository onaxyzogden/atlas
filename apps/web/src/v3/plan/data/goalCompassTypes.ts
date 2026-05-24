/**
 * Shared types for Goal Compass — goal tree, site profile, interventions.
 *
 * Citation shape mirrors `substitutionCatalog.ts` so the Plan stage carries
 * one consistent grounding idiom across data files.
 */

import type { PhaseKey } from '../types.js';
import type {
  GroundCoverState,
  SuccessionStage,
  ZoneCategory,
} from '../../../store/zoneStore.js';

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

export type MaintenanceFrequency =
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'biennial'
  | 'every-3-years';

/**
 * Ongoing operational maintenance for an intervention once it is
 * established (spec §4.3.3). Distinct from the one-time install labor
 * captured by `laborHrsPerAcre` / `materials`. Consumed by the
 * `maintenanceSchedule` derivation, which rolls these into a recurring
 * synthetic phase + a personnel / materials / equipment summary.
 */
export interface MaintenanceSchedule {
  frequency: MaintenanceFrequency;
  /** 'any' = season-agnostic recurring upkeep. */
  season?: 'spring' | 'summer' | 'fall' | 'winter' | 'any';
  laborHrsPerOccurrence: number;
  costUSDPerOccurrence: number;
  /** Skilled help beyond the household, if any. */
  requiredPersonnel?: { skillLevel?: string; minCount: number };
  materialsPerOccurrence?: MaterialLine[];
  /** Free-text equipment classes the recurring task needs. */
  equipmentRequired?: string[];
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

/**
 * The six supported project archetypes. This is the type the sequencing
 * engine sees at runtime (`GoalTree.archetype`), so a mistyped catalog
 * `projectTypes` tag is a compile error. Distinct from the underscored
 * `PlanProjectTypeKey` (Record-key only) — kept as the single runtime
 * source of truth for archetype identity.
 */
export type ProjectArchetype =
  | 'homestead'
  | 'regenerative-farm'
  | 'retreat'
  | 'education'
  | 'conservation'
  | 'multi-enterprise';

export interface GoalTree {
  archetype: ProjectArchetype;
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

/**
 * GeometryTemplate — how the auto-design pipeline's stamper turns an
 * acreage allocation into concrete map geometry within a target zone.
 *
 *   tile-strip      Equal-area strips along the zone's longest edge
 *                   (paddocks, annual beds, AMP cattle cells).
 *   contour-line    One or more contour-following lines clipped to the
 *                   zone (swales, keyline tracks).
 *   edge-line       A line traced along the zone perimeter (perimeter
 *                   fencing, windward shelterbelt).
 *   bbox-rect       A rectangle inscribed inside the zone (orchards laid
 *                   out in clean rows; structure footprints).
 *   centroid-point  A single point at the zone centroid (one-off
 *                   structures: coop, compost bay, tank, value-add
 *                   kitchen, solar inverter).
 *   fill-polygon    The intervention occupies the whole zone polygon
 *                   (food forest, cover-crop rebuild, coppice block,
 *                   pasture renovation, pond placed at low point).
 *
 * Stampers are dispatched in `engine/autoDesign/stampGeometry.ts`.
 * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md.
 */
export type GeometryTemplate =
  | 'tile-strip'
  | 'contour-line'
  | 'edge-line'
  | 'bbox-rect'
  | 'centroid-point'
  | 'fill-polygon';

/**
 * ZoneAffinity — declarative rules the zone-allocator uses to pick which
 * zones an intervention is allowed (and preferred) to land in. Every field
 * is optional; an empty affinity means the intervention is happy in any
 * zone. The allocator scores each candidate zone by how many `preferred*`
 * lists it matches; ties broken by zone area (largest first).
 *
 *   preferredCategories     Zone.category values this intervention likes.
 *   preferredSuccession     Zone.successionStage values this intervention
 *                           likes (e.g. orchard prefers `pioneer`/`mid`).
 *   preferredGroundCover    Zone.groundCover values this intervention
 *                           likes (e.g. cover-crop rebuild prefers
 *                           `bare-soil`; livestock prefers
 *                           `thriving-grasses`).
 *   permacultureRingRange   Inclusive [min, max] ring band — restricts
 *                           placement to zones whose `permacultureZone`
 *                           falls in [min, max]. Z0=home, Z5=wild.
 *   avoidedCategories       Hard veto. Allocator skips zones in this set
 *                           even if no `preferred*` field would match.
 *
 * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md.
 */
export interface ZoneAffinity {
  preferredCategories?: ZoneCategory[];
  preferredSuccession?: SuccessionStage[];
  preferredGroundCover?: GroundCoverState[];
  permacultureRingRange?: [0 | 1 | 2 | 3 | 4 | 5, 0 | 1 | 2 | 3 | 4 | 5];
  avoidedCategories?: ZoneCategory[];
}

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
  /**
   * Optional recurring upkeep once established (spec §4.3.3).
   * Undefined = no modeled ongoing maintenance for this intervention.
   */
  maintenanceSchedule?: MaintenanceSchedule;
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
  /**
   * Where this intervention prefers to land. Read by the auto-design
   * pipeline's `zoneAllocator`. Optional — undefined = no zone preference,
   * allocator falls back to free placement inside the parcel boundary.
   */
  zoneAffinity?: ZoneAffinity;
  /**
   * How the auto-design pipeline's stamper draws this intervention into
   * its allocated zone. Optional — undefined skips geometry emission for
   * this intervention (the task still schedules to the Act calendar).
   */
  geometryTemplate?: GeometryTemplate;
  sources: Citation[];
  region?: CostRegion;
  /**
   * Project archetypes this intervention is authored for. The sequencing
   * engine skips it under any other archetype. Absent OR empty ⇒
   * universal (eligible under every archetype) — this is how the 22
   * legacy interventions stay non-regressive.
   */
  projectTypes?: ProjectArchetype[];
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

/**
 * Fit-Gate property facets (Stage 0 / True North). These capture the
 * legal/physical disqualifier dimensions the Fit Gate engine grades on a
 * Green→Black severity scale. Each value is ordered worst-to-best for
 * severity mapping; `'unknown'` is the empty-but-flagged state that the
 * verdict surfaces as "needs confirmation".
 */
export type ZoningFit =
  | 'permitted'
  | 'conditional'
  | 'variance-needed'
  | 'prohibited'
  | 'unknown';
export type LegalAccessStatus =
  | 'deeded'
  | 'easement'
  | 'shared'
  | 'none'
  | 'unknown';
export type ConservationOverlay =
  | 'none'
  | 'buffer-only'
  | 'partial'
  | 'extensive'
  | 'unknown';
export type FloodplainExtent =
  | 'none'
  | 'fringe'
  | 'partial'
  | 'extensive'
  | 'unknown';

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
  lastFrostDate: Facet<string>;
  firstFrostDate: Facet<string>;
  // Fit-Gate facets (Stage 0). Added 2026-05-24.
  zoningFit: Facet<ZoningFit>;
  legalAccess: Facet<LegalAccessStatus>;
  conservationOverlay: Facet<ConservationOverlay>;
  floodplainExtent: Facet<FloodplainExtent>;
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
    lastFrostDate: emptyFacet<string>(),
    firstFrostDate: emptyFacet<string>(),
    zoningFit: emptyFacet<ZoningFit>(),
    legalAccess: emptyFacet<LegalAccessStatus>(),
    conservationOverlay: emptyFacet<ConservationOverlay>(),
    floodplainExtent: emptyFacet<FloodplainExtent>(),
  };
}

export const CATALOG_VERSION = 'goal-compass-v2-2026-05-16';
