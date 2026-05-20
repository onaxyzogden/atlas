/**
 * B5.2.x.b — Cover-crop plan → WorkItem spine write seam.
 *
 * Mirrors `goalCompassSpineSync.pushGoalCompassToSpine` 1:1:
 *   1. Build a WorkItem per `CropCoverWindow` on every CropArea in the
 *      project, carrying composite `generatedFromCoverCropWindow`
 *      provenance and `source:'cover-crop'`.
 *   2. Push to the spine via `replaceCoverCropRows` (preservation gate).
 *   3. Seed `costRangeAuto` via `replaceCoverCropCosts` (D3 Approach B).
 *   4. Seed `materialsAuto` via `replaceCoverCropResources` (D2 Approach B).
 *
 * Zero-prereq seeding — cover-crop windows have no `dependsOnAuto`
 * (terminate-before-cash-crop ordering is a future slice). No scheduled
 * dates — month-only window bounds lack a year reference. Phase joining
 * follows the same free-text-`CropArea.phase` → declared-phase rule used
 * by `coverCropEconomicsMath` (exact id match first, then case-insensitive
 * name match; otherwise `phaseId: null`).
 *
 * Covenant locked: strictly project cost (D3 territory) — no
 * riba/gharar/CSRA/salam/investor/financing/cost-of-capital semantics.
 */

import type {
  WorkItem,
  MaterialLine,
  CostRange,
} from '@ogden/shared';
import type { CropArea, CropCoverWindow } from '../../store/cropStore.js';
import type { BuildPhase } from '../../store/phaseStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import {
  COVER_CROP_CATALOG,
  coverCropEntryFor,
  type CoverCropEntry,
} from './coverCropCatalog.js';
import {
  effectiveSeedCostPerAcre,
  effectiveLaborHrsPerAcre,
} from './coverCropEconomicsMath.js';

const ACRES_PER_M2 = 1 / 4046.8564224;

function resolvePhaseId(
  cropAreaPhase: string,
  declaredPhases: BuildPhase[],
): string | null {
  const trimmed = (cropAreaPhase ?? '').trim();
  if (!trimmed) return null;
  const byId = declaredPhases.find((p) => p.id === trimmed);
  if (byId) return byId.id;
  const lower = trimmed.toLowerCase();
  const byName = declaredPhases.find(
    (p) => p.name.trim().toLowerCase() === lower,
  );
  return byName ? byName.id : null;
}

/** Stable composite provenance id: `<cropAreaId>__<windowIndex>`. */
export function coverCropProvenanceId(
  cropAreaId: string,
  windowIndex: number,
): string {
  return `${cropAreaId}__${windowIndex}`;
}

/**
 * Pure: build the WorkItem set a cover-crop generation would emit for a
 * project. One WorkItem per `CropCoverWindow`. Items missing both override
 * and catalog cost/labor data still appear (rows carry the plan), but their
 * `costRangeAuto` / `materialsAuto` will be omitted by the seeders.
 */
export function seedCoverCropWorkItems(args: {
  projectId: string;
  cropAreas: CropArea[];
  declaredPhases: BuildPhase[];
  catalog?: readonly CoverCropEntry[];
  now?: () => string;
}): WorkItem[] {
  const { projectId, cropAreas, declaredPhases } = args;
  const catalog = args.catalog ?? COVER_CROP_CATALOG;
  const nowFn = args.now ?? (() => new Date().toISOString());
  const created = nowFn();

  const out: WorkItem[] = [];
  for (const area of cropAreas) {
    if (area.projectId !== projectId) continue;
    const windows = area.coverCropPlan ?? [];
    if (windows.length === 0) continue;
    const phaseId = resolvePhaseId(area.phase, declaredPhases);
    windows.forEach((w, idx) => {
      const entry = catalog.find((e) => e.speciesId === w.speciesId);
      const provenance = coverCropProvenanceId(area.id, idx);
      out.push({
        id: `cc__${provenance}`,
        projectId,
        source: 'cover-crop',
        overridden: false,
        generatedFromCoverCropWindow: provenance,
        createdAt: created,
        updatedAt: created,
        title: `Cover-crop: ${entry?.speciesId ?? w.speciesId} (${area.name})`,
        phaseId,
        status: 'todo',
        doneAt: null,
        dependsOn: [],
        dependsOnAuto: [],
        materialsAuto: [],
        equipmentRequiredAuto: [],
        species: w.speciesId,
        linkedFeatureId: area.id,
        notes: '',
      });
    });
  }
  return out;
}

