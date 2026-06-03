/**
 * compostSync — bespoke local-first resilience layer that mediates between
 * `useCompostStore` and the typed org-scoped compost API (`/api/v1/compost/*`).
 *
 * It reproduces the resilience properties of the project-scoped `syncQueue.ts`
 * (offline op-queue, optimistic writes, temp-id→server-id reconciliation,
 * capped exponential backoff, circuit-breaker drop) WITHOUT reusing it — that
 * engine is project-scoped + IndexedDB-backed, whereas compost is org-scoped
 * and persists its queue inside the store's own localStorage slice.
 *
 * Surfaces status through the existing `connectivityStore`
 * (`syncStatus` / `pendingChanges` / `lastSyncedAt` / `droppedStores`).
 *
 * Circular import note: this module imports `useCompostStore` and the store
 * imports `scheduleFlush` from here. Neither calls the other at module-eval
 * time (only inside functions), so the ES live-binding cycle is safe.
 */

import { api, ApiError } from '../lib/apiClient.js';
import { useConnectivityStore } from '../store/connectivityStore.js';
import { useCompostStore } from './useCompostStore.js';
import {
  pileCreateFromPlanRecipe,
  planRecipeFromPile,
  readingsFromApi,
  seedCapturedAt,
  seedReadingToApiCreate,
  type CompostOp,
} from './compostMapping.js';
import { PLAN_RECIPE, READINGS } from './model.js';

// Mirror syncQueue.ts semantics.
const MAX_RETRIES = 5;
const STORE_TAG = 'compost';

// ── Module-level transient state (never persisted) ─────────────────────────
let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectUnsub: (() => void) | null = null;
// In-flight hydration coalescing. React 19 StrictMode double-invokes the mount
// effect (and useCompostHydration's cleanup can't cancel an async hydrate), so
// two concurrent hydrate() calls would BOTH see an empty site list and BOTH
// create a site/pile + re-seed — duplicating everything. Coalescing the
// concurrent calls onto one promise (keyed by org) makes the first-load
// resolve-or-create atomic per tab. (Cross-process first-load races between two
// separate members remain a server-side idempotency follow-up.)
let hydrating: Promise<void> | null = null;
let hydratingOrg: string | null = null;

/** Capped exponential backoff: min(1000 * 2^(n-1), 16000) ms. */
function backoff(attempt: number): number {
  return Math.min(1000 * 2 ** Math.max(0, attempt - 1), 16_000);
}

/** Coalescing/circuit-breaker key surfaced to the connectivity store. */
function opKey(op: CompostOp): string {
  return `${STORE_TAG}:${op.kind}:${op.localId}`;
}

/** Deterministic "pick lowest id" so two concurrent first-loads converge on
 *  the same site/pile rather than forking duplicates. */
function pickLowest<T extends { id: string }>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return [...arr].sort((a, b) => a.id.localeCompare(b.id))[0];
}

/** True for a permanent (non-retryable) client error — validation/permission.
 *  408 (timeout) and 429 (rate-limit) are transient and DO get retried. */
function isPermanent(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status >= 400 &&
    err.status < 500 &&
    err.status !== 408 &&
    err.status !== 429
  );
}

function markSynced(): void {
  const conn = useConnectivityStore.getState();
  conn.setLastSyncedAt(new Date().toISOString());
  conn.setPendingChanges(useCompostStore.getState().queue.length);
}

function scheduleRetry(ms: number): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushQueue();
  }, ms);
}

// ── Outbound op execution ──────────────────────────────────────────────────

async function executeOp(op: CompostOp): Promise<void> {
  const pileId = useCompostStore.getState().pileId;
  if (!pileId) throw new Error('compostSync: no pile to sync against');

  if (op.kind === 'createReading') {
    const { data } = await api.compost.readings.create(pileId, op.payload);
    useCompostStore.getState()._reconcileReading(op.localId, data);
  } else {
    const { data } = await api.compost.piles.update(pileId, op.patch);
    useCompostStore.getState()._applyPilePatch(data);
  }
}

/**
 * Drain the queue FIFO. Re-entrancy-guarded. On a permanent error or after
 * MAX_RETRIES the op is dropped and surfaced via `addDroppedStore`. On a
 * transient error the op's retryCount is bumped and a backoff retry scheduled;
 * the pass stops there to preserve ordering.
 */
