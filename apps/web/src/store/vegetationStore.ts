/**
 * Vegetation store — single Observe object describing an observed patch
 * of land's vegetation: its successional stage AND its structural ground
 * cover, captured together (ADR plan
 * what-type-of-zones-sleepy-comet.md). Replaces the former split between
 * the `ecology-zone` annotation (`EcologyZone.dominantStage`) and the
 * `ground-cover` paint tool (`LandZone.groundCover`).
 *
 * Plan-stage facets (SiteProfile `currentLandCover`, auto-design
 * affinity, dashboard rollups) read these patches through
 * `vegetationResolver`, with the per-zone `successionStage`/`groundCover`
 * fields acting as a manual override.
 *
 * On first load this store absorbs legacy `EcologyZone` records out of
 * the persisted `ogden-ecology` blob (one-time migration).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import { temporal } from 'zundo';
import {
  type SuccessionStage,
  type GroundCoverState,
  SUCCESSION_STAGE_LABELS,
  SUCCESSION_STAGE_COLORS,
  GROUND_COVER_LABELS,
  GROUND_COVER_COLORS,
} from './zoneStore.js';

export type { SuccessionStage, GroundCoverState };
export {
  SUCCESSION_STAGE_LABELS,
  SUCCESSION_STAGE_COLORS,
  GROUND_COVER_LABELS,
  GROUND_COVER_COLORS,
};

/**
 * OBSERVE — a distinct vegetation patch outlined on the map (mature
 * forest, disturbed pasture, wetland edge, …). `successionStage` is the
 * temporal dimension; `groundCover` is the structural state right now.
 */
export interface VegetationPatch {
  id: string;
  projectId: string;
  // MultiPolygon is permitted so a vegetation matrix produced by the
  // Fill-remainder tool (boundary minus crop / building patches) can
  // store the disconnected pieces that turf.difference leaves behind.
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  successionStage: SuccessionStage;
  groundCover: GroundCoverState;
  label?: string;
  notes?: string;
  createdAt: string;
}

/** Seed a ground cover from a succession stage when migrating legacy
 *  ecology zones (which had no structural cover field). */
export function groundCoverFromStage(stage: SuccessionStage): GroundCoverState {
  if (stage === 'climax' || stage === 'late') return 'forest';
  if (stage === 'disturbed') return 'bare-soil';
  return 'sparse-grasses';
}

interface VegetationState {
  patches: VegetationPatch[];
  /** One-time guard so the ogden-ecology absorb runs only once. */
  migratedFromEcology: boolean;

  addPatch: (p: VegetationPatch) => void;
  updatePatch: (id: string, patch: Partial<VegetationPatch>) => void;
  removePatch: (id: string) => void;
  getProjectPatches: (projectId: string) => VegetationPatch[];
  _markEcologyMigrated: (absorbed: VegetationPatch[]) => void;
}

export const useVegetationStore = create<VegetationState>()(
  persist(
    temporal(
      (set, get) => ({
        patches: [],
        migratedFromEcology: false,

        addPatch: (p) => set((s) => ({ patches: [...s.patches, p] })),
        updatePatch: (id, patch) =>
          set((s) => ({
            patches: s.patches.map((p) =>
              p.id === id ? { ...p, ...patch } : p,
            ),
          })),
        removePatch: (id) =>
          set((s) => ({ patches: s.patches.filter((p) => p.id !== id) })),
        getProjectPatches: (projectId) =>
          get().patches.filter((p) => p.projectId === projectId),
        _markEcologyMigrated: (absorbed) =>
          set((s) => ({
            patches: [...s.patches, ...absorbed],
            migratedFromEcology: true,
          })),
      }),
      { limit: 200 },
    ),
    {
      name: 'ogden-vegetation',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 1,
    },
  ),
);

// absorbLegacyEcologyZones reads getState().migratedFromEcology as its guard.
// Under the async IndexedDB backend that read must happen AFTER hydration (a
// synchronous call would see the empty pre-hydration state and re-absorb / get
// clobbered), so it runs via the onHydrated hook. It is idempotent.
rehydrateWithLogging(useVegetationStore, {
  onHydrated: absorbLegacyEcologyZones,
});

/**
 * One-time absorb: drain legacy `EcologyZone` records out of the
 * persisted `ogden-ecology` blob into vegetation patches, then strip
 * them from the ecology blob so the old store stops carrying them.
 * Runs at most once (guarded by `migratedFromEcology`).
 */
function absorbLegacyEcologyZones(): void {
  if (typeof window === 'undefined') return;
  if (useVegetationStore.getState().migratedFromEcology) return;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem('ogden-ecology');
  } catch {
    raw = null;
  }
  if (!raw) {
    useVegetationStore.getState()._markEcologyMigrated([]);
    return;
  }

  try {
    const parsed = JSON.parse(raw) as {
      state?: { ecologyZones?: unknown[] };
    };
    const legacy = Array.isArray(parsed?.state?.ecologyZones)
      ? (parsed.state!.ecologyZones as Array<{
          id: string;
          projectId: string;
          geometry: GeoJSON.Polygon;
          dominantStage: SuccessionStage;
          label?: string;
          notes?: string;
          createdAt?: string;
        }>)
      : [];

    const absorbed: VegetationPatch[] = legacy.map((z) => ({
      id: z.id,
      projectId: z.projectId,
      geometry: z.geometry,
      successionStage: z.dominantStage,
      groundCover: groundCoverFromStage(z.dominantStage),
      label: z.label,
      notes: z.notes,
      createdAt: z.createdAt ?? new Date().toISOString(),
    }));

    useVegetationStore.getState()._markEcologyMigrated(absorbed);

    if (parsed.state && 'ecologyZones' in parsed.state) {
      delete parsed.state.ecologyZones;
      try {
        window.localStorage.setItem('ogden-ecology', JSON.stringify(parsed));
      } catch {
        /* best-effort cleanup; absorb already succeeded */
      }
    }
  } catch {
    useVegetationStore.getState()._markEcologyMigrated([]);
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenVegetationStore =
    useVegetationStore;
}
