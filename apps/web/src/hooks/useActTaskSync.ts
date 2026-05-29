/**
 * useActTaskSync - pulls a project's ActTasks from the server on mount so a
 * freshly opened device sees assignments made elsewhere.
 *
 * No-op for local-only projects (no serverId): assignment / scoped views are
 * an authenticated + synced capability, and the offline/demo flow always
 * renders the full local view. Safe to call unconditionally (before any early
 * return) because it guards on its own arguments.
 */
import { useEffect } from 'react';
import { useActTaskStore } from '../store/olos/index.js';

export function useActTaskSync(
  localProjectId?: string,
  serverId?: string,
): void {
  useEffect(() => {
    if (!localProjectId || !serverId) return;
    void useActTaskStore.getState().pullAll(localProjectId, serverId);
  }, [localProjectId, serverId]);
}
