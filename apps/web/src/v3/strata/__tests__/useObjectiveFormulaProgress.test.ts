// @vitest-environment happy-dom
/**
 * collectFormulaSatisfiedItemIds — the store-reading half of the formula
 * auto-satisfy path. Pins three rules:
 *   1. an item with satisfiesWhenComputed:true is collected once its formula
 *      has a usable result (per-project store read),
 *   2. an advisory binding (satisfiesWhenComputed falsy) is NEVER collected,
 *   3. the deferred break-even binding is NEVER collected (covenant).
 *
 * happy-dom env because the import chain (formulaCatalog → livestockStore)
 * rehydrates from localStorage at module load.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { PlanStratumObjective } from '@ogden/shared';
import { useLivestockStore, type Paddock } from '../../../store/livestockStore.js';
import { collectFormulaSatisfiedItemIds } from '../useObjectiveFormulaProgress.js';

function paddock(projectId: string, overrides: Partial<Paddock> = {}): Paddock {
  return {
    id: `pad-${Math.round(overrides.areaM2 ?? 0)}-${projectId}`,
    projectId,
    name: 'Test paddock',
    areaM2: 10_000, // 1 ha
    stockingDensity: 5, // head/ha → 5 head → 300 L/day water demand
    species: ['sheep'],
  } as unknown as Paddock;
}

/** Objective with a water-demand item (auto), an advisory water item, and a
 *  break-even item — all on the SAME projectId paddock set. */
function objective(): PlanStratumObjective {
  return {
    id: 's3-water',
    checklist: [
      {
        id: 'water-auto',
        label: 'Calculate stock water demand',
        feedsInto: [],
        optional: false,
        formulaBinding: {
          formulaId: 'stock-water-demand',
          satisfiesWhenComputed: true,
        },
      },
      {
        id: 'water-advisory',
        label: 'Note water demand (advisory)',
        feedsInto: [],
        optional: false,
        formulaBinding: { formulaId: 'stock-water-demand' }, // no satisfiesWhenComputed
      },
      {
        id: 'break-even-auto',
        label: 'Calculate break-even',
        feedsInto: [],
        optional: false,
        formulaBinding: {
          formulaId: 'enterprise-break-even',
          satisfiesWhenComputed: true,
        },
      },
    ],
  } as unknown as PlanStratumObjective;
}

afterEach(() => {
  useLivestockStore.setState({ paddocks: [], fenceLines: [] });
});

describe('collectFormulaSatisfiedItemIds', () => {
  it('collects a satisfiesWhenComputed item once its formula has a usable result', () => {
    useLivestockStore.setState({ paddocks: [paddock('p1')], fenceLines: [] });
    const ids = collectFormulaSatisfiedItemIds('p1', [objective()]);
    expect(ids.has('water-auto')).toBe(true);
  });

  it('never collects an advisory binding (satisfiesWhenComputed falsy)', () => {
    useLivestockStore.setState({ paddocks: [paddock('p1')], fenceLines: [] });
    const ids = collectFormulaSatisfiedItemIds('p1', [objective()]);
    expect(ids.has('water-advisory')).toBe(false);
  });

  it('never collects the deferred break-even binding even when bound to satisfy', () => {
    useLivestockStore.setState({ paddocks: [paddock('p1')], fenceLines: [] });
    const ids = collectFormulaSatisfiedItemIds('p1', [objective()]);
    expect(ids.has('break-even-auto')).toBe(false);
  });

  it('is per-project: no paddocks for the project → nothing collected', () => {
    useLivestockStore.setState({ paddocks: [paddock('p1')], fenceLines: [] });
    const ids = collectFormulaSatisfiedItemIds('other-project', [objective()]);
    expect(ids.size).toBe(0);
  });
});
