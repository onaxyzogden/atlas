import { describe, expect, it } from 'vitest';
import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { detectCovenantBanned } from '@ogden/shared';
import {
  canonicalTagFor,
  DECLARATION_MODE,
  deriveCanonicalObjects,
  deriveObjectiveDisplayMap,
  deriveStratumSequencing,
  isThresholdReachable,
  REACHABLE_THRESHOLD_IDS,
  ROUTABLE_THRESHOLD_IDS,
  THRESHOLDS,
  TIER_ZERO_DISPLAY,
  tierZeroDisplayFor,
} from '../declarationModel.js';

// deriveStratumSequencing / deriveCanonicalObjects only read `o.id`, so a minimal
// stub suffices (the full PlanStratumObjective shape is irrelevant to these pure fns).
function obj(id: string): PlanStratumObjective {
  return { id } as PlanStratumObjective;
}

// deriveStratumSequencing reads only id + ordinal off the stratum; this typed ref
// keeps the id checked against the PlanStratum literal union (a bare object literal
// would widen `id` to `string` and fail to assign to Pick<PlanStratum, ...>).
function stratumRef(
  id: PlanStratum['id'],
  ordinal: number,
): Pick<PlanStratum, 'id' | 'ordinal'> {
  return { id, ordinal };
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
  it('numbers the six declaration objectives 1.1..1.6', () => {
    expect(TIER_ZERO_DISPLAY['s1-vision']?.display).toBe('1.1');
    expect(TIER_ZERO_DISPLAY['s1-steward']?.display).toBe('1.2');
    expect(TIER_ZERO_DISPLAY['s1-boundaries']?.display).toBe('1.3');
    expect(TIER_ZERO_DISPLAY['s1-stakeholders']?.display).toBe('1.4');
    expect(TIER_ZERO_DISPLAY['rf-s1-enterprise-mix']?.display).toBe('1.5');
    expect(TIER_ZERO_DISPLAY['res-s1-household-needs']?.display).toBe('1.6');
  });

  it('marks the canonical objects and the new objectives', () => {
    expect(TIER_ZERO_DISPLAY['s1-vision']?.canonical).toBe('intent');
    expect(TIER_ZERO_DISPLAY['s1-steward']?.canonical).toBe('team');
    expect(TIER_ZERO_DISPLAY['s1-steward']?.isNew).toBe(true);
    expect(TIER_ZERO_DISPLAY['res-s1-household-needs']?.isNew).toBe(true);
    // 1.3 / 1.4 carry no canonical membership.
    expect(TIER_ZERO_DISPLAY['s1-boundaries']?.canonical).toBeUndefined();
  });

  it('tierZeroDisplayFor returns undefined for a non-declaration id', () => {
    expect(tierZeroDisplayFor('s2-terrain')).toBeUndefined();
    expect(tierZeroDisplayFor('s1-vision')?.display).toBe('1.1');
  });
});

describe('THRESHOLDS', () => {
  it('positions three checkpoints against real stratum ids', () => {
    expect(THRESHOLDS).toHaveLength(3);
    // 2026-06-16 Tier-2 Reception restructure: the Reality Check moved to sit
    // AFTER Systems Reading (S3) and the Coherence Check after System Design
    // (S5); the Act Mandate (S7) is unchanged. Single source of truth -- this
    // intentionally shifts the Tier-0 spine display too.
    expect(THRESHOLDS.map((t) => t.afterStratumId)).toEqual([
      's3-systems-reading',
      's5-system-design',
      's7-phasing-resourcing',
    ]);
    expect(THRESHOLDS[0]?.name).toContain('Reality Check');
    expect(THRESHOLDS[2]?.name).toContain('Act Mandate');
  });
});

