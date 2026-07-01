/**
 * receptionModel -- pure derivations for BOTH reception tiers' workbench chrome
 * (Tier 1 / Stratum-2 Land Reading + Tier 2 / Stratum-3 Systems Reading). No DOM;
 * this pins the model contract the ReceptionCenter / ReceptionReferencePanel
 * render:
 *   1. the "2.x" + "3.x" presentation numbering + the union membership set (six
 *      resolved S2 surveys + five resolved S3 surveys; 3.5 flagged new).
 *   2. survey-sequencing strip -- order, live status overlay, and the terminal
 *      node per stratum (Stratum 2 -> "Stratum 3" unlock; Stratum 3 -> covenant Threshold-1
 *      Reality Check), unlocking only when every present survey is complete, plus
 *      the 3.5-benefits-from-3.1 note gated on 3.5's presence (Tier-2-only).
 *   3. cross-stratum progress -- Stratum 2 (Land Reading) + Stratum 3 (Systems Reading)
 *      fractions, the record total, and the threshold-open flag.
 *   4. the tier-keyed copy accessors (default 'tier2' keeps the S3 consumers
 *      byte-identical) + the new-field adapters (set + omitted).
 *   5. Amanah wording-pin -- none of the centralized reception copy (either tier)
 *      drifts to advance-sale / subscription / CSA / yield-share framing.
 */

