/**
 * Utility store — solar arrays, water tanks, wells, generators, compost stations.
 * Utilities are point features placed via click-to-place.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UtilityType =
  | 'solar_panel'
  | 'battery_room'
  | 'generator'
  | 'water_tank'
  | 'well_pump'
  | 'greywater'
  | 'septic'
  | 'rain_catchment'
  | 'lighting'
  | 'firewood_storage'
  | 'waste_sorting'
  | 'compost'
  | 'biochar'
  | 'tool_storage'
  | 'laundry_station';

export interface Utility {
  id: string;
  projectId: string;
  name: string;
  type: UtilityType;
  center: [number, number];
  phase: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const UTILITY_TYPE_CONFIG: Record<UtilityType, { label: string; icon: string; color: string; category: string }> = {
  solar_panel:     { label: 'Solar Panel',       icon: '\u2600',      color: '#c4a265', category: 'Energy' },
  battery_room:    { label: 'Battery Room',      icon: '\u{1F50B}',   color: '#8A9A74', category: 'Energy' },
  generator:       { label: 'Generator',         icon: '\u26A1',      color: '#c44e3f', category: 'Energy' },
  water_tank:      { label: 'Water Tank',        icon: '\u{1F6B0}',   color: '#4A90D9', category: 'Water' },
  well_pump:       { label: 'Well / Pump',       icon: '\u{1F4A7}',   color: '#3A7A9A', category: 'Water' },
  greywater:       { label: 'Greywater System',  icon: '\u{1F4A7}',   color: '#6B8A9A', category: 'Water' },
  septic:          { label: 'Septic System',     icon: '\u{1F6BD}',   color: '#6B6B6B', category: 'Water' },
  rain_catchment:  { label: 'Rain Catchment',    icon: '\u{1F327}',   color: '#4A6B8A', category: 'Water' },
  lighting:        { label: 'Lighting Zone',     icon: '\u{1F4A1}',   color: '#c4a265', category: 'Infrastructure' },
  firewood_storage:{ label: 'Firewood Storage',  icon: '\u{1FAB5}',   color: '#8B6E4E', category: 'Infrastructure' },
  waste_sorting:   { label: 'Waste Sorting',     icon: '\u{1F5D1}',   color: '#6B6B6B', category: 'Infrastructure' },
  compost:         { label: 'Compost',           icon: '\u267B',      color: '#5B8A4A', category: 'Infrastructure' },
  biochar:         { label: 'Biochar',           icon: '\u{1F525}',   color: '#4A3823', category: 'Infrastructure' },
  tool_storage:    { label: 'Tool Storage',      icon: '\u{1F527}',   color: '#6B6B6B', category: 'Infrastructure' },
  laundry_station: { label: 'Laundry Station',   icon: '\u{1F9FA}',   color: '#7A8A9A', category: 'Infrastructure' },
};

interface UtilityState {
  utilities: Utility[];
  placementMode: UtilityType | null;

  addUtility: (utility: Utility) => void;
  updateUtility: (id: string, updates: Partial<Utility>) => void;
  deleteUtility: (id: string) => void;
  setPlacementMode: (type: UtilityType | null) => void;
}

export const useUtilityStore = create<UtilityState>()(
  persist(
    (set) => ({
      utilities: [],
      placementMode: null,

      addUtility: (utility) => set((s) => ({ utilities: [...s.utilities, utility] })),

      updateUtility: (id, updates) =>
        set((s) => ({
          utilities: s.utilities.map((u) =>
            u.id === id ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u,
          ),
        })),

      deleteUtility: (id) => set((s) => ({ utilities: s.utilities.filter((u) => u.id !== id) })),

      setPlacementMode: (type) => set({ placementMode: type }),
    }),
    {
      name: 'ogden-utilities',
      version: 1,
      partialize: (state) => ({ utilities: state.utilities }),
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useUtilityStore.persist.rehydrate();
