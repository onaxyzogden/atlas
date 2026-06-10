/**
 * Water Systems store — Scholar-aligned namespace consolidation
 * (plan few-concerns-shiny-quokka.md, ADR
 * 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).
 *
 * Holds earthworks (movement) + storage infrastructure (storage). Yeomans
 * Keyline Scales: water is one foundational layer; movement and storage are
 * halves of the hydrological respiratory system. Per Holmgren P8.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import { temporal } from 'zundo';

// ── Earthworks (swales / drains / diversions) ───────────────────────────────

export type EarthworkType = 'swale' | 'diversion' | 'french_drain';

export interface Earthwork {
  id: string;
  projectId: string;
  type: EarthworkType;
  geometry: GeoJSON.LineString;
  lengthM: number;
  notes?: string;
  createdAt: string;
}

// ── Storage infrastructure (point placements) ───────────────────────────────

export type StorageInfraType = 'cistern' | 'pond' | 'rain_garden';

export interface StorageInfra {
  id: string;
  projectId: string;
  type: StorageInfraType;
  /** [lng, lat] — point placement. */
  center: [number, number];
  /** Capacity in litres (cisterns/ponds). Optional for rain gardens. */
  capacityL?: number;
  notes?: string;
  createdAt: string;
}

// ── Water nodes (Scholar-aligned directed graph for Plan Module 2) ──────────
//
// Per Permaculture Scholar verdict 2026-05-07: water design is a directed
// graph of nodes (catchments → storage → swale → sink) where every non-sink
// node MUST declare an overflow target. Volume flows downstream and excess
// spills along the overflow edge. This collection is purpose-built for the
// new Plan Module 2 cards and is independent of the legacy
// `earthworks` / `storageInfra` arrays (which remain for map-layer
// compatibility and for the existing OBSERVE annotation pipeline).

export type WaterNodeKind = 'catchment' | 'storage' | 'swale' | 'sink';

export type CatchmentSurface =
  | 'metal_roof'
  | 'asphalt_roof'
  | 'gravel'
  | 'pasture'
  | 'forest';

export type StorageNodeKind = 'cistern' | 'tank' | 'pond' | 'rain_garden';

export interface WaterNode {
  id: string;
  projectId: string;
  /** Plan objective active in the Act tier when this feature was drawn (Phase-5 provenance stamp); undefined for legacy or non-objective draws. */
  sourceObjectiveId?: string;
  name: string;
  kind: WaterNodeKind;
  createdAt: string;

  /**
   * Absolute geographic anchor [lng, lat] used by PlanDataLayers + on-map
   * drag. Set on placement: catchment = polygon centroid, storage/sink =
   * drop point, swale = midpoint of the line. Older v1 nodes without
   * `center` won't render on the Plan map until re-placed (no migration —
   * field is optional).
   */
  center?: [number, number];

  /** Catchment fields. */
  surface?: CatchmentSurface;
  areaM2?: number;
  runoffCoeff?: number;
  /** Catchment polygon footprint, used for map rendering + drag-translate. */
  geometry?: GeoJSON.Polygon;

  /** Storage fields. */
  storageKind?: StorageNodeKind;
  capacityL?: number;
  /**
   * Storage sizing helper inputs (Tier C / C3). Optional — when both are
   * present the implicit target is `householdLpd × daysOffGrid` litres,
   * which the steward eyeballs against `capacityL`. Persisted so a
   * follow-up helper card can compute and warn on under-sizing without a
   * second migration. Only meaningful for `kind === 'storage'`.
   */
  householdLpd?: number;
  daysOffGrid?: number;

  /** Swale fields — capacity derived from L × W × D × 1000 if all present. */
  swaleLengthM?: number;
  swaleWidthM?: number;
  swaleDepthM?: number;
  /** Swale line geometry, used for map rendering + drag-translate. */
  swaleGeometry?: GeoJSON.LineString;

  /**
   * Mandatory for any non-sink node. Either another node id within the
   * same project, the literal `'offsite'` (acknowledged loss), or `null`
   * if the steward hasn't decided yet (treated as a validation warning).
   */
  overflowToNodeId?: string | 'offsite' | null;

  /**
   * PLAN-stage Module 9 — phaseStore phase id this water node belongs to.
   * Optional; undefined = unassigned. Lets the Phasing dashboard roll up
   * water infrastructure by build phase and credits the project-type
   * cross-check chip on Multi-Enterprise sequencing items.
   */
  phase?: string;

  /**
   * PLAN-stage Multi-Enterprise — `enterpriseStore` enterprise id this
   * water node belongs to. Optional; undefined = unassigned.
   */
  enterprise?: string;

  notes?: string;

  /**
   * Plan-stage utility-conflict veto record. Set at create time when the
   * earthwork's geometry intersects (within 3 m) a recorded
   * `BuriedUtility` line and the tool's `earthworkDepthCm` > 30. Per
   * ADR 2026-05-10-plan-earthwork-utility-veto.md. Empty / undefined
   * means no conflict was detected.
   */
  utilityConflicts?: { id: string; kind: string }[];
  /** Free-text acknowledgment captured when overriding the conflict veto. */
  utilityAcknowledgment?: string;
}

