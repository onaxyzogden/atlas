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

/**
 * OBSERVE Module 4 — distinct ecological patches (mature forest, disturbed
 * pasture, wetland edge, etc.) outlined on the map. The `dominantStage`
 * succession label is per-zone (vs. `successionStageByProject` which is a
 * site-wide rollup).
 */
export interface EcologyZone {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  dominantStage: SuccessionStage;
  label?: string;
  notes?: string;
  createdAt: string;
}

interface EcologyState {
  ecology: EcologyObservation[];
  /** Optional per-project succession-stage label; one entry per project. */
  successionStageByProject: Record<string, SuccessionStage>;
  ecologyZones: EcologyZone[];

  addObservation: (o: EcologyObservation) => void;
  updateObservation: (id: string, patch: Partial<EcologyObservation>) => void;
  removeObservation: (id: string) => void;
  setSuccessionStage: (projectId: string, stage: SuccessionStage | undefined) => void;

  addEcologyZone: (z: EcologyZone) => void;
  updateEcologyZone: (id: string, patch: Partial<EcologyZone>) => void;
  removeEcologyZone: (id: string) => void;
}

export const useEcologyStore = create<EcologyState>()(
  persist(
    (set) => ({
      ecology: [],
      successionStageByProject: {},
      ecologyZones: [],

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

      addEcologyZone: (z) => set((s) => ({ ecologyZones: [...s.ecologyZones, z] })),
      updateEcologyZone: (id, patch) =>
        set((s) => ({
          ecologyZones: s.ecologyZones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
        })),
      removeEcologyZone: (id) =>
        set((s) => ({ ecologyZones: s.ecologyZones.filter((z) => z.id !== id) })),
    }),
    {
      name: 'ogden-ecology',
      version: 2,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<EcologyState>;
        return { ...p, ecologyZones: p.ecologyZones ?? [] } as EcologyState;
      },
    },
  ),
);

useEcologyStore.persist.rehydrate();
