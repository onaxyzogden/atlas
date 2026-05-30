// constants/plan/relationshipMatrix.ts
//
// The secondary x primary compatibility matrix and the named design-tension
// register (OLOS Project-Type + Secondary-Layer Spec v1.2, section 5.3).
//
// Matrix legend (one cell per (secondary, primary) pair):
//   'M'  Modifying  - secondary injects patch records AND/OR adds objectives
//   'A'  Additive   - secondary adds standalone objectives only
//   'X'  Tension    - pairing is possible but carries known design friction
//   'NA' Not applicable - the secondary cannot meaningfully layer on this primary
//
// IMPORTANT: 'X' is a DISPLAY HINT only. It masks the underlying additive/
// modifying behaviour (which comes from the secondary catalogue content the
// resolver applies) and it is NOT the source of truth for tension detection.
// Two tensions in the register (wellness+agritourism, off_grid+education) sit
// on cells marked 'A', so `getActiveTensions` reads the DESIGN_TENSIONS list -
// never the matrix cells. The matrix drives only (a) whether a secondary is
// compatible at all (cell !== 'NA') and (b) the display hint.

import type { ProjectTypeId } from '../../schemas/plan/projectTypeTaxonomy.schema.js';
import type { PlanStratumId } from '../../schemas/plan/planTierObjective.schema.js';

/** A single matrix cell. */
export type RelationCell = 'M' | 'A' | 'X' | 'NA';

/** The 12 types that can stand alone as a primary (everything but residential). */
export type PrimaryTypeId = Exclude<ProjectTypeId, 'residential'>;

/** The 8 types that can be layered as a secondary (the can-be-secondary set). */
export type SecondaryTypeId = Extract<
  ProjectTypeId,
  | 'market_garden'
  | 'orchard_food_forest'
  | 'silvopasture'
  | 'agritourism'
  | 'education'
  | 'wellness'
  | 'nursery'
  | 'residential'
>;

/** Primary ids in taxonomy ordinal order (matrix column order). */
export const PRIMARY_TYPE_IDS: readonly PrimaryTypeId[] = [
  'homestead',
  'regenerative_farm',
  'market_garden',
  'orchard_food_forest',
  'silvopasture',
  'ecovillage',
  'agritourism',
  'education',
  'conservation',
  'off_grid',
  'wellness',
  'nursery',
];

/** Secondary ids in taxonomy ordinal order (matrix row order). */
export const SECONDARY_TYPE_IDS: readonly SecondaryTypeId[] = [
  'market_garden',
  'orchard_food_forest',
  'silvopasture',
  'agritourism',
  'education',
  'wellness',
  'nursery',
  'residential',
];

/**
 * Secondary (row) x Primary (column) relationship matrix. The strict Record
 * types require every one of the 8 rows to carry all 12 primary cells, so a
 * missing or mistyped cell is a compile error.
 */
export const RELATIONSHIP_MATRIX: Record<
  SecondaryTypeId,
  Record<PrimaryTypeId, RelationCell>
