/**
 * objectiveFeatureRegistry — the single source of truth mapping a Plan
 * objective's armed map tools to the placed-feature stores those tools write
 * into, so the Act objective panel can list "this objective's placed features."
 *
 * ## The derive seam
 *
 *   getObjectiveActTools(objective)   // @ogden/shared — catalogue-id strings
 *     -> ACT_TOOL_CATALOG[id].arm     // join to the real arm (map/log/form/…)
 *     -> filter(arm.kind === 'map')   // only map arms produce features
 *     -> arm.mapToolId                // MapToolId[]
 *     -> matchedDescriptors(ids)      // store-granular descriptors (this file)
 *     -> descriptor.build(projectId)  // store records -> ObjectivePlacedRow[]
 *
 * There is NO central `mapToolId -> store` map in the codebase today — that
 * resolution is buried in the DrawHost switches (PlanDrawHost / ObserveDrawHost
 * / the survey hosts). This file lifts it into one declarative table.
 *
 * ## Store-granular, not tool-granular
 *
 * Each descriptor binds a *store family* (crops, livestock, built-env, …), and
 * `build` lists ALL of that project's features in the store — not only those a
 * specific tool drew. Rationale: placed features carry only `projectId` + a
 * Yeomans `phase` today (no objective id), so per-objective precision is not
 * derivable. Showing every feature in a store the objective touches is the
 * operator-confirmed "derive now" behaviour; the additive `sourceObjectiveId`
 * stamping (Phase 5) tightens this to exact per-objective later.
 *
 * Tools whose store is outside the operator-named 9-store scope (topography
 * annotations, climate sectors, soil samples, neighbour pins, …) match no
 * descriptor and are silently skipped — exactly like `resolveActTools` skips
 * unknown catalogue ids.
 *
 * ## Divergent delete signatures
 *
 * The stores delete by wildly different signatures — flat `deleteX(id)`,
 * `byProject` `removeFeature(pid, id)`, land-design `remove(pid, id)`, and the
 * water store's five collections each with their own `removeY(id)`. Rather than
 * a descriptor-level delete + a source switch in the panel, every row carries
 * its own bound `remove()` closure, built at row time. The panel just calls
 * `row.remove()`.
 */

import type { MapToolId } from '../../../v3/observe/components/measure/useMapToolStore.js';
import { ACT_TOOL_CATALOG } from '../../../v3/act/tier-shell/actToolCatalog.js';
import { getObjectiveActTools, type PlanStratumObjective } from '@ogden/shared';

import { useCropStore } from '../../../store/cropStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import {
  useWaterSystemsStore,
  type Earthwork,
  type StorageInfra,
  type Watercourse,
  type Waterbody,
  type WaterNode,
} from '../../../store/waterSystemsStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore, PATH_TYPE_CONFIG } from '../../../store/pathStore.js';
import {
  useVegetationSurveyStore,
  VEG_COMMUNITY_COLORS,
  type VegetationSurveyFeature,
} from '../../../store/vegetationSurveyStore.js';
import {
  useSlopeSurveyStore,
  SLOPE_CLASS_COLORS,
  type SlopeSurveyFeature,
} from '../../../store/slopeSurveyStore.js';
import {
  builtToRow,
  designToRow,
  zoneToRow,
  centroidOf,
  type PlacedFeatureRow,
} from './usePlacedFeatures.js';

// ─────────────────────────────────────────────────────────────────────────
// Row type — a PlacedFeatureRow widened to carry any store's source tag plus
// a pre-bound delete closure (so the panel never switches on source).
// ─────────────────────────────────────────────────────────────────────────

