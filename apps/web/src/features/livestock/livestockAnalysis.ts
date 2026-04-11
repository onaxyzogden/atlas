/**
 * livestockAnalysis — pure-function analysis module for livestock dashboards.
 *
 * Shared computations consumed by GrazingDashboard, PaddockDesignDashboard,
 * HerdRotationDashboard, and LivestockDashboard via useMemo.
 */

import type { Paddock, LivestockSpecies } from '../../store/livestockStore.js';
import type { LandZone } from '../../store/zoneStore.js';
import type { Structure } from '../../store/structureStore.js';
import type { DesignPath } from '../../store/pathStore.js';
import { LIVESTOCK_SPECIES, type LivestockSpeciesInfo } from './speciesData.js';

/* ================================================================== */
/*  Exported types                                                     */
/* ================================================================== */

export interface ForageQuality {
  quality: 'high' | 'good' | 'moderate' | 'poor';
  adjustedStockingMultiplier: number;
  biomassEstimate: number; // relative 0-100
}

export interface RecoveryStatus {
  paddockId: string;
  paddockName: string;
  daysRested: number;
  requiredDays: number;
  compliance: number; // 0-100
  status: 'active' | 'resting' | 'ready' | 'overdue';
}

export interface RiskLevel {
  risk: 'low' | 'moderate' | 'high';
  ratio: number;
}

export interface CarryingCapacity {
  species: LivestockSpecies;
  label: string;
  baseCapacity: number;
  adjustedCapacity: number;
  seasonMultiplier: number;
}

export interface WaterAccess {
  nearestDistanceM: number;
  nearestStructureName: string | null;
  meetsRequirement: boolean;
  thresholdM: number;
}

export interface SafetyConflict {
  paddockId: string;
  paddockName: string;
  pathId: string;
  pathName: string;
  distanceM: number;
}

export interface SpeciesConflict {
  paddockA: string;
  paddockB: string;
  speciesA: LivestockSpecies[];
  speciesB: LivestockSpecies[];
  distanceM: number;
}

export interface RotationEntry {
  paddockId: string;
  paddockName: string;
  species: LivestockSpecies[];
  group: string;
  recovery: RecoveryStatus;
  suggestedAction: 'move_in' | 'continue' | 'rest';
}

export interface InventoryEntry {
  species: LivestockSpecies;
  info: LivestockSpeciesInfo;
  totalHead: number;
  paddockCount: number;
  avgCompliance: number;
}

export interface PredatorRisk {
  paddockId: string;
  paddockName: string;
  risk: 'low' | 'moderate' | 'high';
  reason: string;
}

export interface ShelterAccess {
  paddockId: string;
  nearestDistanceM: number;
  nearestStructureName: string | null;
  hasShelter: boolean;
}

/* ================================================================== */
/*  Geometry helpers (no turf dependency — lightweight approx)         */
/* ================================================================== */

function polygonCentroid(geom: GeoJSON.Polygon): [number, number] {
  const ring = geom.coordinates[0];
  if (!ring || ring.length === 0) return [0, 0];
  let sx = 0, sy = 0;
  for (const c of ring) { sx += c[0]!; sy += c[1]!; }
  return [sx / ring.length, sy / ring.length];
}

function approxDistanceM(a: [number, number], b: [number, number]): number {
  const lat = (a[1] + b[1]) / 2;
  const dx = (a[0] - b[0]) * 111320 * Math.cos(lat * Math.PI / 180);
  const dy = (a[1] - b[1]) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}

function polygonPerimeterM(geom: GeoJSON.Polygon): number {
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    total += approxDistanceM(ring[i] as [number, number], ring[i + 1] as [number, number]);
  }
  return total;
}

/* ================================================================== */
/*  Forage & stocking                                                  */
/* ================================================================== */

