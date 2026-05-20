/**
 * B5.2.x.b — Pure cover-crop economics math.
 *
 * Joins `CropArea.coverCropPlan` windows against `COVER_CROP_CATALOG`
 * (national-average cited cost data) and the project's declared
 * `BuildPhase` list to produce a per-phase rollup of seed cost (USD)
 * and seeding labor (hours).
 *
 * Effective seed cost / labor = per-window steward override ?? catalog
 * default. Entries (catalog or window) lacking cost/labor data are
 * silently excluded — no stubbed defaults (B4/B5 "omitted-not-stubbed"
 * precedent).
 *
 * Covenant locked: strictly project cost (D3 territory). "Seed cost" +
 * "Seeding labor" only. No "yield-as-return", no "investment-recovery",
 * no riba/gharar/CSRA/salam/investor/financing/cost-of-capital framing.
 */

import type { CropArea, CropCoverWindow } from '../../store/cropStore.js';
import type { BuildPhase } from '../../store/phaseStore.js';
import { COVER_CROP_CATALOG, type CoverCropEntry } from './coverCropCatalog.js';

/** Bucket id for windows on areas whose `phase` field is empty or unmatched. */
export const UNPHASED_BUCKET_ID = '__unphased__';

const ACRES_PER_M2 = 1 / 4046.8564224;

/** Effective seed cost per acre, override wins; undefined if neither present. */
export function effectiveSeedCostPerAcre(
  window: CropCoverWindow,
  entry: CoverCropEntry | undefined,
): number | undefined {
  if (Number.isFinite(window.seedCostUSDPerAcreOverride)) {
    return window.seedCostUSDPerAcreOverride;
  }
  if (entry && Number.isFinite(entry.seedCostUSDPerAcre)) {
    return entry.seedCostUSDPerAcre;
  }
  return undefined;
}

/** Effective seeding labor (hrs/acre), override wins; undefined if neither present. */
export function effectiveLaborHrsPerAcre(
  window: CropCoverWindow,
  entry: CoverCropEntry | undefined,
): number | undefined {
  if (Number.isFinite(window.seedingLaborHrsPerAcreOverride)) {
    return window.seedingLaborHrsPerAcreOverride;
  }
  if (entry && Number.isFinite(entry.seedingLaborHrsPerAcre)) {
    return entry.seedingLaborHrsPerAcre;
  }
  return undefined;
}

export interface WindowEconomics {
  /** Total seed cost (USD) for this window over the CropArea's full footprint. */
  seedCostUSD: number;
  /** Total seeding labor (hours) for this window over the CropArea's footprint. */
  seedingLaborHrs: number;
  /** Per-acre values used (override ?? catalog); undefined if no data. */
  effectiveSeedCostPerAcre: number | undefined;
  effectiveLaborHrsPerAcre: number | undefined;
  acres: number;
}

/** Window × area → totals. Missing catalog/override data → zero contribution. */
export function windowEconomics(args: {
  window: CropCoverWindow;
  areaM2: number;
  catalog?: readonly CoverCropEntry[];
}): WindowEconomics {
  const { window, areaM2 } = args;
  const catalog = args.catalog ?? COVER_CROP_CATALOG;
  const entry = catalog.find((e) => e.speciesId === window.speciesId);
  const acres = Number.isFinite(areaM2) && areaM2 > 0 ? areaM2 * ACRES_PER_M2 : 0;
  const seedPerAcre = effectiveSeedCostPerAcre(window, entry);
  const laborPerAcre = effectiveLaborHrsPerAcre(window, entry);
  return {
    seedCostUSD: seedPerAcre != null ? seedPerAcre * acres : 0,
    seedingLaborHrs: laborPerAcre != null ? laborPerAcre * acres : 0,
    effectiveSeedCostPerAcre: seedPerAcre,
    effectiveLaborHrsPerAcre: laborPerAcre,
    acres,
  };
}

export interface CoverCropPhaseRow {
  /** Phase id (or `UNPHASED_BUCKET_ID`). */
  phaseId: string;
  /** Phase display name (or "(Unphased)"). */
  phaseName: string;
  /** Phase ordering (declared phase `order`, or `Number.MAX_SAFE_INTEGER` for unphased). */
  order: number;
  totalSeedCostUSD: number;
  totalSeedingLaborHrs: number;
  /** Distinct CropArea ids contributing to this row. */
  cropAreaCount: number;
  /** Distinct cover-crop species ids contributing to this row. */
  speciesCount: number;
}

