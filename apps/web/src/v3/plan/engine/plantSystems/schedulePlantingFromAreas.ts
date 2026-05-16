/**
 * schedulePlantingFromAreas — for each annual crop area on a project,
 * walks every `species` listed against the annual phenology catalog and
 * emits the full year's planting calendar:
 *
 *   - start-indoors → `PropagationBatch` (nursery store)
 *   - direct-sow / transplant / harvest-window-opens → `PhaseTask`
 *     (phase store, packed into one synthetic `generatedFromPlantingCalendar`
 *     phase per project)
 *
 * Succession plantings walk forward in `intervalDays` until the first-frost
 * cutoff. Every emitted row carries
 * `generatedFromPlantingCalendar: '<species>:<cropAreaId>:<year>'` so
 * regenerate can wholesale-replace without touching user-authored rows.
 *
 * Pure function. Deterministic. Mirrors the dateKey/iso/meta convention of
 * `scheduleTasksToCalendar.ts`.
 */

import type { CropArea } from '../../../../store/cropStore.js';
import type { BuildPhase, PhaseTask } from '../../../../store/phaseStore.js';
import type { PropagationBatch } from '../../../../store/nurseryStore.js';
import type { ProjectRole } from '@ogden/shared';
import {
  getAnnualPhenology,
  type AnnualPlantPhenology,
} from '../../../../features/planting/plantPhenologyData.js';

const ALL_ROLES: ProjectRole[] = ['owner', 'designer', 'reviewer', 'viewer'];

const SCHEDULABLE_CROP_TYPES = new Set<CropArea['type']>([
  'row_crop',
  'garden_bed',
  'market_garden',
]);

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function seasonOf(d: Date): 'spring' | 'summer' | 'fall' | 'winter' {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}

/**
 * Rebases a `last-frost / first-frost` pair onto the target calendar year.
 * The climate layer returns historical normals (any year) — we only care
 * about the month/day. Last frost lands in target year; first frost lands
 * in the same target year (assumes a single growing-year window).
 */
function rebaseToYear(iso: string, year: number): Date {
  const d = parseIso(iso);
  return new Date(year, d.getMonth(), d.getDate());
}

function normalizeSpeciesKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function resolvePhenology(speciesRaw: string): AnnualPlantPhenology | undefined {
  const direct = getAnnualPhenology(speciesRaw);
  if (direct) return direct;
  const normalized = normalizeSpeciesKey(speciesRaw);
  return getAnnualPhenology(normalized);
}

export interface FrostDates {
  lastFrost: string; // ISO YYYY-MM-DD (spring last frost normal)
  firstFrost: string; // ISO YYYY-MM-DD (fall first frost normal)
}

export interface PlantingScheduleOutput {
  /** Single dedicated phase carrying all planting-calendar tasks. */
  generatedPhase: BuildPhase;
  /** Tasks attached to the generated phase. */
  phaseTasks: { phaseId: string; task: PhaseTask }[];
  /** Start-indoors batches to write into `nurseryStore`. */
  nurseryBatches: PropagationBatch[];
  /** Diagnostic rows for the UI summary table (one per (area × species × planting). */
  rows: Array<{
    cropAreaId: string;
    cropAreaName: string;
    speciesId: string;
    speciesLabel: string;
    plantingIndex: number; // 0 = primary, 1..N = successions
    startIndoorsDate: string | null;
    directSowDate: string | null;
    transplantDate: string | null;
    harvestOpenDate: string;
    harvestCloseDate: string;
  }>;
}

function makeTask(
  args: {
    cropArea: CropArea;
    species: AnnualPlantPhenology;
    date: Date;
    title: string;
    laborHrs: number;
    designLayer: 'vegetation';
    year: number;
    plantingIndex: number;
  },
): PhaseTask {
  const { cropArea, species, date, title, laborHrs, designLayer, year, plantingIndex } = args;
  const id =
    `pc-${species.id}-${cropArea.id}-${year}-${plantingIndex}-${title.split(' ')[0]!.toLowerCase()}` +
    `-${isoDate(date)}`;
  return {
    id,
    season: seasonOf(date),
    title,
    laborHrs,
    costUSD: 0,
    designLayer,
    scheduledStart: isoDate(date),
    scheduledEnd: isoDate(date),
    roleAccess: [...ALL_ROLES],
    status: 'generated',
    generatedFromPlantingCalendar: `${species.id}:${cropArea.id}:${year}`,
  };
}

