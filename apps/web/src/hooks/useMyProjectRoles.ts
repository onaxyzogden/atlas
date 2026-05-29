// useMyProjectRoles.ts
//
// Slice 5.5a - bulk per-project role map for the signed-in user. The single
// role source for the Portfolio role badge and the Per-Project Home access
// gate. Keyed by SERVER project id (projects.id), because role is a
// backend-synced concept: local-only projects have no serverId and therefore
// never appear in the map. Signed-out sessions never fetch and get a stable
// empty map, so the dominant offline/demo flow always renders the full
// single-owner view ("scoped views are an authenticated + synced capability").

import { useEffect, useMemo } from 'react';
import type { ProjectRole } from '@ogden/shared';
import { useMemberStore } from '../store/memberStore.js';
import { useAuthStore } from '../store/authStore.js';

const EMPTY: ReadonlyMap<string, ProjectRole> = new Map();

export function useMyProjectRoles(): ReadonlyMap<string, ProjectRole> {
  const user = useAuthStore((s) => s.user);
  const myRoles = useMemberStore((s) => s.myRoles);
  const fetchMyRoles = useMemberStore((s) => s.fetchMyRoles);

  useEffect(() => {
    if (user) {
      fetchMyRoles();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);

  return useMemo(() => {
    const keys = Object.keys(myRoles);
    if (keys.length === 0) return EMPTY;
    const map = new Map<string, ProjectRole>();
    for (const key of keys) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      map.set(key, myRoles[key]!);
    }
    return map;
  }, [myRoles]);
}
