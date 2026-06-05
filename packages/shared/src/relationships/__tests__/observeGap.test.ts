import { describe, it, expect } from 'vitest';
import {
  isObserveGapObjective,
  objectiveHasInjectedItems,
  collectObserveGapObjectives,
} from '../observeGap.js';
import type { ObjectivesDelta } from '../computeObjectivesDelta.js';
import type {
  PlanDecisionChecklistItem,
  PlanStratumObjective,
} from '../../schemas/plan/planStratumObjective.schema.js';
import { obj, ck } from '../../constants/plan/catalogues/authoring.js';

// Part E (Plan Nav v1.1 section 9). isObserveGapObjective is the single rule
// both the Plan add-preview and the Observe re-derivation read, so it must not
// drift. A gap = output IS an observation record, OR injected items AND a
// non-empty overlay bundle. The "injected items" signal is supplied by the
// caller (a delta for the preview, the persistent checklist marker otherwise).

const injectedItem = (id: string): PlanDecisionChecklistItem => ({
  ...ck(id, id),
  expandedBySecondaryId: 'residential',
});

/** Build a base universal objective, then override the gap-relevant fields. */
function makeObjective(
  id: string,
  over: Partial<
    Pick<
      PlanStratumObjective,
      'outputKind' | 'defaultOverlayBundle' | 'checklist'
    >
  >,
): PlanStratumObjective {
  const base = obj({
    id,
    stratumId: 's2-land-reading',
    title: id,
    focusedQuestion: 'q',
    checklist: [],
    completionGate: 'gate',
    actHandoff: 'handoff',
    source: 'universal',
    ref: 'U-X',
  });
  return { ...base, ...over };
}

describe('objectiveHasInjectedItems', () => {
  it('is true when any checklist item carries expandedBySecondaryId', () => {
    const o = makeObjective('a', {
      checklist: [ck('plain', 'plain'), injectedItem('inj')],
    });
    expect(objectiveHasInjectedItems(o)).toBe(true);
  });

  it('is false when no checklist item is secondary-injected', () => {
    const o = makeObjective('b', { checklist: [ck('plain', 'plain')] });
    expect(objectiveHasInjectedItems(o)).toBe(false);
  });
});

describe('isObserveGapObjective (persistent signal)', () => {
  it('observation-record output is always a gap', () => {
    const o = makeObjective('obs', { outputKind: 'observation-record' });
    expect(isObserveGapObjective(o)).toBe(true);
  });

  it('injected items AND a non-empty overlay bundle is a gap', () => {
    const o = makeObjective('inj-overlay', {
      checklist: [injectedItem('i')],
      defaultOverlayBundle: ['hydrology' as never],
    });
    // overlay id values come from the OverlayId enum; cast keeps the fixture terse
    expect(isObserveGapObjective(o)).toBe(true);
  });

  it('injected items WITHOUT an overlay bundle is NOT a gap', () => {
    const o = makeObjective('inj-only', {
      checklist: [injectedItem('i')],
      defaultOverlayBundle: [],
    });
    expect(isObserveGapObjective(o)).toBe(false);
  });

  it('overlay bundle WITHOUT injected items is NOT a gap', () => {
    const o = makeObjective('overlay-only', {
      checklist: [ck('plain', 'plain')],
      defaultOverlayBundle: ['zones' as never],
    });
    expect(isObserveGapObjective(o)).toBe(false);
  });

  it('honours an explicit hasInjectedItems override', () => {
    const o = makeObjective('forced', {
      checklist: [ck('plain', 'plain')],
      defaultOverlayBundle: ['soil-conditions' as never],
    });
    expect(isObserveGapObjective(o, false)).toBe(false);
    expect(isObserveGapObjective(o, true)).toBe(true);
  });
});

describe('collectObserveGapObjectives - persistent (no delta)', () => {
  it('returns every gap objective in the resolved set', () => {
    const objectives = [
      makeObjective('obs', { outputKind: 'observation-record' }),
      makeObjective('inj-overlay', {
        checklist: [injectedItem('i')],
        defaultOverlayBundle: ['hydrology' as never],
      }),
      makeObjective('plain', { checklist: [ck('p', 'p')] }),
    ];
    expect(collectObserveGapObjectives(objectives).sort()).toEqual([
      'inj-overlay',
      'obs',
    ]);
  });
});

describe('collectObserveGapObjectives - delta (add-preview)', () => {
  it('reproduces the two-part rule: new observation-record OR gained-items+overlay', () => {
    const newObs = makeObjective('new-obs', {
      outputKind: 'observation-record',
    });
    const gainedOverlay = makeObjective('gained-overlay', {
      checklist: [injectedItem('i')],
      defaultOverlayBundle: ['water-flow' as never],
    });
    const gainedNoOverlay = makeObjective('gained-no-overlay', {
      checklist: [injectedItem('i')],
      defaultOverlayBundle: [],
    });
    const afterObjectives = [newObs, gainedOverlay, gainedNoOverlay];

    const delta: ObjectivesDelta = {
      newObjectiveIds: ['new-obs'],
      newObjectives: [newObs],
      objectivesWithNewItems: ['gained-overlay', 'gained-no-overlay'],
      injectedItems: [],
      objectivesWithGateAmendments: [],
      gateAmendments: [],
    };

    // new-obs via the observation-record loop; gained-overlay via the overlay
    // loop; gained-no-overlay excluded (empty overlay).
    expect(collectObserveGapObjectives(afterObjectives, delta).sort()).toEqual([
      'gained-overlay',
      'new-obs',
    ]);
  });
});
