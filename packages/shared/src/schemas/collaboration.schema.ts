import { z } from 'zod';

// ─── Roles ──────────────────────────────────────────────────────────────────

export const ProjectRole = z.enum(['owner', 'designer', 'reviewer', 'viewer']);
export type ProjectRole = z.infer<typeof ProjectRole>;

export const OrgRole = z.enum(['owner', 'admin', 'editor', 'viewer']);
export type OrgRole = z.infer<typeof OrgRole>;

// ─── Comments ───────────────────────────────────────────────────────────────

export const CreateCommentInput = z.object({
  text: z.string().min(1).max(5000),
  location: z.tuple([z.number(), z.number()]).optional(),  // [lng, lat]
  featureId: z.string().uuid().optional(),
  featureType: z.string().optional(),
  parentId: z.string().uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof CreateCommentInput>;

export const UpdateCommentInput = z.object({
  text: z.string().min(1).max(5000).optional(),
  resolved: z.boolean().optional(),
});
export type UpdateCommentInput = z.infer<typeof UpdateCommentInput>;

export const CommentRecord = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string().nullable(),
  authorEmail: z.string(),
  text: z.string(),
  location: z.tuple([z.number(), z.number()]).nullable(),  // [lng, lat]
  featureId: z.string().uuid().nullable(),
  featureType: z.string().nullable(),
  resolved: z.boolean(),
  resolvedBy: z.string().uuid().nullable(),
  parentId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CommentRecord = z.infer<typeof CommentRecord>;

// ─── Members ────────────────────────────────────────────────────────────────

export const InviteMemberInput = z.object({
  email: z.string().email(),
  role: ProjectRole.exclude(['owner']),  // can't invite as owner
});
export type InviteMemberInput = z.infer<typeof InviteMemberInput>;

export const UpdateMemberRoleInput = z.object({
  role: ProjectRole.exclude(['owner']),
});
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleInput>;

export const ProjectMemberRecord = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  displayName: z.string().nullable(),
  role: ProjectRole,
  joinedAt: z.string(),
});
export type ProjectMemberRecord = z.infer<typeof ProjectMemberRecord>;

// ─── Organizations ──────────────────────────────────────────────────────────

export const CreateOrganizationInput = z.object({
  name: z.string().min(1).max(200),
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInput>;

export const OrganizationRecord = z.object({
  id: z.string().uuid(),
  name: z.string(),
  plan: z.string(),
  createdAt: z.string(),
});
export type OrganizationRecord = z.infer<typeof OrganizationRecord>;

export const OrgMemberRecord = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  displayName: z.string().nullable(),
  role: OrgRole,
  joinedAt: z.string(),
});
export type OrgMemberRecord = z.infer<typeof OrgMemberRecord>;

export const InviteOrgMemberInput = z.object({
  email: z.string().email(),
  role: OrgRole.exclude(['owner']),
});
export type InviteOrgMemberInput = z.infer<typeof InviteOrgMemberInput>;

// ─── Activity ───────────────────────────────────────────────────────────────

export const ActivityAction = z.enum([
  'comment_added',
  'comment_resolved',
  'comment_deleted',
  'feature_created',
  'feature_updated',
  'feature_deleted',
  'member_joined',
  'member_removed',
  'role_changed',
  'export_generated',
  'suggestion_created',
  'suggestion_approved',
  'suggestion_rejected',
]);
export type ActivityAction = z.infer<typeof ActivityAction>;

export const ActivityRecord = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  userName: z.string().nullable(),
  action: ActivityAction,
  entityType: z.string().nullable(),
  entityId: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});
export type ActivityRecord = z.infer<typeof ActivityRecord>;

// ─── Suggested Edits ────────────────────────────────────────────────────────

export const SuggestEditStatus = z.enum(['pending', 'approved', 'rejected']);
export type SuggestEditStatus = z.infer<typeof SuggestEditStatus>;

export const CreateSuggestedEditInput = z.object({
  featureId: z.string().uuid(),
  diffPayload: z.object({
    properties: z.object({
      before: z.record(z.unknown()),
      after: z.record(z.unknown()),
    }).optional(),
    geometry: z.object({
      before: z.unknown(),  // GeoJSON geometry
      after: z.unknown(),
    }).optional(),
  }),
  comment: z.string().max(5000).optional(),
});
export type CreateSuggestedEditInput = z.infer<typeof CreateSuggestedEditInput>;

export const ReviewSuggestedEditInput = z.object({
  action: z.enum(['approved', 'rejected']),
});
export type ReviewSuggestedEditInput = z.infer<typeof ReviewSuggestedEditInput>;

export const SuggestedEditRecord = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string().nullable(),
  featureId: z.string().uuid(),
  commentId: z.string().uuid().nullable(),
  status: SuggestEditStatus,
  diffPayload: z.record(z.unknown()),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type SuggestedEditRecord = z.infer<typeof SuggestedEditRecord>;
