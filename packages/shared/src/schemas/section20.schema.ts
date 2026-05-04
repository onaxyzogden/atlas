import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 20 — Collaboration, Teamwork & Review
//
// Headline collaborator/comment counts and the timestamp of the
// most recent activity from the collaboration endpoint.

export const CollaborationReviewSummary = z.object({
  collaboratorCount: z.number().int().nonnegative(),
  openCommentCount: z.number().int().nonnegative(),
  resolvedCommentCount: z.number().int().nonnegative(),
  lastActivityAt: z.string().datetime().nullable(),
});
export type CollaborationReviewSummary = z.infer<typeof CollaborationReviewSummary>;

export const CollaborationReviewResponse = sectionResponse(CollaborationReviewSummary);
export type CollaborationReviewResponse = z.infer<typeof CollaborationReviewResponse>;