> = {
  market_garden: {
    homestead: 'M',
    regenerative_farm: 'M',
    market_garden: 'NA',
    orchard_food_forest: 'A',
    silvopasture: 'A',
    ecovillage: 'A',
    agritourism: 'A',
    education: 'A',
    conservation: 'X',
    off_grid: 'M',
    wellness: 'A',
    nursery: 'M',
  },
  orchard_food_forest: {
    homestead: 'M',
    regenerative_farm: 'M',
    market_garden: 'M',
    orchard_food_forest: 'NA',
    silvopasture: 'M',
    ecovillage: 'A',
    agritourism: 'A',
    education: 'A',
    conservation: 'A',
    off_grid: 'M',
    wellness: 'A',
    nursery: 'M',
  },
  silvopasture: {
    homestead: 'M',
    regenerative_farm: 'M',
    market_garden: 'X',
    orchard_food_forest: 'M',
    silvopasture: 'NA',
    ecovillage: 'A',
    agritourism: 'A',
    education: 'A',
    conservation: 'X',
    off_grid: 'M',
    wellness: 'X',
    nursery: 'A',
  },
  agritourism: {
    homestead: 'A',
    regenerative_farm: 'A',
    market_garden: 'A',
    orchard_food_forest: 'A',
    silvopasture: 'A',
    ecovillage: 'X',
    agritourism: 'NA',
    education: 'A',
    conservation: 'A',
    off_grid: 'X',
    wellness: 'A',
    nursery: 'A',
  },
  education: {
    homestead: 'A',
    regenerative_farm: 'A',
    market_garden: 'A',
    orchard_food_forest: 'A',
    silvopasture: 'A',
    ecovillage: 'A',
    agritourism: 'A',
    education: 'NA',
    conservation: 'A',
    off_grid: 'A',
    wellness: 'A',
    nursery: 'A',
  },
  wellness: {
    homestead: 'A',
    regenerative_farm: 'A',
    market_garden: 'A',
    orchard_food_forest: 'A',
    silvopasture: 'X',
    ecovillage: 'A',
    agritourism: 'A',
    education: 'A',
    conservation: 'A',
    off_grid: 'A',
    wellness: 'NA',
    nursery: 'A',
  },
  nursery: {
    homestead: 'A',
    regenerative_farm: 'M',
    market_garden: 'M',
    orchard_food_forest: 'A',
    silvopasture: 'A',
    ecovillage: 'A',
    agritourism: 'A',
    education: 'A',
    conservation: 'M',
    off_grid: 'A',
    wellness: 'A',
    nursery: 'NA',
  },
  residential: {
    homestead: 'NA',
    regenerative_farm: 'M',
    market_garden: 'A',
    orchard_food_forest: 'A',
    silvopasture: 'A',
    ecovillage: 'NA',
    agritourism: 'X',
    education: 'A',
    conservation: 'A',
    off_grid: 'NA',
    wellness: 'X',
    nursery: 'A',
  },
};

/**
 * A named, advisory design tension between two project types. Tensions are
 * never blocking - the wizard surfaces them and the steward acknowledges.
 * Order-independent: a tension fires when BOTH `typeA` and `typeB` are present
 * in a project (as primary or secondary), regardless of which is which.
 */
export interface DesignTension {
  id: string;
  typeA: ProjectTypeId;
  typeB: ProjectTypeId;
  /** Stratum at which the tension is resolved during planning. */
  resolutionStratumId: PlanStratumId;
  /** Human-facing stratum label transcribed from the spec (may name >1 stratum). */
  resolutionStratumLabel: string;
  description: string;
}

