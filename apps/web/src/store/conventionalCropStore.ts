/**
 * Conventional-crop store — OBSERVE-stage land-cover annotation of
 * pre-existing conventionally-farmed ground (row crops, monocultures,
 * cover-cropped fields, fallow). Sibling to pastureStore + ecologyStore.
 * Plan owns designed cropping (guilds, annual beds) — stage separation
 * per 2026-05-08-atlas-plan-module4-livestock.md.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

export type ConventionalCropKind =
  | 'annual-row'
  | 'perennial-monoculture'
  | 'cover-cropped'
  | 'fallow';

export type CompactionLevel = 'none' | 'mild' | 'moderate' | 'severe' | 'unknown';
export type InputRegime = 'synthetic' | 'organic' | 'mixed' | 'none' | 'unknown';
export type TillageRegime =
  | 'no-till'
  | 'reduced'
  | 'conventional'
  | 'intensive'
  | 'unknown';
export type IrrigationRegime =
  | 'none'
  | 'rainfed'
  | 'drip'
  | 'sprinkler'
  | 'flood'
  | 'unknown';

export interface ConventionalCrop {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  kind: ConventionalCropKind;
  primaryCrop?: string;
  rotationNotes?: string;
  compaction?: CompactionLevel;
  inputs?: InputRegime;
  tillage?: TillageRegime;
  irrigation?: IrrigationRegime;
  lastPlanted?: string;
  label?: string;
  notes?: string;
  createdAt: string;
}

interface ConventionalCropState {
  conventionalCrops: ConventionalCrop[];
  addConventionalCrop: (c: ConventionalCrop) => void;
  updateConventionalCrop: (id: string, patch: Partial<ConventionalCrop>) => void;
  removeConventionalCrop: (id: string) => void;
}

export const useConventionalCropStore = create<ConventionalCropState>()(
  persist(
    temporal(
      (set) => ({
        conventionalCrops: [],
        addConventionalCrop: (c) =>
          set((s) => ({ conventionalCrops: [...s.conventionalCrops, c] })),
        updateConventionalCrop: (id, patch) =>
          set((s) => ({
            conventionalCrops: s.conventionalCrops.map((c) =>
              c.id === id ? { ...c, ...patch } : c,
            ),
          })),
        removeConventionalCrop: (id) =>
          set((s) => ({
            conventionalCrops: s.conventionalCrops.filter((c) => c.id !== id),
          })),
      }),
      { limit: 200 },
    ),
    { name: 'ogden-conventional-crops', storage: idbPersistStorage, version: 1 },
  ),
);

rehydrateWithLogging(useConventionalCropStore);