export function schedulePlantingFromAreas(
  cropAreas: CropArea[],
  frost: FrostDates,
  year: number,
  projectId: string,
): PlantingScheduleOutput {
  const phaseId = `pc-phase-${projectId}-${year}`;
  const generatedPhase: BuildPhase = {
    id: phaseId,
    projectId,
    name: `Annual planting · ${year}`,
    timeframe: `Year ${year}`,
    order: 1,
    description: 'Auto-generated annual planting calendar (start indoors / direct sow / transplant / harvest).',
    color: '#9b7bc6',
    completed: false,
    notes: '',
    completedAt: null,
    generatedFromPlantingCalendar: true,
    catalogVersion: 'planting-calendar-v1-2026-05-14',
  };

  const phaseTasks: { phaseId: string; task: PhaseTask }[] = [];
  const nurseryBatches: PropagationBatch[] = [];
  const rows: PlantingScheduleOutput['rows'] = [];

  const lastFrost = rebaseToYear(frost.lastFrost, year);
  const firstFrost = rebaseToYear(frost.firstFrost, year);
  if (firstFrost.getTime() <= lastFrost.getTime()) {
    // Defensive: nothing schedulable when window is degenerate.
    return { generatedPhase, phaseTasks, nurseryBatches, rows };
  }

  const eligibleAreas = cropAreas.filter(
    (a) => a.projectId === projectId && SCHEDULABLE_CROP_TYPES.has(a.type),
  );

  for (const area of eligibleAreas) {
    for (const speciesRaw of area.species) {
      const phen = resolvePhenology(speciesRaw);
      if (!phen) continue;

      // Primary planting → either transplant pathway or direct-sow.
      const plantings: Array<{ index: number; plantingDate: Date; pathway: 'transplant' | 'direct' }> =
        [];

      // Compute the primary planting date.
      const primaryDate =
        phen.transplantWeeksAfterLastFrost !== null
          ? addDays(lastFrost, phen.transplantWeeksAfterLastFrost * 7)
          : phen.directSowWeeksRelativeToLastFrost !== null
            ? addDays(lastFrost, phen.directSowWeeksRelativeToLastFrost.start * 7)
            : null;
      if (!primaryDate) continue;
      const primaryPathway: 'transplant' | 'direct' =
        phen.transplantWeeksAfterLastFrost !== null ? 'transplant' : 'direct';
      plantings.push({ index: 0, plantingDate: primaryDate, pathway: primaryPathway });

      // Walk successions forward (direct-sow pathway only — succession from
      // transplants would compound nursery overhead beyond MVP scope).
      if (phen.succession && phen.directSowWeeksRelativeToLastFrost !== null) {
        const cutoff = addDays(firstFrost, -phen.succession.cutoffWeeksBeforeFirstFrost * 7);
        let next = addDays(primaryDate, phen.succession.intervalDays);
        let idx = 1;
        while (next.getTime() <= cutoff.getTime()) {
          plantings.push({ index: idx, plantingDate: next, pathway: 'direct' });
          next = addDays(next, phen.succession.intervalDays);
          idx += 1;
          if (idx > 12) break; // hard cap
        }
      }

      for (const planting of plantings) {
        const { index: plantingIndex, plantingDate, pathway } = planting;
        let startIndoorsDate: string | null = null;
        let directSowDate: string | null = null;
        let transplantDate: string | null = null;

        if (pathway === 'transplant' && phen.startIndoorsWeeksBeforeLastFrost !== null) {
          const startDate = addDays(plantingDate, -phen.startIndoorsWeeksBeforeLastFrost * 7);
          startIndoorsDate = isoDate(startDate);
          const batchId = `pc-batch-${phen.id}-${area.id}-${year}-${plantingIndex}`;
          nurseryBatches.push({
            id: batchId,
            projectId,
            species: phen.id,
            method: 'seed',
            quantity: Math.max(1, Math.round((area.areaM2 / (phen.spacingCm.inRow * phen.spacingCm.betweenRow / 10000)) / Math.max(plantings.length, 1))),
            stage: 'seed',
            sowDate: isoDate(startDate),
            expectedReadyDate: isoDate(plantingDate),
            destinationZoneId: area.id,
            seedSaving: false,
            notes: `Auto-generated for ${phen.commonName} → ${area.name}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            generatedFromPlantingCalendar: `${phen.id}:${area.id}:${year}`,
          });
          transplantDate = isoDate(plantingDate);
          phaseTasks.push({
            phaseId,
            task: makeTask({
              cropArea: area,
              species: phen,
              date: plantingDate,
              title: `Transplant ${phen.commonName} → ${area.name}`,
              laborHrs: 2,
              designLayer: 'vegetation',
              year,
              plantingIndex,
            }),
          });
        } else {
          directSowDate = isoDate(plantingDate);
          phaseTasks.push({
            phaseId,
            task: makeTask({
              cropArea: area,
              species: phen,
              date: plantingDate,
              title: `Direct sow ${phen.commonName} → ${area.name}`,
              laborHrs: 1,
              designLayer: 'vegetation',
              year,
              plantingIndex,
            }),
          });
        }

        const harvestOpen = addDays(plantingDate, phen.daysToFirstHarvest);
        const harvestClose = addDays(harvestOpen, phen.harvestWindowDays);
        phaseTasks.push({
          phaseId,
          task: makeTask({
            cropArea: area,
            species: phen,
            date: harvestOpen,
            title: `Harvest opens: ${phen.commonName} (${area.name})`,
            laborHrs: 2,
            designLayer: 'vegetation',
            year,
            plantingIndex,
          }),
        });

        rows.push({
          cropAreaId: area.id,
          cropAreaName: area.name,
          speciesId: phen.id,
          speciesLabel: phen.commonName,
          plantingIndex,
          startIndoorsDate,
          directSowDate,
          transplantDate,
          harvestOpenDate: isoDate(harvestOpen),
          harvestCloseDate: isoDate(harvestClose),
        });
      }
    }
  }

  return { generatedPhase, phaseTasks, nurseryBatches, rows };
}
