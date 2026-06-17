/**
 * receptionModel -- pure derivations for the Tier-2 / Stratum-3 Reception
 * (Systems Reading) workbench chrome. No DOM; this pins the model contract the
 * ReceptionCenter / ReceptionReferencePanel render:
 *   1. the "2.x" presentation numbering + membership set (the five resolved S3
 *      surveys; 2.5 flagged new).
 *   2. survey-sequencing strip -- order, live status overlay, terminal
 *      Threshold-1 node that unlocks only when every present survey is complete,
 *      and the 2.5-benefits-from-2.1 note gated on 2.5's presence.
 *   3. cross-tier progress -- Tier 1 (Land Reading) + Tier 2 (Systems Reading)
 *      fractions, the record total, and the threshold-open flag.
 *   4. the new-field adapters (set + omitted).
 *   5. Amanah wording-pin -- none of the centralized reception copy drifts to
 *      advance-sale / subscription / CSA / yield-share framing.
 */

import { describe, it, expect } from 'vitest';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import {
  TIER_TWO_DISPLAY,
  tierTwoDisplayFor,
  RECEPTION_OBJECTIVE_IDS,
  isReceptionObjectiveId,
  isReceptionObjective,
  deriveReceptionSequencing,
  deriveReceptionProgress,
  receptionStatusLabel,
  receptionRecordsCaption,
  receptionThresholdDesc,
  readIntentLens,
  readObserveOutput,
  readBuildsOn,
  RECEPTION_MODE,
  RECEPTION_RULE,
  RECEPTION_STILL_LISTENING,
  RECEPTION_REFERENCE,
  RECEPTION_GATES,
} from '../receptionModel.js';
import { THRESHOLDS } from '../declarationModel.js';

// deriveReceptionSequencing reads only `id`; deriveReceptionProgress reads
// `id` + `stratumId`. A minimal stub suffices.
function obj(id: string, stratumId = 's3-systems-reading'): PlanStratumObjective {
  return { id, stratumId } as PlanStratumObjective;
}

const FIVE = [
  obj('s3-hydrology'),
  obj('s3-soil'),
  obj('rf-s3-nutrient-cycling'),
  obj('rf-s3-pest-pressure'),
  obj('silv-sec-s3-stock-water'),
];

const ALL_COMPLETE: Record<string, PlanStratumObjectiveStatus> = {
  's3-hydrology': 'complete',
  's3-soil': 'complete',
  'rf-s3-nutrient-cycling': 'complete',
  'rf-s3-pest-pressure': 'complete',
  'silv-sec-s3-stock-water': 'complete',
};

describe('receptionModel -- TIER_TWO_DISPLAY numbering', () => {
  it('numbers the five surveys 2.1..2.5 in resolution order', () => {
    expect(TIER_TWO_DISPLAY['s3-hydrology']?.display).toBe('2.1');
    expect(TIER_TWO_DISPLAY['s3-soil']?.display).toBe('2.2');
    expect(TIER_TWO_DISPLAY['rf-s3-nutrient-cycling']?.display).toBe('2.3');
    expect(TIER_TWO_DISPLAY['rf-s3-pest-pressure']?.display).toBe('2.4');
    expect(TIER_TWO_DISPLAY['silv-sec-s3-stock-water']?.display).toBe('2.5');
  });

  it('flags only the new livestock-water survey (2.5) as isNew', () => {
    expect(TIER_TWO_DISPLAY['silv-sec-s3-stock-water']?.isNew).toBe(true);
    expect(TIER_TWO_DISPLAY['s3-hydrology']?.isNew).toBeUndefined();
  });

  it('tierTwoDisplayFor returns the entry for a member, undefined otherwise', () => {
    expect(tierTwoDisplayFor('s3-soil')?.display).toBe('2.2');
    expect(tierTwoDisplayFor('s1-vision')).toBeUndefined();
  });
});

