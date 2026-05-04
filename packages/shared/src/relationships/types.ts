/**
 * @ogden/shared/relationships — types.
 *
 * `ResourceType` is a closed enum of biological / structural flows that one
 * placed entity can route to another. The Phase 1 seed covers the 13 most
 * common output→input flows from a permaculture design lens (see
 * wiki/decisions/2026-04-28-needs-yields-dependency-graph.md). Adding new
 * values is non-breaking; removing or renaming is.
 *
 * `Edge` is the link between an entity's declared output and another
 * entity's declared input. `ratio` is optional and when supplied represents
 * the fraction of the source's output routed to this destination.
 */

import { z } from 'zod';

export const RESOURCE_TYPES = [
  'manure',
  'greywater',
  'compost',
  'biomass',
  'seed',
  'forage',
  'mulch',
  'heat',
  'shade',
  'pollination',
  'pest_predation',
  'nutrient_uptake',
  'surface_water',
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const ResourceTypeSchema = z.enum(RESOURCE_TYPES);

export const EdgeSchema = z
  .object({
    fromId: z.string().min(1),
    fromOutput: ResourceTypeSchema,
    toId: z.string().min(1),
    toInput: ResourceTypeSchema,
    ratio: z.number().min(0).max(1).optional(),
  })
  .strict();

export type Edge = z.infer<typeof EdgeSchema>;

/**
 * A placed entity participating in the relationship graph. The `type`
 * field must be a member of one of the four canonical entity-type enums
 * (StructureType, UtilityType, CropAreaType, LivestockSpecies); see
 * `EntityType` in catalog.ts.
 */
export interface PlacedEntity<T extends string = string> {
  id: string;
  type: T;
}

/**
 * Project-level relationship state. Persisted by callers (Phase 3); this
 * module treats it as a value object.
 */
export interface RelationshipsState {
  entities: PlacedEntity[];
  edges: Edge[];
}
