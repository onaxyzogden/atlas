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
import type {
  PlanStratumId,
  PlanStratumObjective,
} from '../../schemas/plan/planStratumObjective.schema.js';

/** A single matrix cell. */
export type RelationCell = 'M' | 'A' | 'X' | 'NA';

/** The 13 types that can stand alone as a primary (everything but residential). */
export type PrimaryTypeId = Exclude<ProjectTypeId, 'residential'>;

/** The 9 types that can be layered as a secondary (the can-be-secondary set). */
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
  | 'livestock_operation'
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
  'livestock_operation',
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
  'livestock_operation',
];

/**
 * Secondary (row) x Primary (column) relationship matrix. The strict Record
 * types require every one of the 9 rows to carry all 13 primary cells, so a
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
    livestock_operation: 'X',
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
    livestock_operation: 'A',
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
    livestock_operation: 'M',
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
    livestock_operation: 'A',
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
    livestock_operation: 'A',
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
    livestock_operation: 'X',
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
    livestock_operation: 'A',
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
    livestock_operation: 'A',
  },
  livestock_operation: {
    homestead: 'M',
    regenerative_farm: 'M',
    market_garden: 'M',
    orchard_food_forest: 'M',
    silvopasture: 'NA',
    ecovillage: 'M',
    agritourism: 'A',
    education: 'A',
    conservation: 'M',
    off_grid: 'A',
    wellness: 'X',
    nursery: 'A',
    livestock_operation: 'NA',
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
  /**
   * Objective ids this tension concerns, across BOTH type roles (a type's
   * primary-role id and its secondary-role `*-sec-*` id are both listed where
   * it has one), plus the universal anchor for the resolution stratum
   * (`s4-zones` / `s5-access`). Authored domain content. Consumers resolve it
   * with `getTensionConcernObjectiveIds`, which filters to the ids actually
   * present in a given project's resolved set — so listing a superset is safe.
   */
  relatedObjectiveIds?: readonly string[];
}

/** The 13 named design tensions (spec section 5.3; tensions 11-12 added 2026-06-03
 * with the livestock_operation primary type, mirroring the silvopasture pairs;
 * tension-13 added 2026-06-03 with the livestock_operation secondary layer). */