export interface ObjectivePlacedRow extends Omit<PlacedFeatureRow, 'source'> {
  /** Store-family tag — wider than usePlacedFeatures' 3-store union. */
  source: string;
  /** Pre-bound deleter — encapsulates the store's own delete signature. */
  remove: () => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Local formatters (the usePlacedFeatures ones are module-private; these few
// are tiny and kept local rather than widening that module's export surface).
// ─────────────────────────────────────────────────────────────────────────

function fmtArea(m2: number | undefined): string | undefined {
  if (typeof m2 !== 'number' || !isFinite(m2) || m2 <= 0) return undefined;
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${Math.round(m2)} m²`;
}

function fmtLength(m: number | undefined): string | undefined {
  if (typeof m !== 'number' || !isFinite(m) || m <= 0) return undefined;
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function fmtAcres(ac: number | undefined): string | undefined {
  if (typeof ac !== 'number' || !isFinite(ac) || ac <= 0) return undefined;
  return `${ac.toFixed(2)} ac`;
}

function titleCase(s: string): string {
  return s
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Default fills for stores whose records do not carry their own colour.
const COLOR_FENCE = '#9a6b3f';
const COLOR_PATH_FALLBACK = '#8a8e94';
const COLOR_WATER_LINE = '#3b82c4';
const COLOR_WATER_BODY = '#2f6f9f';
const COLOR_WATER_STORAGE = '#4a7fb0';
const COLOR_WATER_NODE = '#3d8bbd';

// ─────────────────────────────────────────────────────────────────────────
// Descriptor table
// ─────────────────────────────────────────────────────────────────────────

export interface PlacedFeatureDescriptor {
  /** Stable store-family tag — also the row `source` and the dedupe key. */
  source: string;
  /** True when this objective tool's mapToolId writes into this store. */
  matches: (id: MapToolId) => boolean;
  /** List + map + bind-delete every project feature in this store. */
  build: (projectId: string) => ObjectivePlacedRow[];
}

/**
 * mapToolIds that route through `PlanDesignElementHost` -> designElementsStore
 * (the `DESIGN_ELEMENT_TOOL_IDS` set in PlanDrawHost.tsx). Kept in sync with
 * that file by hand — both reference the elementCatalog kinds. Only the members
 * an objective can actually arm need listing, but the full set is mirrored so a
 * future objective override picks them up without a second edit here.
 */
const DESIGN_ELEMENT_MAP_TOOL_IDS = new Set<string>([
  'plan.plant-systems.orchard',
  'plan.plant-systems.silvopasture',
  'plan.plant-systems.pasture-mix',
  'plan.plant-systems.oak-tree',
  'plan.plant-systems.pine-tree',
  'plan.plant-systems.apple-tree',
  'plan.plant-systems.shrub',
  'plan.plant-systems.hedgerow',
  'plan.water-management.spring',
  'plan.zone-circulation.road',
  'plan.zone-circulation.bridge',
  'plan.machinery.turnaround',
]);

export const PLACED_FEATURE_DESCRIPTORS: readonly PlacedFeatureDescriptor[] = [
  // ── Crops (crop-area tool; bed/garden type chosen in the popover) ──────────
  {
    source: 'crop',
    matches: (id) => id === 'plan.plant-systems.crop-area',
    build: (projectId) => {
      const { cropAreas, deleteCropArea } = useCropStore.getState();
      return cropAreas
        .filter((c) => c.projectId === projectId)
        .map<ObjectivePlacedRow>((c) => ({
          rowKey: `crop:${c.id}`,
          id: c.id,
          source: 'crop',
          kind: c.type,
          groupLabel: 'Crop areas',
          label: c.name?.trim() || titleCase(c.type),
          color: c.color || '#7aa86a',
          meta: fmtArea(c.areaM2),
          centroid: centroidOf(c.geometry),
          hidden: false,
          remove: () => useCropStore.getState().deleteCropArea(c.id),
        }));
    },
  },

  // ── Livestock (paddocks + fence lines — one store, one domain) ────────────
  {
    source: 'livestock',
    matches: (id) =>
      id === 'plan.livestock.paddock' || id === 'plan.livestock.fence-line',
    build: (projectId) => {
      const { paddocks, fenceLines } = useLivestockStore.getState();
      const out: ObjectivePlacedRow[] = [];
      for (const p of paddocks) {
        if (p.projectId !== projectId) continue;
        out.push({
          rowKey: `paddock:${p.id}`,
          id: p.id,
          source: 'livestock',
          kind: 'paddock',
          groupLabel: 'Paddocks',
          label: p.name?.trim() || 'Paddock',
          color: p.color || '#9bbf5a',
          meta: fmtArea(p.areaM2),
          centroid: centroidOf(p.geometry),
          hidden: false,
          remove: () => useLivestockStore.getState().deletePaddock(p.id),
        });
      }
      for (const f of fenceLines) {
        if (f.projectId !== projectId) continue;
        out.push({
          rowKey: `fence:${f.id}`,
          id: f.id,
          source: 'livestock',
          kind: 'fence',
          groupLabel: 'Fence lines',
          label: f.name?.trim() || titleCase(f.fenceType),
          color: COLOR_FENCE,
          meta: undefined,
          centroid: centroidOf(f.geometry),
          hidden: false,
          remove: () => useLivestockStore.getState().deleteFenceLine(f.id),
        });
      }
      return out;
    },
  },

  // ── Built environment (Observe rail ids + Plan `…be.<kind>` ids) ──────────
  {
    source: 'built',
    matches: (id) =>
      id.startsWith('observe.built-environment.') ||
      id.startsWith('plan.structures-subsystems.be.'),
    build: (projectId) => {
      const { entities, delete: del } = useBuiltEnvironmentStoreV2.getState();
      return entities
        .filter((e) => e.projectId === projectId)
        .map<ObjectivePlacedRow>((e) => ({
          ...builtToRow(e),
          source: 'built',
          remove: () => del(e.id),
        }));
    },
  },

  // ── Land-design elements (elementCatalog kinds via PlanDesignElementHost) ──
  {
    source: 'design',
    matches: (id) => DESIGN_ELEMENT_MAP_TOOL_IDS.has(id),
    build: (projectId) => {
      const list = useLandDesignStore.getState().byProject[projectId] ?? [];
      return list
        .filter((el) => !el.draft)
        .map<ObjectivePlacedRow>((el) => ({
          ...designToRow(el),
          source: 'design',
          remove: () => useLandDesignStore.getState().remove(projectId, el.id),
        }));
    },
  },

  // ── Water systems (5 collections, mixed geometry/center; per-record delete)
  {
    source: 'water',
    matches: (id) =>
      id.startsWith('plan.water-management.') ||
      id === 'observe.earth-water-ecology.watercourse',
    build: (projectId) => {
      const s = useWaterSystemsStore.getState();
      const out: ObjectivePlacedRow[] = [];

      for (const e of s.earthworks as Earthwork[]) {
        if (e.projectId !== projectId) continue;
        out.push({
          rowKey: `water-earthwork:${e.id}`,
          id: e.id,
          source: 'water',
          kind: e.type,
          groupLabel: 'Earthworks',
          label: titleCase(e.type),
          color: COLOR_WATER_LINE,
          meta: fmtLength(e.lengthM),
          centroid: centroidOf(e.geometry),
          hidden: false,
          remove: () => useWaterSystemsStore.getState().removeEarthwork(e.id),
        });
      }
      for (const i of s.storageInfra as StorageInfra[]) {
        if (i.projectId !== projectId) continue;
        out.push({
          rowKey: `water-storage:${i.id}`,
          id: i.id,
          source: 'water',
          kind: i.type,
          groupLabel: 'Water storage',
          label: titleCase(i.type),
          color: COLOR_WATER_STORAGE,
          meta: undefined,
          centroid: i.center ?? null,
          hidden: false,
          remove: () => useWaterSystemsStore.getState().removeStorageInfra(i.id),
        });
      }
      for (const w of s.watercourses as Watercourse[]) {
        if (w.projectId !== projectId) continue;
        out.push({
          rowKey: `water-course:${w.id}`,
          id: w.id,
          source: 'water',
          kind: w.kind,
          groupLabel: 'Watercourses',
          label: titleCase(w.kind),
          color: COLOR_WATER_LINE,
          meta: undefined,
          centroid: centroidOf(w.geometry),
          hidden: false,
          remove: () => useWaterSystemsStore.getState().removeWatercourse(w.id),
        });
      }
      for (const b of s.waterbodies as Waterbody[]) {
        if (b.projectId !== projectId) continue;
        out.push({
          rowKey: `water-body:${b.id}`,
          id: b.id,
          source: 'water',
          kind: b.kind,
          groupLabel: 'Waterbodies',
          label: b.name?.trim() || titleCase(b.kind),
          color: COLOR_WATER_BODY,
          meta: undefined,
          centroid: centroidOf(b.geometry),
          hidden: false,
          remove: () => useWaterSystemsStore.getState().removeWaterbody(b.id),
        });
      }
      for (const n of s.waterNodes as WaterNode[]) {
        if (n.projectId !== projectId) continue;
        const centroid =
          n.center ??
          centroidOf(n.geometry ?? null) ??
          centroidOf(n.swaleGeometry ?? null);
        out.push({
          rowKey: `water-node:${n.id}`,
          id: n.id,
          source: 'water',
          kind: n.kind,
          groupLabel: 'Water nodes',
          label: n.name?.trim() || titleCase(n.kind),
          color: COLOR_WATER_NODE,
          meta: undefined,
          centroid,
          hidden: false,
          remove: () => useWaterSystemsStore.getState().removeWaterNode(n.id),
        });
      }
      return out;
    },
  },

  // ── Zones (polygon zones + seed-from-rings anchor) ────────────────────────
  {
    source: 'zone',
    matches: (id) =>
      id === 'plan.zone-circulation.zone' ||
      id === 'plan.zone-circulation.zone-seed-anchor',
    build: (projectId) => {
      const { zones, deleteZone } = useZoneStore.getState();
      return zones
        .filter((z) => z.projectId === projectId)
        .map<ObjectivePlacedRow>((z) => ({
          ...zoneToRow(z),
          source: 'zone',
          remove: () => deleteZone(z.id),
        }));
    },
  },

  // ── Paths (roads via the path tool; `road` elementCatalog kind → design) ──
  {
    source: 'path',
    matches: (id) => id === 'plan.zone-circulation.path',
    build: (projectId) => {
      const { paths, deletePath } = usePathStore.getState();
      return paths
        .filter((p) => p.projectId === projectId)
        .map<ObjectivePlacedRow>((p) => {
          const cfg = PATH_TYPE_CONFIG[p.type];
          return {
            rowKey: `path:${p.id}`,
            id: p.id,
            source: 'path',
            kind: p.type,
            groupLabel: 'Paths & roads',
            label: p.name?.trim() || cfg?.label || 'Path',
            color: p.color || cfg?.color || COLOR_PATH_FALLBACK,
            meta: fmtLength(p.lengthM),
            centroid: centroidOf(p.geometry),
            hidden: false,
            remove: () => usePathStore.getState().deletePath(p.id),
          };
        });
    },
  },

  // ── Vegetation survey (drawn community polygons, auto-%) ───────────────────
  {
    source: 'veg-survey',
    matches: (id) => id === 'act.ecology.veg-survey',
    build: (projectId) => {
      const features = useVegetationSurveyStore
        .getState()
        .listForProject(projectId) as VegetationSurveyFeature[];
      return features.map<ObjectivePlacedRow>((f) => ({
        rowKey: `veg:${f.id}`,
        id: f.id,
        source: 'veg-survey',
        kind: f.community,
        groupLabel: 'Vegetation survey',
        label: titleCase(f.community),
        color: VEG_COMMUNITY_COLORS[f.community] ?? '#7aa05a',
        meta: fmtAcres(f.acreage),
        centroid: centroidOf(f.geometry),
        hidden: false,
        remove: () =>
          useVegetationSurveyStore.getState().removeFeature(projectId, f.id),
      }));
    },
  },

  // ── Slope survey (drawn per-class polygons, auto-%) ───────────────────────
  {
    source: 'slope-survey',
    matches: (id) => id.startsWith('act.terrain.slope-'),
    build: (projectId) => {
      const features = useSlopeSurveyStore
        .getState()
        .listForProject(projectId) as SlopeSurveyFeature[];
      return features.map<ObjectivePlacedRow>((f) => ({
        rowKey: `slope:${f.id}`,
        id: f.id,
        source: 'slope-survey',
        kind: f.slopeClass,
        groupLabel: 'Slope survey',
        label: titleCase(f.slopeClass),
        color: SLOPE_CLASS_COLORS[f.slopeClass] ?? '#d9d362',
        meta: fmtAcres(f.acreage),
        centroid: centroidOf(f.geometry),
        hidden: false,
        remove: () =>
          useSlopeSurveyStore.getState().removeFeature(projectId, f.id),
      }));
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Pure resolution helpers (unit-tested)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolve an objective's armed *map* tool ids. Joins each catalogue-id string
 * to ACT_TOOL_CATALOG and keeps only `kind: 'map'` arms (log/form/flow/
 * zone-action arms place no features). Unknown ids are skipped.
 */
export function objectiveMapToolIds(
  objective: PlanStratumObjective,
): MapToolId[] {
  const out: MapToolId[] = [];
  for (const id of getObjectiveActTools(objective)) {
    const tool = ACT_TOOL_CATALOG[id];
    if (tool && tool.arm.kind === 'map') out.push(tool.arm.mapToolId);
  }
  return out;
}

/** The descriptors any of the given map tool ids resolve to (deduped, in table order). */
export function matchedDescriptors(
  toolIds: readonly MapToolId[],
): PlacedFeatureDescriptor[] {
  return PLACED_FEATURE_DESCRIPTORS.filter((d) =>
    toolIds.some((id) => d.matches(id)),
  );
}

/** The store-family `source` tags an objective's tools resolve to (for tests/debug). */
export function matchedSources(toolIds: readonly MapToolId[]): string[] {
  return matchedDescriptors(toolIds).map((d) => d.source);
}
