/**
 * True North / Fit Gate (Stage 0) types.
 *
 * Captures the steward-attested half of the Fit Gate — the questionnaire
 * segments that are NOT auto-derivable from GIS (legal/zoning, financial,
 * access/market, ecological non-negotiables, human/neighbour, deal-breakers)
 * plus the Required Land Functions checklist.
 *
 * Segment 1 (Core Vision) lives in the goal tree (`goalTreeStore`) and the
 * property attributes live in the Site Profile (`siteProfileStore`); this
 * store owns segments 2–8. The Fit Gate engine reads all three.
 *
 * Covenant note: capital channels are limited to the channels permitted under
 * the project's fiqh constraints (donation, qard ḥasan, in-kind, sponsorship).
 * No investor / CSRA / salam / advance-purchase framing is modeled here.
 */

/** Three-valued answer. `'unknown'` is the empty-but-flagged state. */
export type TriState = 'yes' | 'no' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low' | 'unknown';
export type AccessQuality = 'good' | 'adequate' | 'poor' | 'none' | 'unknown';
export type Proximity = 'isolated' | 'moderate' | 'close' | 'unknown';
export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';
export type Attitude = 'supportive' | 'neutral' | 'resistant' | 'unknown';

/** Segment 2 — what the land must physically support. */
export type LandFunction =
  | 'growing-food'
  | 'grazing'
  | 'hosting-visitors'
  | 'parking'
  | 'water-storage'
  | 'housing'
  | 'workshops'
  | 'trails'
  | 'composting'
  | 'nursery'
  | 'market-garden'
  | 'forest-access';

/** Segment 4 — covenant-permitted capital channels only. */
export type CapitalChannel =
  | 'donation'
  | 'restricted-donation'
  | 'qard-hasan'
  | 'in-kind'
  | 'sponsorship';

/** Segment 6 — ecological values that must be respected. */
export type EcologicalFeature =
  | 'wetlands'
  | 'endangered-habitat'
  | 'floodplain'
  | 'erosion-slopes'
  | 'old-growth'
  | 'riparian'
  | 'conservation-easement'
  | 'cultural-sacred';

/** Segment 8 — explicit hard-stop conditions (drive Red/Black severity). */
export type DealBreaker =
  | 'no-legal-access'
  | 'zoning-prohibits-core-use'
  | 'no-water-path'
  | 'floodplain-covers-build'
  | 'conservation-blocks-infrastructure'
  | 'extreme-neighbour-conflict'
  | 'tenure-too-short'
  | 'soil-contamination'
  | 'unsafe-access-road'
  | 'no-winter-access'
  | 'capital-exceeds-threshold'
  | 'no-lawful-public-activity';

export interface LegalZoningSegment {
  /** Does current zoning permit the project's core use? */
  zoningPermitsUse: TriState;
  /** Permissions the steward judges required (free-text list). */
  permitsRequired: string[];
  /** Subset of `permitsRequired` already confirmed/obtained. */
  permitsConfirmed: string[];
}

export interface FinancialSegment {
  /** Which permitted capital channels the project will rely on. */
  capitalChannels: CapitalChannel[];
  /** Confidence the project can sustain carrying costs (taxes, insurance…). */
  carryingCostConfidence: Confidence;
  /** Is the funding for the project secured? */
  fundingSecured: TriState;
}

export interface AccessMarketSegment {
  roadAccess: AccessQuality;
  /** Distance to target audience/customers, km. Null = unrecorded. */
  distanceToAudienceKm: number | null;
  /** Year-round / winter access available? */
  seasonalAccess: TriState;
}

export interface EcologicalSegment {
  /** Sensitive features present that must be protected. */
  protectedFeatures: EcologicalFeature[];
  /** Steward commitment to respect the features above. */
  respectCommitment: TriState;
}

export interface HumanNeighbourSegment {
  neighbourProximity: Proximity;
  conflictRisk: RiskLevel;
  municipalAttitude: Attitude;
}

export interface TrueNorthProfile {
  projectId: string;
  /** Segment 2 */
  requiredFunctions: LandFunction[];
  /** Segment 3 */
  legalZoning: LegalZoningSegment;
  /** Segment 4 */
  financial: FinancialSegment;
  /** Segment 5 */
  accessMarket: AccessMarketSegment;
  /** Segment 6 */
  ecological: EcologicalSegment;
  /** Segment 7 */
  humanNeighbour: HumanNeighbourSegment;
  /** Segment 8 */
  dealBreakers: DealBreaker[];
  updatedAt?: string;
}

/** The 7 segments this store + the goal tree/site profile own, in wheel order. */
export type TrueNorthSegmentId =
  | 'core-vision'
  | 'required-functions'
  | 'legal-zoning'
  | 'financial'
  | 'access-market'
  | 'ecological'
  | 'human-neighbour'
  | 'deal-breakers';

export function emptyTrueNorthProfile(projectId: string): TrueNorthProfile {
  return {
    projectId,
    requiredFunctions: [],
    legalZoning: {
      zoningPermitsUse: 'unknown',
      permitsRequired: [],
      permitsConfirmed: [],
    },
    financial: {
      capitalChannels: [],
      carryingCostConfidence: 'unknown',
      fundingSecured: 'unknown',
    },
    accessMarket: {
      roadAccess: 'unknown',
      distanceToAudienceKm: null,
      seasonalAccess: 'unknown',
    },
    ecological: {
      protectedFeatures: [],
      respectCommitment: 'unknown',
    },
    humanNeighbour: {
      neighbourProximity: 'unknown',
      conflictRisk: 'unknown',
      municipalAttitude: 'unknown',
    },
    dealBreakers: [],
  };
}
