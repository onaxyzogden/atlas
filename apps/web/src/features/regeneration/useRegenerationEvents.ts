/**
 * useRegenerationEvents — fetch-on-mount convenience hook for the
 * RegenerationTimelineCard. Pulls the cached per-project events out of
 * `regenerationEventStore` and triggers a fetch if the cache is empty.
 */

import { useEffect } from 'react';
import {
  useRegenerationEventStore,
  useRegenerationEvents as useEventsSelector,
  type ProjectEvents,
} from '../../store/regenerationEventStore.js';

export function useRegenerationEventsForProject(projectId: string | undefined): ProjectEvents | null {
  const state = useEventsSelector(projectId);
  const fetchForProject = useRegenerationEventStore((s) => s.fetchForProject);

  useEffect(() => {
    if (!projectId) return;
    if (!state || state.status === 'idle') {
      void fetchForProject(projectId);
    }
  }, [projectId, state, fetchForProject]);

  return state;
}
