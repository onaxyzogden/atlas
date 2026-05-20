/**
 * B5.2.x.c — Pure cover-crop → cash-crop terminate-before edge seeding.
 *
 * Joins cover-crop WorkItems to cash-crop (planting-calendar) WorkItems
 * sharing a CropArea, returning a `Map<coverCropId, cashCropIds[]>` that
 * `replaceCoverCropDependencies` writes into `WorkItem.precedesAuto`.
 *
 * Provenance parsing:
 *  - Cover-crop: `generatedFromCoverCropWindow: '<cropAreaId>__<windowIndex>'`
 *  - Cash-crop:  `generatedFromPlantingCalendar: '<species>:<cropAreaId>:<year>'`
 *
 * Cross-source isolation: this helper *reads* both sides but writes nothing.
 * The store action writing `precedesAuto` only ever touches cover-crop rows,
 * preserving single-writer-spine.
 *
 * Orphan area (cover-crop window with no cash-crop on the area) → empty
 * edge array (silent; the planner UI surfaces a warning banner separately).
 *
 * Pure / no I/O / no React.
 */

import type { WorkItem } from '@ogden/shared';

/** Parse `<cropAreaId>__<windowIndex>`. Returns null on malformed input. */
function parseCoverCropProvenance(
  provenance: string | undefined,
): { cropAreaId: string; windowIndex: number } | null {
  if (!provenance) return null;
  const sep = provenance.indexOf('__');
  if (sep <= 0) return null;
  const cropAreaId = provenance.slice(0, sep);
  const idxStr = provenance.slice(sep + 2);
  const windowIndex = Number(idxStr);
  if (!cropAreaId || !Number.isFinite(windowIndex)) return null;
  return { cropAreaId, windowIndex };
}

/** Parse `<species>:<cropAreaId>:<year>`. Returns null on malformed input. */
function parsePlantingCalendarProvenance(
  provenance: string | undefined,
): { species: string; cropAreaId: string; year: number } | null {
  if (!provenance) return null;
  const parts = provenance.split(':');
  if (parts.length !== 3) return null;
  const [species, cropAreaId, yearStr] = parts;
  if (!species || !cropAreaId) return null;
  const year = Number(yearStr);
  if (!Number.isFinite(year)) return null;
  return { species, cropAreaId, year };
}

/**
 * Build the `coverCropId → [cashCropId, ...]` edge map. Cover-crop rows
 * whose CropArea has no planting-calendar WorkItem are omitted from the map
 * (consumer should treat absence as "no edges").
 */
export function seedCoverCropDependencies(args: {
  coverCropItems: WorkItem[];
  cashCropItems: WorkItem[];
}): Map<string, string[]> {
  const { coverCropItems, cashCropItems } = args;

  // CropArea id → cash-crop WorkItem ids (preserves declaration order).
  const cashByArea = new Map<string, string[]>();
  for (const it of cashCropItems) {
    const parsed = parsePlantingCalendarProvenance(
      it.generatedFromPlantingCalendar,
    );
    if (!parsed) continue;
    const list = cashByArea.get(parsed.cropAreaId);
    if (list) list.push(it.id);
    else cashByArea.set(parsed.cropAreaId, [it.id]);
  }

  const out = new Map<string, string[]>();
  for (const cc of coverCropItems) {
    if (cc.source !== 'cover-crop') continue;
    const parsed = parseCoverCropProvenance(cc.generatedFromCoverCropWindow);
    if (!parsed) continue;
    const successors = cashByArea.get(parsed.cropAreaId);
    if (!successors || successors.length === 0) continue;
    out.set(cc.id, [...successors]);
  }
  return out;
}

/** Internal helpers exported for spine-sync tests. */
export const __test = {
  parseCoverCropProvenance,
  parsePlantingCalendarProvenance,
};
