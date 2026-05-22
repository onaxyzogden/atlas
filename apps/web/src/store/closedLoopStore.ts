/**
 * Closed-Loop Systems store — unified material-flow model
 * (ADR 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md;
 * #58/#59 unification — collapses the former `flowConnectorStore`
 * (`ogden-flow-connectors`, canvas LineStrings, free-text endpoints) and the
 * former `WasteVector` model into one `MaterialFlow`).
 *
 * Holds material flows (design intent — canvas-drawn OR list-authored) +
 * waste-vector runs (operational feedback) + fertility infrastructure
 * (nutrient destinations). Together these form one closed loop per Holmgren
 * P4 (Self-regulation & Feedback) and P6 (Produce No Waste).
 *
 * A `MaterialFlow` carries an optional structured `sourceId`/`sinkId` pair so
 * it can earn closed-loop credit in `ClosedLoopGraphCard`, an optional
 * `geometry` (present only for canvas-origin flows), and free-text
 * `sourceLabel`/`sinkLabel` fallbacks for endpoints the steward has not yet
 * pinned to a feature.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { temporal } from 'zundo';

const FLOW_CONNECTOR_LEGACY_KEY = 'ogden-flow-connectors';

// ── Material flows ──────────────────────────────────────────────────────────

/**
 * Superset enum: the legacy `FlowKind` set (canvas connectors) verbatim plus
 * the two `WasteResourceType` members it did not already cover
 * (`organic_matter`, `greywater`). `compost` / `manure` overlapped both
 * models and dedupe here.
 */
export type MaterialKind =
  | 'compost'
  | 'manure'
  | 'mulch'
  | 'water'
  | 'grain'
  | 'energy'
  | 'other'
  | 'organic_matter'
  | 'greywater';

export interface MaterialFlow {
  id: string;
  projectId: string;
  label: string;
  materialKind: MaterialKind;
  /** Structured endpoint feature ids — null until the steward pins them.
   *  Closed-loop credit requires both to be non-null. */
  sourceId: string | null;
  sinkId: string | null;
  /** Free-text endpoint fallbacks (carried from the legacy connector
   *  `fromName`/`toName`); shown when the matching id is null. */
  sourceLabel?: string;
  sinkLabel?: string;
  /** 'canvas' = drawn on the map (carries geometry); 'list' = authored in the
   *  Waste-vector list tool (no geometry). */
  origin: 'canvas' | 'list';
  /** Present only for origin === 'canvas'. */
  geometry?: GeoJSON.LineString;
  /** Hex colour — defaults to the material-kind palette entry. */
  color?: string;
  notes?: string;
  phase?: string;
  enterprise?: string;
  /** Optional monthly throughput quantities. All optional so legacy flows
   *  (and flows authored without opening the Quantities sub-section) round-
   *  trip unchanged; dashboard derivations fold over `?? 0`. */
  massKgPerMonth?: number;
  volumeLPerMonth?: number;
  energyKwhPerMonth?: number;
  nutrientNKgPerMonth?: number;
  nutrientPKgPerMonth?: number;
  nutrientKKgPerMonth?: number;
  createdAt: string;
  updatedAt?: string;
}

export const MATERIAL_KIND_CONFIG: Record<
  MaterialKind,
  { label: string; color: string }
> = {
  compost:        { label: 'Compost',        color: '#6a4a28' },
  manure:         { label: 'Manure',         color: '#8a6a3a' },
  mulch:          { label: 'Mulch',          color: '#7aae3c' },
  water:          { label: 'Water',          color: '#4a90d9' },
  grain:          { label: 'Grain',          color: '#caa46c' },
  energy:         { label: 'Energy',         color: '#e6b34a' },
  other:          { label: 'Other',          color: '#9a8070' },
  organic_matter: { label: 'Organic matter', color: '#5a7a3a' },
  greywater:      { label: 'Greywater',      color: '#5aa0a8' },
};

// ── Legacy shapes (read-only — migration inputs) ────────────────────────────

type LegacyWasteResourceType = 'organic_matter' | 'manure' | 'greywater' | 'compost';

interface LegacyWasteVector {
  id: string;
  projectId: string;
  fromFeatureId: string;
  toFeatureId: string;
  label: string;
  resourceType: LegacyWasteResourceType;
  createdAt: string;
}

type LegacyFlowKind =
  | 'compost' | 'manure' | 'mulch' | 'water' | 'grain' | 'energy' | 'other';

interface LegacyFlowConnector {
  id: string;
  projectId: string;
  name: string;
  flowKind: LegacyFlowKind;
  geometry: GeoJSON.LineString;
  color: string;
  fromName?: string;
  toName?: string;
  notes: string;
  phase?: string;
  enterprise?: string;
  createdAt: string;
  updatedAt: string;
}

/** WasteVector → MaterialFlow (list origin, structured endpoints, no geometry). */
function wasteVectorToFlow(v: LegacyWasteVector): MaterialFlow {
  return {
    id: v.id,
    projectId: v.projectId,
    label: v.label,
    materialKind: v.resourceType, // every LegacyWasteResourceType ∈ MaterialKind
    sourceId: v.fromFeatureId || null,
    sinkId: v.toFeatureId || null,
    origin: 'list',
    color: MATERIAL_KIND_CONFIG[v.resourceType].color,
    createdAt: v.createdAt,
  };
}

