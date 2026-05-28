/**
 * useProjectRole — resolves the current user's role on a project and
 * derives the spec capability set per `projectRoleCapabilities` so all 8
 * `ProjectRole` variants (4 legacy + 4 OLOS spec-shaped, added Phase 5
 * Slice 5.1) return correct booleans without per-call literal checks.
 *
 * Fetches from backend if not cached.
 */

import { useEffect } from 'react';
import { useMemberStore } from '../store/memberStore.js';
import { useAuthStore } from '../store/authStore.js';
import { hasCapability, type ProjectRole } from '@ogden/shared';

interface ProjectRoleResult {
  role: ProjectRole | null;
  canEdit: boolean;          // role grants `edit`
  canComment: boolean;       // role grants `comment`
  canDelete: boolean;        // role grants `delete_project`
  canManageMembers: boolean; // role grants `manage_members`
  canSuggestEdits: boolean;  // role grants `suggest_edits`
  isLoading: boolean;
}

export function useProjectRole(projectId: string | undefined): ProjectRoleResult {
  const myRole = useMemberStore((s) => s.myRole);
  const isLoading = useMemberStore((s) => s.isLoading);
  const fetchMyRole = useMemberStore((s) => s.fetchMyRole);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (projectId && user) {
      fetchMyRole(projectId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, !!user]);

  const role = myRole;

  return {
    role,
    canEdit:          role !== null && hasCapability(role, 'edit'),
    canComment:       role !== null && hasCapability(role, 'comment'),
    canDelete:        role !== null && hasCapability(role, 'delete_project'),
    canManageMembers: role !== null && hasCapability(role, 'manage_members'),
    canSuggestEdits:  role !== null && hasCapability(role, 'suggest_edits'),
    isLoading,
  };
}
