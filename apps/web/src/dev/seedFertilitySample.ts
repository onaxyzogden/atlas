/**
 * seedFertilitySample — dev-only console helper for exercising the
 * zoneThresholds cascade UX.
 *
 * Drops a deterministic 12-entity payload (4 structures, 2 paths,
 * 3 guilds, 3 fertility units) onto a target project so the three
 * readouts (FertilityColocationCard, SpiritualCommunalCard,
 * ArrivalSequenceDesignCard) each render with meaningful content at
 * default thresholds AND visibly change behaviour when the steward
 * tunes `closeM` / `mediumM` via the FertilityColocationCard's
 * "Tune zones (advanced)" disclosure.
 *
 * Usage from the browser console:
 *
 *     window.__ogdenSeedFertilitySample()              // defaults to first project
 *     window.__ogdenSeedFertilitySample('<projectId>') // specific project
 *
 * Idempotent: refuses to seed a project that already has any
 * structures, paths, guilds, or fertility infra (no console-driven
 * clobbering of hand-placed work).
 *
 * Geometry is anchored at the project's parcel centroid via
 * `turf.centroid`, with deterministic metre offsets converted to
 * lng/lat using the same cosine-corrected math as the inline helper
 * in `SpiritualCommunalCard.tsx` (so behaviour matches what the
 * cards' distance functions will compute).
 *
 * Exposed unconditionally (matches existing `__ogden*` debug-handle
 * pattern in projectStore.ts:705-706 and zoneStore.ts:235-236).
 * Function reference only — costs nothing until called.
 */

import * as turf from '@turf/turf';
import { useProjectStore } from '../store/projectStore.js';
import { useStructureStore, type Structure } from '../store/structureStore.js';
import {
  usePathStore,
  PATH_TYPE_CONFIG,
  type DesignPath,
  type PathType,
} from '../store/pathStore.js';
import { usePolycultureStore, type Guild } from '../store/polycultureStore.js';
import {
  useClosedLoopStore,
  type FertilityInfra,
  type FertilityInfraType,
} from '../store/closedLoopStore.js';
import type { StructureType } from '@ogden/shared';

interface SeedResult {
  ok: boolean;
  reason?: string;
  inserted?: { structures: number; paths: number; guilds: number; fertility: number };
}

// ─────────────────────────────────────────────────────────────────────────
// Offset → [lng, lat] conversion (cosine-corrected at parcel latitude).
// Mirrors SpiritualCommunalCard.tsx:90-98 so the cards' distance helpers
// see the same metres-on-the-ground we intended.
// ─────────────────────────────────────────────────────────────────────────

function offsetToLngLat(
  centroid: [number, number],
  offsetN_m: number,
  offsetE_m: number,
): [number, number] {
  const [lng, lat] = centroid;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);
  return [lng + offsetE_m / mPerDegLng, lat + offsetN_m / mPerDegLat];
}

function makeSquarePolygon(
  center: [number, number],
  sideM: number,
): GeoJSON.Polygon {
  const half = sideM / 2;
  const nw = offsetToLngLat(center, half, -half);
  const ne = offsetToLngLat(center, half, half);
  const se = offsetToLngLat(center, -half, half);
  const sw = offsetToLngLat(center, -half, -half);
  return {
    type: 'Polygon',
    coordinates: [[nw, ne, se, sw, nw]],
  };
}

function haversineMLocal(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const dφ = ((lat2 - lat1) * Math.PI) / 180;
  const dλ = ((lng2 - lng1) * Math.PI) / 180;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function lineLengthM(coords: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const a = coords[i - 1];
    const b = coords[i];
    if (a && b) total += haversineMLocal(a, b);
  }
  return total;
}

// ─────────────────────────────────────────────────────────────────────────
// Entity offset table — see the plan file for the rationale on each row.
// ─────────────────────────────────────────────────────────────────────────

