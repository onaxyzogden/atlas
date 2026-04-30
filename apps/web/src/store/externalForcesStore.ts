/**
 * External Forces store — Scholar-aligned namespace consolidation
 * (plan few-concerns-shiny-quokka.md, ADR
 * 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).
 *
 * Holds hazards + sectors. Hazards are extreme manifestations of sector
 * energies (Mollison Designers' Manual: sectors include "storms, wildfire,
 * frost"); they share one namespace per Holmgren P8.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Hazards ──────────────────────────────────────────────────────────────────

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
  /**
   * ACT-stage Module 5 — concrete mitigation steps the steward commits to in
   * response to this hazard. Optional, additive; legacy hazards load with
   * `mitigationSteps` undefined. Edited via `HazardPlansCard`.
   */
  mitigationSteps?: string[];
  /**
   * ACT-stage Module 5 — ids of features (zones / structures / appropriate-tech
   * items) that participate in the mitigation plan for this hazard.
   */
  linkedFeatureIds?: string[];
}

// ── Sectors ──────────────────────────────────────────────────────────────────

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

interface ExternalForcesState {
  hazards: HazardEvent[];
  sectors: SectorArrow[];

  addHazard: (h: HazardEvent) => void;
  updateHazard: (id: string, patch: Partial<HazardEvent>) => void;
  removeHazard: (id: string) => void;

  addSector: (s: SectorArrow) => void;
  updateSector: (id: string, patch: Partial<SectorArrow>) => void;
  removeSector: (id: string) => void;
}

export const useExternalForcesStore = create<ExternalForcesState>()(
  persist(
    (set) => ({
      hazards: [],
      sectors: [],

      addHazard: (h) => set((s) => ({ hazards: [...s.hazards, h] })),
      updateHazard: (id, patch) =>
        set((s) => ({ hazards: s.hazards.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
      removeHazard: (id) => set((s) => ({ hazards: s.hazards.filter((h) => h.id !== id) })),

      addSector: (sector) => set((s) => ({ sectors: [...s.sectors, sector] })),
      updateSector: (id, patch) =>
        set((s) => ({ sectors: s.sectors.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeSector: (id) => set((s) => ({ sectors: s.sectors.filter((x) => x.id !== id) })),
    }),
    { name: 'ogden-external-forces', version: 1 },
  ),
);

useExternalForcesStore.persist.rehydrate();