describe('receptionModel -- membership', () => {
  it('RECEPTION_OBJECTIVE_IDS is exactly the five survey ids', () => {
    expect([...RECEPTION_OBJECTIVE_IDS].sort()).toEqual(
      [
        's3-hydrology',
        's3-soil',
        'rf-s3-nutrient-cycling',
        'rf-s3-pest-pressure',
        'silv-sec-s3-stock-water',
      ].sort(),
    );
  });

  it('isReceptionObjectiveId / isReceptionObjective discriminate the set', () => {
    expect(isReceptionObjectiveId('s3-hydrology')).toBe(true);
    expect(isReceptionObjectiveId('s1-vision')).toBe(false);
    expect(isReceptionObjectiveId(null)).toBe(false);
    expect(isReceptionObjectiveId(undefined)).toBe(false);
    expect(isReceptionObjective({ id: 'silv-sec-s3-stock-water' })).toBe(true);
    expect(isReceptionObjective({ id: 's2-terrain' })).toBe(false);
    expect(isReceptionObjective(null)).toBe(false);
  });

  it('does NOT include the excluded forage survey', () => {
    expect(isReceptionObjectiveId('silv-sec-s3-forage-survey')).toBe(false);
  });
});

describe('receptionModel -- sequencing strip', () => {
  it('lays out present surveys in 2.1..2.5 order with live status', () => {
    const seq = deriveReceptionSequencing(FIVE, {
      's3-hydrology': 'complete',
      's3-soil': 'active',
      'rf-s3-nutrient-cycling': 'available',
      'rf-s3-pest-pressure': 'locked',
      'silv-sec-s3-stock-water': 'locked',
    });
    expect(seq.nodes.map((n) => n.display)).toEqual([
      '2.1',
      '2.2',
      '2.3',
      '2.4',
      '2.5',
    ]);
    expect(seq.nodes[0]?.status).toBe('complete');
    expect(seq.nodes[1]?.status).toBe('active');
    expect(seq.nodes[3]?.status).toBe('locked');
  });

  it('drops surveys absent from the resolved set (graceful)', () => {
    const seq = deriveReceptionSequencing(
      [obj('s3-hydrology'), obj('s3-soil')],
      { 's3-hydrology': 'active', 's3-soil': 'locked' },
    );
    expect(seq.nodes.map((n) => n.id)).toEqual(['s3-hydrology', 's3-soil']);
  });

  it('keeps the terminal Threshold-1 node locked until every survey is complete', () => {
    const partial = deriveReceptionSequencing(FIVE, {
      ...ALL_COMPLETE,
      'silv-sec-s3-stock-water': 'active',
    });
    expect(partial.threshold.status).toBe('locked');
    const all = deriveReceptionSequencing(FIVE, ALL_COMPLETE);
    expect(all.threshold.status).toBe('available');
    // The terminal node carries the shared THRESHOLDS[0] name.
    expect(all.threshold.name).toBe(THRESHOLDS[0]?.name);
  });

  it('surfaces the 2.5-benefits-from-2.1 note only when 2.5 is present', () => {
    const withStock = deriveReceptionSequencing(FIVE, ALL_COMPLETE);
    expect(withStock.note).toMatch(/2\.5 Livestock Water benefits from 2\.1/);
    const withoutStock = deriveReceptionSequencing(
      [obj('s3-hydrology'), obj('s3-soil')],
      { 's3-hydrology': 'complete', 's3-soil': 'complete' },
    );
    expect(withoutStock.note).toBeUndefined();
  });
});

