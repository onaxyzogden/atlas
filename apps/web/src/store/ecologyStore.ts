/**
 * Ecology store — Scholar-aligned namespace consolidation
 * (plan few-concerns-shiny-quokka.md, ADR
 * 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).
 *
 * Holds ecology observations + per-project succession stage. Succession is
 * the temporal dimension of ecology (PDC Week 8-10), so the two share one
 * namespace per Holmgren P8.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TrophicLevel =
  | 'producer'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'decomposer';

export type SuccessionStage =
  | 'disturbed'
  | 'pioneer'
  | 'mid'
  | 'late'
  | 'climax';

export interface EcologyObservation {
  id: string;
  projectId: string;
  species: string;
  trophicLevel: TrophicLevel;
  notes?: string;
  observedAt: string;
}

interface EcologyState {
  ecology: EcologyObservation[];
  /** Optional per-project succession-stage label; one entry per project. */
  successionStageByProject: Record<string, SuccessionStage>;

  addObservation: (o: EcologyObservation) => void;
  updateObservation: (id: string, patch: Partial<EcologyObservation>) => void;
  removeObservation: (id: string) => void;
  setSuccessionStage: (projectId: string, stage: SuccessionStage | undefined) => void;
}

export const useEcologyStore = create<EcologyState>()(
  persist(
    (set) => ({
      ecology: [],
      successionStageByProject: {},

      addObservation: (o) => set((s) => ({ ecology: [...s.ecology, o] })),
      updateObservation: (id, patch) =>
        set((s) => ({ ecology: s.ecology.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      removeObservation: (id) => set((s) => ({ ecology: s.ecology.filter((o) => o.id !== id) })),
      setSuccessionStage: (projectId, stage) =>
        set((s) => {
          const next = { ...s.successionStageByProject };
          if (stage === undefined) delete next[projectId];
          else next[projectId] = stage;
          return { successionStageByProject: next };
        }),
    }),
    { name: 'ogden-ecology', version: 1 },
  ),
);

useEcologyStore.persist.rehydrate();
