/**
 * useProjectRole — resolves the current user's role on a project.
 *
 * Fetches from backend if not cached; provides derived permission booleans.
 */

import { useEffect } from 'react';
import { useMemberStore } from '../store/memberStore.js';
import { useAuthStore } from '../store/authStore.js';
import type { ProjectRole } from '@ogden/shared';

interface ProjectRoleResult {
  role: ProjectRole | null;
  canEdit: boolean;         // owner | designer
  canComment: boolean;      // owner | designer | reviewer
  canDelete: boolean;       // owner only
  canManageMembers: boolean; // owner only
  canSuggestEdits: boolean;  // reviewer only
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
    canEdit: role === 'owner' || role === 'designer',
    canComment: role === 'owner' || role === 'designer' || role === 'reviewer',
    canDelete: role === 'owner',
    canManageMembers: role === 'owner',
    canSuggestEdits: role === 'reviewer',
    isLoading,
  };
}
