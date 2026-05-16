/**
 * maintenanceSchedule — operational maintenance rollup (spec §4.3.3).
 *
 * Distinct from the one-time install captured by sequencing/regeneration:
 * once an intervention is established it carries *recurring* upkeep
 * (labor, cost, materials, skilled personnel, equipment). This pure
 * derivation reads the `maintenanceSchedule` metadata authored on the
 * intervention catalog + the recurring regeneration methods, and emits:
 *
 *   - one synthetic recurring "Ongoing maintenance" BuildPhase, and
 *   - one tagged PhaseTask per recurring item, plus
 *   - a rollup view-model (per-frequency totals, annualised labor/cost,
 *     materials procurement, personnel-vs-household, equipment).
 *
 * Mirrors the `regenerationForcing.ts` pattern: woven into
 * `runAutoDesign` at the orchestrator seam, never inside the sequencing
 * engine, so it is purely additive and never mutates existing phases.
 *
 * Spec ref: OLOS_Atlas_Platform_Workflow_Spec_v1.docx §4.3.3.
 */

import { phase as phaseTokens } from '../../../lib/tokens.js';
import type { BuildPhase, PhaseTask } from '../../../store/phaseStore.js';
import {
  CATALOG_VERSION,
  type Intervention,
  type MaintenanceFrequency,
  type MaintenanceSchedule,
  type MaterialLine,
} from '../data/goalCompassTypes.js';
import type { ForcedRegenerationZone } from './autoDesign/regenerationForcing.js';

/** Occurrences per year — used to annualise per-occurrence labor/cost. */
const OCCURRENCES_PER_YEAR: Record<MaintenanceFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  annual: 1,
  biennial: 0.5,
  'every-3-years': 1 / 3,
};

const ALL_FREQUENCIES: MaintenanceFrequency[] = [
  'monthly',
  'quarterly',
  'annual',
  'biennial',
  'every-3-years',
];

export interface FrequencyBucket {
  taskCount: number;
  laborHrsPerOccurrence: number;
  costUSDPerOccurrence: number;
}

export interface MaterialProcurementLine {
  label: string;
  unit: string;
  /** Source labels (intervention / method names) that need this line. */
  sources: string[];
}

export interface ExternalPersonnelLine {
  skillLevel: string;
  minCount: number;
  /** What recurring task pulls in this skilled help. */
  from: string;
}

export interface MaintenanceRollup {
  byFrequency: Record<MaintenanceFrequency, FrequencyBucket>;
  /** Sum of per-occurrence labor × occurrences/yr across all items. */
  annualisedLaborHrs: number;
  /** Sum of per-occurrence cost × occurrences/yr across all items. */
  annualisedCostUSD: number;
  materials: MaterialProcurementLine[];
  /** Skilled help beyond the household the plan must source. */
  externalPersonnel: ExternalPersonnelLine[];
  /** De-duplicated equipment classes the recurring work depends on. */
  equipment: string[];
}

export interface MaintenanceScheduleResult {
  /** Synthetic recurring phase; null when nothing recurring was found. */
  generatedPhase: BuildPhase | null;
  /** Tagged maintenance tasks ready for scheduleTasksToCalendar. */
  generatedTasks: { phaseId: string; task: PhaseTask }[];
  rollup: MaintenanceRollup;
}

function emptyRollup(): MaintenanceRollup {
  const byFrequency = {} as Record<MaintenanceFrequency, FrequencyBucket>;
  for (const f of ALL_FREQUENCIES) {
    byFrequency[f] = {
      taskCount: 0,
      laborHrsPerOccurrence: 0,
      costUSDPerOccurrence: 0,
    };
  }
  return {
    byFrequency,
    annualisedLaborHrs: 0,
    annualisedCostUSD: 0,
    materials: [],
    externalPersonnel: [],
    equipment: [],
  };
}

/** PhaseTask.season is concrete; season-agnostic upkeep anchors to spring. */
function resolveSeason(
  s: MaintenanceSchedule['season'],
): PhaseTask['season'] {
  return s && s !== 'any' ? s : 'spring';
}

interface RecurringItem {
  /** Stable id fragment, unique per source. */
  key: string;
  label: string;
  schedule: MaintenanceSchedule;
  /** Catalog intervention id for task provenance, when one exists. */
  interventionId?: string;
}

/**
 * Build the recurring maintenance plan from the established interventions
 * + the recurring regeneration methods. Pure; deterministic ordering.
 *
 * @param projectId        owning project
 * @param interventions    interventions the sequencing engine selected
 * @param forcedZones      regeneration pathways forced onto barren zones
 */