export const DESIGN_TENSIONS: readonly DesignTension[] = [
  {
    id: 'tension-1',
    relatedObjectiveIds: [
      's4-zones',
      'well-s4-privacy-zone-hierarchy',
      'well-s4-sensory-design-standards',
      'well-sec-s4-sensory-standards',
      'ag-s4-circulation-strategy',
      'ag-s4-biosecurity-zoning',
    ],
    typeA: 'wellness',
    typeB: 'agritourism',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Quiet vs. visitor traffic. Sanctuary design requires low-stimulation, privacy-graded zones. High-traffic guest programs conflict unless spatially separated. Advisory, not blocking - the steward may be designing a quiet retreat, not a high-traffic operation. Resolution anchored to Stratum 4 Zone Allocation.',
  },
  {
    id: 'tension-2',
    relatedObjectiveIds: [
      's4-zones',
      'con-s4-restoration-priority-zones',
      'mgd-s4-crop-rotation-bed-layout',
      'mgd-s4-ipm-strategy',
    ],
    typeA: 'conservation',
    typeB: 'market_garden',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Intervention philosophy conflict. High-input annual production contradicts minimal-intervention habitat logic. Requires hard spatial boundaries between production and restoration zones.',
  },
  {
    id: 'tension-3',
    relatedObjectiveIds: [
      's4-zones',
      'con-s4-restoration-priority-zones',
      'con-s5-fencing-exclusion',
      'silv-s4-paddock-layout',
      'silv-s5-fencing',
      'silv-sec-s4-grazing-design',
      'silv-sec-s4-stock-infrastructure',
    ],
    typeA: 'conservation',
    typeB: 'silvopasture',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation, Stratum 6',
    description:
      'Animal impact vs. habitat recovery. Grazing pressure, compaction, and browse damage threaten sensitive restoration areas. Requires fencing, exclusion zones, and corridor design before Act.',
  },
  {
    id: 'tension-4',
    relatedObjectiveIds: [
      's5-access',
      'edu-s4-teaching-zone-allocation',
      'edu-s5-teaching-spaces',
      'ofg-s4-emergency-comms-response',
    ],
    typeA: 'off_grid',
    typeB: 'education',
    resolutionStratumId: 's5-system-design',
    resolutionStratumLabel: 'Stratum 5 - Access & Circulation',
    description:
      'Access conflict. Remote settlement design minimises and controls site access. Education requires regular, safe, predictable public access. Driveway, parking, and security design must reconcile both.',
  },
  {
    id: 'tension-5',
    relatedObjectiveIds: [
      's4-zones',
      'ev-s4-settlement-strategy',
      'ev-s4-housing-cluster',
      'ag-s4-circulation-strategy',
    ],
    typeA: 'ecovillage',
    typeB: 'agritourism',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Governance and privacy conflict. Resident consent, community agreements, and private living zones may directly conflict with open visitor access. Requires explicit visitor policy before Zone Allocation.',
  },
  {
    id: 'tension-6',
    relatedObjectiveIds: [
      's5-access',
      'silv-s5-fencing',
      'silv-s4-paddock-layout',
      'silv-sec-s4-grazing-design',
      'mgd-s4-crop-rotation-bed-layout',
      'mgd-s5-bed-growing-infrastructure',
    ],
    typeA: 'silvopasture',
    typeB: 'market_garden',
    resolutionStratumId: 's5-system-design',
    resolutionStratumLabel: 'Stratum 5 - Access & Circulation, Design',
    description:
      'Contamination and damage risk. Animal movement near intensive crop beds creates pathogen, compaction, and browse risk. Requires strict spatial and temporal separation.',
  },
  {
    id: 'tension-7',
    relatedObjectiveIds: [
      's4-zones',
      'silv-s4-paddock-layout',
      'silv-sec-s4-grazing-design',
      'well-s4-sensory-design-standards',
      'well-s4-privacy-zone-hierarchy',
      'well-sec-s4-sensory-standards',
    ],
    typeA: 'silvopasture',
    typeB: 'wellness',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Sensory conflict. Animal noise, odour, and operational activity are incompatible with low-stimulation sanctuary zones unless sufficient distance and screening is designed in.',
  },
  {
    id: 'tension-8',
    relatedObjectiveIds: [
      's5-access',
      'ag-s4-circulation-strategy',
      'ag-s5-dispersed-siting',
      'ofg-s4-emergency-comms-response',
    ],
    typeA: 'off_grid',
    typeB: 'agritourism',
    resolutionStratumId: 's5-system-design',
    resolutionStratumLabel: 'Stratum 5 - Access & Circulation',
    description:
      'Access conflict. Remote settlement deliberately limits visitor access for security and privacy. Agritourism requires regular, predictable, open public access. Driveway, security, and visitor management design must reconcile both.',
  },
  {
    id: 'tension-9',
    relatedObjectiveIds: [
      's4-zones',
      'res-s4-living-zone',
      'ag-s4-circulation-strategy',
      'ag-s4-biosecurity-zoning',
    ],
    typeA: 'residential',
    typeB: 'agritourism',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      "Private residence vs. visitor access conflict. The steward's home is on the same land guests are visiting. Private living zones, family security, and household routines must be explicitly separated from visitor circulation before Zone Allocation.",
  },
  {
    id: 'tension-10',
    // residential cannot be a primary, so wellness is always the primary in
    // this pairing — only its primary-role ids are reachable (no `well-sec-*`).
    relatedObjectiveIds: [
      's4-zones',
      'res-s4-living-zone',
      'well-s4-privacy-zone-hierarchy',
      'well-s4-sensory-design-standards',
    ],
    typeA: 'residential',
    typeB: 'wellness',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Private domestic life vs. therapeutic sanctuary zones. Household noise, activity, and domestic infrastructure conflict with the low-stimulation, privacy-graded environment required for a healing sanctuary. Requires hard spatial separation and acoustic buffering.',
  },
  {
    id: 'tension-11',
    relatedObjectiveIds: [
      's4-zones',
      'lvs-s4-grazing-system',
      'lvs-s4-stocking-rate',
      'lvs-sec-s4-species-stocking',
      'well-s4-sensory-design-standards',
      'well-s4-privacy-zone-hierarchy',
      'well-sec-s4-sensory-standards',
    ],
    typeA: 'livestock_operation',
    typeB: 'wellness',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Sensory conflict. Animal noise, odour, and operational activity are incompatible with low-stimulation sanctuary zones unless sufficient distance and screening is designed in. Advisory, not blocking. Resolution anchored to Stratum 4 Zone Allocation.',
  },
  {
    id: 'tension-12',
    relatedObjectiveIds: [
      's5-access',
      'lvs-s5-fencing-water',
      'lvs-s4-grazing-system',
      'lvs-sec-s4-stock-infrastructure',
      'mgd-s4-crop-rotation-bed-layout',
      'mgd-s5-bed-growing-infrastructure',
    ],
    typeA: 'livestock_operation',
    typeB: 'market_garden',
    resolutionStratumId: 's5-system-design',
    resolutionStratumLabel: 'Stratum 5 - Access & Circulation, Design',
    description:
      'Contamination and damage risk. Animal movement near intensive crop beds creates pathogen, compaction, and browse risk. Requires strict spatial and temporal separation between the herd and the market-garden beds.',
  },
  {
    id: 'tension-13',
    relatedObjectiveIds: [
      's4-zones',
      'lvs-s4-grazing-system',
      'lvs-s4-stocking-rate',
      'lvs-sec-s4-species-stocking',
      'con-s4-restoration-priority-zones',
      'con-s5-fencing-exclusion',
    ],
    typeA: 'livestock_operation',
    typeB: 'conservation',
    resolutionStratumId: 's4-foundation-decisions',
    resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
    description:
      'Grazing-as-tool vs. habitat protection. Targeted/conservation grazing is a recognised restoration tool, but uncontrolled grazing pressure, compaction, and browse damage threaten sensitive habitat. Requires fencing, exclusion zones, and an explicit grazing-as-restoration prescription before Act. Advisory, not blocking. Resolution anchored to Stratum 4 Zone Allocation.',
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

/**
 * The objective ids a tension concerns, resolved against a project's actual
 * objective set. Takes the authored `relatedObjectiveIds` (a role-agnostic
 * superset that lists both a type's primary-role id and its `*-sec-*`
 * secondary-role id where it has one) and filters to the ids actually present
 * in `objectives` — so listing ids that aren't in a given project is harmless.
 *
 * Result is de-duped with first-seen order preserved. When a tension has no
 * authored mapping, or none of its mapped ids are present, falls back to every
 * objective at the tension's `resolutionStratumId` — so a tension always
 * highlights something meaningful to the steward.
 */
export function getTensionConcernObjectiveIds(
  tension: DesignTension,
  objectives: readonly PlanStratumObjective[],
): string[] {
  const presentIds = new Set(objectives.map((o) => o.id));
  const mapped: string[] = [];
  const seen = new Set<string>();
  for (const id of tension.relatedObjectiveIds ?? []) {
    if (presentIds.has(id) && !seen.has(id)) {
      seen.add(id);
      mapped.push(id);
    }
  }
  if (mapped.length > 0) return mapped;
  // Fallback: every objective resolved at the tension's resolution stratum.
  return objectives
    .filter((o) => o.stratumId === tension.resolutionStratumId)
    .map((o) => o.id);
}
