/**
 * B5.1 — Pure living-roots math.
 *
 * Composes a 12-month boolean "living roots in the ground" vector per
 * `CropArea` from its `coverCropPlan` windows, then projects the parcel-
 * level coverage % as an area-weighted mean. Strictly soil-vitality —
 * not a financial or yield-as-return notion (covenant locked).
 */

import type { CropArea } from '../../store/cropStore.js';
import {
  coverCropEntryFor,
  livingRootMonthsFor,
  type CoverCropRole,
} from './coverCropCatalog.js';

export interface LivingRootsAreaRow {
  cropAreaId: string;
  cropAreaName: string;
  areaM2: number;
  /** length 12, index 0 = January. */
  monthsCovered: boolean[];
  /** monthsCovered.filter(Boolean).length / 12 * 100, in %. */
  coveragePct: number;
  /** Distinct species across all windows on this area. */
  speciesCount: number;
}

export interface LivingRootsOverall {
  areaCount: number;
  /** Area-weighted mean of per-area coveragePct across ALL areas, in %. */
  coveragePct: number;
  /** Sum of areaM2 across all areas with ≥1 window. */
  plannedAreaM2: number;
  /** Sum of areaM2 across ALL project areas (with or without a window). */
  totalAreaM2: number;
  /** Distinct cover-crop species across the whole parcel. */
  distinctSpeciesCount: number;
  /** Distinct cover-crop roles present across the whole parcel. */
  rolesPresent: CoverCropRole[];
}

export interface LivingRootsReport {
  overall: LivingRootsOverall;
  rows: LivingRootsAreaRow[];
}

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function computeLivingRootsReport(args: {
  projectId: string;
  cropAreas: CropArea[];
}): LivingRootsReport {
  const { projectId, cropAreas } = args;
  const projectAreas = cropAreas.filter((c) => c.projectId === projectId);

  const rows: LivingRootsAreaRow[] = projectAreas.map((c) => {
    const monthsCovered = new Array<boolean>(12).fill(false);
    const speciesSet = new Set<string>();
    for (const w of c.coverCropPlan ?? []) {
      // Catalog miss → still count the window for months/species; the catalog
      // is for citation + role guidance, not a hard gate.
      coverCropEntryFor(w.speciesId); // (presence check; result unused)
      speciesSet.add(w.speciesId);
      for (const m of livingRootMonthsFor({ startMonth: w.startMonth, endMonth: w.endMonth })) {
        monthsCovered[m - 1] = true;
      }
    }
    const monthsCount = monthsCovered.filter(Boolean).length;
    return {
      cropAreaId: c.id,
      cropAreaName: c.name,
      areaM2: c.areaM2,
      monthsCovered,
      coveragePct: clamp01to100((monthsCount / 12) * 100),
      speciesCount: speciesSet.size,
    };
  });

  let weightedNumerator = 0;
  let weightedDenominator = 0;
  let plannedAreaM2 = 0;
  const distinctSpecies = new Set<string>();
  const distinctRoles = new Set<CoverCropRole>();

  for (const c of projectAreas) {
    if (c.areaM2 > 0) {
      const row = rows.find((r) => r.cropAreaId === c.id);
      const pct = row?.coveragePct ?? 0;
      weightedNumerator += pct * c.areaM2;
      weightedDenominator += c.areaM2;
    }
    if ((c.coverCropPlan ?? []).length > 0) {
      plannedAreaM2 += c.areaM2;
      for (const w of c.coverCropPlan ?? []) {
        distinctSpecies.add(w.speciesId);
        distinctRoles.add(w.role);
      }
    }
  }

  const overallCoveragePct = clamp01to100(
    weightedDenominator > 0 ? weightedNumerator / weightedDenominator : 0,
  );

  return {
    overall: {
      areaCount: projectAreas.length,
      coveragePct: overallCoveragePct,
      plannedAreaM2,
      totalAreaM2: projectAreas.reduce((sum, c) => sum + c.areaM2, 0),
      distinctSpeciesCount: distinctSpecies.size,
      rolesPresent: Array.from(distinctRoles),
    },
    rows,
  };
}

/** Goal-tree wrapper: returns `overall.coveragePct`. */
export function computeLivingRootsCoveragePct(args: {
  projectId: string;
  cropAreas: CropArea[];
}): number {
  return computeLivingRootsReport(args).overall.coveragePct;
}