export function computeForageQuality(
  organicMatterPct: number,
  canopyPct: number,
  slopeDeg: number,
  growingSeasonDays: number,
): ForageQuality {
  // Score 0-100 from soil + terrain + climate
  let score = 0;
  // Organic matter: 0-5% maps to 0-30 points
  score += Math.min(organicMatterPct / 5, 1) * 30;
  // Canopy: moderate (20-40%) is ideal for silvopasture, too much shades out grass
  const canopyScore = canopyPct <= 40 ? canopyPct / 40 * 20 : Math.max(0, 1 - (canopyPct - 40) / 60) * 20;
  score += canopyScore;
  // Slope: flat is best, >25 degrees is poor
  score += Math.max(0, 1 - slopeDeg / 25) * 20;
  // Growing season: 120+ days is good, 200+ is excellent
  score += Math.min(growingSeasonDays / 200, 1) * 30;

  const quality = score >= 75 ? 'high' : score >= 50 ? 'good' : score >= 30 ? 'moderate' : 'poor';
  const adjustedStockingMultiplier = score >= 75 ? 1.1 : score >= 50 ? 1.0 : score >= 30 ? 0.75 : 0.5;

  return { quality, adjustedStockingMultiplier, biomassEstimate: Math.round(score) };
}

export function computeRecommendedStocking(
  species: LivestockSpecies,
  forage: ForageQuality,
): number {
  const base = LIVESTOCK_SPECIES[species]?.typicalStocking ?? 2;
  return Math.round(base * forage.adjustedStockingMultiplier * 10) / 10;
}

/* ================================================================== */
/*  Recovery & rotation                                                */
/* ================================================================== */

export function computeRecoveryStatus(paddock: Paddock): RecoveryStatus {
  const now = Date.now();
  const updated = new Date(paddock.updatedAt).getTime();
  const daysRested = Math.max(0, Math.floor((now - updated) / 86_400_000));

  // Required days = max recovery across all assigned species (or 30 default)
  const requiredDays = paddock.species.length > 0
    ? Math.max(...paddock.species.map((sp) => LIVESTOCK_SPECIES[sp]?.recoveryDays ?? 30))
    : 30;

  const compliance = requiredDays > 0 ? Math.min(100, Math.round((daysRested / requiredDays) * 100)) : 100;

  let status: RecoveryStatus['status'];
  if (daysRested < 1) status = 'active';
  else if (daysRested < requiredDays) status = 'resting';
  else if (daysRested <= requiredDays * 2) status = 'ready';
  else status = 'overdue';

  return { paddockId: paddock.id, paddockName: paddock.name, daysRested, requiredDays, compliance, status };
}

export function computeOvergrazingRisk(
  paddock: Paddock,
  recommendedDensity: number,
): RiskLevel {
  if (!paddock.stockingDensity || recommendedDensity <= 0) return { risk: 'low', ratio: 0 };
  const ratio = paddock.stockingDensity / recommendedDensity;
  if (ratio > 1.2) return { risk: 'high', ratio };
  if (ratio > 1.0) return { risk: 'moderate', ratio };
  return { risk: 'low', ratio };
}

export function computeRotationSchedule(paddocks: Paddock[]): RotationEntry[] {
  if (paddocks.length === 0) return [];

  // Group by grazingCellGroup
  const groups = new Map<string, Paddock[]>();
  for (const p of paddocks) {
    const key = p.grazingCellGroup ?? 'ungrouped';
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }

  const entries: RotationEntry[] = [];
  for (const [group, pads] of groups) {
    for (const p of pads) {
      const recovery = computeRecoveryStatus(p);
      let suggestedAction: RotationEntry['suggestedAction'];
      if (recovery.status === 'active') suggestedAction = 'continue';
      else if (recovery.status === 'ready' || recovery.status === 'overdue') suggestedAction = 'move_in';
      else suggestedAction = 'rest';

      entries.push({ paddockId: p.id, paddockName: p.name, species: p.species, group, recovery, suggestedAction });
    }
  }

  // Sort: active first, then ready, then resting, then overdue
  const order: Record<string, number> = { active: 0, ready: 1, overdue: 2, resting: 3 };
  entries.sort((a, b) => (order[a.recovery.status] ?? 9) - (order[b.recovery.status] ?? 9));

  return entries;
}

export function computeRotationEfficiency(paddocks: Paddock[]): number {
  if (paddocks.length === 0) return 100;
  const recoveries = paddocks.map(computeRecoveryStatus);
  const optimal = recoveries.filter((r) => r.status === 'ready' || r.status === 'active').length;
  return Math.round((optimal / recoveries.length) * 100);
}

/* ================================================================== */
/*  Seasonal carrying capacity                                         */
/* ================================================================== */