export interface CoverCropEconomicsReport {
  /** Per-phase rows, ordered by declared phase `order`; unphased bucket last. */
  rows: CoverCropPhaseRow[];
  /** Project-wide totals. */
  totalSeedCostUSD: number;
  totalSeedingLaborHrs: number;
}

/**
 * Compose the per-phase rollup. CropArea.phase is free-text; resolution
 * against declared phases is by exact `id` match first, then case-insensitive
 * `name` match. Anything else → `UNPHASED_BUCKET_ID` bucket.
 */
export function computeCoverCropEconomics(args: {
  projectId: string;
  cropAreas: CropArea[];
  declaredPhases: BuildPhase[];
  catalog?: readonly CoverCropEntry[];
}): CoverCropEconomicsReport {
  const { projectId, cropAreas, declaredPhases } = args;
  const catalog = args.catalog ?? COVER_CROP_CATALOG;

  const projectAreas = cropAreas.filter((c) => c.projectId === projectId);
  const projectPhases = declaredPhases
    .filter((p) => p.projectId === projectId)
    .slice()
    .sort((a, b) => a.order - b.order);

  const phaseById = new Map(projectPhases.map((p) => [p.id, p]));
  const phaseByNameLower = new Map(
    projectPhases.map((p) => [p.name.trim().toLowerCase(), p]),
  );

  type Accum = {
    phaseId: string;
    phaseName: string;
    order: number;
    totalSeedCostUSD: number;
    totalSeedingLaborHrs: number;
    cropAreaIds: Set<string>;
    speciesIds: Set<string>;
  };

  const accumByPhase = new Map<string, Accum>();
  const getOrCreate = (phaseId: string, phaseName: string, order: number): Accum => {
    const existing = accumByPhase.get(phaseId);
    if (existing) return existing;
    const fresh: Accum = {
      phaseId,
      phaseName,
      order,
      totalSeedCostUSD: 0,
      totalSeedingLaborHrs: 0,
      cropAreaIds: new Set(),
      speciesIds: new Set(),
    };
    accumByPhase.set(phaseId, fresh);
    return fresh;
  };

  let totalSeedCostUSD = 0;
  let totalSeedingLaborHrs = 0;

  for (const area of projectAreas) {
    const windows = area.coverCropPlan ?? [];
    if (windows.length === 0) continue;

    const phaseField = (area.phase ?? '').trim();
    let resolvedId = UNPHASED_BUCKET_ID;
    let resolvedName = '(Unphased)';
    let resolvedOrder = Number.MAX_SAFE_INTEGER;
    if (phaseField.length > 0) {
      const byId = phaseById.get(phaseField);
      const byName = byId ?? phaseByNameLower.get(phaseField.toLowerCase());
      if (byName) {
        resolvedId = byName.id;
        resolvedName = byName.name;
        resolvedOrder = byName.order;
      }
    }

    for (const w of windows) {
      const econ = windowEconomics({ window: w, areaM2: area.areaM2, catalog });
      if (econ.seedCostUSD === 0 && econ.seedingLaborHrs === 0) continue;
      const bucket = getOrCreate(resolvedId, resolvedName, resolvedOrder);
      bucket.totalSeedCostUSD += econ.seedCostUSD;
      bucket.totalSeedingLaborHrs += econ.seedingLaborHrs;
      bucket.cropAreaIds.add(area.id);
      bucket.speciesIds.add(w.speciesId);
      totalSeedCostUSD += econ.seedCostUSD;
      totalSeedingLaborHrs += econ.seedingLaborHrs;
    }
  }

  const rows: CoverCropPhaseRow[] = Array.from(accumByPhase.values())
    .map((a) => ({
      phaseId: a.phaseId,
      phaseName: a.phaseName,
      order: a.order,
      totalSeedCostUSD: a.totalSeedCostUSD,
      totalSeedingLaborHrs: a.totalSeedingLaborHrs,
      cropAreaCount: a.cropAreaIds.size,
      speciesCount: a.speciesIds.size,
    }))
    .sort((a, b) => a.order - b.order);

  return { rows, totalSeedCostUSD, totalSeedingLaborHrs };
}