/** FlowConnector → MaterialFlow (canvas origin, geometry kept, endpoints
 *  unpinned — free-text names preserved as fallbacks). */
function flowConnectorToFlow(c: LegacyFlowConnector): MaterialFlow {
  return {
    id: c.id,
    projectId: c.projectId,
    label: c.name,
    materialKind: c.flowKind, // every LegacyFlowKind ∈ MaterialKind
    sourceId: null,
    sinkId: null,
    sourceLabel: c.fromName || undefined,
    sinkLabel: c.toName || undefined,
    origin: 'canvas',
    geometry: c.geometry,
    color: c.color || MATERIAL_KIND_CONFIG[c.flowKind].color,
    notes: c.notes || undefined,
    phase: c.phase,
    enterprise: c.enterprise,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** Raw-read a top-level zustand-persisted blob's `state` slice. */
function readPersistedSlice<T>(key: string): T | undefined {
  if (typeof window === 'undefined' || !window.localStorage) return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { state?: T };
    return parsed.state;
  } catch {
    return undefined;
  }
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
 * worm_bin` value.
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
   * to. Optional; undefined = unassigned.
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
  materialFlows: MaterialFlow[];
  wasteVectorRuns: WasteVectorRun[];
  fertilityInfra: FertilityInfra[];

  addMaterialFlow: (f: MaterialFlow) => void;
  updateMaterialFlow: (id: string, patch: Partial<MaterialFlow>) => void;
  removeMaterialFlow: (id: string) => void;

  addWasteVectorRun: (r: WasteVectorRun) => void;
  removeWasteVectorRun: (id: string) => void;

  addFertilityInfra: (i: FertilityInfra) => void;
  updateFertilityInfra: (id: string, patch: Partial<FertilityInfra>) => void;
  removeFertilityInfra: (id: string) => void;
}

interface PersistedV1 {
  wasteVectors?: LegacyWasteVector[];
  wasteVectorRuns?: WasteVectorRun[];
  fertilityInfra?: FertilityInfra[];
}

export const useClosedLoopStore = create<ClosedLoopState>()(
  persist(
    temporal(
      (set) => ({
        materialFlows: [],
        wasteVectorRuns: [],
        fertilityInfra: [],

        addMaterialFlow: (f) => set((s) => ({ materialFlows: [...s.materialFlows, f] })),
        updateMaterialFlow: (id, patch) =>
          set((s) => ({
            materialFlows: s.materialFlows.map((f) =>
              f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f,
            ),
          })),
        removeMaterialFlow: (id) =>
          set((s) => ({ materialFlows: s.materialFlows.filter((f) => f.id !== id) })),

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
    {
      name: 'ogden-closed-loop',
      version: 2,
      // Same-key v1→v2: WasteVector[] → MaterialFlow[] (list origin).
      migrate: (persisted, version) => {
        if (version >= 2) return persisted as ClosedLoopState;
        const p = (persisted ?? {}) as PersistedV1;
        return {
          materialFlows: (p.wasteVectors ?? []).map(wasteVectorToFlow),
          wasteVectorRuns: p.wasteVectorRuns ?? [],
          fertilityInfra: p.fertilityInfra ?? [],
        } as ClosedLoopState;
      },
      onRehydrateStorage: () => (hydrated, error) => {
        if (error || !hydrated) return;
        // Foreign-key fold: the dead `ogden-flow-connectors` blob is invisible
        // to the same-key `migrate` above, so fold it here on first load, then
        // delete the dead key so it can never re-fold (idempotent).
        if (typeof window === 'undefined' || !window.localStorage) return;
        const legacy = readPersistedSlice<{ connectors?: LegacyFlowConnector[] }>(
          FLOW_CONNECTOR_LEGACY_KEY,
        );
        const connectors = legacy?.connectors ?? [];
        if (connectors.length === 0) {
          if (window.localStorage.getItem(FLOW_CONNECTOR_LEGACY_KEY)) {
            window.localStorage.removeItem(FLOW_CONNECTOR_LEGACY_KEY);
          }
          return;
        }
        const existingIds = new Set(hydrated.materialFlows.map((f) => f.id));
        const folded = connectors
          .filter((c) => !existingIds.has(c.id))
          .map(flowConnectorToFlow);
        useClosedLoopStore.setState({
          materialFlows: [...hydrated.materialFlows, ...folded],
        });
        window.localStorage.removeItem(FLOW_CONNECTOR_LEGACY_KEY);
        // Migrated state is the new baseline — drop the undo timeline (it holds
        // pre-merge shapes).
        (
          useClosedLoopStore as unknown as {
            temporal: { getState: () => { clear: () => void } };
          }
        ).temporal.getState().clear();
      },
    },
  ),
);

rehydrateWithLogging(useClosedLoopStore);
