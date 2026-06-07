/**
 * compostAccess — org-scoped authorization helpers for the composting vertical.
 *
 * The land-use routes gate on `resolveProjectRole` (keyed on the `projects`
 * table). Compost has NO project row — a pile is a batch, not a parcel — so it
 * authorizes against organization membership instead, exactly like
 * routes/organizations/index.ts does with `requireOrgOwner`/`requireOrgMember`.
 *
 * Org roles (migration 001): owner | admin | editor | viewer.
 *   - read  → any member
 *   - write → any member except a read-only `viewer`
 *   - destructive delete → org owner/admin OR the resource's own owner
 *
 * The context loaders resolve the owning org (and resource owner) for a nested
 * resource by walking reading → pile → site, so a caller only ever needs the
 * leaf id from the URL.
 */

import type { Sql } from 'postgres';
import { ForbiddenError, NotFoundError } from './errors.js';

export type OrgRole = 'owner' | 'admin' | 'editor' | 'viewer';

/** Caller must be a member of the org. Returns their role. */
export async function requireOrgMember(
  db: Sql,
  orgId: string,
  userId: string,
): Promise<OrgRole> {
  const [row] = await db`
    SELECT role FROM organization_members
    WHERE org_id = ${orgId} AND user_id = ${userId}
  `;
  if (!row) {
    throw new ForbiddenError('You are not a member of this organization');
  }
  return row.role as OrgRole;
}

/** Caller must be a member whose role can mutate (anything but read-only viewer). */
export async function requireOrgWriter(
  db: Sql,
  orgId: string,
  userId: string,
): Promise<OrgRole> {
  const role = await requireOrgMember(db, orgId, userId);
  if (role === 'viewer') {
    throw new ForbiddenError('Read-only members cannot modify compost records');
  }
  return role;
}

/**
 * Authorize a destructive delete: the org owner/admin, or the user who owns
 * the resource (its `owner_id` / `recorded_by`), may delete it.
 */
export async function requireOrgOwnerOrResourceOwner(
  db: Sql,
  orgId: string,
  userId: string,
  resourceOwnerId: string | null,
): Promise<void> {
  const role = await requireOrgMember(db, orgId, userId);
  if (role === 'owner' || role === 'admin') return;
  if (resourceOwnerId && resourceOwnerId === userId) return;
  throw new ForbiddenError(
    'Only an org owner/admin or the resource owner can delete this',
  );
}

export interface SiteContext {
  orgId: string;
  ownerId: string | null;
}

export async function getSiteContext(db: Sql, siteId: string): Promise<SiteContext> {
  const [row] = await db`
    SELECT org_id, owner_id FROM compost_sites WHERE id = ${siteId}
  `;
  if (!row) throw new NotFoundError('CompostSite', siteId);
  return {
    orgId: row.org_id as string,
    ownerId: (row.owner_id ?? null) as string | null,
  };
}

export interface PileContext {
  orgId: string;
  ownerId: string | null;
  siteId: string;
}

export async function getPileContext(db: Sql, pileId: string): Promise<PileContext> {
  const [row] = await db`
    SELECT org_id, owner_id, site_id FROM compost_piles WHERE id = ${pileId}
  `;
  if (!row) throw new NotFoundError('CompostPile', pileId);
  return {
    orgId: row.org_id as string,
    ownerId: (row.owner_id ?? null) as string | null,
    siteId: row.site_id as string,
  };
}

export interface ReadingContext {
  orgId: string;
  recordedBy: string | null;
  pileId: string;
}

export async function getReadingContext(
  db: Sql,
  readingId: string,
): Promise<ReadingContext> {
  const [row] = await db`
    SELECT r.recorded_by, r.pile_id, p.org_id
    FROM compost_readings r
    JOIN compost_piles p ON p.id = r.pile_id
    WHERE r.id = ${readingId}
  `;
  if (!row) throw new NotFoundError('CompostReading', readingId);
  return {
    orgId: row.org_id as string,
    recordedBy: (row.recorded_by ?? null) as string | null,
    pileId: row.pile_id as string,
  };
}