/** The 10 named design tensions (spec section 5.3). */
export const DESIGN_TENSIONS: readonly DesignTension[] = [
  {
    id: 'tension-1',
    typeA: 'wellness',
    typeB: 'agritourism',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Quiet vs. visitor traffic. Sanctuary design requires low-stimulation, privacy-graded zones. High-traffic guest programs conflict unless spatially separated. Advisory, not blocking - the steward may be designing a quiet retreat, not a high-traffic operation. Resolution anchored to Stratum 4 Zone Allocation.',
  },
  {
    id: 'tension-2',
    typeA: 'conservation',
    typeB: 'market_garden',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Intervention philosophy conflict. High-input annual production contradicts minimal-intervention habitat logic. Requires hard spatial boundaries between production and restoration zones.',
  },
  {
    id: 'tension-3',
    typeA: 'conservation',
    typeB: 'silvopasture',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation, Stratum 6',
    description:
      'Animal impact vs. habitat recovery. Grazing pressure, compaction, and browse damage threaten sensitive restoration areas. Requires fencing, exclusion zones, and corridor design before Act.',
  },
  {
    id: 'tension-4',
    typeA: 'off_grid',
    typeB: 'education',
    resolutionStratumId: 's5-system-design',
    resolutionStratumLabel: 'Stratum 5 - Access & Circulation',
    description:
      'Access conflict. Remote settlement design minimises and controls site access. Education requires regular, safe, predictable public access. Driveway, parking, and security design must reconcile both.',
  },
  {
    id: 'tension-5',
    typeA: 'ecovillage',
    typeB: 'agritourism',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Governance and privacy conflict. Resident consent, community agreements, and private living zones may directly conflict with open visitor access. Requires explicit visitor policy before Zone Allocation.',
  },
  {
    id: 'tension-6',
    typeA: 'silvopasture',
    typeB: 'market_garden',
    resolutionStratumId: 's5-system-design',
    resolutionStratumLabel: 'Stratum 5 - Access & Circulation, Design',
    description:
      'Contamination and damage risk. Animal movement near intensive crop beds creates pathogen, compaction, and browse risk. Requires strict spatial and temporal separation.',
  },
  {
    id: 'tension-7',
    typeA: 'silvopasture',
    typeB: 'wellness',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Sensory conflict. Animal noise, odour, and operational activity are incompatible with low-stimulation sanctuary zones unless sufficient distance and screening is designed in.',
  },
  {
    id: 'tension-8',
    typeA: 'off_grid',
    typeB: 'agritourism',
    resolutionStratumId: 's5-system-design',
    resolutionStratumLabel: 'Stratum 5 - Access & Circulation',
    description:
      'Access conflict. Remote settlement deliberately limits visitor access for security and privacy. Agritourism requires regular, predictable, open public access. Driveway, security, and visitor management design must reconcile both.',
  },
  {
    id: 'tension-9',
    typeA: 'residential',
    typeB: 'agritourism',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      "Private residence vs. visitor access conflict. The steward's home is on the same land guests are visiting. Private living zones, family security, and household routines must be explicitly separated from visitor circulation before Zone Allocation.",
  },
  {
    id: 'tension-10',
    typeA: 'residential',
    typeB: 'wellness',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Private domestic life vs. therapeutic sanctuary zones. Household noise, activity, and domestic infrastructure conflict with the low-stimulation, privacy-graded environment required for a healing sanctuary. Requires hard spatial separation and acoustic buffering.',
  },
];

const SECONDARY_ID_SET: ReadonlySet<string> = new Set(SECONDARY_TYPE_IDS);
const PRIMARY_ID_SET: ReadonlySet<string> = new Set(PRIMARY_TYPE_IDS);

function isSecondaryTypeId(id: ProjectTypeId): id is SecondaryTypeId {
  return SECONDARY_ID_SET.has(id);
}

function isPrimaryTypeId(id: ProjectTypeId): id is PrimaryTypeId {
  return PRIMARY_ID_SET.has(id);
}

/**
 * Relationship cell for a (secondary, primary) pair. Returns 'NA' for any pair
 * where the secondary is not can-be-secondary or the primary is not
 * can-be-primary, so the helper is total over ProjectTypeId.
 */
export function getPairRelation(
  secondary: ProjectTypeId,
  primary: ProjectTypeId,
): RelationCell {
  if (!isSecondaryTypeId(secondary) || !isPrimaryTypeId(primary)) return 'NA';
  return RELATIONSHIP_MATRIX[secondary][primary];
}

/** True when the secondary can be layered on the primary (cell !== 'NA'). */
export function isCompatibleSecondary(
  secondary: ProjectTypeId,
  primary: ProjectTypeId,
): boolean {
  return getPairRelation(secondary, primary) !== 'NA';
}

/**
 * The design tensions active for a project, derived from the DESIGN_TENSIONS
 * register (NOT the matrix). A tension is active when both of its types are
 * present in the project, regardless of primary/secondary role.
 */
export function getActiveTensions(
  primaryTypeId: ProjectTypeId,
  secondaryTypeIds: readonly ProjectTypeId[] = [],
): DesignTension[] {
  const present = new Set<ProjectTypeId>([primaryTypeId, ...secondaryTypeIds]);
  return DESIGN_TENSIONS.filter((t) => present.has(t.typeA) && present.has(t.typeB));
}
