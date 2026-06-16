import { describe, expect, it } from 'vitest';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import {
  canonicalTagFor,
  DECLARATION_MODE,
  deriveCanonicalObjects,
  deriveSequencing,
  THRESHOLDS,
  TIER_ZERO_DISPLAY,
  tierZeroDisplayFor,
} from '../declarationModel.js';

// deriveSequencing / deriveCanonicalObjects only read `o.id`, so a minimal stub
// suffices (the full PlanStratumObjective shape is irrelevant to these pure fns).
function obj(id: string): PlanStratumObjective {
  return { id } as PlanStratumObjective;
}

/** The full six-objective regen + residential + silvopasture declaration set. */
const SIX = [
  obj('s1-vision'),
  obj('s1-steward'),
  obj('s1-boundaries'),
  obj('s1-stakeholders'),
  obj('rf-s1-enterprise-mix'),
  obj('res-s1-household-needs'),
];

function statuses(
  overrides: Record<string, PlanStratumObjectiveStatus>,
): Record<string, PlanStratumObjectiveStatus> {
  return overrides;
}

describe('TIER_ZERO_DISPLAY', () => {
  it('numbers the six declaration objectives 0.1..0.6', () => {
    expect(TIER_ZERO_DISPLAY['s1-vision']?.display).toBe('0.1');
    expect(TIER_ZERO_DISPLAY['s1-steward']?.display).toBe('0.2');
    expect(TIER_ZERO_DISPLAY['s1-boundaries']?.display).toBe('0.3');
    expect(TIER_ZERO_DISPLAY['s1-stakeholders']?.display).toBe('0.4');
    expect(TIER_ZERO_DISPLAY['rf-s1-enterprise-mix']?.display).toBe('0.5');
    expect(TIER_ZERO_DISPLAY['res-s1-household-needs']?.display).toBe('0.6');
  });

  it('marks the canonical objects and the new objectives', () => {
    expect(TIER_ZERO_DISPLAY['s1-vision']?.canonical).toBe('intent');
    expect(TIER_ZERO_DISPLAY['s1-steward']?.canonical).toBe('team');
    expect(TIER_ZERO_DISPLAY['s1-steward']?.isNew).toBe(true);
    expect(TIER_ZERO_DISPLAY['res-s1-household-needs']?.isNew).toBe(true);
    // 0.3 / 0.4 carry no canonical membership.
    expect(TIER_ZERO_DISPLAY['s1-boundaries']?.canonical).toBeUndefined();
  });

  it('tierZeroDisplayFor returns undefined for a non-declaration id', () => {
    expect(tierZeroDisplayFor('s2-terrain')).toBeUndefined();
    expect(tierZeroDisplayFor('s1-vision')?.display).toBe('0.1');
  });
});

describe('THRESHOLDS', () => {
  it('positions three checkpoints against real stratum ids', () => {
    expect(THRESHOLDS).toHaveLength(3);
    expect(THRESHOLDS.map((t) => t.afterStratumId)).toEqual([
      's1-project-foundation',
      's6-integration-design',
      's7-phasing-resourcing',
    ]);
    expect(THRESHOLDS[0]?.name).toContain('Reality Check');
    expect(THRESHOLDS[2]?.name).toContain('Act Mandate');
  });
});

