/**
 * useCompostHydration — mount-time hook that wires the compost slice to the
 * server. Keyed on the authenticated user's `defaultOrgId`:
 *
 *  - resolves-or-creates the org's site + pile and (idempotently) server-seeds
 *    the textbook readings, then populates the store from the server;
 *  - registers the reconnect reflush so a queued offline write is pushed once
 *    the API becomes reachable again.
 *
 * No-op (keeps the persisted local cache) until an org is known. Replaces the
 * bare `void useCompostStore(s => s.readings.length)` touch the workspace page
 * used to do.
 */

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { hydrate, subscribeReconnectFlush } from './compostSync.js';

export function useCompostHydration(): void {
  const orgId = useAuthStore((s) => s.user?.defaultOrgId);

  useEffect(() => {
    if (!orgId) return;
    const unsubscribe = subscribeReconnectFlush();
    void hydrate(orgId);
    return unsubscribe;
  }, [orgId]);
}
