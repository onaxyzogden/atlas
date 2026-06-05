// presentationShare.schema.ts
//
// PresentationShare — token-based read-only share of an Observe Dashboard
// presentation view (OLOS Observe Dashboard Spec §6). Tokens are 32-char
// random strings persisted client-side (Phase 4 locked decision: local-
// first; server endpoint deferred). The viewer route
// `/v3/observe/share/$token` reads the token to render a frozen snapshot
// of the four presentation sections (omitting any sections opted out at
// share-generation time).
//
// Expiry buckets per spec §6.2 — `permanent` carries `expiresAt = null`.
// `7d`, `30d`, `90d` carry the materialised ISO timestamp so the viewer
// route never has to recompute against creation time.

import { z } from 'zod';

export const PresentationShareSectionId = z.enum([
  'site_overview',
  'current_conditions',
  'ecological_trajectory',
  'evidence_library',
]);
export type PresentationShareSectionId = z.infer<
  typeof PresentationShareSectionId
>;

export const PresentationShareExpiry = z.enum(['7d', '30d', '90d', 'permanent']);
export type PresentationShareExpiry = z.infer<typeof PresentationShareExpiry>;

export const PresentationShareSchema = z
  .object({
    token: z.string().min(8),
    projectId: z.string().min(1),
    createdAt: z.string().datetime(),
    /** ISO timestamp the share stops resolving. `null` for `permanent`. */
    expiresAt: z.string().datetime().nullable().default(null),
    expiry: PresentationShareExpiry,
    /** Sections included in the share. Empty array = all four sections. */
    sections: z.array(PresentationShareSectionId).default([]),
  })
  .passthrough();
export type PresentationShare = z.infer<typeof PresentationShareSchema>;
