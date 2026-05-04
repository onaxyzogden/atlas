/**
 * useRelationshipsSync — Phase 3 server sync for the Needs & Yields graph.
 *
 * Drains the local pending-mutations queue (writes) and hydrates from the
 * server (read), per ADR wiki/decisions/2026-04-28-needs-yields-dependency-graph.md.
 *
 * Design points:
 *   - localStorage is canonical: optimistic local writes never block on the
 *     network. The store enqueues every mutation; this hook drains them.
 *   - Drain is sequential FIFO: a failed mutation is requeued at the head
 *     so order is preserved across reconnect (avoids racey DELETEs landing
 *     before their corresponding ADD).
 *   - Drains pause on `ApiError` (server reachable but rejected) by leaving
 *     the queue intact — surfacing the bug on next mount instead of looping.
 *   - Network errors retry on a `setInterval` poll.
 */

import { useEffect, useRef } from 'react';
import { api, ApiError, type RelationshipRecord } from '../../lib/apiClient.js';
import { useRelationshipsStore } from '../../store/relationshipsStore.js';

const DRAIN_INTERVAL_MS = 15_000;

export function useRelationshipsSync(projectId: string | null) {
  const drainingRef = useRef(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    async function hydrate() {
      try {
        const res = await api.relationships.list(projectId!);
        if (cancelled) return;
        const list = res.data as RelationshipRecord[];
        useRelationshipsStore.getState().hydrateFromServer(
          projectId!,
          list.map((r) => ({
            id: r.id,
            fromId: r.fromId,
            fromOutput: r.fromOutput as never,
            toId: r.toId,
            toInput: r.toInput as never,
            ...(r.ratio !== undefined ? { ratio: r.ratio } : {}),
          })),
        );
      } catch {
        // offline or 4xx — keep local copy, sync hook will retry on next interval.
      }
    }

    async function drain() {
      if (drainingRef.current || cancelled) return;
      drainingRef.current = true;
      try {
        const store = useRelationshipsStore.getState();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const next = store.shiftPending(projectId!);
          if (!next) break;
          try {
            if (next.kind === 'add') {
              const res = await api.relationships.create(projectId!, next.edge);
              const record = res.data as RelationshipRecord;
              useRelationshipsStore
                .getState()
                .markEdgeSynced(projectId!, next.edge, record.id);
            } else {
              await api.relationships.delete(projectId!, next.serverId);
            }
          } catch (err) {
            if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
              // Server-side rejection — drop this mutation; logging it loud so
              // the bug surfaces in dev rather than spinning forever.
              // eslint-disable-next-line no-console
              console.warn('[relationships] dropping rejected mutation', next, err);
            } else {
              // Network / 5xx — requeue at head and stop draining for now.
              useRelationshipsStore.getState().unshiftPending(projectId!, next);
              break;
            }
          }
        }
      } finally {
        drainingRef.current = false;
      }
    }

    void hydrate().then(drain);
    const id = window.setInterval(drain, DRAIN_INTERVAL_MS);
    const onOnline = () => void drain();
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
    };
  }, [projectId]);
}
