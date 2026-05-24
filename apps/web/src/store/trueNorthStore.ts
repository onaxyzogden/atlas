/**
 * True North store — per-project, persisted. Owns the steward-attested
 * Fit Gate segments 2–8 (Required Land Functions, Legal & Zoning, Financial,
 * Access & Market, Ecological Non-Negotiables, Human & Neighbour, Deal
 * Breakers). Segment 1 (Core Vision) is the goal tree; property attributes
 * are the Site Profile. The Fit Gate engine reads all three.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type {
  AccessMarketSegment,
  DealBreaker,
  EcologicalSegment,
  FinancialSegment,
  HumanNeighbourSegment,
  LandFunction,
  LegalZoningSegment,
  TrueNorthProfile,
} from '../v3/true-north/data/trueNorthTypes.js';
import { emptyTrueNorthProfile } from '../v3/true-north/data/trueNorthTypes.js';

interface TrueNorthState {
  profilesByProject: Record<string, TrueNorthProfile>;

  ensureDefault: (projectId: string) => void;
  getProfile: (projectId: string) => TrueNorthProfile;
  setRequiredFunctions: (projectId: string, functions: LandFunction[]) => void;
  patchLegalZoning: (projectId: string, patch: Partial<LegalZoningSegment>) => void;
  patchFinancial: (projectId: string, patch: Partial<FinancialSegment>) => void;
  patchAccessMarket: (projectId: string, patch: Partial<AccessMarketSegment>) => void;
  patchEcological: (projectId: string, patch: Partial<EcologicalSegment>) => void;
  patchHumanNeighbour: (projectId: string, patch: Partial<HumanNeighbourSegment>) => void;
  setDealBreakers: (projectId: string, dealBreakers: DealBreaker[]) => void;
}

export const useTrueNorthStore = create<TrueNorthState>()(
  persist(
    (set, get) => {
      /** Apply a partial update to one project's profile, stamping updatedAt. */
      const patch = (projectId: string, fn: (p: TrueNorthProfile) => TrueNorthProfile) =>
        set((s) => {
          const existing = s.profilesByProject[projectId] ?? emptyTrueNorthProfile(projectId);
          return {
            profilesByProject: {
              ...s.profilesByProject,
              [projectId]: { ...fn(existing), updatedAt: new Date().toISOString() },
            },
          };
        });

      return {
        profilesByProject: {},

        ensureDefault: (projectId) => {
          if (get().profilesByProject[projectId]) return;
          set((s) => ({
            profilesByProject: {
              ...s.profilesByProject,
              [projectId]: emptyTrueNorthProfile(projectId),
            },
          }));
        },

        getProfile: (projectId) =>
          get().profilesByProject[projectId] ?? emptyTrueNorthProfile(projectId),

        setRequiredFunctions: (projectId, functions) =>
          patch(projectId, (p) => ({ ...p, requiredFunctions: functions })),

        patchLegalZoning: (projectId, p) =>
          patch(projectId, (prev) => ({ ...prev, legalZoning: { ...prev.legalZoning, ...p } })),

        patchFinancial: (projectId, p) =>
          patch(projectId, (prev) => ({ ...prev, financial: { ...prev.financial, ...p } })),

        patchAccessMarket: (projectId, p) =>
          patch(projectId, (prev) => ({ ...prev, accessMarket: { ...prev.accessMarket, ...p } })),

        patchEcological: (projectId, p) =>
          patch(projectId, (prev) => ({ ...prev, ecological: { ...prev.ecological, ...p } })),

        patchHumanNeighbour: (projectId, p) =>
          patch(projectId, (prev) => ({
            ...prev,
            humanNeighbour: { ...prev.humanNeighbour, ...p },
          })),

        setDealBreakers: (projectId, dealBreakers) =>
          patch(projectId, (prev) => ({ ...prev, dealBreakers })),
      };
    },
    {
      name: 'ogden-true-north',
      version: 1,
      partialize: (state) => ({ profilesByProject: state.profilesByProject }),
    },
  ),
);

rehydrateWithLogging(useTrueNorthStore);