// ── Watercourses (natural drainage — distinct from built earthworks) ────────

export type WatercourseKind = 'stream' | 'creek' | 'ditch' | 'other';

export interface Watercourse {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  kind: WatercourseKind;
  perennial?: boolean;
  notes?: string;
  createdAt: string;
}

// ── Waterbodies (natural standing water — lakes, ponds, wetlands) ───────────
//
// Polygon counterpart to `Watercourse`. Captured from the basemap via the
// "Adopt water from map" tool (OpenMapTiles `water` source-layer). Distinct
// from `StorageInfra` (point-only built storage) and from Plan-stage
// `WaterNode` (directed-graph design nodes). Pure observation — never
// participates in Plan-stage hydraulic routing.

export type WaterbodyKind =
  | 'lake'
  | 'pond'
  | 'wetland'
  | 'reservoir'
  | 'other';

export interface Waterbody {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  kind: WaterbodyKind;
  name?: string;
  notes?: string;
  createdAt: string;
}

interface WaterSystemsState {
  earthworks: Earthwork[];
  storageInfra: StorageInfra[];
  watercourses: Watercourse[];
  waterbodies: Waterbody[];
  waterNodes: WaterNode[];

  addEarthwork: (e: Earthwork) => void;
  updateEarthwork: (id: string, patch: Partial<Earthwork>) => void;
  removeEarthwork: (id: string) => void;

  addStorageInfra: (i: StorageInfra) => void;
  updateStorageInfra: (id: string, patch: Partial<StorageInfra>) => void;
  removeStorageInfra: (id: string) => void;

  addWatercourse: (w: Watercourse) => void;
  updateWatercourse: (id: string, patch: Partial<Watercourse>) => void;
  removeWatercourse: (id: string) => void;

  addWaterbody: (w: Waterbody) => void;
  updateWaterbody: (id: string, patch: Partial<Waterbody>) => void;
  removeWaterbody: (id: string) => void;

  addWaterNode: (n: WaterNode) => void;
  updateWaterNode: (id: string, patch: Partial<WaterNode>) => void;
  removeWaterNode: (id: string) => void;
}

export const useWaterSystemsStore = create<WaterSystemsState>()(
  persist(
    temporal((set) => ({
      earthworks: [],
      storageInfra: [],
      watercourses: [],
      waterbodies: [],
      waterNodes: [],

      addEarthwork: (e) => set((s) => ({ earthworks: [...s.earthworks, e] })),
      updateEarthwork: (id, patch) =>
        set((s) => ({ earthworks: s.earthworks.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEarthwork: (id) => set((s) => ({ earthworks: s.earthworks.filter((e) => e.id !== id) })),

      addStorageInfra: (i) => set((s) => ({ storageInfra: [...s.storageInfra, i] })),
      updateStorageInfra: (id, patch) =>
        set((s) => ({ storageInfra: s.storageInfra.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      removeStorageInfra: (id) => set((s) => ({ storageInfra: s.storageInfra.filter((i) => i.id !== id) })),

      addWatercourse: (w) => set((s) => ({ watercourses: [...s.watercourses, w] })),
      updateWatercourse: (id, patch) =>
        set((s) => ({
          watercourses: s.watercourses.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),
      removeWatercourse: (id) =>
        set((s) => ({ watercourses: s.watercourses.filter((w) => w.id !== id) })),

      addWaterbody: (w) => set((s) => ({ waterbodies: [...s.waterbodies, w] })),
      updateWaterbody: (id, patch) =>
        set((s) => ({
          waterbodies: s.waterbodies.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),
      removeWaterbody: (id) =>
        set((s) => ({ waterbodies: s.waterbodies.filter((w) => w.id !== id) })),

      addWaterNode: (n) => set((s) => ({ waterNodes: [...s.waterNodes, n] })),
      updateWaterNode: (id, patch) =>
        set((s) => ({
          waterNodes: s.waterNodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        })),
      removeWaterNode: (id) =>
        set((s) => {
          // Removing a node also nulls any overflow edges pointing at it,
          // so the directed graph never holds a dangling reference.
          const remaining = s.waterNodes.filter((n) => n.id !== id);
          return {
            waterNodes: remaining.map((n) =>
              n.overflowToNodeId === id ? { ...n, overflowToNodeId: null } : n,
            ),
          };
        }),
    }), { limit: 200 }),
    {
      name: 'ogden-water-systems',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 3,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<WaterSystemsState>;
        return {
          ...p,
          watercourses: p.watercourses ?? [],
          waterbodies: p.waterbodies ?? [],
          waterNodes: p.waterNodes ?? [],
        } as WaterSystemsState;
      },
    },
  ),
);

rehydrateWithLogging(useWaterSystemsStore);
