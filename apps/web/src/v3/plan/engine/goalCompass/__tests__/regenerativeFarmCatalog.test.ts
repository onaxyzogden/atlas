// @vitest-environment happy-dom
/**
 * Regenerative Farm catalog readiness — the two first-class cash
 * enterprises (`market-garden`, `annual-cash-crop-rotation`) must be
 * reachable by the sequencing engine from a goal tree that targets the
 * existing income / soil criterion vocabulary, with their declared
 * prerequisites pulled in. Locks OQ1 closure for the Regenerative Farm
 * archetype: no engine/schema/criterion changes were required.
 */

import { describe, expect, it } from 'vitest';
import { runSequencingEngine } from '../sequencingEngine.js';
import { getIntervention } from '../../../data/interventionCatalog.js';
import { makeSiteProfile } from '../../autoDesign/__tests__/fixtures.js';
import type { GoalTree } from '../../../data/goalCompassTypes.js';

const PID = 'proj-regen';

/** Goal tree a Regenerative Farm steward would set: cash income +
 *  measurable soil rebuilding. Uses only the existing criterion ids. */
function incomeAndSoilGoalTree(): GoalTree {
  return {
    archetype: 'regenerative-farm',
    parentGoal: {
      id: 'pg',
      title: 'Regenerative cash farm',
      narrative: 'Earn from the land while rebuilding it.',
    },
    subGoals: [
      {
        id: 'sg-income',
        title: 'Farm income',
        criteria: [
          {
            id: 'income-surplus-usd',
            description: 'Annual surplus',
            unit: 'usd',
            target: 25000,
            deadlineYear: 5,
          },
          {
            id: 'income-streams-count',
            description: 'Distinct income streams',
            unit: 'count',
            target: 3,
            deadlineYear: 5,
          },
        ],
      },
      {
        id: 'sg-soil',
        title: 'Soil rebuilding',
        criteria: [
          {
            id: 'soil-om-pct',
            description: 'Organic matter gain',
            unit: 'pct',
            target: 1.5,
            deadlineYear: 7,
          },
          {
            id: 'soil-cover-pct',
            description: 'Living ground cover',
            unit: 'pct',
            target: 80,
            deadlineYear: 3,
          },
        ],
      },
    ],
  };
}

describe('Regenerative Farm catalog readiness', () => {
  it('catalog exposes both first-class cash enterprises', () => {
    expect(getIntervention('market-garden')).not.toBeNull();
    expect(getIntervention('annual-cash-crop-rotation')).not.toBeNull();
  });

  it('sequences both cash enterprises for an income+soil goal tree', () => {
    const res = runSequencingEngine(
      incomeAndSoilGoalTree(),
      makeSiteProfile(PID, 60),
      PID,
    );
    const ids = new Set(res.selected.map((s) => s.intervention.id));
    expect(ids.has('market-garden')).toBe(true);
    expect(ids.has('annual-cash-crop-rotation')).toBe(true);
  });

  it('pulls each enterprise prerequisite ahead of the enterprise', () => {
    const res = runSequencingEngine(
      incomeAndSoilGoalTree(),
      makeSiteProfile(PID, 60),
      PID,
    );
    const order = res.selected.map((s) => s.intervention.id);
    const idx = (id: string) => order.indexOf(id);

    // Declared prerequisites must be selected and ordered first.
    expect(idx('cover-crop-rebuild')).toBeGreaterThanOrEqual(0);
    expect(idx('compost-system')).toBeGreaterThanOrEqual(0);
    expect(idx('keyline-access-track')).toBeGreaterThanOrEqual(0);
    expect(idx('cover-crop-rebuild')).toBeLessThan(idx('market-garden'));
    expect(idx('compost-system')).toBeLessThan(idx('market-garden'));
    expect(idx('keyline-access-track')).toBeLessThan(
      idx('annual-cash-crop-rotation'),
    );
    expect(idx('cover-crop-rebuild')).toBeLessThan(
      idx('annual-cash-crop-rotation'),
    );
  });

  it('both enterprises carry recurring maintenance metadata (WS4b)', () => {
    expect(getIntervention('market-garden')?.maintenanceSchedule).toBeDefined();
    expect(
      getIntervention('annual-cash-crop-rotation')?.maintenanceSchedule,
    ).toBeDefined();
  });
});
