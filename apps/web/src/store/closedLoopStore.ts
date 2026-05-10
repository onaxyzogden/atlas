/**
 * Closed-Loop Systems store — Scholar-aligned namespace consolidation
 * (plan few-concerns-shiny-quokka.md, ADR
 * 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).
 *
 * Holds waste vectors (design intent) + waste-vector runs (operational
 * feedback) + fertility infrastructure (nutrient destinations). Together
 * these form one closed loop per Holmgren P4 (Self-regulation & Feedback)
 * and P6 (Produce No Waste).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

// ── Waste-to-resource vectors ───────────────────────────────────────────────

export type WasteResourceType = 'organic_matter' | 'manure' | 'greywater' | 'compost';

export interface WasteVector {
  id: string;
  projectId: string;
  /** Existing feature ids (zone / structure / crop area) — free-form so we
   *  can connect across stores without a hard FK. */
  fromFeatureId: string;
  toFeatureId: string;
  label: string;
  resourceType: WasteResourceType;
  createdAt: string;
}

// ── Waste-vector runs (ACT-stage Module 2) ──────────────────────────────────

export interface WasteVectorRun {
  id: string;
  projectId: string;
  vectorId: string;
  /** ISO date string. */
  runDate: string;
  notes?: string;
}

// ── Fertility infrastructure (point placements) ─────────────────────────────

/**
 * Fertility-infrastructure node kinds. The four "structural" types
 * (composter / hugelkultur / biochar / worm_bin) were the original v1
 * set. Per Permaculture Scholar verdict 2026-05-07
 * (`wiki/decisions/2026-05-07-atlas-plan-soil-scholar-build-fresh.md`)
 * orthodox permaculture also frames soil fertility through three
 * vegetative/biological practices — cover-cropping, chop-and-drop,
 * dynamic accumulators (comfrey, persimmon, deep-rooted mineral
 * cyclers) — and an animal-integration practice (rotational grazing).
 * They join the union as additive members; legacy entries persist
 * unchanged with their original `composter | hugelkultur | biochar |
 * worm_bin` value, so no schema-version bump is required.
 */
export type FertilityInfraType =
  | 'composter'
  | 'hugelkultur'
  | 'biochar'
  | 'worm_bin'
  | 'cover_crop'
  | 'chop_and_drop'
  | 'dynamic_accumulator'
  | 'rotational_grazing';

export interface FertilityInfra {
  id: string;
  projectId: string;
  type: FertilityInfraType;
  center: [number, number];
  /** Optional capacity / scale note (e.g. "3 m³ pile"). */
  scaleNote?: string;
  notes?: string;
  /**
   * PLAN-stage Module 9 — phaseStore phase id this fertility node belongs
   * to. Optional; undefined = unassigned. Lets the Phasing dashboard
   * sequence soil-building infrastructure by build phase.
   */
  phase?: string;
  /**
   * PLAN-stage Multi-Enterprise — `enterpriseStore` enterprise id this
   * fertility unit belongs to. Optional; undefined = unassigned.
   */
  enterprise?: string;
  createdAt: string;
}

interface ClosedLoopState {
  wasteVectors: WasteVector[];
  wasteVectorRuns: WasteVectorRun[];
  fertilityInfra: FertilityInfra[];

  addWasteVector: (v: WasteVector) => void;
  updateWasteVector: (id: string, patch: Partial<WasteVector>) => void;
  removeWasteVector: (id: string) => void;

  addWasteVectorRun: (r: WasteVectorRun) => void;
  removeWasteVectorRun: (id: string) => void;

  addFertilityInfra: (i: FertilityInfra) => void;
  updateFertilityInfra: (id: string, patch: Partial<FertilityInfra>) => void;
  removeFertilityInfra: (id: string) => void;
}

export const useClosedLoopStore = create<ClosedLoopState>()(
  persist(
    temporal(
      (set) => ({
        wasteVectors: [],
        wasteVectorRuns: [],
        fertilityInfra: [],

        addWasteVector: (v) => set((s) => ({ wasteVectors: [...s.wasteVectors, v] })),
        updateWasteVector: (id, patch) =>
          set((s) => ({ wasteVectors: s.wasteVectors.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
        removeWasteVector: (id) =>
          set((s) => ({ wasteVectors: s.wasteVectors.filter((v) => v.id !== id) })),

        addWasteVectorRun: (r) => set((s) => ({ wasteVectorRuns: [...s.wasteVectorRuns, r] })),
        removeWasteVectorRun: (id) =>
          set((s) => ({ wasteVectorRuns: s.wasteVectorRuns.filter((r) => r.id !== id) })),

        addFertilityInfra: (i) => set((s) => ({ fertilityInfra: [...s.fertilityInfra, i] })),
        updateFertilityInfra: (id, patch) =>
          set((s) => ({ fertilityInfra: s.fertilityInfra.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
        removeFertilityInfra: (id) =>
          set((s) => ({ fertilityInfra: s.fertilityInfra.filter((i) => i.id !== id) })),
      }),
      { limit: 200 },
    ),
    { name: 'ogden-closed-loop', version: 1 },
  ),
);

useClosedLoopStore.persist.rehydrate();
