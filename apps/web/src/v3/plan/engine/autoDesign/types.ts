/**
 * Shared types for the auto-design pipeline.
 *
 * The pipeline is a chain of pure functions:
 *   runSequencingEngine → zoneAllocator → stampGeometry → DraftShape[]
 * with `scheduleTasksToCalendar` (existing) for the Act calendar.
 *
 * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md.
 */

import type { GeometryTemplate } from '../../data/goalCompassTypes.js';
import type {
  ZoneCategory,
  SuccessionStage,
  GroundCoverState,
} from '../../../../store/zoneStore.js';

/** 1 acre in square metres (international acre). */
export const ACRE_M2 = 4046.8564224;

/**
 * Minimal zone view the allocator needs. `LandZone` structurally
 * satisfies this — tests can pass lightweight fixtures.
 */
export interface AllocatorZone {
  id: string;
  category: ZoneCategory;
  successionStage?: SuccessionStage | null;
  groundCover?: GroundCoverState | null;
  permacultureZone?: 0 | 1 | 2 | 3 | 4 | 5;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  areaM2: number;
}

export interface ZoneAllocation {
  zoneId: string;
  areaM2: number;
  /** Affinity score the allocator assigned (higher = better fit). */
  score: number;
}

/** Terrain inputs the contour/low-point stampers consume. */
export interface TerrainView {
  contours: { id: string; geometry: GeoJSON.LineString; elevationM?: number }[];
  /** High/low point markers; low-point fill uses `kind === 'low'`. */
  points: {
    id: string;
    position: [number, number];
    kind: 'high' | 'low';
    elevationM?: number;
  }[];
}

export const EMPTY_TERRAIN: TerrainView = { contours: [], points: [] };

/**
 * One stamped feature ready to become a draft design element. Geometry
 * is GeoJSON in [lng, lat]. The orchestrator tags these with
 * `phase: 'generated-draft'` before any store write (Phase 3+).
 */
export interface DraftShape {
  id: string;
  generationId: string;
  interventionId: string;
  zoneId: string | null;
  template: GeometryTemplate;
  geometry: GeoJSON.Polygon | GeoJSON.LineString | GeoJSON.Point;
  areaM2: number;
}