export function computeSeasonalCarryingCapacity(
  species: LivestockSpecies,
  areaHa: number,
  growingSeasonDays: number,
  frostDates: { first: string | null; last: string | null },
): CarryingCapacity {
  const info = LIVESTOCK_SPECIES[species];
  if (!info) return { species, label: species, baseCapacity: 0, adjustedCapacity: 0, seasonMultiplier: 0 };

  const baseCapacity = Math.round(info.typicalStocking * areaHa);
  // Season multiplier: 365 grow days = 1.0, shorter seasons reduce capacity
  const seasonMultiplier = Math.min(1, growingSeasonDays / 200);

  // Frost penalty: if frost dates indicate < 5 month window, reduce further
  let frostPenalty = 1.0;
  if (frostDates.first && frostDates.last) {
    const first = new Date(frostDates.first + ' 2026');
    const last = new Date(frostDates.last + ' 2026');
    if (!isNaN(first.getTime()) && !isNaN(last.getTime())) {
      const frostFreeMs = first.getTime() - last.getTime();
      const frostFreeDays = Math.max(0, frostFreeMs / 86_400_000);
      frostPenalty = Math.min(1, frostFreeDays / 180);
    }
  }

  const adjustedCapacity = Math.round(baseCapacity * seasonMultiplier * frostPenalty);
  return { species, label: info.label, baseCapacity, adjustedCapacity, seasonMultiplier: seasonMultiplier * frostPenalty };
}

/* ================================================================== */
/*  Infrastructure access                                              */
/* ================================================================== */

const WATER_THRESHOLDS: Partial<Record<LivestockSpecies, number>> = {
  cattle: 200, horses: 200,
  sheep: 100, goats: 100,
  poultry: 50, rabbits: 50, ducks_geese: 50,
};
const DEFAULT_WATER_THRESHOLD = 150;

export function computeWaterPointDistance(
  paddock: Paddock,
  waterStructures: Structure[],
): WaterAccess {
  const centroid = polygonCentroid(paddock.geometry);
  const primarySpecies = paddock.species[0];
  const thresholdM = (primarySpecies ? WATER_THRESHOLDS[primarySpecies] : undefined) ?? DEFAULT_WATER_THRESHOLD;

  let nearestDist = Infinity;
  let nearestName: string | null = null;

  for (const s of waterStructures) {
    const dist = approxDistanceM(centroid, s.center);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestName = s.name;
    }
  }

  return {
    nearestDistanceM: isFinite(nearestDist) ? Math.round(nearestDist) : -1,
    nearestStructureName: nearestName,
    meetsRequirement: nearestDist <= thresholdM,
    thresholdM,
  };
}

export function computePaddockPerimeter(geometry: GeoJSON.Polygon): number {
  return Math.round(polygonPerimeterM(geometry));
}

export function computeShelterAccess(paddock: Paddock, structures: Structure[]): ShelterAccess {
  const centroid = polygonCentroid(paddock.geometry);
  const shelters = structures.filter((s) =>
    s.type === 'animal_shelter' || s.type === 'barn',
  );

  let nearestDist = Infinity;
  let nearestName: string | null = null;

  for (const s of shelters) {
    const dist = approxDistanceM(centroid, s.center);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestName = s.name;
    }
  }

  return {
    paddockId: paddock.id,
    nearestDistanceM: isFinite(nearestDist) ? Math.round(nearestDist) : -1,
    nearestStructureName: nearestName,
    hasShelter: nearestDist <= 300,
  };
}

/* ================================================================== */
/*  Guest safety & species conflicts                                   */
/* ================================================================== */

export function computeGuestSafetyConflicts(
  paddocks: Paddock[],
  guestPaths: DesignPath[],
): SafetyConflict[] {
  const conflicts: SafetyConflict[] = [];
  const bufferedPaddocks = paddocks.filter((p) => p.guestSafeBuffer);

  for (const pad of bufferedPaddocks) {
    const centroid = polygonCentroid(pad.geometry);
    for (const path of guestPaths) {
      // Check distance from paddock centroid to each path vertex
      for (const coord of path.geometry.coordinates) {
        const dist = approxDistanceM(centroid, coord as [number, number]);
        if (dist < 50) { // 50m buffer
          conflicts.push({
            paddockId: pad.id,
            paddockName: pad.name,
            pathId: path.id,
            pathName: path.name,
            distanceM: Math.round(dist),
          });
          break;
        }
      }
    }
  }

  return conflicts;
}