// DECOUPLE (2026-06-19, Threshold-3 build): two distinct id sets. REACHABLE is
// the CLICKABLE-row set the Plan rail-header switcher renders as buttons. All
// three thresholds are clickable: T3 (Act Mandate) was added 2026-06-19 by
// operator decision ("a button that functions like the other two thresholds").
// Clicking T3 only NAVIGATES to the Act Mandate surface -- the one-way Begin-Act
// planReadOnly arming stays gated behind the surface's own CTA, so clickability
// != arming. These tests guard that all three ids stay clickable.
describe('REACHABLE_THRESHOLD_IDS', () => {
  it('contains the two soft checkpoints (Reality + Coherence)', () => {
    expect(REACHABLE_THRESHOLD_IDS).toContain('threshold-1');
    expect(REACHABLE_THRESHOLD_IDS).toContain('threshold-2');
  });

  it('includes threshold-3 (Act Mandate) -- its switcher row is clickable (navigates)', () => {
    expect(REACHABLE_THRESHOLD_IDS).toContain('threshold-3');
  });

  it('every reachable id is a real threshold in THRESHOLDS (no typo / stale id)', () => {
    const known = new Set(THRESHOLDS.map((t) => t.id));
    for (const id of REACHABLE_THRESHOLD_IDS) {
      expect(known.has(id)).toBe(true);
    }
  });
});

// ROUTABLE is the BUILT-SURFACE set the threshold route guard (routes/index.tsx
// isThresholdReachable) consumes -- all three surfaces exist. It now matches
// REACHABLE (every clickable row is also a routable surface), but the two stay
// distinct constants: "has a built surface" (route reach) is a different concern
// from "is a clickable switcher row" (nav affordance), and they could diverge.
describe('ROUTABLE_THRESHOLD_IDS', () => {
  it('contains all three built threshold surfaces, including the Act Mandate', () => {
    expect(ROUTABLE_THRESHOLD_IDS).toContain('threshold-1');
    expect(ROUTABLE_THRESHOLD_IDS).toContain('threshold-2');
    expect(ROUTABLE_THRESHOLD_IDS).toContain('threshold-3');
  });

  it('is a superset of the spine-clickable REACHABLE set', () => {
    for (const id of REACHABLE_THRESHOLD_IDS) {
      expect(ROUTABLE_THRESHOLD_IDS).toContain(id);
    }
  });

  it('every routable id is a real threshold in THRESHOLDS (no typo / stale id)', () => {
    const known = new Set(THRESHOLDS.map((t) => t.id));
    for (const id of ROUTABLE_THRESHOLD_IDS) {
      expect(known.has(id)).toBe(true);
    }
  });
});

describe('isThresholdReachable', () => {
  it('returns true for all three built threshold surfaces', () => {
    expect(isThresholdReachable('threshold-1')).toBe(true);
    expect(isThresholdReachable('threshold-2')).toBe(true);
    // threshold-3 (Act Mandate) is now BUILT -> routable (its divider stays
    // decorative, but the surface is reachable by deep-link / the s7 cue).
    expect(isThresholdReachable('threshold-3')).toBe(true);
  });

  it('returns false for unknown ids', () => {
    expect(isThresholdReachable('threshold-99')).toBe(false);
    expect(isThresholdReachable('')).toBe(false);
  });
});

