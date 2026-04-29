/**
 * Site annotations store — Phase 4b–4f of the OBSERVE-stage IA restructure
 * (plan few-concerns-shiny-quokka.md).
 *
 * Why a separate store: `siteDataStore` is ephemeral / fetch-driven. The
 * OBSERVE-stage user inputs (hazards log, A-B transects, sector arrows,
 * ecology observations, SWOT journal entries) are durable steward data and
 * must survive a reload, so they live here in a Zustand `persist` store
 * keyed by projectId. This mirrors the pattern used by `nurseryStore`,
 * `fieldworkStore`, and `soilSampleStore`.
 *
 * Each annotation family is keyed by projectId so a workspace with many
 * projects keeps clean separation. All actions return void; consumers read
 * via the per-project selector helpers.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Hazards (Phase 4b) ───────────────────────────────────────────────────────

export type HazardType =
  | 'hurricane'
  | 'ice_storm'
  | 'blizzard'
  | 'flood'
  | 'wildfire'
  | 'lightning'
  | 'earthquake'
  | 'drought'
  | 'tornado'
  | 'other';

export type HazardSeverity = 'low' | 'med' | 'high' | 'catastrophic';

export interface HazardEvent {
  id: string;
  projectId: string;
  type: HazardType;
  /** YYYY-MM-DD or YYYY for less precise historical entries. */
  date: string;
  severity?: HazardSeverity;
  description?: string;
  /** Free-form list of vulnerabilities the steward associated with this event. */
  linkedVulnerabilities?: string[];
  createdAt: string;
}

// ── Transects (Phase 4c) ─────────────────────────────────────────────────────

export interface Transect {
  id: string;
  projectId: string;
  name: string;
  /** [lng, lat] — start point. */
  pointA: [number, number];
  pointB: [number, number];
  /** ISO timestamp when elevation was last sampled along this transect. */
  sampledAt?: string;
  /** Cached sampled elevation profile (metres). */
  elevationProfileM?: number[];
  notes?: string;
}

// ── Sectors (Phase 4e) ───────────────────────────────────────────────────────

export type SectorType =
  | 'sun_summer'
  | 'sun_winter'
  | 'wind_prevailing'
  | 'wind_storm'
  | 'fire'
  | 'noise'
  | 'wildlife'
  | 'view';

export type SectorIntensity = 'low' | 'med' | 'high';

export interface SectorArrow {
  id: string;
  projectId: string;
  type: SectorType;
  /** Bearing in degrees from N (0 = N, 90 = E). */
  bearingDeg: number;
  /** Arc width in degrees (e.g. 60 for a wedge). */
  arcDeg: number;
  intensity?: SectorIntensity;
  notes?: string;
}

// ── Ecology / food-chain (Phase 4d) ──────────────────────────────────────────

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

// ── SWOT (Phase 4f) ──────────────────────────────────────────────────────────

export type SwotBucket = 'S' | 'W' | 'O' | 'T';

export interface SwotEntry {
  id: string;
  projectId: string;
  bucket: SwotBucket;
  title: string;
  body?: string;
  tags?: string[];
  createdAt: string;
}

// ── Store shape ──────────────────────────────────────────────────────────────

interface SiteAnnotationsState {
  hazards: HazardEvent[];
  transects: Transect[];
  sectors: SectorArrow[];
  ecology: EcologyObservation[];
  /** Optional per-project succession-stage label; one entry per project. */
  successionStageByProject: Record<string, SuccessionStage>;
  swot: SwotEntry[];

  // Hazards
  addHazard: (h: HazardEvent) => void;
  updateHazard: (id: string, patch: Partial<HazardEvent>) => void;
  removeHazard: (id: string) => void;

  // Transects
  addTransect: (t: Transect) => void;
  updateTransect: (id: string, patch: Partial<Transect>) => void;
  removeTransect: (id: string) => void;

  // Sectors
  addSector: (s: SectorArrow) => void;
  updateSector: (id: string, patch: Partial<SectorArrow>) => void;
  removeSector: (id: string) => void;

  // Ecology
  addObservation: (o: EcologyObservation) => void;
  updateObservation: (id: string, patch: Partial<EcologyObservation>) => void;
  removeObservation: (id: string) => void;
  setSuccessionStage: (projectId: string, stage: SuccessionStage | undefined) => void;

  // SWOT
  addSwot: (e: SwotEntry) => void;
  updateSwot: (id: string, patch: Partial<SwotEntry>) => void;
  removeSwot: (id: string) => void;
}

export const useSiteAnnotationsStore = create<SiteAnnotationsState>()(
  persist(
    (set) => ({
      hazards: [],
      transects: [],
      sectors: [],
      ecology: [],
      successionStageByProject: {},
      swot: [],

      addHazard: (h) => set((s) => ({ hazards: [...s.hazards, h] })),
      updateHazard: (id, patch) =>
        set((s) => ({ hazards: s.hazards.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
      removeHazard: (id) => set((s) => ({ hazards: s.hazards.filter((h) => h.id !== id) })),

      addTransect: (t) => set((s) => ({ transects: [...s.transects, t] })),
      updateTransect: (id, patch) =>
        set((s) => ({ transects: s.transects.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTransect: (id) => set((s) => ({ transects: s.transects.filter((t) => t.id !== id) })),

      addSector: (sector) => set((s) => ({ sectors: [...s.sectors, sector] })),
      updateSector: (id, patch) =>
        set((s) => ({ sectors: s.sectors.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeSector: (id) => set((s) => ({ sectors: s.sectors.filter((x) => x.id !== id) })),

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

      addSwot: (e) => set((s) => ({ swot: [...s.swot, e] })),
      updateSwot: (id, patch) =>
        set((s) => ({ swot: s.swot.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeSwot: (id) => set((s) => ({ swot: s.swot.filter((e) => e.id !== id) })),
    }),
    {
      name: 'ogden-site-annotations',
      version: 1,
    },
  ),
);

useSiteAnnotationsStore.persist.rehydrate();

// ── Per-project selector helpers ─────────────────────────────────────────────

export function newAnnotationId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
