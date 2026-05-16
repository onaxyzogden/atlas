// @vitest-environment happy-dom
/**
 * computeMaintenanceSchedule — spec §4.3.3 recurring-upkeep rollup.
 *
 *  - No recurring metadata ⇒ null phase, empty rollup.
 *  - Interventions + recurring regeneration methods ⇒ one synthetic
 *    "Ongoing maintenance" phase with tagged tasks.
 *  - Per-frequency buckets, annualised labor/cost, materials dedup,
 *    external personnel, equipment are aggregated correctly.
 *  - Recurring regeneration methods are deduped by method id across
 *    multiple forced zones (no double-count).
 */

import { describe, expect, it } from 'vitest';
import { computeMaintenanceSchedule } from '../maintenanceSchedule.js';
import { getIntervention } from '../../data/interventionCatalog.js';
import { buildRegenerationPathway } from '../../data/regenerationPathway.js';
import type { ForcedRegenerationZone } from '../autoDesign/regenerationForcing.js';
import type { Intervention } from '../../data/goalCompassTypes.js';

function iv(id: string): Intervention {
  const found = getIntervention(id);
  if (!found) throw new Error(`catalog missing ${id}`);
  return found;
}

const forced = (zoneId: string): ForcedRegenerationZone => ({
  zoneId,
  pathway: buildRegenerationPathway('high'),
});

describe('computeMaintenanceSchedule', () => {
  it('returns a null phase + empty rollup when nothing recurs', () => {
    const parcel = getIntervention('parcel-assessment');
    expect(parcel?.maintenanceSchedule).toBeUndefined();
    const res = computeMaintenanceSchedule('p1', parcel ? [parcel] : [], []);
    expect(res.generatedPhase).toBeNull();
    expect(res.generatedTasks).toHaveLength(0);
    expect(res.rollup.annualisedLaborHrs).toBe(0);
    expect(res.rollup.annualisedCostUSD).toBe(0);
  });

  it('emits a synthetic recurring phase + one task per recurring item', () => {
    const compost = iv('compost-system'); // monthly
    const foodForest = iv('food-forest'); // annual
    expect(compost.maintenanceSchedule?.frequency).toBe('monthly');

    const res = computeMaintenanceSchedule('p1', [compost, foodForest], []);
    expect(res.generatedPhase).not.toBeNull();
    expect(res.generatedPhase!.id).toBe('maint-phase-p1');
    expect(res.generatedPhase!.order).toBe(99);
    expect(res.generatedPhase!.generatedFromGoalCompass).toBe(true);
    expect(res.generatedTasks).toHaveLength(2);
    for (const { task } of res.generatedTasks) {
      expect(task.isMaintenanceTask).toBe(true);
      expect(task.recurrenceFrequency).toBeDefined();
    }
  });

  it('annualises per-occurrence labor/cost by frequency', () => {
    const compost = iv('compost-system'); // monthly → ×12
    const sch = compost.maintenanceSchedule!;
    const res = computeMaintenanceSchedule('p1', [compost], []);
    expect(res.rollup.annualisedLaborHrs).toBeCloseTo(
      sch.laborHrsPerOccurrence * 12,
    );
    expect(res.rollup.annualisedCostUSD).toBeCloseTo(
      sch.costUSDPerOccurrence * 12,
    );
    expect(res.rollup.byFrequency.monthly.taskCount).toBe(1);
  });

  it('folds recurring regeneration methods in and dedups by method id', () => {
    // Two barren zones → same pathway methods. Recurring methods must be
    // counted once, not per-zone.
    const zones = [forced('z1'), forced('z2')];
    const oneZone = computeMaintenanceSchedule('p1', [], [forced('z1')]);
    const twoZones = computeMaintenanceSchedule('p1', [], zones);
    expect(twoZones.generatedTasks).toHaveLength(
      oneZone.generatedTasks.length,
    );
    expect(twoZones.generatedTasks.length).toBeGreaterThan(0);
  });

  it('aggregates external personnel + equipment from task metadata', () => {
    // cattle-rotational-grazing carries vet personnel; small-ruminant too.
    const grazing = iv('cattle-rotational-grazing');
    const res = computeMaintenanceSchedule('p1', [grazing], []);
    if (grazing.maintenanceSchedule?.requiredPersonnel) {
      expect(res.rollup.externalPersonnel.length).toBeGreaterThan(0);
    }
    if (grazing.maintenanceSchedule?.equipmentRequired?.length) {
      expect(res.rollup.equipment.length).toBeGreaterThan(0);
    }
  });
});