describe('deriveStratumSequencing', () => {
  const S1 = stratumRef('s1-project-foundation', 1);

  it('lays out Stratum 1 via its curated override with overlaid status + 1.x numbering', () => {
    const seq = deriveStratumSequencing(
      S1,
      SIX,
      statuses({
        's1-vision': 'complete',
        's1-steward': 'active',
        's1-boundaries': 'available',
        's1-stakeholders': 'available',
        'rf-s1-enterprise-mix': 'locked',
        'res-s1-household-needs': 'locked',
      }),
      'Land Reading',
    );
    expect(seq.groups).toHaveLength(3);

    // Group 1: single 1.1, complete.
    expect(seq.groups[0]?.kind).toBe('single');
    expect(seq.groups[0]?.nodes.map((n) => n.display)).toEqual(['1.1']);
    expect(seq.groups[0]?.nodes[0]?.status).toBe('complete');

    // Group 2: parallel 1.2 / 1.3 / 1.4.
    expect(seq.groups[1]?.kind).toBe('parallel');
    expect(seq.groups[1]?.nodes.map((n) => n.display)).toEqual([
      '1.2',
      '1.3',
      '1.4',
    ]);
    expect(seq.groups[1]?.nodes[0]?.status).toBe('active');

    // Group 3: parallel 1.5 / 1.6, both locked.
    expect(seq.groups[2]?.kind).toBe('parallel');
    expect(seq.groups[2]?.nodes.map((n) => n.display)).toEqual(['1.5', '1.6']);

    // Terminal node = the next stratum, locked until all six complete.
    expect(seq.next).toEqual({ label: 'Land Reading', status: 'locked' });
  });

  it('appends type-specific stratum-1 objectives not covered by the curated override', () => {
    // An ecovillage resolves the 4 universal ids plus its OWN s1 ids, which the
    // curated SEQUENCE_LAYOUT (rf-/res- only) never lists. They must still render
    // -- appended after the curated waves, not silently dropped.
    const ecovillage = [
      obj('s1-vision'),
      obj('s1-steward'),
      obj('s1-boundaries'),
      obj('s1-stakeholders'),
      obj('ev-s1-legal-governance'),
      obj('ev-s1-provision-balance'),
    ];
    const seq = deriveStratumSequencing(
      S1,
      ecovillage,
      statuses({
        'ev-s1-legal-governance': 'available',
        'ev-s1-provision-balance': 'available',
      }),
      'Land Reading',
    );

    // Every resolved objective renders -- 6 nodes, none dropped.
    const nodes = seq.groups.flatMap((g) => g.nodes);
    expect(nodes).toHaveLength(6);

    // The two ev-* ids appear, numbered 1.5 / 1.6 after the curated 1.1-1.4.
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n.display]));
    expect(byId['ev-s1-legal-governance']).toBe('1.5');
    expect(byId['ev-s1-provision-balance']).toBe('1.6');
  });

  it('defaults a missing status to locked', () => {
    const seq = deriveStratumSequencing(
      S1,
      SIX,
      statuses({ 's1-vision': 'complete' }),
      'Land Reading',
    );
    expect(seq.groups[1]?.nodes[0]?.status).toBe('locked');
  });

  it('unlocks the terminal node only when every present objective is complete', () => {
    const allComplete = Object.fromEntries(
      SIX.map((o) => [o.id, 'complete' as PlanStratumObjectiveStatus]),
    );
    const seq = deriveStratumSequencing(S1, SIX, allComplete, 'Land Reading');
    expect(seq.next.status).toBe('available');
  });

  it('drops absent objectives and collapses a one-node parallel group to single', () => {
    // A regen + silvopasture project with NO residential secondary lacks 1.6.
    const noResidential = SIX.filter((o) => o.id !== 'res-s1-household-needs');
    const seq = deriveStratumSequencing(
      S1,
      noResidential,
      statuses({ 'rf-s1-enterprise-mix': 'available' }),
      'Land Reading',
    );
    const last = seq.groups[seq.groups.length - 1];
    expect(last?.nodes.map((n) => n.display)).toEqual(['1.5']);
    expect(last?.kind).toBe('single');
  });

  it('returns a locked terminal node for an empty stratum', () => {
    const seq = deriveStratumSequencing(S1, [], {}, 'Land Reading');
    expect(seq.groups).toHaveLength(0);
    expect(seq.next.status).toBe('locked');
  });

  it('derives a generic stratum (no override) as one parallel wave numbered N.x', () => {
    const S2 = stratumRef('s2-land-reading', 2);
    const objectives = [obj('s2-terrain'), obj('s2-water'), obj('s2-access')];
    const seq = deriveStratumSequencing(
      S2,
      objectives,
      statuses({
        's2-terrain': 'active',
        's2-water': 'available',
        's2-access': 'available',
      }),
      'Systems Reading',
    );
    expect(seq.groups).toHaveLength(1);
    expect(seq.groups[0]?.kind).toBe('parallel');
    expect(seq.groups[0]?.nodes.map((n) => n.display)).toEqual([
      '2.1',
      '2.2',
      '2.3',
    ]);
    // The model echoes the caller-supplied terminal label verbatim.
    expect(seq.next.label).toBe('Systems Reading');
  });

  it('orders intra-stratum prerequisites into successive waves', () => {
    const S4 = stratumRef('s4-foundation-decisions', 4);
    // b depends on a (same stratum) -> a in wave 1, b in wave 2; c is free -> wave 1.
    const a = obj('s4-a');
    const b = {
      id: 's4-b',
      prerequisiteObjectiveIds: ['s4-a'],
    } as PlanStratumObjective;
    const c = obj('s4-c');
    const seq = deriveStratumSequencing(
      S4,
      [a, b, c],
      statuses({
        's4-a': 'complete',
        's4-b': 'available',
        's4-c': 'available',
      }),
      'System Design',
    );
    // Wave 1: a + c (parallel), wave 2: b (single). Numbered 4.1/4.2 then 4.3.
    expect(seq.groups).toHaveLength(2);
    expect(seq.groups[0]?.nodes.map((n) => n.id)).toEqual(['s4-a', 's4-c']);
    expect(seq.groups[0]?.nodes.map((n) => n.display)).toEqual(['4.1', '4.2']);
    expect(seq.groups[1]?.nodes.map((n) => n.id)).toEqual(['s4-b']);
    expect(seq.groups[1]?.nodes.map((n) => n.display)).toEqual(['4.3']);
  });

  it('echoes a "Plan complete" terminal label for the final stratum', () => {
    const S7 = stratumRef('s7-phasing-resourcing', 7);
    const seq = deriveStratumSequencing(
      S7,
      [obj('s7-phasing')],
      statuses({ 's7-phasing': 'active' }),
      'Plan complete',
    );
    expect(seq.next.label).toBe('Plan complete');
  });
});

