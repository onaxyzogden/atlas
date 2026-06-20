/**
 * useServerMachineryInventory — bridges the local zustand
 * `useMachineryInventoryStore` to the `/api/v1/machinery-items` REST endpoints.
 *
 * Behaviour
 * - On mount: GET the project's items, hydrate the store (server wins on
 *   id conflict; localStorage entries with no server match are kept until
 *   the next mutation creates/updates them server-side).
 * - On store change: diff the previous and next list for the project and
 *   POST / PATCH / DELETE accordingly. Mutations are fire-and-forget; UI
 *   updates remain optimistic via the local store.
 *
 * Mount once per active project (e.g. inside the Plan stage shell). Multiple
 * concurrent mounts will each subscribe — guard with a top-level mount.
 */

import { useEffect, useRef } from 'react';
import { api } from '../lib/apiClient.js';
import { DEMO_OFFLINE_ENABLED } from '../app/demoSession.js';
import {
  useMachineryInventoryStore,
  type MachineryItem,
} from '../store/machineryInventoryStore.js';
import type {
  MachineryItemSummary,
  CreateMachineryItemInput,
  UpdateMachineryItemInput,
} from '@ogden/shared';

function summaryToItem(row: MachineryItemSummary): MachineryItem {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    purpose: row.purpose,
    frequency: row.frequency,
    fuelType: row.fuelType,
    requiredWidthM: row.requiredWidthM ?? undefined,
    requiredTurnRadiusM: row.requiredTurnRadiusM ?? undefined,
    housingElementId: row.housingElementId ?? undefined,
    acquisitionYear: row.acquisitionYear ?? undefined,
    lifecycleYearsEstimate: row.lifecycleYearsEstimate ?? undefined,
  };
}

function itemToCreateInput(item: MachineryItem): CreateMachineryItemInput {
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    purpose: item.purpose,
    frequency: item.frequency,
    fuelType: item.fuelType,
    requiredWidthM: item.requiredWidthM ?? null,
    requiredTurnRadiusM: item.requiredTurnRadiusM ?? null,
    housingElementId: item.housingElementId ?? null,
    acquisitionYear: item.acquisitionYear ?? null,
    lifecycleYearsEstimate: item.lifecycleYearsEstimate ?? null,
  };
}

function itemToUpdateInput(item: MachineryItem): UpdateMachineryItemInput {
  return itemToCreateInput(item);
}

function itemsEqual(a: MachineryItem, b: MachineryItem): boolean {
  return (
    a.name === b.name &&
    a.kind === b.kind &&
    a.purpose === b.purpose &&
    a.frequency === b.frequency &&
    a.fuelType === b.fuelType &&
    (a.requiredWidthM ?? null) === (b.requiredWidthM ?? null) &&
    (a.requiredTurnRadiusM ?? null) === (b.requiredTurnRadiusM ?? null) &&
    (a.housingElementId ?? null) === (b.housingElementId ?? null) &&
    (a.acquisitionYear ?? null) === (b.acquisitionYear ?? null) &&
    (a.lifecycleYearsEstimate ?? null) === (b.lifecycleYearsEstimate ?? null)
  );
}

export function useServerMachineryInventory(projectId: string | undefined): void {
  const hydratedRef = useRef<string | null>(null);

  // ── Initial hydration ─────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    // Offline demo: machinery inventory is local-first (persisted to IndexedDB),
    // so there is no backend to hydrate from — a GET would only 401 and warn.
    if (DEMO_OFFLINE_ENABLED) return;
    if (hydratedRef.current === projectId) return;
    hydratedRef.current = projectId;

    let cancelled = false;
    api.machineryItems
      .list(projectId)
      .then((envelope) => {
        if (cancelled) return;
        const serverItems = (envelope.data ?? []).map(summaryToItem);
        useMachineryInventoryStore.setState((state) => {
          const local = state.byProject[projectId] ?? [];
          // Server wins on id collision; preserve any local-only items so the
          // first mutation will create them server-side.
          const serverIds = new Set(serverItems.map((it) => it.id));
          const localOnly = local.filter((it) => !serverIds.has(it.id));
          return {
            byProject: {
              ...state.byProject,
              [projectId]: [...serverItems, ...localOnly],
            },
          };
        });
      })
      .catch((err) => {
        // Hydration failures are non-fatal — keep the local store as source
        // of truth and let the next mutation try to push.
        // eslint-disable-next-line no-console
        console.warn('[machinery] server hydration failed:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // ── Push local changes to the server ──────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    // Offline demo: no backend to push to — local mutations persist via the
    // store's IndexedDB and need no server sync.
    if (DEMO_OFFLINE_ENABLED) return;

    let prev = useMachineryInventoryStore.getState().byProject[projectId] ?? [];

    const unsubscribe = useMachineryInventoryStore.subscribe((state) => {
      const next = state.byProject[projectId] ?? [];
      if (next === prev) return;

      const prevById = new Map(prev.map((it) => [it.id, it]));
      const nextById = new Map(next.map((it) => [it.id, it]));

      // Created
      for (const item of next) {
        if (!prevById.has(item.id)) {
          api.machineryItems.create(projectId, itemToCreateInput(item)).catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('[machinery] server create failed:', err);
          });
        }
      }

      // Updated
      for (const item of next) {
        const before = prevById.get(item.id);
        if (before && !itemsEqual(before, item)) {
          api.machineryItems.update(item.id, itemToUpdateInput(item)).catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('[machinery] server update failed:', err);
          });
        }
      }

      // Deleted
      for (const item of prev) {
        if (!nextById.has(item.id)) {
          api.machineryItems.delete(item.id).catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('[machinery] server delete failed:', err);
          });
        }
      }

      prev = next;
    });

    return () => {
      unsubscribe();
    };
  }, [projectId]);
}
