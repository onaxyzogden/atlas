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
import { temporal } from 'zundo';

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
  /** Optional [lng, lat] for map placement / spatial export. Existing
   *  observations without a location remain CSV-only. Capture UI to set
   *  this is a deferred follow-up (see 2026-05-07 symbology / export
   *  ADR — permacultureZone + ecologyObservation update). */
  location?: [number, number];
  notes?: string;
  observedAt: string;
}

// NOTE: distinct vegetation patches (formerly `EcologyZone`) moved to
// `vegetationStore` as `VegetationPatch` — one object now carries both
// successional stage and structural ground cover (plan
// what-type-of-zones-sleepy-comet.md). Legacy persisted `ecologyZones`
// are absorbed there on first load.

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
    temporal((set) => ({
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
    }), { limit: 200 }),
    {
      name: 'ogden-ecology',
      version: 3,
      migrate: (persisted) => {
        // v3: `ecologyZones` removed (absorbed by vegetationStore on
        // first load). Drop the field if an old blob still carries it.
        const p = (persisted ?? {}) as Record<string, unknown>;
        delete p.ecologyZones;
        return p as unknown as EcologyState;
      },
    },
  ),
);

useEcologyStore.persist.rehydrate();
