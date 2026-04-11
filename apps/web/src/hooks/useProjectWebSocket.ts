/**
 * useProjectWebSocket — connects the WebSocket service to the project lifecycle.
 *
 * Opens a WS connection when the project page loads (if MULTI_USER is enabled),
 * disconnects on unmount, and runs stale presence pruning.
 */

import { useEffect } from 'react';
import { FLAGS } from '@ogden/shared';
import { useAuthStore } from '../store/authStore.js';
import { usePresenceStore } from '../store/presenceStore.js';
import { wsService } from '../lib/wsService.js';

const PRUNE_INTERVAL_MS = 15_000;

export function useProjectWebSocket(projectServerId: string | undefined) {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!FLAGS.MULTI_USER || !projectServerId || !token) return;

    wsService.connect(projectServerId, token);

    // Stale presence pruning
    const pruneTimer = setInterval(() => {
      usePresenceStore.getState().pruneStale();
    }, PRUNE_INTERVAL_MS);

    return () => {
      clearInterval(pruneTimer);
      wsService.disconnect();
    };
  }, [projectServerId, token]);
}