export function computeMaintenanceSchedule(
  projectId: string,
  interventions: Intervention[],
  forcedZones: ForcedRegenerationZone[] = [],
): MaintenanceScheduleResult {
  const items: RecurringItem[] = [];

  for (const iv of interventions) {
    if (!iv.maintenanceSchedule) continue;
    items.push({
      key: `iv-${iv.id}`,
      label: iv.name,
      schedule: iv.maintenanceSchedule,
      interventionId: iv.id,
    });
  }

  // Recurring regeneration methods (cover-crop rebuild, managed grazing).
  // De-dupe by method id so multiple barren zones don't double-count the
  // same recurring commitment in the rollup.
  const seenMethods = new Set<string>();
  for (const fz of forcedZones) {
    for (const method of fz.pathway.methods) {
      if (!method.maintenanceSchedule) continue;
      if (seenMethods.has(method.id)) continue;
      seenMethods.add(method.id);
      items.push({
        key: `regen-${method.id}`,
        label: `${method.name} (regeneration)`,
        schedule: method.maintenanceSchedule,
        interventionId: method.interventionId ?? method.id,
      });
    }
  }

  if (items.length === 0) {
    return {
      generatedPhase: null,
      generatedTasks: [],
      rollup: emptyRollup(),
    };
  }

  const generatedPhase: BuildPhase = {
    id: `maint-phase-${projectId}`,
    projectId,
    name: 'Ongoing maintenance (recurring)',
    timeframe: 'Recurring (post-establishment)',
    // Sorts after every normal build phase so the recurring block reads
    // last in the phasing timeline.
    order: 99,
    description:
      'Operational upkeep once interventions are established — recurring ' +
      'labor, materials, skilled help, and equipment. Generated from the ' +
      'maintenance metadata on the intervention catalog (spec §4.3.3).',
    color: phaseTokens[4],
    completed: false,
    notes: '',
    completedAt: null,
    yeomansCap: 'soil',
    generatedFromGoalCompass: true,
    catalogVersion: CATALOG_VERSION,
  };

  const rollup = emptyRollup();
  const materialIndex = new Map<string, MaterialProcurementLine>();
  const equipment = new Set<string>();
  const generatedTasks: { phaseId: string; task: PhaseTask }[] = [];

  for (const item of items) {
    const sch = item.schedule;
    const perYear = OCCURRENCES_PER_YEAR[sch.frequency];

    const bucket = rollup.byFrequency[sch.frequency];
    bucket.taskCount += 1;
    bucket.laborHrsPerOccurrence += sch.laborHrsPerOccurrence;
    bucket.costUSDPerOccurrence += sch.costUSDPerOccurrence;

    rollup.annualisedLaborHrs += sch.laborHrsPerOccurrence * perYear;
    rollup.annualisedCostUSD += sch.costUSDPerOccurrence * perYear;

    for (const m of sch.materialsPerOccurrence ?? []) {
      const k = `${m.label}|${m.unit}`;
      const existing = materialIndex.get(k);
      if (existing) {
        if (!existing.sources.includes(item.label)) {
          existing.sources.push(item.label);
        }
      } else {
        materialIndex.set(k, {
          label: m.label,
          unit: m.unit,
          sources: [item.label],
        });
      }
    }

    if (sch.requiredPersonnel) {
      rollup.externalPersonnel.push({
        skillLevel: sch.requiredPersonnel.skillLevel ?? 'skilled',
        minCount: sch.requiredPersonnel.minCount,
        from: item.label,
      });
    }

    for (const e of sch.equipmentRequired ?? []) equipment.add(e);

    generatedTasks.push({
      phaseId: generatedPhase.id,
      task: {
        id: `maint-task-${item.key}`,
        season: resolveSeason(sch.season),
        title: `${item.label} — upkeep (${sch.frequency})`,
        laborHrs: sch.laborHrsPerOccurrence,
        costUSD: sch.costUSDPerOccurrence,
        notes: sch.notes,
        designLayer: 'vegetation',
        generatedFromIntervention: item.interventionId,
        catalogVersion: CATALOG_VERSION,
        status: 'generated',
        isMaintenanceTask: true,
        recurrenceFrequency: sch.frequency,
        materials: sch.materialsPerOccurrence as MaterialLine[] | undefined,
        requiredPersonnel: sch.requiredPersonnel,
        equipmentRequired: sch.equipmentRequired,
      },
    });
  }

  rollup.materials = [...materialIndex.values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  rollup.equipment = [...equipment].sort();

  return { generatedPhase, generatedTasks, rollup };
}
