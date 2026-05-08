/**
 * builtEnvironmentStore — OBSERVE Module "Built Environment" annotations.
 *
 * Existing on-site infrastructure: buildings, wells, septic systems, power
 * lines, buried utilities, fences, gates, and existing driveways. These
 * physical assets shape what design moves are possible — buried utilities
 * veto earthworks across them, well capacity sets the irrigation budget,
 * fence lines define livestock subdivision options.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export type BuildingSubtype = 'residence' | 'outbuilding' | 'agricultural' | 'other';

export interface Building {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  subtype: BuildingSubtype;
  label?: string;
  notes?: string;
  areaM2?: number;
  createdAt: string;
}

export type WellKind = 'drinking' | 'irrigation' | 'unknown';

export interface Well {
  id: string;
  projectId: string;
  /** [lng, lat] */
  position: [number, number];
  kind: WellKind;
  depthM?: number;
  flowLpm?: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export type SepticKind = 'tank' | 'leach_field' | 'cesspool' | 'other';

export interface Septic {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  kind: SepticKind;
  label?: string;
  notes?: string;
  areaM2?: number;
  createdAt: string;
}

export type PowerLinePlacement = 'overhead' | 'buried';

export interface PowerLine {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  placement: PowerLinePlacement;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export type BuriedUtilityKind = 'water_main' | 'gas' | 'fibre' | 'sewer' | 'other';

export interface BuriedUtility {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  kind: BuriedUtilityKind;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export type FenceKind = 'barbed' | 'page_wire' | 'electric' | 'privacy' | 'other';

export interface Fence {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  kind: FenceKind;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface Gate {
  id: string;
  projectId: string;
  /** [lng, lat] */
  position: [number, number];
  label?: string;
  notes?: string;
  createdAt: string;
}

export type DrivewaySurface = 'gravel' | 'paved' | 'dirt' | 'other';

export interface ExistingDriveway {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  surface: DrivewaySurface;
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

interface BuiltEnvironmentState {
  buildings: Building[];
  wells: Well[];
  septics: Septic[];
  powerLines: PowerLine[];
  buriedUtilities: BuriedUtility[];
  fences: Fence[];
  gates: Gate[];
  existingDriveways: ExistingDriveway[];

  addBuilding: (b: Building) => void;
  updateBuilding: (id: string, patch: Partial<Building>) => void;
  removeBuilding: (id: string) => void;

  addWell: (w: Well) => void;
  updateWell: (id: string, patch: Partial<Well>) => void;
  removeWell: (id: string) => void;

  addSeptic: (s: Septic) => void;
  updateSeptic: (id: string, patch: Partial<Septic>) => void;
  removeSeptic: (id: string) => void;

  addPowerLine: (p: PowerLine) => void;
  updatePowerLine: (id: string, patch: Partial<PowerLine>) => void;
  removePowerLine: (id: string) => void;

  addBuriedUtility: (u: BuriedUtility) => void;
  updateBuriedUtility: (id: string, patch: Partial<BuriedUtility>) => void;
  removeBuriedUtility: (id: string) => void;

  addFence: (f: Fence) => void;
  updateFence: (id: string, patch: Partial<Fence>) => void;
  removeFence: (id: string) => void;

  addGate: (g: Gate) => void;
  updateGate: (id: string, patch: Partial<Gate>) => void;
  removeGate: (id: string) => void;

  addExistingDriveway: (d: ExistingDriveway) => void;
  updateExistingDriveway: (id: string, patch: Partial<ExistingDriveway>) => void;
  removeExistingDriveway: (id: string) => void;
}

export const useBuiltEnvironmentStore = create<BuiltEnvironmentState>()(
  persist(
    temporal((set) => ({
      buildings: [],
      wells: [],
      septics: [],
      powerLines: [],
      buriedUtilities: [],
      fences: [],
      gates: [],
      existingDriveways: [],

      addBuilding: (b) => set((s) => ({ buildings: [...s.buildings, b] })),
      updateBuilding: (id, patch) =>
        set((s) => ({
          buildings: s.buildings.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      removeBuilding: (id) =>
        set((s) => ({ buildings: s.buildings.filter((b) => b.id !== id) })),

      addWell: (w) => set((s) => ({ wells: [...s.wells, w] })),
      updateWell: (id, patch) =>
        set((s) => ({
          wells: s.wells.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),
      removeWell: (id) => set((s) => ({ wells: s.wells.filter((w) => w.id !== id) })),

      addSeptic: (sp) => set((s) => ({ septics: [...s.septics, sp] })),
      updateSeptic: (id, patch) =>
        set((s) => ({
          septics: s.septics.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)),
        })),
      removeSeptic: (id) =>
        set((s) => ({ septics: s.septics.filter((sp) => sp.id !== id) })),

      addPowerLine: (p) => set((s) => ({ powerLines: [...s.powerLines, p] })),
      updatePowerLine: (id, patch) =>
        set((s) => ({
          powerLines: s.powerLines.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePowerLine: (id) =>
        set((s) => ({ powerLines: s.powerLines.filter((p) => p.id !== id) })),

      addBuriedUtility: (u) =>
        set((s) => ({ buriedUtilities: [...s.buriedUtilities, u] })),
      updateBuriedUtility: (id, patch) =>
        set((s) => ({
          buriedUtilities: s.buriedUtilities.map((u) =>
            u.id === id ? { ...u, ...patch } : u,
          ),
        })),
      removeBuriedUtility: (id) =>
        set((s) => ({
          buriedUtilities: s.buriedUtilities.filter((u) => u.id !== id),
        })),

      addFence: (f) => set((s) => ({ fences: [...s.fences, f] })),
      updateFence: (id, patch) =>
        set((s) => ({
          fences: s.fences.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),
      removeFence: (id) =>
        set((s) => ({ fences: s.fences.filter((f) => f.id !== id) })),

      addGate: (g) => set((s) => ({ gates: [...s.gates, g] })),
      updateGate: (id, patch) =>
        set((s) => ({
          gates: s.gates.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      removeGate: (id) => set((s) => ({ gates: s.gates.filter((g) => g.id !== id) })),

      addExistingDriveway: (d) =>
        set((s) => ({ existingDriveways: [...s.existingDriveways, d] })),
      updateExistingDriveway: (id, patch) =>
        set((s) => ({
          existingDriveways: s.existingDriveways.map((d) =>
            d.id === id ? { ...d, ...patch } : d,
          ),
        })),
      removeExistingDriveway: (id) =>
        set((s) => ({
          existingDriveways: s.existingDriveways.filter((d) => d.id !== id),
        })),
    }), { limit: 200 }),
    { name: 'ogden-built-environment', version: 1 },
  ),
);

useBuiltEnvironmentStore.persist.rehydrate();
