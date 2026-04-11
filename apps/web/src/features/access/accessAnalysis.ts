/**
 * accessAnalysis — pure helper functions for circulation intelligence:
 * access status, corridor connectivity, route conflicts, slope warnings.
 */

import * as turf from '@turf/turf';
import type { DesignPath, PathType } from '../../store/pathStore.js';
import type { LandZone } from '../../store/zoneStore.js';

/* ------------------------------------------------------------------ */
/*  Access Status                                                      */
/* ------------------------------------------------------------------ */

export interface AccessStatus {
  mainEntry: DesignPath | null;
  emergencyAccess: DesignPath | null;
  serviceAccess: DesignPath | null;
  pedestrianPaths: DesignPath[];
  animalCorridors: DesignPath[];
  arrivalSequences: DesignPath[];
  quietRoutes: DesignPath[];
}

export function analyzeAccess(paths: DesignPath[]): AccessStatus {
  return {
    mainEntry: paths.find((p) => p.type === 'main_road') ?? null,
    emergencyAccess: paths.find((p) => p.type === 'emergency_access') ?? null,
    serviceAccess: paths.find((p) => p.type === 'service_road') ?? null,
    pedestrianPaths: paths.filter((p) => p.type === 'pedestrian_path'),
    animalCorridors: paths.filter((p) => p.type === 'animal_corridor'),
    arrivalSequences: paths.filter((p) => p.type === 'arrival_sequence'),
    quietRoutes: paths.filter((p) => p.type === 'quiet_route'),
  };
}

/* ------------------------------------------------------------------ */
/*  Corridor Connectivity                                              */
/* ------------------------------------------------------------------ */

export interface CorridorReport {
  corridor: DesignPath;
  connectsToLivestock: boolean;
  connectsToWater: boolean;
  nearestLivestockZone: string | null;
  nearestWaterZone: string | null;
}

export function analyzeCorridorConnectivity(
  corridors: DesignPath[],
  livestockZones: LandZone[],
  waterZones: LandZone[],
): CorridorReport[] {
  return corridors.map((corridor) => {
    const coords = corridor.geometry.coordinates;
    const start = coords[0] as [number, number];
    const end = coords[coords.length - 1] as [number, number];
    const startPt = turf.point(start);
    const endPt = turf.point(end);

    let connectsToLivestock = false;
    let nearestLivestockZone: string | null = null;
    for (const z of livestockZones) {
      try {
        const buffered = turf.buffer(turf.feature(z.geometry), 20, { units: 'meters' });
        if (buffered && (turf.booleanPointInPolygon(startPt, buffered) || turf.booleanPointInPolygon(endPt, buffered))) {
          connectsToLivestock = true;
          nearestLivestockZone = z.name;
          break;
        }
      } catch { /* skip invalid geometry */ }
    }

    let connectsToWater = false;
    let nearestWaterZone: string | null = null;
    for (const z of waterZones) {
      try {
        const buffered = turf.buffer(turf.feature(z.geometry), 20, { units: 'meters' });
        if (buffered && (turf.booleanPointInPolygon(startPt, buffered) || turf.booleanPointInPolygon(endPt, buffered))) {
          connectsToWater = true;
          nearestWaterZone = z.name;
          break;
        }
      } catch { /* skip */ }
    }

    return { corridor, connectsToLivestock, connectsToWater, nearestLivestockZone, nearestWaterZone };
  });
}

/* ------------------------------------------------------------------ */
/*  Route Conflict Detection                                           */
/* ------------------------------------------------------------------ */

export interface RouteConflict {
  type: 'vehicle_pedestrian' | 'livestock_guest' | 'service_spiritual';
  severity: 'warning' | 'error';
  pathNames: [string, string];
  description: string;
}

const VEHICLE_TYPES: PathType[] = ['main_road', 'secondary_road', 'service_road'];
const PEDESTRIAN_TYPES: PathType[] = ['pedestrian_path', 'quiet_route', 'trail'];
const GUEST_TYPES: PathType[] = ['arrival_sequence', 'pedestrian_path', 'quiet_route'];

export function detectRouteConflicts(paths: DesignPath[], zones: LandZone[]): RouteConflict[] {
  const conflicts: RouteConflict[] = [];

  const vehiclePaths = paths.filter((p) => VEHICLE_TYPES.includes(p.type));
  const pedestrianPaths = paths.filter((p) => PEDESTRIAN_TYPES.includes(p.type));
  const animalCorridors = paths.filter((p) => p.type === 'animal_corridor' || p.type === 'grazing_route');
  const guestPaths = paths.filter((p) => GUEST_TYPES.includes(p.type));
  const spiritualZones = zones.filter((z) => z.category === 'spiritual');

  // 1. Vehicle vs pedestrian intersections
  for (const v of vehiclePaths) {
    for (const pe of pedestrianPaths) {
      try {
        const intersections = turf.lineIntersect(turf.feature(v.geometry), turf.feature(pe.geometry));
        if (intersections.features.length > 0) {
          conflicts.push({
            type: 'vehicle_pedestrian',
            severity: 'warning',
            pathNames: [v.name, pe.name],
            description: `Vehicle route "${v.name}" crosses pedestrian path "${pe.name}" at ${intersections.features.length} point(s)`,
          });
        }
      } catch { /* skip */ }
    }
  }

  // 2. Animal corridors vs guest circulation
  for (const ac of animalCorridors) {
    for (const gp of guestPaths) {
      try {
        const intersections = turf.lineIntersect(turf.feature(ac.geometry), turf.feature(gp.geometry));
        if (intersections.features.length > 0) {
          conflicts.push({
            type: 'livestock_guest',
            severity: 'error',
            pathNames: [ac.name, gp.name],
            description: `Animal corridor "${ac.name}" crosses guest path "${gp.name}" \u2014 safety concern`,
          });
        }
      } catch { /* skip */ }
    }
  }

  // 3. Service roads through spiritual zones
  const serviceRoads = paths.filter((p) => p.type === 'service_road');
  for (const sr of serviceRoads) {
    for (const sz of spiritualZones) {
      try {
        if (turf.booleanCrosses(turf.feature(sr.geometry), turf.feature(sz.geometry))) {
          conflicts.push({
            type: 'service_spiritual',
            severity: 'warning',
            pathNames: [sr.name, sz.name],
            description: `Service road "${sr.name}" passes through spiritual zone "${sz.name}"`,
          });
        }
      } catch { /* skip */ }
    }
  }

  return conflicts;
}

/* ------------------------------------------------------------------ */
/*  Slope Warnings                                                     */
/* ------------------------------------------------------------------ */

export interface SlopeWarning {
  path: DesignPath;
  siteMaxSlopeDeg: number;
  isHighGrade: boolean;
  message: string;
}

export function checkSlopeWarnings(
  paths: DesignPath[],
  terrainSummary: { elevation_max?: number; elevation_min?: number; mean_slope_deg?: number } | null,
): SlopeWarning[] {
  if (!terrainSummary || terrainSummary.mean_slope_deg == null) return [];

  const meanSlope = terrainSummary.mean_slope_deg;
  const isHighGrade = meanSlope > 15;

  if (!isHighGrade) return [];

  // When site-wide mean slope is >15 degrees, flag all paths
  return paths.map((path) => ({
    path,
    siteMaxSlopeDeg: meanSlope,
    isHighGrade: true,
    message: `Site-wide mean slope ${meanSlope.toFixed(1)}\u00B0 exceeds 15\u00B0 \u2014 "${path.name}" may require grading or switchbacks`,
  }));
}
