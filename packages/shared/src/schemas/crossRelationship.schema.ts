import { z } from 'zod';

/**
 * Cross-project relationships (Portfolio Home Spec §5).
 *
 * A relationship is a label between two of a steward's projects describing how
 * the properties relate spatially, ecologically, or operationally. It drives
 * the §2.7 relationship lines on the Portfolio Map and is DISPLAY / AWARENESS
 * METADATA ONLY — it has no effect on Plan, Act, or Observe data logic
 * (§5.1, §9.4).
 *
 * Distinct from the within-project Needs & Yields `EdgeSchema`
 * (`@ogden/shared/relationships`): that graph connects entities INSIDE one
 * project; this connects two whole projects.
 *
 * Relationships are symmetric (§5.3). The persistence layer stores them once in
 * canonical project-id order; the API reads them against either side, so a
 * consumer always sees the relationship from either project.
 */

/**
 * The five relationship types and their §2.7 map line styling:
 *   shared_watershed      — blue dashed   (both drain into the same catchment)
 *   adjacent_boundary     — solid grey    (properties touch / within 50 m)
 *   habitat_corridor      — green dashed  (wildlife/habitat corridor between)
 *   same_management_unit  — solid orange  (managed as one operational unit)
 *   shared_infrastructure — purple dashed (shared bore / track / fence line)
 */
export const CrossRelationshipType = z.enum([
  'shared_watershed',
  'adjacent_boundary',
  'habitat_corridor',
  'same_management_unit',
  'shared_infrastructure',
]);
export type CrossRelationshipType = z.infer<typeof CrossRelationshipType>;

/** A stored cross-project relationship record (§5.2). */
export const CrossRelationship = z.object({
  id: z.string().uuid(),
  projectAId: z.string().uuid(),
  projectBId: z.string().uuid(),
  relationshipType: CrossRelationshipType,
  notes: z.string().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  /** Display name of the project on the "other" side of the relationship,
   *  relative to the project being viewed. Server-supplied for list rendering
   *  (rail / dashboard); null when not resolvable. */
  otherProjectName: z.string().nullable().optional(),
});
export type CrossRelationship = z.infer<typeof CrossRelationship>;

/**
 * Create payload. The first project comes from the route (`:id`); the caller
 * supplies the second project + type (+ optional steward notes). The server
 * normalises the two ids into canonical order before persisting.
 */
export const CreateCrossRelationshipInput = z.object({
  projectBId: z.string().uuid(),
  relationshipType: CrossRelationshipType,
  notes: z.string().max(2000).nullable().optional(),
});
export type CreateCrossRelationshipInput = z.infer<typeof CreateCrossRelationshipInput>;