export async function flushQueue(): Promise<void> {
  if (flushing) return;

  const conn = useConnectivityStore.getState();
  const store = useCompostStore.getState();
  if (!store.pileId) return; // nothing to sync against yet (pre-hydration)

  const queue = store.queue;
  if (queue.length === 0) return;

  // Offline: keep the queue, reflect pending count, defer to reconnect.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    conn.setPendingChanges(queue.length);
    return;
  }

  flushing = true;
  conn.setSyncStatus('syncing');
  try {
    const ordered = [...queue].sort((a, b) => a.ts - b.ts);
    for (const op of ordered) {
      try {
        await executeOp(op);
        useCompostStore.getState()._dequeue(op.localId);
      } catch (err) {
        const bumped: CompostOp = { ...op, retryCount: op.retryCount + 1 };
        if (isPermanent(err) || bumped.retryCount > MAX_RETRIES) {
          // Give up on this op — drop it and surface it to the steward.
          useCompostStore.getState()._dequeue(op.localId);
          conn.addDroppedStore(opKey(op));
          continue;
        }
        // Transient — bump retry, stop the pass, schedule a backoff retry.
        useCompostStore.getState()._updateOp(bumped);
        conn.setPendingChanges(useCompostStore.getState().queue.length);
        conn.setSyncStatus('error');
        scheduleRetry(backoff(bumped.retryCount));
        return;
      }
    }

    const remaining = useCompostStore.getState().queue.length;
    conn.setPendingChanges(remaining);
    if (remaining === 0) {
      markSynced();
      conn.setSyncStatus('idle');
    } else {
      // Ops enqueued mid-pass (not in the snapshot) — drain them next tick.
      setTimeout(() => void flushQueue(), 0);
    }
  } finally {
    flushing = false;
  }
}

/** Called by the store after an optimistic enqueue. */
export function scheduleFlush(): void {
  void flushQueue();
}

// ── Hydration ──────────────────────────────────────────────────────────────

/**
 * Resolve-or-create the org's compost site + pile, idempotently server-seed
 * the textbook readings on a brand-new pile, then populate the store from the
 * server (merging any not-yet-synced optimistic readings). Re-runs on every
 * mount so other members' readings appear; the persisted store is the offline
 * cache shown until this resolves.
 *
 * Graceful no-op when offline or unauthenticated: the local seed is preserved
 * and no ops are enqueued.
 */
export async function hydrate(orgId: string): Promise<void> {
  if (!orgId) return;
  // Coalesce concurrent hydrations for the same org onto one in-flight promise
  // (StrictMode double-mount guard — see `hydrating` declaration above). Once it
  // settles the latch clears, so a genuine later remount re-fetches to pick up
  // other members' readings.
  if (hydrating && hydratingOrg === orgId) return hydrating;
  hydrating = _hydrate(orgId).finally(() => {
    hydrating = null;
    hydratingOrg = null;
  });
  hydratingOrg = orgId;
  return hydrating;
}

async function _hydrate(orgId: string): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    // Offline: keep the persisted cache, try to flush whatever is queued.
    void flushQueue();
    return;
  }

  try {
    // 1. Resolve or create the site.
    const sitesEnv = await api.compost.sites.list(orgId);
    let site = pickLowest(sitesEnv.data);
    if (!site) {
      const created = await api.compost.sites.create({ orgId, name: PLAN_RECIPE.site });
      site = created.data;
    }

    // 2. Resolve or create the pile.
    const pilesEnv = await api.compost.piles.list(site.id);
    let pile = pickLowest(pilesEnv.data);
    let pileJustCreated = false;
    if (!pile) {
      const created = await api.compost.piles.create(
        site.id,
        pileCreateFromPlanRecipe(PLAN_RECIPE),
      );
      pile = created.data;
      pileJustCreated = true;
    }

    // 3. Seed the 35 textbook readings ONLY for a brand-new pile, with a
    //    secondary empty-list guard (idempotent on re-entry / concurrent load).
    let readingsEnv = await api.compost.readings.list(pile.id);
    if (pileJustCreated && readingsEnv.data.length === 0) {
      for (const seed of READINGS) {
        await api.compost.readings.create(
          pile.id,
          seedReadingToApiCreate(seed, seedCapturedAt(seed.day)),
        );
      }
      readingsEnv = await api.compost.readings.list(pile.id);
    }

    // 4. Populate the store (the `_applyHydration` setter does NOT enqueue and
    //    preserves any optimistic readings still pending in the queue).
    useCompostStore.getState()._applyHydration({
      orgId,
      siteId: site.id,
      pileId: pile.id,
      pile: planRecipeFromPile(pile, site.name),
      readings: readingsFromApi(readingsEnv.data),
    });

    markSynced();
    useConnectivityStore.getState().setSyncStatus('idle');

    // Flush anything that was queued while offline / before hydration.
    await flushQueue();
  } catch {
    // Offline / unauthenticated / transient server error: keep the local seed,
    // enqueue nothing, leave `hydrated` false so the next mount retries. The
    // apiClient already drove `apiReachable` false on a network failure, which
    // will trigger a reflush via subscribeReconnectFlush once it recovers.
  }
}

// ── Reconnect reflush ──────────────────────────────────────────────────────

/**
 * Subscribe to connectivity transitions and reflush the queue when the API
 * becomes reachable again (false→true) or the device comes back online.
 * Idempotent: a second call returns the existing unsubscribe.
 */
export function subscribeReconnectFlush(): () => void {
  if (reconnectUnsub) return reconnectUnsub;
  const unsub = useConnectivityStore.subscribe((state, prev) => {
    const recovered =
      (state.apiReachable && !prev.apiReachable) || (state.isOnline && !prev.isOnline);
    if (recovered) void flushQueue();
  });
  reconnectUnsub = () => {
    unsub();
    reconnectUnsub = null;
  };
  return reconnectUnsub;
}