import { describe, it, expect } from 'vitest';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import {
  TIER_TWO_DISPLAY,
  TIER_ONE_DISPLAY,
  tierTwoDisplayFor,
  receptionDisplayFor,
  receptionTierOf,
  RECEPTION_OBJECTIVE_IDS,
  isReceptionObjectiveId,
  isReceptionObjective,
  deriveReceptionSequencing,
  deriveReceptionProgress,
  receptionStatusLabel,
  receptionRecordsCaption,
  receptionThresholdDesc,
  receptionModeCopy,
  receptionRuleCopy,
  receptionGatesCopy,
  receptionStillListeningCopy,
  receptionReferenceSubtitle,
  readIntentLens,
  readObserveOutput,
  readBuildsOn,
  RECEPTION_MODE,
  RECEPTION_MODE_TIER_ONE,
  RECEPTION_RULE,
  RECEPTION_RULE_TIER_ONE,
  RECEPTION_STILL_LISTENING,
  RECEPTION_STILL_LISTENING_TIER_ONE,
  RECEPTION_REFERENCE,
  RECEPTION_GATES,
  RECEPTION_GATES_TIER_ONE,
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

// The six Tier-1 (Stratum-2, Land Reading) surveys for the regen + residential
// + silvopasture config -- the parallel of FIVE for the Tier-1 chrome.
const SIX = [
  obj('s2-terrain', 's2-land-reading'),
  obj('s2-climate', 's2-land-reading'),
  obj('s2-ecology', 's2-land-reading'),
  obj('s2-infrastructure', 's2-land-reading'),
  obj('rf-s2-land-health', 's2-land-reading'),
  obj('rf-s2-landscape-context', 's2-land-reading'),
];

const SIX_ALL_COMPLETE: Record<string, PlanStratumObjectiveStatus> = {
  's2-terrain': 'complete',
  's2-climate': 'complete',
  's2-ecology': 'complete',
  's2-infrastructure': 'complete',
  'rf-s2-land-health': 'complete',
  'rf-s2-landscape-context': 'complete',
};

describe('receptionModel -- TIER_TWO_DISPLAY numbering', () => {
  it('numbers the five surveys 3.1..3.5 in resolution order', () => {
    expect(TIER_TWO_DISPLAY['s3-hydrology']?.display).toBe('3.1');
    expect(TIER_TWO_DISPLAY['s3-soil']?.display).toBe('3.2');
    expect(TIER_TWO_DISPLAY['rf-s3-nutrient-cycling']?.display).toBe('3.3');
    expect(TIER_TWO_DISPLAY['rf-s3-pest-pressure']?.display).toBe('3.4');
    expect(TIER_TWO_DISPLAY['silv-sec-s3-stock-water']?.display).toBe('3.5');
  });

  it('flags only the new livestock-water survey (3.5) as isNew', () => {
    expect(TIER_TWO_DISPLAY['silv-sec-s3-stock-water']?.isNew).toBe(true);
    expect(TIER_TWO_DISPLAY['s3-hydrology']?.isNew).toBeUndefined();
  });

  it('tierTwoDisplayFor returns the entry for a member, undefined otherwise', () => {
    expect(tierTwoDisplayFor('s3-soil')?.display).toBe('3.2');
    expect(tierTwoDisplayFor('s1-vision')).toBeUndefined();
  });
});

describe('receptionModel -- membership', () => {
  it('RECEPTION_OBJECTIVE_IDS is the union of both tier display maps (11 ids)', () => {
    expect([...RECEPTION_OBJECTIVE_IDS].sort()).toEqual(
      [
        // Stratum 2 -- Land Reading (the six s2 surveys)
        's2-terrain',
        's2-climate',
        's2-ecology',
        's2-infrastructure',
        'rf-s2-land-health',
        'rf-s2-landscape-context',
        // Stratum 3 -- Systems Reading (the five s3 surveys)
        's3-hydrology',
        's3-soil',
        'rf-s3-nutrient-cycling',
        'rf-s3-pest-pressure',
        'silv-sec-s3-stock-water',
      ].sort(),
    );
  });

  it('isReceptionObjectiveId / isReceptionObjective discriminate the set (both tiers)', () => {
    expect(isReceptionObjectiveId('s3-hydrology')).toBe(true);
    // The widened set now flips the six Tier-1 surveys into reception mode.
    expect(isReceptionObjectiveId('s2-terrain')).toBe(true);
    expect(isReceptionObjectiveId('rf-s2-landscape-context')).toBe(true);
    expect(isReceptionObjectiveId('s1-vision')).toBe(false);
    expect(isReceptionObjectiveId(null)).toBe(false);
    expect(isReceptionObjectiveId(undefined)).toBe(false);
    expect(isReceptionObjective({ id: 'silv-sec-s3-stock-water' })).toBe(true);
    expect(isReceptionObjective({ id: 's2-terrain' })).toBe(true);
    expect(isReceptionObjective({ id: 's1-vision' })).toBe(false);
    expect(isReceptionObjective(null)).toBe(false);
  });

  it('does NOT include the excluded forage survey or non-reception ids', () => {
    expect(isReceptionObjectiveId('silv-sec-s3-forage-survey')).toBe(false);
    expect(isReceptionObjectiveId('s1-vision')).toBe(false);
  });
});

describe('receptionModel -- TIER_ONE_DISPLAY numbering', () => {
  it('numbers the six Land-Reading surveys 2.1..2.6 in spec order', () => {
    expect(TIER_ONE_DISPLAY['s2-terrain']?.display).toBe('2.1');
    expect(TIER_ONE_DISPLAY['s2-climate']?.display).toBe('2.2');
    expect(TIER_ONE_DISPLAY['s2-ecology']?.display).toBe('2.3');
    expect(TIER_ONE_DISPLAY['s2-infrastructure']?.display).toBe('2.4');
    expect(TIER_ONE_DISPLAY['rf-s2-land-health']?.display).toBe('2.5');
    expect(TIER_ONE_DISPLAY['rf-s2-landscape-context']?.display).toBe('2.6');
  });

  it('flags no Tier-1 survey isNew (the restructure reframes, never adds)', () => {
    for (const entry of Object.values(TIER_ONE_DISPLAY)) {
      expect(entry.isNew).toBeUndefined();
    }
  });

  it('receptionTierOf classifies each id by tier (else null)', () => {
    expect(receptionTierOf('s2-terrain')).toBe('tier1');
    expect(receptionTierOf('rf-s2-landscape-context')).toBe('tier1');
    expect(receptionTierOf('s3-hydrology')).toBe('tier2');
    expect(receptionTierOf('silv-sec-s3-stock-water')).toBe('tier2');
    expect(receptionTierOf('s1-vision')).toBeNull();
    expect(receptionTierOf('silv-sec-s3-forage-survey')).toBeNull();
    expect(receptionTierOf(null)).toBeNull();
    expect(receptionTierOf(undefined)).toBeNull();
  });

  it('receptionDisplayFor resolves an entry in EITHER tier map', () => {
    expect(receptionDisplayFor('s2-ecology')?.display).toBe('2.3');
    expect(receptionDisplayFor('s3-soil')?.display).toBe('3.2');
    expect(receptionDisplayFor('s1-vision')).toBeUndefined();
  });
});

describe('receptionModel -- tier-1 sequencing strip', () => {
  it('lays out the six surveys 2.1..2.6 with live status', () => {
    const seq = deriveReceptionSequencing(
      SIX,
      {
        's2-terrain': 'complete',
        's2-climate': 'active',
        's2-ecology': 'available',
        's2-infrastructure': 'available',
        'rf-s2-land-health': 'locked',
        'rf-s2-landscape-context': 'locked',
      },
      'tier1',
    );
    expect(seq.nodes.map((n) => n.display)).toEqual([
      '2.1',
      '2.2',
      '2.3',
      '2.4',
      '2.5',
      '2.6',
    ]);
    expect(seq.nodes[0]?.status).toBe('complete');
    expect(seq.nodes[1]?.status).toBe('active');
  });

  it('terminal node is the Stratum 3 unlock, available iff all six complete', () => {
    const partial = deriveReceptionSequencing(
      SIX,
      { ...SIX_ALL_COMPLETE, 'rf-s2-landscape-context': 'active' },
      'tier1',
    );
    expect(partial.threshold.label).toBe('Stratum 3');
    expect(partial.threshold.name).toBe('Stratum 3 -- Systems Reading');
    expect(partial.threshold.status).toBe('locked');

    const all = deriveReceptionSequencing(SIX, SIX_ALL_COMPLETE, 'tier1');
    expect(all.threshold.status).toBe('available');
    expect(all.threshold.label).toBe('Stratum 3');
  });

  it('never surfaces the Tier-2-only stock-water note on a Tier-1 strip', () => {
    // Even if the stock-water survey somehow co-resolves, the note is tier-2-gated.
    const seq = deriveReceptionSequencing(
      [...SIX, obj('silv-sec-s3-stock-water')],
      { ...SIX_ALL_COMPLETE, 'silv-sec-s3-stock-water': 'complete' },
      'tier1',
    );
    expect(seq.note).toBeUndefined();
  });

  it('default tier === explicit tier2 (the five S3 consumers stay byte-identical)', () => {
    const def = deriveReceptionSequencing(FIVE, ALL_COMPLETE);
    const two = deriveReceptionSequencing(FIVE, ALL_COMPLETE, 'tier2');
    expect(def).toEqual(two);
    expect(def.threshold.label).toBe('Threshold 1');
  });
});

describe('receptionModel -- tier-keyed copy accessors', () => {
  it('mode/rule/gates/still-listening default to Tier-2, switch on tier1', () => {
    expect(receptionModeCopy()).toBe(RECEPTION_MODE);
    expect(receptionModeCopy('tier2')).toBe(RECEPTION_MODE);
    expect(receptionModeCopy('tier1')).toBe(RECEPTION_MODE_TIER_ONE);

    expect(receptionRuleCopy()).toBe(RECEPTION_RULE);
    expect(receptionRuleCopy('tier1')).toBe(RECEPTION_RULE_TIER_ONE);

    expect(receptionGatesCopy()).toBe(RECEPTION_GATES);
    expect(receptionGatesCopy('tier1')).toBe(RECEPTION_GATES_TIER_ONE);

    expect(receptionStillListeningCopy()).toBe(RECEPTION_STILL_LISTENING);
    expect(receptionStillListeningCopy('tier1')).toBe(
      RECEPTION_STILL_LISTENING_TIER_ONE,
    );
  });

  it('tier-1 mode header carries the Land-Reading framing', () => {
    const mode = receptionModeCopy('tier1');
    expect(mode.tier).toBe('Stratum 2');
    expect(mode.pill).toBe('Mode 2 -- Reception');
    expect(mode.titleEm).toBe('actually here');
    expect(mode.sequencingLabel).toMatch(/Stratum 2/);
  });

  it('reference subtitle is tier-suffixed', () => {
    expect(receptionReferenceSubtitle()).toBe('Mode 2 -- Reception - Stratum 3');
    expect(receptionReferenceSubtitle('tier1')).toBe(
      'Mode 2 -- Reception - Stratum 2',
    );
  });

  it('tier-1 second gate reframes as the Stratum 3 unlock (six surveys)', () => {
    const gates = receptionGatesCopy('tier1');
    expect(gates.tierTwo.title).toBe('Stratum 3 -- Systems Reading');
    expect(gates.tierTwo.desc).toMatch(/all six Stratum 2 objectives/);
    // The covenant Threshold-1 copy is shared, unchanged across tiers.
    expect(gates.thresholdOne).toBe(RECEPTION_GATES.thresholdOne);
  });
});

describe('receptionModel -- sequencing strip', () => {
  it('lays out present surveys in 3.1..3.5 order with live status', () => {
    const seq = deriveReceptionSequencing(FIVE, {
      's3-hydrology': 'complete',
      's3-soil': 'active',
      'rf-s3-nutrient-cycling': 'available',
      'rf-s3-pest-pressure': 'locked',
      'silv-sec-s3-stock-water': 'locked',
    });
    expect(seq.nodes.map((n) => n.display)).toEqual([
      '3.1',
      '3.2',
      '3.3',
      '3.4',
      '3.5',
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

  it('surfaces the 3.5-benefits-from-3.1 note only when 3.5 is present', () => {
    const withStock = deriveReceptionSequencing(FIVE, ALL_COMPLETE);
    expect(withStock.note).toMatch(/3\.5 Livestock Water benefits from 3\.1/);
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
    expect(desc).toMatch(/Stratum 2 \(6\/6\)/);
    expect(desc).toMatch(/Stratum 3 \(5\/5\)/);
    expect(desc).toMatch(/11 survey objectives/);
  });
});

describe('receptionModel -- new-field adapters', () => {
  it('reads intentLens / observeOutput / buildsOnDisplay when authored', () => {
    const survey = {
      id: 's3-hydrology',
      intentLens: [{ typeId: 'regenerative_farm', text: 'Look for swale lines' }],
      observeOutput: 'Hydrology Survey Record',
      buildsOnDisplay: 'Stratum 2.1 Terrain & topography',
    } as unknown as PlanStratumObjective;
    expect(readIntentLens(survey)).toHaveLength(1);
    expect(readObserveOutput(survey)).toBe('Hydrology Survey Record');
    expect(readBuildsOn(survey)).toBe('Stratum 2.1 Terrain & topography');
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
  const BANNED =
    /subscription|presale|pre-sale|advance[ -]sale|csa|csra|yield[ -]share/;

  it('carries no advance-sale / subscription / CSA / yield-share framing (Stratum 3)', () => {
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
    expect(corpus).not.toMatch(BANNED);
  });

  it('the new Tier-1 (Land Reading) copy carries no banned framing', () => {
    const corpus = [
      ...Object.values(RECEPTION_MODE_TIER_ONE),
      ...Object.values(RECEPTION_RULE_TIER_ONE),
      ...Object.values(RECEPTION_STILL_LISTENING_TIER_ONE),
      RECEPTION_GATES_TIER_ONE.tierTwo.title,
      RECEPTION_GATES_TIER_ONE.tierTwo.desc,
      receptionReferenceSubtitle('tier1'),
      deriveReceptionSequencing(SIX, SIX_ALL_COMPLETE, 'tier1').threshold.name,
    ]
      .join(' ')
      .toLowerCase();
    expect(corpus).not.toMatch(BANNED);
  });
});
