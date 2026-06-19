/**
 * Portfolio POI store (Portfolio Home — resource nodes).
 *
 * Backed by the backend API; NOT persisted to localStorage (server is the
 * source of truth, mirrors `crossRelationshipStore`). POIs are portfolio-wide
 * (owner-scoped, no project param), so the store holds a single flat list of
 * `pois[]` and a derived flat `flows[]` (every POI↔project material flow across
 * all POIs) — the Portfolio Map reads both to draw diamond markers and the
 * material-flow lines connecting each POI to its linked projects.
 *
 * Mutations re-fetch the authoritative list so the nested `flows` (with their
 * server-supplied `projectName`) stay consistent. Create/flow-create RE-THROW
 * so the page can surface a `portfolio:toast` with the correct status copy.
 */

import { create } from 'zustand';
import { api } from '../lib/apiClient.js';
import { DEMO_OFFLINE_ENABLED } from '../app/demoSession.js';
import type {
  PortfolioPoi,
  CreatePortfolioPoiInput,
  UpdatePortfolioPoiInput,
  PoiProjectFlow,
  CreatePoiFlowInput,
} from '@ogden/shared';

const EMPTY_POIS: readonly PortfolioPoi[] = [];
const EMPTY_FLOWS: readonly PoiProjectFlow[] = [];

/** Flatten the nested per-POI flows into one portfolio-wide list. */
function flattenFlows(pois: PortfolioPoi[]): PoiProjectFlow[] {
  return pois.flatMap((p) => p.flows ?? []);
}

interface PoiState {
  pois: PortfolioPoi[];
  flows: PoiProjectFlow[];

  fetchAll: () => Promise<void>;
  createPoi: (input: CreatePortfolioPoiInput) => Promise<PortfolioPoi | null>;
  updatePoi: (poiId: string, input: UpdatePortfolioPoiInput) => Promise<void>;
  deletePoi: (poiId: string) => Promise<void>;
  createFlow: (poiId: string, input: CreatePoiFlowInput) => Promise<PoiProjectFlow | null>;
  deleteFlow: (poiId: string, flowId: string) => Promise<void>;

  reset: () => void;
}

export const usePoiStore = create<PoiState>()((set, get) => ({
  pois: EMPTY_POIS as PortfolioPoi[],
  flows: EMPTY_FLOWS as PoiProjectFlow[],

  fetchAll: async () => {
    // Offline demo: POIs are server-backed with no local persistence, so there
    // is nothing to read (and a fetch would only 401). The Portfolio Map POI
    // controls are themselves gated off in offline mode.
    if (DEMO_OFFLINE_ENABLED) return;
    try {
      const { data } = await api.portfolioPois.list();
      if (data) {
        set({ pois: data, flows: flattenFlows(data) });
      }
    } catch (err) {
      console.warn('[OGDEN] Failed to fetch portfolio POIs:', err);
    }
  },

  createPoi: async (input: CreatePortfolioPoiInput) => {
    try {
      const { data } = await api.portfolioPois.create(input);
      // Re-fetch so the flat lists stay authoritative (a fresh POI has no flows
      // yet, but this keeps the store the single source of truth).
      await get().fetchAll();
      return data ?? null;
    } catch (err) {
      console.warn('[OGDEN] Failed to create portfolio POI:', err);
      throw err; // Re-throw so the page can surface the error via portfolio:toast.
    }
  },

  updatePoi: async (poiId: string, input: UpdatePortfolioPoiInput) => {
    try {
      await api.portfolioPois.update(poiId, input);
      await get().fetchAll();
    } catch (err) {
      console.warn('[OGDEN] Failed to update portfolio POI:', err);
      throw err;
    }
  },

  deletePoi: async (poiId: string) => {
    // Optimistically drop the POI and its flows, then resync.
    set((s) => ({
      pois: s.pois.filter((p) => p.id !== poiId),
      flows: s.flows.filter((f) => f.poiId !== poiId),
    }));
    try {
      await api.portfolioPois.remove(poiId);
    } catch (err) {
      console.warn('[OGDEN] Failed to delete portfolio POI:', err);
    } finally {
      await get().fetchAll();
    }
  },

  createFlow: async (poiId: string, input: CreatePoiFlowInput) => {
    try {
      const { data } = await api.portfolioPois.flows.create(poiId, input);
      await get().fetchAll();
      return data ?? null;
    } catch (err) {
      console.warn('[OGDEN] Failed to create POI flow:', err);
      throw err; // Re-throw so the page toasts (e.g. 403 unowned, 409 duplicate).
    }
  },

  deleteFlow: async (poiId: string, flowId: string) => {
    set((s) => ({ flows: s.flows.filter((f) => f.id !== flowId) }));
    try {
      await api.portfolioPois.flows.remove(poiId, flowId);
    } catch (err) {
      console.warn('[OGDEN] Failed to delete POI flow:', err);
    } finally {
      await get().fetchAll();
    }
  },

  reset: () => set({ pois: EMPTY_POIS as PortfolioPoi[], flows: EMPTY_FLOWS as PoiProjectFlow[] }),
}));
