import type { ProjectTypeId } from '../../schemas/plan/projectTypeTaxonomy.schema.js';

/**
 * One row of the OLOS project-type taxonomy (Project-Type + Secondary-Layer
 * Spec v1.2). `ordinal` is wizard display order; `canBePrimary` types appear
 * in the Step-2 grid; `canBeSecondary` types appear in the compatible-secondary
 * picker. Capability is data here, read by the wizard and the resolution
 * engine — not a separate enum.
 */
export interface ProjectTypeDef {
  id: ProjectTypeId;
  label: string;
  ordinal: number;
  canBePrimary: boolean;
  canBeSecondary: boolean;
  description: string;
}

/**
 * The 13-type taxonomy. 12 types can stand alone as a primary; `residential`
 * is a secondary-only live-in layer added onto a working-land primary. 8 types
 * can be layered as a secondary (the can-be-secondary set).
 *
 * Labels and descriptions are ASCII-only (operator convention). The Zod
 * `ProjectType` enum (project.schema.ts) is the superset of these ids plus the
 * `moontrance` sentinel.
 */
export const PROJECT_TYPES: readonly ProjectTypeDef[] = [
  {
    id: 'homestead',
    label: 'Homestead',
    ordinal: 0,
    canBePrimary: true,
    canBeSecondary: false,
    description:
      'Family-scale self-reliant land: food, water, shelter, and resilience for the household.',
  },
  {
    id: 'regenerative_farm',
    label: 'Regenerative Farm',
    ordinal: 1,
    canBePrimary: true,
    canBeSecondary: false,
    description:
      'Commercial-scale regenerative production rebuilding soil, water, and biodiversity.',
  },
  {
    id: 'market_garden',
    label: 'Market Garden',
    ordinal: 2,
    canBePrimary: true,
    canBeSecondary: true,
    description:
      'Intensive small-footprint horticulture for direct and local market sales.',
  },
  {
    id: 'orchard_food_forest',
    label: 'Orchard / Food Forest',
    ordinal: 3,
    canBePrimary: true,
    canBeSecondary: true,
    description:
      'Perennial tree-and-shrub systems layered for long-horizon yield.',
  },
  {
    id: 'silvopasture',
    label: 'Silvopasture',
    ordinal: 4,
    canBePrimary: true,
    canBeSecondary: true,
    description: 'Integrated trees, forage, and livestock on shared ground.',
  },
  {
    id: 'ecovillage',
    label: 'Ecovillage',
    ordinal: 5,
    canBePrimary: true,
    canBeSecondary: false,
    description:
      'Intentional community organized around shared land, governance, and regenerative living.',
  },
  {
    id: 'agritourism',
    label: 'Agritourism / Retreat',
    ordinal: 6,
    canBePrimary: true,
    canBeSecondary: true,
    description:
      'Visitor-hosting on working land: stays, tours, events, and retreats.',
  },
  {
    id: 'education',
    label: 'Education',
    ordinal: 7,
    canBePrimary: true,
    canBeSecondary: true,
    description:
      'Teaching landscape for courses, demonstration, and applied learning.',
  },
  {
    id: 'conservation',
    label: 'Conservation',
    ordinal: 8,
    canBePrimary: true,
    canBeSecondary: false,
    description:
      'Habitat protection and ecological restoration as the primary purpose.',
  },
  {
    id: 'off_grid',
    label: 'Off-Grid',
    ordinal: 9,
    canBePrimary: true,
    canBeSecondary: false,
    description:
      'Energy, water, and waste autonomy independent of municipal services.',
  },
  {
    id: 'wellness',
    label: 'Wellness',
    ordinal: 10,
    canBePrimary: true,
    canBeSecondary: true,
    description:
      'Therapeutic and restorative land use centered on human health.',
  },
  {
    id: 'nursery',
    label: 'Nursery',
    ordinal: 11,
    canBePrimary: true,
    canBeSecondary: true,
    description:
      'Propagation and growing-on of plants for sale or project supply.',
  },
  {
    id: 'residential',
    label: 'Residential / Live-In',
    ordinal: 12,
    canBePrimary: false,
    canBeSecondary: true,
    description:
      'A live-in dwelling layer added onto a working-land primary.',
  },
];

/** The 12 types offered as a primary in the Step-2 grid (ordinal order). */
export const PRIMARY_TYPES: readonly ProjectTypeDef[] = PROJECT_TYPES.filter(
  (t) => t.canBePrimary,
);

/** The 8 types offered in the compatible-secondary picker (ordinal order). */
export const SECONDARY_TYPES: readonly ProjectTypeDef[] = PROJECT_TYPES.filter(
  (t) => t.canBeSecondary,
);

/** Lookup a type definition by id. Returns undefined for unknown ids. */
export function findProjectType(id: string): ProjectTypeDef | undefined {
  return PROJECT_TYPES.find((t) => t.id === id);
}