export function computeSpeciesConflicts(paddocks: Paddock[]): SpeciesConflict[] {
  const conflicts: SpeciesConflict[] = [];
  const incompatible: [LivestockSpecies, LivestockSpecies][] = [
    ['cattle', 'horses'], // compete for forage
    ['poultry', 'pigs'],  // disease transmission
    ['goats', 'horses'],  // parasite sharing
  ];

  for (let i = 0; i < paddocks.length; i++) {
    for (let j = i + 1; j < paddocks.length; j++) {
      const a = paddocks[i]!;
      const b = paddocks[j]!;
      const centA = polygonCentroid(a.geometry);
      const centB = polygonCentroid(b.geometry);
      const dist = approxDistanceM(centA, centB);

      if (dist > 200) continue; // too far to conflict

      for (const [s1, s2] of incompatible) {
        const aHas = a.species.includes(s1) || a.species.includes(s2);
        const bHas = b.species.includes(s1) || b.species.includes(s2);
        if (aHas && bHas && dist < 50) {
          conflicts.push({
            paddockA: a.name,
            paddockB: b.name,
            speciesA: a.species,
            speciesB: b.species,
            distanceM: Math.round(dist),
          });
        }
      }
    }
  }

  return conflicts;
}

/* ================================================================== */
/*  Inventory & risk                                                   */
/* ================================================================== */

export function computeInventorySummary(paddocks: Paddock[]): InventoryEntry[] {
  const map = new Map<LivestockSpecies, { totalHead: number; paddockCount: number; complianceSum: number }>();

  for (const p of paddocks) {
    const recovery = computeRecoveryStatus(p);
    const areaHa = p.areaM2 / 10_000;

    for (const sp of p.species) {
      const info = LIVESTOCK_SPECIES[sp];
      if (!info) continue;
      const headEstimate = p.stockingDensity
        ? Math.round(p.stockingDensity * areaHa)
        : Math.round(info.typicalStocking * areaHa);

      const existing = map.get(sp) ?? { totalHead: 0, paddockCount: 0, complianceSum: 0 };
      existing.totalHead += headEstimate;
      existing.paddockCount += 1;
      existing.complianceSum += recovery.compliance;
      map.set(sp, existing);
    }
  }

  const entries: InventoryEntry[] = [];
  for (const [species, data] of map) {
    const info = LIVESTOCK_SPECIES[species];
    if (!info) continue;
    entries.push({
      species,
      info,
      totalHead: data.totalHead,
      paddockCount: data.paddockCount,
      avgCompliance: data.paddockCount > 0 ? Math.round(data.complianceSum / data.paddockCount) : 0,
    });
  }

  // Sort by head count descending
  entries.sort((a, b) => b.totalHead - a.totalHead);
  return entries;
}

export function computePredatorRisk(
  paddock: Paddock,
  zones: LandZone[],
  treeCanopyPct: number,
): PredatorRisk {
  const centroid = polygonCentroid(paddock.geometry);

  // Check adjacency to conservation or buffer zones (woodland edges)
  let nearestEdgeDist = Infinity;
  for (const z of zones) {
    if (z.category !== 'conservation' && z.category !== 'buffer') continue;
    const geom = z.geometry.type === 'MultiPolygon'
      ? { type: 'Polygon' as const, coordinates: z.geometry.coordinates[0]! }
      : z.geometry;
    const zCentroid = polygonCentroid(geom);
    const dist = approxDistanceM(centroid, zCentroid);
    if (dist < nearestEdgeDist) nearestEdgeDist = dist;
  }

  // High canopy + close to woodland edge = higher predator risk
  let risk: 'low' | 'moderate' | 'high' = 'low';
  let reason = 'No significant woodland edges nearby';

  if (nearestEdgeDist < 100 && treeCanopyPct > 30) {
    risk = 'high';
    reason = `Adjacent to woodland edge (${Math.round(nearestEdgeDist)}m) with ${treeCanopyPct}% canopy`;
  } else if (nearestEdgeDist < 200 || treeCanopyPct > 50) {
    risk = 'moderate';
    reason = nearestEdgeDist < 200
      ? `Within 200m of woodland edge`
      : `High canopy cover (${treeCanopyPct}%)`;
  }

  return { paddockId: paddock.id, paddockName: paddock.name, risk, reason };
}