interface StructureSeed {
  type: StructureType;
  name: string;
  offsetN: number;
  offsetE: number;
  widthM: number;
  depthM: number;
}

const STRUCTURE_SEEDS: StructureSeed[] = [
  { type: 'prayer_space', name: 'Prayer space', offsetN: 0, offsetE: 0, widthM: 8, depthM: 8 },
  { type: 'bathhouse', name: 'Bathhouse', offsetN: 0, offsetE: 60, widthM: 6, depthM: 6 },
  { type: 'pavilion', name: 'Pavilion', offsetN: -50, offsetE: 0, widthM: 6, depthM: 6 },
  { type: 'lookout', name: 'Lookout', offsetN: -80, offsetE: 30, widthM: 4, depthM: 4 },
];

interface FertilitySeed {
  type: FertilityInfraType;
  offsetN: number;
  offsetE: number;
  scaleNote: string;
}

const FERTILITY_SEEDS: FertilitySeed[] = [
  { type: 'composter', offsetN: 15, offsetE: 0, scaleNote: '3 m³ pile' },
  { type: 'worm_bin', offsetN: 40, offsetE: 30, scaleNote: '500 L bin' },
  { type: 'hugelkultur', offsetN: 90, offsetE: 0, scaleNote: '6 m mound' },
];

interface GuildSeed {
  name: string;
  anchorSpeciesId: string;
  offsetN: number;
  offsetE: number;
}

const GUILD_SEEDS: GuildSeed[] = [
  { name: 'Tomato–basil polyculture', anchorSpeciesId: 'placeholder-tomato', offsetN: 10, offsetE: 0 },
  { name: 'Stone-fruit guild', anchorSpeciesId: 'placeholder-peach', offsetN: 20, offsetE: -20 },
  { name: 'Berry hedgerow', anchorSpeciesId: 'placeholder-currant', offsetN: 100, offsetE: 0 },
];

interface PathSeed {
  type: PathType;
  name: string;
  /** Each waypoint is (offsetN, offsetE) in metres. */
  waypoints: [number, number][];
  usageFrequency?: DesignPath['usageFrequency'];
}

