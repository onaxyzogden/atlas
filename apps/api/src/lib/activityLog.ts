/**
 * activityLog — helper to record project activity for the audit/activity feed.
 */

import type { Sql } from 'postgres';

interface ActivityParams {
  projectId: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(
  db: Sql,
  { projectId, userId, action, entityType, entityId, metadata }: ActivityParams,
): Promise<void> {
  await db`
    INSERT INTO project_activity (project_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (
      ${projectId},
      ${userId},
      ${action},
      ${entityType ?? null},
      ${entityId ?? null},
      ${metadata ? JSON.stringify(metadata) : null}
    )
  `;
}