describe('deriveSequencing', () => {
  it('lays out the full six-objective DAG with overlaid status', () => {
    const seq = deriveSequencing(
      SIX,
      statuses({
        's1-vision': 'complete',
        's1-steward': 'active',
        's1-boundaries': 'available',
        's1-stakeholders': 'available',
        'rf-s1-enterprise-mix': 'locked',
        'res-s1-household-needs': 'locked',
      }),
    );
    expect(seq.groups).toHaveLength(3);

    // Group 1: single 0.1, complete.
    expect(seq.groups[0]?.kind).toBe('single');
    expect(seq.groups[0]?.nodes.map((n) => n.display)).toEqual(['0.1']);
    expect(seq.groups[0]?.nodes[0]?.status).toBe('complete');

    // Group 2: parallel 0.2 / 0.3 / 0.4.
    expect(seq.groups[1]?.kind).toBe('parallel');
    expect(seq.groups[1]?.nodes.map((n) => n.display)).toEqual([
      '0.2',
      '0.3',
      '0.4',
    ]);
    expect(seq.groups[1]?.nodes[0]?.status).toBe('active');

    // Group 3: parallel 0.5 / 0.6, both locked.
    expect(seq.groups[2]?.kind).toBe('parallel');
    expect(seq.groups[2]?.nodes.map((n) => n.display)).toEqual(['0.5', '0.6']);

    // Terminal node locked until all six complete.
    expect(seq.next).toEqual({ label: 'Tier 1', status: 'locked' });
  });

  it('defaults a missing status to locked', () => {
    const seq = deriveSequencing(SIX, statuses({ 's1-vision': 'complete' }));
    expect(seq.groups[1]?.nodes[0]?.status).toBe('locked');
  });

  it('unlocks the terminal node only when every present objective is complete', () => {
    const allComplete = Object.fromEntries(
      SIX.map((o) => [o.id, 'complete' as PlanStratumObjectiveStatus]),
    );
    const seq = deriveSequencing(SIX, allComplete);
    expect(seq.next.status).toBe('available');
  });

  it('drops absent objectives and collapses a one-node parallel group to single', () => {
    // A regen + silvopasture project with NO residential secondary lacks 0.6.
    const noResidential = SIX.filter((o) => o.id !== 'res-s1-household-needs');
    const seq = deriveSequencing(
      noResidential,
      statuses({ 'rf-s1-enterprise-mix': 'available' }),
    );
    const last = seq.groups[seq.groups.length - 1];
    expect(last?.nodes.map((n) => n.display)).toEqual(['0.5']);
    expect(last?.kind).toBe('single');
  });

  it('returns a locked terminal node for an empty declaration set', () => {
    const seq = deriveSequencing([], {});
    expect(seq.groups).toHaveLength(0);
    expect(seq.next.status).toBe('locked');
  });
});

describe('canonicalTagFor', () => {
  it('maps status to tag + label', () => {
    expect(canonicalTagFor('complete')).toEqual({
      tag: 'done',
      tagLabel: 'Established',
    });
    expect(canonicalTagFor('active')).toEqual({
      tag: 'wip',
      tagLabel: 'In Progress',
    });
    expect(canonicalTagFor('available')).toEqual({
      tag: 'idle',
      tagLabel: 'Not started',
    });
    expect(canonicalTagFor('locked').tag).toBe('idle');
    expect(canonicalTagFor('deferred').tag).toBe('idle');
  });
});

describe('deriveCanonicalObjects', () => {
  it('emits Intent then Team with status-driven tags', () => {
    const cards = deriveCanonicalObjects(
      SIX,
      statuses({ 's1-vision': 'complete', 's1-steward': 'active' }),
    );
    expect(cards.map((c) => c.kind)).toEqual(['intent', 'team']);
    expect(cards[0]?.name).toBe('Intent Object');
    expect(cards[0]?.tag).toBe('done');
    expect(cards[0]?.tagLabel).toBe('Established');
    expect(cards[1]?.name).toBe('Steward / Team Object');
    expect(cards[1]?.tag).toBe('wip');
    expect(cards[1]?.objectiveId).toBe('s1-steward');
  });

  it('omits a canonical card whose objective is absent from the set', () => {
    const intentOnly = [obj('s1-vision')];
    const cards = deriveCanonicalObjects(intentOnly, { 's1-vision': 'active' });
    expect(cards.map((c) => c.kind)).toEqual(['intent']);
  });
});

describe('DECLARATION_MODE copy (Amanah wording-pin)', () => {
  it('contains no advance-sale / subscription framing', () => {
    const corpus = [
      DECLARATION_MODE.pill,
      DECLARATION_MODE.titleLead + DECLARATION_MODE.titleEm + DECLARATION_MODE.titleTail,
      DECLARATION_MODE.desc,
      DECLARATION_MODE.sequencingLabel,
      ...deriveCanonicalObjects(SIX, {}).flatMap((c) => [c.name, c.desc]),
    ]
      .join(' ')
      .toLowerCase();
    expect(corpus).not.toMatch(/subscription|presale|advance sale|csa|csra|yield[- ]share/);
  });
});