const PATH_SEEDS: PathSeed[] = [
  {
    type: 'arrival_sequence',
    name: 'Main approach',
    waypoints: [
      [-100, -30],
      [-40, 0],
      [-10, 0],
    ],
    usageFrequency: 'weekly',
  },
  {
    type: 'pedestrian_path',
    name: 'Kitchen-garden loop',
    waypoints: [
      [5, 5],
      [20, 20],
    ],
    usageFrequency: 'daily',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Main entry point.
// ─────────────────────────────────────────────────────────────────────────

export function seedFertilitySample(projectId?: string): SeedResult {
  const projectState = useProjectStore.getState();
  const projects = projectState.projects;

  const target =
    (projectId && projects.find((p) => p.id === projectId || p.serverId === projectId)) ||
    projects.find((p) => p.isBuiltin) ||
    projects[0];

  if (!target) {
    const reason = 'no project available to seed';
    console.warn('[seedFertilitySample]', reason);
    return { ok: false, reason };
  }

  const boundary = target.parcelBoundaryGeojson;
  if (!boundary) {
    const reason = `project "${target.name}" has no parcelBoundaryGeojson — cannot anchor seed`;
    console.warn('[seedFertilitySample]', reason);
    return { ok: false, reason };
  }

  let centroid: [number, number];
  try {
    const c = turf.centroid(boundary).geometry.coordinates;
    const lng = c[0];
    const lat = c[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      throw new Error('centroid produced non-numeric coordinates');
    }
    centroid = [lng, lat];
  } catch (err) {
    const reason = `turf.centroid failed: ${err instanceof Error ? err.message : String(err)}`;
    console.warn('[seedFertilitySample]', reason);
    return { ok: false, reason };
  }

  // Idempotency: refuse if any of the four target stores already holds
  // an entity for this project.
  const pid = target.id;
  const existingStructures = useStructureStore
    .getState()
    .structures.filter((s) => s.projectId === pid).length;
  const existingPaths = usePathStore.getState().paths.filter((p) => p.projectId === pid).length;
  const existingGuilds = usePolycultureStore.getState().guilds.filter((g) => g.projectId === pid)
    .length;
  const existingFertility = useClosedLoopStore
    .getState()
    .fertilityInfra.filter((f) => f.projectId === pid).length;

  if (existingStructures + existingPaths + existingGuilds + existingFertility > 0) {
    const reason = `project "${target.name}" already has placed entities (${existingStructures} structures / ${existingPaths} paths / ${existingGuilds} guilds / ${existingFertility} fertility) — refusing to seed; clear them first or pass a different projectId`;
    console.warn('[seedFertilitySample]', reason);
    return { ok: false, reason };
  }

  const now = new Date().toISOString();
  const newId = (): string =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `seed-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

  // ── Structures ────────────────────────────────────────────────────────
  const addStructure = useStructureStore.getState().addStructure;
  for (const seed of STRUCTURE_SEEDS) {
    const center = offsetToLngLat(centroid, seed.offsetN, seed.offsetE);
    const geometry = makeSquarePolygon(center, Math.max(seed.widthM, seed.depthM));
    const s: Structure = {
      id: newId(),
      projectId: pid,
      name: seed.name,
      type: seed.type,
      center,
      geometry,
      rotationDeg: 0,
      widthM: seed.widthM,
      depthM: seed.depthM,
      phase: 'phase-1',
      costEstimate: null,
      storiesCount: 1,
      infrastructureReqs: [],
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    addStructure(s);
  }

  // ── Fertility infra ───────────────────────────────────────────────────
  const addFertility = useClosedLoopStore.getState().addFertilityInfra;
  for (const seed of FERTILITY_SEEDS) {
    const center = offsetToLngLat(centroid, seed.offsetN, seed.offsetE);
    const f: FertilityInfra = {
      id: newId(),
      projectId: pid,
      type: seed.type,
      center,
      scaleNote: seed.scaleNote,
      createdAt: now,
    };
    addFertility(f);
  }

  // ── Guilds ────────────────────────────────────────────────────────────
  const addGuild = usePolycultureStore.getState().addGuild;
  for (const seed of GUILD_SEEDS) {
    const center = offsetToLngLat(centroid, seed.offsetN, seed.offsetE);
    const g: Guild = {
      id: newId(),
      projectId: pid,
      name: seed.name,
      anchorSpeciesId: seed.anchorSpeciesId,
      members: [],
      center,
      createdAt: now,
    };
    addGuild(g);
  }

  // ── Paths ─────────────────────────────────────────────────────────────
  const addPath = usePathStore.getState().addPath;
  for (const seed of PATH_SEEDS) {
    const coords = seed.waypoints.map(([n, e]) => offsetToLngLat(centroid, n, e));
    const lengthM = lineLengthM(coords);
    const p: DesignPath = {
      id: newId(),
      projectId: pid,
      name: seed.name,
      type: seed.type,
      color: PATH_TYPE_CONFIG[seed.type].color,
      geometry: { type: 'LineString', coordinates: coords },
      lengthM,
      phase: 'phase-1',
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    if (seed.usageFrequency !== undefined) p.usageFrequency = seed.usageFrequency;
    addPath(p);
  }

  const inserted = {
    structures: STRUCTURE_SEEDS.length,
    paths: PATH_SEEDS.length,
    guilds: GUILD_SEEDS.length,
    fertility: FERTILITY_SEEDS.length,
  };

  console.info(
    `[seedFertilitySample] inserted ${inserted.structures} structures, ${inserted.paths} paths, ${inserted.guilds} guilds, ${inserted.fertility} fertility units on "${target.name}" (${pid})`,
  );

  return { ok: true, inserted };
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenSeedFertilitySample =
    seedFertilitySample;
}