describe('deriveObjectiveDisplayMap', () => {
  const S1 = stratumRef('s1-project-foundation', 1);

  it('maps the six S1 declaration objectives to 1.1..1.6, keyed by id', () => {
    const map = deriveObjectiveDisplayMap(S1, SIX);
    expect(map.get('s1-vision')).toBe('1.1');
    expect(map.get('s1-steward')).toBe('1.2');
    expect(map.get('s1-boundaries')).toBe('1.3');
    expect(map.get('s1-stakeholders')).toBe('1.4');
    expect(map.get('rf-s1-enterprise-mix')).toBe('1.5');
    expect(map.get('res-s1-household-needs')).toBe('1.6');
    // One entry per resolved objective; keys are the objective ids.
    expect(map.size).toBe(6);
  });

  it('numbers a generic single-wave stratum N.1, N.2, N.3', () => {
    const S2 = stratumRef('s2-land-reading', 2);
    const map = deriveObjectiveDisplayMap(S2, [
      obj('s2-terrain'),
      obj('s2-water'),
      obj('s2-access'),
    ]);
    expect(map.get('s2-terrain')).toBe('2.1');
    expect(map.get('s2-water')).toBe('2.2');
    expect(map.get('s2-access')).toBe('2.3');
  });

  it('returns exactly the sequencing rail node displays (single numbering source)', () => {
    // The map is DERIVED from deriveStratumSequencing, so every id must map to
    // that function's node.display -- a card badge can never drift from the
    // stepper. Guarding this identity keeps the reuse honest.
    const seq = deriveStratumSequencing(S1, SIX, {}, '');
    const map = deriveObjectiveDisplayMap(S1, SIX);
    const nodes = seq.groups.flatMap((g) => g.nodes);
    for (const node of nodes) {
      expect(map.get(node.id)).toBe(node.display);
    }
    // ...and no extra keys beyond the sequencer's nodes.
    expect([...map.keys()].sort()).toEqual(nodes.map((n) => n.id).sort());
  });

  it('omits an objective absent from the resolved set (no entry -> no badge)', () => {
    // A project without the residential secondary lacks res-s1-household-needs;
    // its id is simply absent, and its card then renders no number.
    const noResidential = SIX.filter((o) => o.id !== 'res-s1-household-needs');
    const map = deriveObjectiveDisplayMap(S1, noResidential);
    expect(map.has('res-s1-household-needs')).toBe(false);
    expect(map.get('rf-s1-enterprise-mix')).toBe('1.5');
  });

  it('returns an empty map for an empty stratum', () => {
    expect(deriveObjectiveDisplayMap(S1, []).size).toBe(0);
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
      ...deriveCanonicalObjects(SIX, {}).flatMap((c) => [c.name, c.desc]),
    ]
      .join(' ')
      .toLowerCase();
    expect(detectCovenantBanned(corpus), corpus).toBe(false);
  });
});