describe('receptionModel -- cross-tier progress', () => {
  const TIER_ONE = [
    obj('s2-terrain', 's2-land-reading'),
    obj('s2-water', 's2-land-reading'),
  ];

  it('counts completion per tier from the FULL objective list', () => {
    const prog = deriveReceptionProgress([...TIER_ONE, ...FIVE], {
      's2-terrain': 'complete',
      's2-water': 'active',
      's3-hydrology': 'complete',
      's3-soil': 'complete',
      'rf-s3-nutrient-cycling': 'locked',
      'rf-s3-pest-pressure': 'locked',
      'silv-sec-s3-stock-water': 'locked',
    });
    expect(prog.tierOne).toEqual({ complete: 1, total: 2 });
    expect(prog.tierTwo).toEqual({ complete: 2, total: 5 });
    expect(prog.totalRecords).toBe(7);
    expect(prog.thresholdOpen).toBe(false);
  });

  it('opens the threshold only when BOTH tiers are fully complete', () => {
    const prog = deriveReceptionProgress([...TIER_ONE, ...FIVE], {
      's2-terrain': 'complete',
      's2-water': 'complete',
      ...ALL_COMPLETE,
    });
    expect(prog.thresholdOpen).toBe(true);
  });

  it('defaults capturedRecords to 0 (Stage-3 map count injected later)', () => {
    const prog = deriveReceptionProgress(FIVE, ALL_COMPLETE);
    expect(prog.capturedRecords).toBe(0);
    const withCount = deriveReceptionProgress(FIVE, ALL_COMPLETE, 11);
    expect(withCount.capturedRecords).toBe(11);
  });
});

describe('receptionModel -- labels + captions', () => {
  it('maps status to a human label', () => {
    expect(receptionStatusLabel('active')).toBe('In Progress');
    expect(receptionStatusLabel('available')).toBe('Available');
    expect(receptionStatusLabel('complete')).toBe('Complete');
    expect(receptionStatusLabel('deferred')).toBe('On Hold');
    expect(receptionStatusLabel('locked')).toBe('Locked');
  });

  it('derives the records caption from the total', () => {
    expect(receptionRecordsCaption(11)).toMatch(/11 survey records/);
  });

  it('derives the threshold description from both tier totals', () => {
    const desc = receptionThresholdDesc(6, 5);
    expect(desc).toMatch(/Tier 1 \(6\/6\)/);
    expect(desc).toMatch(/Tier 2 \(5\/5\)/);
    expect(desc).toMatch(/11 survey objectives/);
  });
});

describe('receptionModel -- new-field adapters', () => {
  it('reads intentLens / observeOutput / buildsOnDisplay when authored', () => {
    const survey = {
      id: 's3-hydrology',
      intentLens: [{ typeId: 'regenerative_farm', text: 'Look for swale lines' }],
      observeOutput: 'Hydrology Survey Record',
      buildsOnDisplay: 'Tier 1.1 Terrain & topography',
    } as unknown as PlanStratumObjective;
    expect(readIntentLens(survey)).toHaveLength(1);
    expect(readObserveOutput(survey)).toBe('Hydrology Survey Record');
    expect(readBuildsOn(survey)).toBe('Tier 1.1 Terrain & topography');
  });

  it('returns empty/undefined when the fields are omitted (Act objectives)', () => {
    const bare = { id: 's1-vision' } as PlanStratumObjective;
    expect(readIntentLens(bare)).toEqual([]);
    expect(readObserveOutput(bare)).toBeUndefined();
    expect(readBuildsOn(bare)).toBeUndefined();
    expect(readIntentLens(null)).toEqual([]);
  });
});

describe('receptionModel -- Amanah wording-pin', () => {
  it('carries no advance-sale / subscription / CSA / yield-share framing', () => {
    const corpus = [
      ...Object.values(RECEPTION_MODE),
      ...Object.values(RECEPTION_RULE),
      ...Object.values(RECEPTION_STILL_LISTENING),
      ...Object.values(RECEPTION_REFERENCE),
      RECEPTION_GATES.tierTwo.title,
      RECEPTION_GATES.tierTwo.desc,
      RECEPTION_GATES.thresholdOne.eyebrow,
      RECEPTION_GATES.thresholdOne.title,
      receptionThresholdDesc(6, 5),
      receptionRecordsCaption(11),
      deriveReceptionSequencing(FIVE, ALL_COMPLETE).note ?? '',
    ]
      .join(' ')
      .toLowerCase();
    expect(corpus).not.toMatch(
      /subscription|presale|pre-sale|advance[ -]sale|csa|csra|yield[ -]share/,
    );
  });
});
