/**
 * undoCoordinatorStore — global cross-store undo/redo for the seven OBSERVE
 * namespace stores. Each of those stores is now wrapped with zundo's
 * `temporal()` middleware (per-store undo history). This atom layers a
 * single global timeline on top: every forward mutation appends the
 * mutated store's name to a `history` stack, undo pops the latest name
 * and dispatches `temporal.undo()` on that store, redo reverses.
 *
 * Wiring strategy
 * ---------------
 * Each store's `temporal` slice is a vanilla zustand store with its own
 * `subscribe`. We:
 *
 *   1. Wait for `persist.onFinishHydration` on every wrapped store so the
 *      rehydration `setState` doesn't get logged as a user mutation.
 *   2. Call `temporal.getState().clear()` on each to flush the past states
 *      that rehydration accumulated.
 *   3. Subscribe to each `temporal`. When `pastStates.length` increases
 *      between two consecutive snapshots, treat that as a forward
 *      mutation and append the store's name to the history. (`undo()`
 *      *decreases* `pastStates.length`, so it never trips this branch.
 *      `redo()` *increases* it — we use a flag to differentiate.)
 *
 * Not persisted — undo history doesn't survive a reload (zundo's history
 * is in-memory by design).
 */

import { create } from 'zustand';
import { useHumanContextStore } from './humanContextStore.js';
import { useTopographyStore } from './topographyStore.js';
import { useExternalForcesStore } from './externalForcesStore.js';
import { useWaterSystemsStore } from './waterSystemsStore.js';
import { useEcologyStore } from './ecologyStore.js';
import { useSwotStore } from './swotStore.js';
import { useSoilSampleStore } from './soilSampleStore.js';
import { useZoneStore } from './zoneStore.js';
import { usePathStore } from './pathStore.js';
import { useCropStore } from './cropStore.js';
import { useLivestockStore } from './livestockStore.js';
import { useClosedLoopStore } from './closedLoopStore.js';
import { usePolycultureStore } from './polycultureStore.js';

export type UndoableStoreName =
  | 'humanContext'
  | 'topography'
  | 'externalForces'
  | 'waterSystems'
  | 'ecology'
  | 'swot'
  | 'soilSample'
  | 'zone'
  | 'path'
  | 'crop'
  | 'livestock'
  | 'closedLoop'
  | 'polyculture';

interface UndoCoordinatorState {
  history: UndoableStoreName[];
  redoHistory: UndoableStoreName[];
  /** True while we're dispatching undo/redo on a child store, so the
   *  subscriber can distinguish coordinator-driven changes from user
   *  forward mutations. */
  inFlight: boolean;
  pushMutation: (name: UndoableStoreName) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

/** Map each store name to its zustand store handle. We treat each as
 *  loosely-typed (`{ temporal: { getState: () => { undo, redo, ... } } }`)
 *  because the public temporal API is identical across stores. */
type TemporalApi = {
  getState: () => {
    undo: () => void;
    redo: () => void;
    clear: () => void;
    pastStates: unknown[];
    futureStates: unknown[];
  };
  subscribe: (
    listener: (
      curr: { pastStates: unknown[]; futureStates: unknown[] },
      prev: { pastStates: unknown[]; futureStates: unknown[] },
    ) => void,
  ) => () => void;
};
type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (cb: () => void) => () => void;
};
type StoreWithMiddleware = { temporal: TemporalApi; persist: PersistApi };

const STORES: Record<UndoableStoreName, StoreWithMiddleware> = {
  humanContext: useHumanContextStore as unknown as StoreWithMiddleware,
  topography: useTopographyStore as unknown as StoreWithMiddleware,
  externalForces: useExternalForcesStore as unknown as StoreWithMiddleware,
  waterSystems: useWaterSystemsStore as unknown as StoreWithMiddleware,
  ecology: useEcologyStore as unknown as StoreWithMiddleware,
  swot: useSwotStore as unknown as StoreWithMiddleware,
  soilSample: useSoilSampleStore as unknown as StoreWithMiddleware,
  zone: useZoneStore as unknown as StoreWithMiddleware,
  path: usePathStore as unknown as StoreWithMiddleware,
  crop: useCropStore as unknown as StoreWithMiddleware,
  livestock: useLivestockStore as unknown as StoreWithMiddleware,
  closedLoop: useClosedLoopStore as unknown as StoreWithMiddleware,
  polyculture: usePolycultureStore as unknown as StoreWithMiddleware,
};

export const useUndoCoordinatorStore = create<UndoCoordinatorState>((set, get) => ({
  history: [],
  redoHistory: [],
  inFlight: false,

  pushMutation: (name) =>
    set((s) => ({
      history: [...s.history, name],
      // Forward mutation invalidates any pending redo timeline.
      redoHistory: [],
    })),

  undo: () => {
    const { history, redoHistory } = get();
    const last = history[history.length - 1];
    if (!last) return;
    const store = STORES[last];
    set({ inFlight: true });
    try {
      store.temporal.getState().undo();
    } finally {
      set({ inFlight: false });
    }
    set({
      history: history.slice(0, -1),
      redoHistory: [...redoHistory, last],
    });
  },

  redo: () => {
    const { history, redoHistory } = get();
    const last = redoHistory[redoHistory.length - 1];
    if (!last) return;
    const store = STORES[last];
    set({ inFlight: true });
    try {
      store.temporal.getState().redo();
    } finally {
      set({ inFlight: false });
    }
    set({
      history: [...history, last],
      redoHistory: redoHistory.slice(0, -1),
    });
  },

  reset: () => set({ history: [], redoHistory: [] }),
}));

// ── One-shot subscription wiring (module-eval side effect) ────────────────────

/** Track per-store whether we've already attached the subscriber. Idempotent
 *  in case this module is re-evaluated (e.g. HMR). */
const wired = new Set<UndoableStoreName>();

function wireStore(name: UndoableStoreName): void {
  if (wired.has(name)) return;
  wired.add(name);
  const store = STORES[name];
  // Flush the past states accumulated during rehydration so the *first*
  // user mutation is what shows up in our history, not rehydration churn.
  try {
    store.temporal.getState().clear();
  } catch {
    /* tolerate missing clear() */
  }
  store.temporal.subscribe((curr, prev) => {
    if (curr.pastStates.length <= prev.pastStates.length) return;
    // pastStates grew — either a forward mutation OR a redo dispatch.
    // Both should land in `history`; only forward mutations should clear
    // `redoHistory`. The coordinator's `redo()` sets `inFlight`, so we
    // skip the entire push here for redo (the coordinator already
    // appended to history at the source).
    const inFlight = useUndoCoordinatorStore.getState().inFlight;
    if (inFlight) return;
    useUndoCoordinatorStore.getState().pushMutation(name);
  });
}

/** Attach subscribers as soon as each store finishes hydration. Stores
 *  that have already hydrated by the time this module loads attach
 *  immediately. */
function setupUndoCoordinator(): void {
  if (typeof window === 'undefined') return; // SSR / vitest no-op default
  for (const name of Object.keys(STORES) as UndoableStoreName[]) {
    const store = STORES[name];
    if (store.persist.hasHydrated()) {
      wireStore(name);
    } else {
      store.persist.onFinishHydration(() => wireStore(name));
    }
  }
}

setupUndoCoordinator();