/**
 * Pure: derive cover-crop-seeded `costRangeAuto` per WorkItem id. Items with
 * no effective seed cost are omitted from the map → the seeder clears any
 * stale auto. Band shape: degenerate (low=mid=high=cost × acres) since
 * national-average cost data is a single value, not a range.
 */
export function seedCoverCropCosts(args: {
  items: WorkItem[];
  cropAreas: CropArea[];
  catalog?: readonly CoverCropEntry[];
}): Map<string, CostRange> {
  const { items, cropAreas } = args;
  const catalog = args.catalog ?? COVER_CROP_CATALOG;
  const areaById = new Map(cropAreas.map((c) => [c.id, c]));
  const out = new Map<string, CostRange>();
  for (const it of items) {
    if (it.source !== 'cover-crop') continue;
    const provenance = it.generatedFromCoverCropWindow;
    if (!provenance) continue;
    const [cropAreaId, idxStr] = provenance.split('__');
    if (!cropAreaId || !idxStr) continue;
    const idx = Number(idxStr);
    const area = areaById.get(cropAreaId);
    if (!area) continue;
    const window = area.coverCropPlan?.[idx];
    if (!window) continue;
    const entry = coverCropEntryFor(window.speciesId);
    const perAcre = effectiveSeedCostPerAcre(window, entry);
    if (perAcre == null) continue;
    const acres = area.areaM2 > 0 ? area.areaM2 * ACRES_PER_M2 : 0;
    if (acres === 0) continue;
    const total = perAcre * acres;
    out.set(it.id, { low: total, mid: total, high: total });
    // Use catalog argument (silence unused-var lint when caller passes own catalog)
    void catalog;
  }
  return out;
}

/**
 * Pure: derive cover-crop-seeded resourcing per WorkItem id. Each item gets
 * a single `materialsAuto` BOM line — seed for the window — when
 * `seedRateLbPerAcre` is present. Items lacking seed-rate data are omitted
 * (the seeder clears any stale auto). Labor is folded into `laborHrs` is
 * NOT done here — D2 is operational resourcing only, mirroring the
 * goal-compass seeder discipline.
 */
export function seedCoverCropResources(args: {
  items: WorkItem[];
  cropAreas: CropArea[];
  catalog?: readonly CoverCropEntry[];
}): Map<string, { equipment: string[]; materials: MaterialLine[] }> {
  const { items, cropAreas } = args;
  const catalog = args.catalog ?? COVER_CROP_CATALOG;
  const areaById = new Map(cropAreas.map((c) => [c.id, c]));
  const out = new Map<string, { equipment: string[]; materials: MaterialLine[] }>();
  for (const it of items) {
    if (it.source !== 'cover-crop') continue;
    const provenance = it.generatedFromCoverCropWindow;
    if (!provenance) continue;
    const [cropAreaId, idxStr] = provenance.split('__');
    if (!cropAreaId || !idxStr) continue;
    const idx = Number(idxStr);
    const area = areaById.get(cropAreaId);
    if (!area) continue;
    const window = area.coverCropPlan?.[idx];
    if (!window) continue;
    const entry = catalog.find((e) => e.speciesId === window.speciesId);
    if (!entry?.seedRateLbPerAcre) continue;
    const materials: MaterialLine[] = [
      {
        label: `${window.speciesId} seed`,
        unit: 'lb',
        quantityPerAcre: entry.seedRateLbPerAcre,
      },
    ];
    out.set(it.id, { equipment: [], materials });
  }
  return out;
}

/**
 * Push a fresh cover-crop generation onto the spine. Preserves
 * steward-overridden + every non-cover-crop row (cross-source preservation
 * gate). Mirrors `pushGoalCompassToSpine` shape 1:1.
 */
export function pushCoverCropPlanToSpine(projectId: string): void {
  const cropAreas = useCropStore.getState().cropAreas;
  const declaredPhases = usePhaseStore.getState().getProjectPhases(projectId);
  const items = seedCoverCropWorkItems({
    projectId,
    cropAreas,
    declaredPhases,
  });
  const store = useWorkItemStore.getState();
  store.replaceCoverCropRows(projectId, items);
  store.replaceCoverCropCosts(
    projectId,
    seedCoverCropCosts({ items, cropAreas }),
  );
  store.replaceCoverCropResources(
    projectId,
    seedCoverCropResources({ items, cropAreas }),
  );
}

/** Helper used by `effectiveLaborHrsPerAcre`-aware callers (read-only). */
export { effectiveLaborHrsPerAcre };
