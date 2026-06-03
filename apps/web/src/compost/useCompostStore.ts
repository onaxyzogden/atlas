/**
 * useCompostStore — local-first persisted slice for the compost vertical,
 * now backed by the typed org-scoped compost API (Phase 3 hardening).
 *
 * The public surface is UNCHANGED so the Plan/Act/Observe screens keep their
 * existing selectors: `readings`, `logReading(tempC, note)`, `reset()`. What
 * changed underneath:
 *
 *  - `logReading` is now OPTIMISTIC: it appends a temp-id reading immediately
 *    (so Act → Observe still flows synchronously) AND enqueues a `createReading`
 *    op, then kicks the flush. On success the temp id reconciles to the server
 *    id (see compostSync.ts).
 *  - New persisted fields hold the server linkage (`orgId`/`siteId`/`pileId`),
 *    the org-shared Plan payload (`pile`), the hydration flag, and the offline
 *    op `queue`. The underscore-prefixed setters are internal (sync-layer use).
 *
 * Persist key + bumped to `version: 2` with a `migrate` from the v1 `{readings}`
 * shape. `partialize` persists only data (never functions). The queue lives in
 * this slice's own localStorage — NOT IndexedDB — so the resilience layer is
 * self-contained and org-scoped (unlike the project-scoped syncQueue.ts).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompostPile, CompostReading } from '@ogden/shared';
import { READINGS, type PlanRecipe, type Reading } from './model.js';
import {
  formatReadingDate,
  planRecipeFromPile,
  readingCreatePayload,
  readingFromApi,
  reindexDays,
  type CompostOp,
} from './compostMapping.js';
import { scheduleFlush } from './compostSync.js';

let localIdCounter = 0;
function makeLocalId(): string {
  localIdCounter += 1;
  return `local-${Date.now()}-${localIdCounter}`;
}

/** Payload the sync layer hands to `_applyHydration` after a server fetch. */
interface HydrationPayload {
  orgId: string;
  siteId: string;
  pileId: string;
  pile: PlanRecipe;
  readings: Reading[];
}

interface CompostState {
  // ── Persisted data ──
  readings: Reading[];
  /** Org this slice is synced to (null before first hydration). */
  orgId: string | null;
  siteId: string | null;
  pileId: string | null;
  /** Org-shared Plan payload; null falls back to the static PLAN_RECIPE. */
  pile: PlanRecipe | null;
  /** True once a server fetch has populated this slice at least once. */
  hydrated: boolean;
  /** Offline op-queue (optimistic writes awaiting server confirmation). */
  queue: CompostOp[];

  // ── Public actions (stable identity — screens depend on these) ──
  /** Append a manual reading. `tempC` is the operator-entered Celsius value. */
  logReading: (tempC: number, note: string) => void;
  /** Restore the textbook seed (dev reset affordance). */
  reset: () => void;

  // ── Internal setters (sync layer only) ──
  _applyHydration: (payload: HydrationPayload) => void;
  _dequeue: (localId: string) => void;
  _updateOp: (op: CompostOp) => void;
  _reconcileReading: (localId: string, server: CompostReading) => void;
  _applyPilePatch: (server: CompostPile) => void;
}

export const useCompostStore = create<CompostState>()(
  persist(
    (set) => ({
      readings: READINGS,
      orgId: null,
      siteId: null,
      pileId: null,
      pile: null,
      hydrated: false,
      queue: [],

      logReading: (tempC, note) => {
        const localId = makeLocalId();
        const capturedAt = new Date().toISOString();
        set((s) => {
          const last = s.readings[s.readings.length - 1];
          const tempF = Math.round((tempC * 9) / 5 + 32);
          const next: Reading = {
            id: localId,
            day: s.readings.length,
            date: formatReadingDate(capturedAt),
            temp: tempF,
            moisture: last?.moisture ?? 50,
            turned: false,
            note,
            proofPhoto: false,
          };
          const op: CompostOp = {
            kind: 'createReading',
            localId,
            payload: readingCreatePayload(tempC, note, capturedAt),
            retryCount: 0,
            ts: Date.now(),
          };
          return { readings: [...s.readings, next], queue: [...s.queue, op] };
        });
        // Push to the server (no-op offline; reconciled on success/reconnect).
        scheduleFlush();
      },

      reset: () => set({ readings: READINGS, queue: [], pile: null, hydrated: false }),

      _applyHydration: ({ orgId, siteId, pileId, pile, readings }) =>
        set((s) => {
          // Preserve optimistic readings still awaiting a server id so a
          // re-fetch (which won't include them yet) never drops a pending log.
          const pendingIds = new Set(
            s.queue.filter((o) => o.kind === 'createReading').map((o) => o.localId),
          );
          const optimistic = s.readings.filter((r) => pendingIds.has(r.id));
          return {
            orgId,
            siteId,
            pileId,
            pile,
            hydrated: true,
            readings: reindexDays([...readings, ...optimistic]),
          };
        }),

      _dequeue: (localId) =>
        set((s) => ({ queue: s.queue.filter((o) => o.localId !== localId) })),

      _updateOp: (op) =>
        set((s) => ({ queue: s.queue.map((o) => (o.localId === op.localId ? op : o)) })),

      _reconcileReading: (localId, server) =>
        set((s) => {
          const idx = s.readings.findIndex((r) => r.id === localId);
          if (idx === -1) return s;
          const prev = idx > 0 ? s.readings[idx - 1] : undefined;
          const mapped = readingFromApi(server, idx, prev?.moisture ?? 50);
          const readings = [...s.readings];
          readings[idx] = mapped;
          return { readings: reindexDays(readings) };
        }),

      _applyPilePatch: (server) =>
        set((s) => ({ pile: planRecipeFromPile(server, s.pile?.site) })),
    }),
    {
      name: 'ogden-compost-pile',
      version: 2,
      // v1 persisted only `{ readings }`; seed the new server-linkage fields and
      // force a re-hydrate. Never trust a persisted `hydrated: true` — the slice
      // always re-fetches on mount, and the persisted state is the offline cache.
      migrate: (persisted, _version) => {
        const p = (persisted ?? {}) as Partial<CompostState>;
        return {
          readings: p.readings ?? READINGS,
          orgId: p.orgId ?? null,
          siteId: p.siteId ?? null,
          pileId: p.pileId ?? null,
          pile: p.pile ?? null,
          hydrated: false,
          queue: p.queue ?? [],
        } as CompostState;
      },
      partialize: (s) => ({
        readings: s.readings,
        queue: s.queue,
        orgId: s.orgId,
        siteId: s.siteId,
        pileId: s.pileId,
        pile: s.pile,
        hydrated: s.hydrated,
      }),
    },
  ),
);
