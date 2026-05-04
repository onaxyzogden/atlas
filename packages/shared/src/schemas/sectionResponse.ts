/**
 * Shared section-response envelope — Phase 7.2.
 *
 * Every `GET /api/v1/<section>/:projectId` route follows the same
 * discriminated-union shape: either the section's data is `ready`
 * and a typed `summary` ships, or it's `not_ready` with a reason
 * the UI can surface as a placeholder.
 *
 * Section 2 (basemap-terrain) and Section 5 (hydrology-water) hand-
 * authored this envelope; this module factors it out so the 26 other
 * sections (3, 4, 6..29) can ride on a single source of truth. As
 * each section's processor ships its own typed summary, replace the
 * generic `summary` argument here with the section-specific schema.
 */

import { z } from 'zod';

/** Reasons a section may be `not_ready` for a given project. */
export const NotReadyReason = z.enum([
  'no_boundary',
  'pending',
  'failed',
  'not_implemented',
]);
export type NotReadyReason = z.infer<typeof NotReadyReason>;

/**
 * Build a discriminated-union response wrapping the given summary
 * schema. Mirrors the shape used by section2 / section5 so client
 * code can branch on `response.status` uniformly across sections.
 */
export function sectionResponse<S extends z.ZodTypeAny>(summary: S) {
  return z.discriminatedUnion('status', [
    z.object({
      status: z.literal('ready'),
      projectId: z.string().uuid(),
      summary,
    }),
    z.object({
      status: z.literal('not_ready'),
      projectId: z.string().uuid(),
      reason: NotReadyReason,
    }),
  ]);
}
