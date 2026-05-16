// @vitest-environment happy-dom
/**
 * regenerationForcing — spec §3.2.1 system obligation.
 *
 *  - A barren zone ALWAYS yields a mandatory pathway, regardless of goals.
 *  - Barren zones are withheld from productive allocation (assignment gate).
 *  - Acknowledging a zone releases the gate but keeps the pathway.
 *  - With no barren zones the forcing is a no-op.
 */

import { describe, expect, it } from 'vitest';
import {
  computeRegenerationForcing,
  applyAssignmentGate,
} from '../regenerationForcing.js';
import { runAutoDesign } from '../runAutoDesign.js';
import { makeZone, makeGoalTree, makeSiteProfile } from './fixtures.js';

describe('computeRegenerationForcing', () => {
  it('forces a pathway on a barren zone independent of the goal tree', () => {
    const zones = [
      makeZone('z-barren', { category: 'food_production', groundCover: 'barren' }),
      makeZone('z-good', { category: 'food_production', groundCover: 'bare-soil' }),
    ];
    const r = computeRegenerationForcing('p1', zones, 'high');

    expect(r.barrenZoneIds).toEqual(['z-barren']);
    expect(r.forcedZones).toHaveLength(1);
    expect(r.forcedZones[0]!.zoneId).toBe('z-barren');
    expect(r.forcedZones[0]!.pathway.methods.length).toBeGreaterThan(0);
    expect(r.forcedZones[0]!.pathway.timelineToProductiveYears).toBeGreaterThan(0);
    expect(r.generatedPhase).not.toBeNull();
    expect(r.generatedTasks.length).toBeGreaterThan(0);
  });

  it('is a no-op when there are no barren zones', () => {
    const zones = [makeZone('z1', { groundCover: 'thriving-grasses' })];
    const r = computeRegenerationForcing('p1', zones, 'low');
    expect(r.barrenZoneIds).toEqual([]);
    expect(r.forcedZones).toEqual([]);
    expect(r.generatedPhase).toBeNull();
  });

  it('acknowledging a barren zone releases the gate but keeps the pathway', () => {
    const zones = [makeZone('z-barren', { groundCover: 'barren' })];
    const r = computeRegenerationForcing('p1', zones, 'med', ['z-barren']);
    expect(r.barrenZoneIds).toEqual([]); // gate released
    expect(r.forcedZones).toHaveLength(1); // pathway still mandatory
  });
});

describe('applyAssignmentGate', () => {
  it('removes withheld barren zones from the allocatable set', () => {
    const zones = [makeZone('a', {}), makeZone('b', {})];
    expect(applyAssignmentGate(zones, ['a']).map((z) => z.id)).toEqual(['b']);
    expect(applyAssignmentGate(zones, [])).toHaveLength(2);
  });
});

describe('runAutoDesign integration — §3.2.1', () => {
  it('emits a regeneration pathway + draft and never lands productive geometry on a barren zone', () => {
    const zones = [
      makeZone('z-barren', {
        category: 'food_production',
        groundCover: 'barren',
        successionStage: 'disturbed',
        lng: 0,
        lat: 0,
      }),
      makeZone('z-good', {
        category: 'food_production',
        groundCover: 'bare-soil',
        successionStage: 'pioneer',
        lng: 1,
        lat: 1,
      }),
    ];
    const result = runAutoDesign({
      projectId: 'p1',
      generationId: 'g1',
      goalTree: makeGoalTree(),
      siteProfile: makeSiteProfile('p1'),
      zones,
    });

    expect(result.regenerationPathways).toHaveLength(1);
    expect(result.regenerationPathways[0]!.zoneId).toBe('z-barren');

    const regenDraft = result.drafts.find(
      (d) => d.interventionId === 'regeneration-pathway',
    );
    expect(regenDraft?.zoneId).toBe('z-barren');

    // No productive (non-regeneration) draft may target the barren zone.
    const productiveOnBarren = result.drafts.filter(
      (d) =>
        d.zoneId === 'z-barren' && d.interventionId !== 'regeneration-pathway',
    );
    expect(productiveOnBarren).toHaveLength(0);

    // Regeneration tasks are scheduled onto the calendar.
    const regenTasks = result.scheduledTasks.filter((t) =>
      t.task.id.startsWith('regen-task-z-barren-'),
    );
    expect(regenTasks.length).toBeGreaterThan(0);
    expect(regenTasks.every((t) => t.task.scheduledStart)).toBe(true);
  });
});
