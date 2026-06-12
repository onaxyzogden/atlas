import { describe, expect, it } from 'vitest';
import {
  CommunityWorkInstanceSchema,
  CommunityWorkRuleSchema,
} from '../../schemas/communityWork/communityWork.schema.js';
import {
  generateCommunityWorkPlan,
  type CommunityWorkGenerationInput,
} from '../generateCommunityWorkPlan.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function baseInput(
  overrides: Partial<CommunityWorkGenerationInput> = {},
): CommunityWorkGenerationInput {
  return {
    todayISO: '2026-06-12',
    protocols: [],
    ratifyCapturePresent: false,
    ratifyMembers: [],
    stewardInvites: [],
    ...overrides,
  };
}

/** Find every rule whose sourceKind matches. */
function rulesOfKind(
  out: ReturnType<typeof generateCommunityWorkPlan>,
  sourceKind: string,
) {
  return out.rules.filter((r) => r.sourceKind === sourceKind);
}

function ruleBySourceId(
  out: ReturnType<typeof generateCommunityWorkPlan>,
  sourceId: string,
) {
  return out.rules.find((r) => r.sourceId === sourceId);
}

// ===========================================================================
// Empty input
// ===========================================================================

describe('generateCommunityWorkPlan — empty input', () => {
  it('empty input yields empty plan', () => {
    const out = generateCommunityWorkPlan(baseInput());
    expect(out.rules).toEqual([]);
    expect(out.instances).toEqual([]);
  });
});

// ===========================================================================
// (a) reviewCadence option → recurrence / anchorMonth (table-driven)
// ===========================================================================

describe('(a) reviewCadence option → recurrence mapping', () => {
  const checkinCases: Array<[string, string]> = [
    ['Weekly', 'weekly'],
    ['Fortnightly', 'fortnightly'],
    ['Monthly', 'monthly'],
  ];
  it.each(checkinCases)('check-in %s → %s', (opt, expected) => {
    const out = generateCommunityWorkPlan(
      baseInput({ reviewCadence: { cfCadCheckin: opt } }),
    );
    const rule = ruleBySourceId(out, 'checkin');
    expect(rule?.recurrence).toBe(expected);
  });

  const governanceCases: Array<[string, string]> = [
    ['Monthly', 'monthly'],
    ['Quarterly', 'quarterly'],
    ['Biannual', 'biannual'],
  ];
  it.each(governanceCases)('governance %s → %s', (opt, expected) => {
    const out = generateCommunityWorkPlan(
      baseInput({ reviewCadence: { cfCadGovernance: opt } }),
    );
    const rule = ruleBySourceId(out, 'governance-meeting');
    expect(rule?.recurrence).toBe(expected);
  });

  const annualCases: Array<[string, number]> = [
    ['Annually (February)', 2],
    ['Annually (September)', 9],
  ];
  it.each(annualCases)('annual %s → anchorMonth %i', (opt, month) => {
    const out = generateCommunityWorkPlan(
      baseInput({ reviewCadence: { cfCadAnnual: opt } }),
    );
    const rule = ruleBySourceId(out, 'annual-review');
    expect(rule?.recurrence).toBe('annual');
    expect(rule?.anchorMonth).toBe(month);
  });

  const fullCases: Array<[string, string]> = [
    ['Every 2 years', 'biennial'],
    ['Annually', 'annual'],
    ['Every 5 years', 'every-5-years'],
  ];
  it.each(fullCases)('full review %s → %s', (opt, expected) => {
    const out = generateCommunityWorkPlan(
      baseInput({ reviewCadence: { cfCadFull: opt } }),
    );
    const rule = ruleBySourceId(out, 'full-review');
    expect(rule?.recurrence).toBe(expected);
  });

  it('five-year option → every-5-years five-year-review rule', () => {
    const out = generateCommunityWorkPlan(
      baseInput({ reviewCadence: { cfCadFiveYear: 'Year 5 then every 5 years' } }),
    );
    const rule = ruleBySourceId(out, 'five-year-review');
    expect(rule?.recurrence).toBe('every-5-years');
    expect(rule?.kind).toBe('five-year-review');
  });

  it('unset cadence fields generate no rule', () => {
    const out = generateCommunityWorkPlan(
      baseInput({ reviewCadence: { cfCadCheckin: '', cfCadGovernance: '' } }),
    );
    expect(rulesOfKind(out, 'governance')).toEqual([]);
  });

  it('all five cadence fields set → up to 5 rules', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        reviewCadence: {
          cfCadCheckin: 'Weekly',
          cfCadGovernance: 'Quarterly',
          cfCadAnnual: 'Annually (February)',
          cfCadFull: 'Every 5 years',
          cfCadFiveYear: 'Year 5 then every 5 years',
        },
      }),
    );
    expect(rulesOfKind(out, 'governance')).toHaveLength(5);
  });
});

// ===========================================================================
// (b) adaptive management
// ===========================================================================

describe('(b) adaptive management', () => {
  const timingCases: Array<[string, number]> = [
    ['February -- after data year closes, before growing season', 2],
    ['January', 1],
    ['September -- after growing season', 9],
  ];
  it.each(timingCases)('review timing %s → anchorMonth %i', (timing, month) => {
    const out = generateCommunityWorkPlan(
      baseInput({ adaptiveReview: { timing } }),
    );
    const rule = ruleBySourceId(out, 'adaptive-review');
    expect(rule?.recurrence).toBe('annual');
    expect(rule?.anchorMonth).toBe(month);
    expect(rule?.sourceObjectiveId).toBe('ev-s7-adaptive-management');
  });

  it('facilitator carried verbatim to suggestedCarer', () => {
    const facilitator = 'SM -- consensus facilitation training';
    const out = generateCommunityWorkPlan(
      baseInput({ adaptiveReview: { timing: 'January', facilitator } }),
    );
    const rule = ruleBySourceId(out, 'adaptive-review');
    expect(rule?.suggestedCarer).toBe(facilitator);
  });

  it('adaptiveFiveYear presence → every-5-years five-year-review rule', () => {
    const out = generateCommunityWorkPlan(baseInput({ adaptiveFiveYear: true }));
    const rule = out.rules.find(
      (r) => r.sourceKind === 'adaptive' && r.sourceId === 'five-year-review',
    );
    expect(rule?.recurrence).toBe('every-5-years');
    expect(rule?.sourceObjectiveId).toBe('ev-s7-adaptive-management');
  });

  it('no adaptive input → no adaptive rules', () => {
    const out = generateCommunityWorkPlan(baseInput());
    expect(rulesOfKind(out, 'adaptive')).toEqual([]);
  });
});

// ===========================================================================
// fortnightly determinism
// ===========================================================================

describe('fortnightly determinism (even epoch-week Mondays)', () => {
  it('todayISO 2026-06-12, 90d horizon → exact even-week Mondays', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        todayISO: '2026-06-12',
        reviewCadence: { cfCadCheckin: 'Fortnightly' },
      }),
    );
    const dates = out.instances
      .filter((i) => i.ruleKey === 'cwp__governance__checkin')
      .map((i) => i.dueDate);
    // Mondays in [2026-06-12, 2026-09-10] whose epoch week is even.
    expect(dates).toEqual([
      '2026-06-22',
      '2026-07-06',
      '2026-07-20',
      '2026-08-03',
      '2026-08-17',
      '2026-08-31',
    ]);
  });

  it('a different todayISO yields its own deterministic even-week Mondays', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        todayISO: '2026-06-19',
        reviewCadence: { cfCadCheckin: 'Fortnightly' },
      }),
    );
    const dates = out.instances
      .filter((i) => i.ruleKey === 'cwp__governance__checkin')
      .map((i) => i.dueDate);
    // Horizon [2026-06-19, 2026-09-17] — same anchor calendar, one more occurrence.
    expect(dates).toEqual([
      '2026-06-22',
      '2026-07-06',
      '2026-07-20',
      '2026-08-03',
      '2026-08-17',
      '2026-08-31',
      '2026-09-14',
    ]);
  });
});

// ===========================================================================
// founding-anchored every-5-years
// ===========================================================================

describe('founding-anchored five-year review', () => {
  it('foundingYear chosen so an occurrence lands in horizon', () => {
    // foundingYear 2025 → mod 5 = 0 → years divisible by 5: 2030 is the next
    // Jan-1 ≡ 0 mod 5. Use a wide horizon spanning Jan 1 2030.
    const out = generateCommunityWorkPlan(
      baseInput({
        todayISO: '2029-12-01',
        horizonDays: 120,
        foundingYear: 2025,
        adaptiveFiveYear: true,
      }),
    );
    const dates = out.instances
      .filter((i) => i.ruleKey === 'cwp__adaptive__five-year-review')
      .map((i) => i.dueDate);
    expect(dates).toEqual(['2030-01-01']);
  });

  it('foundingYear off-cycle so no occurrence lands in a 90d horizon', () => {
    // foundingYear 2027 → mod 5 = 2 → Jan-1 of years ≡ 2 mod 5 (…2027, 2032…).
    // A mid-2026 90d horizon contains no such Jan 1 → zero instances, rule exists.
    const out = generateCommunityWorkPlan(
      baseInput({
        todayISO: '2026-06-12',
        foundingYear: 2027,
        adaptiveFiveYear: true,
      }),
    );
    const rule = out.rules.find(
      (r) => r.sourceKind === 'adaptive' && r.sourceId === 'five-year-review',
    );
    expect(rule).toBeDefined();
    const dates = out.instances.filter(
      (i) => i.ruleKey === 'cwp__adaptive__five-year-review',
    );
    expect(dates).toEqual([]);
  });

  it('foundingYear absent → years divisible by 5', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        todayISO: '2029-12-01',
        horizonDays: 120,
        adaptiveFiveYear: true,
      }),
    );
    const dates = out.instances
      .filter((i) => i.ruleKey === 'cwp__adaptive__five-year-review')
      .map((i) => i.dueDate);
    expect(dates).toEqual(['2030-01-01']);
  });
});

// ===========================================================================
// (c) protocols + covenants
// ===========================================================================

describe('(c) protocols', () => {
  it('capture supersedes protocol: governance cadence set → skip governance-decision-cadence protocol rule', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        reviewCadence: { cfCadGovernance: 'Quarterly' },
        protocols: [
          {
            id: 'eco-governance-decision-cadence',
            name: 'Governance decision cadence',
            response: 'Convene quarterly',
          },
        ],
      }),
    );
    const protocolRule = out.rules.find(
      (r) => r.sourceProtocolId === 'eco-governance-decision-cadence',
    );
    expect(protocolRule).toBeUndefined();
    // The governance-meeting capture rule IS present.
    expect(ruleBySourceId(out, 'governance-meeting')).toBeDefined();
  });

  it('governance cadence UNSET → governance protocol rule still generated', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        protocols: [
          {
            id: 'eco-governance-decision-cadence',
            name: 'Governance decision cadence',
            response: 'Convene quarterly',
          },
        ],
      }),
    );
    const protocolRule = out.rules.find(
      (r) => r.sourceProtocolId === 'eco-governance-decision-cadence',
    );
    expect(protocolRule?.recurrence).toBe('quarterly');
    expect(protocolRule?.kind).toBe('governance-meeting');
  });

  it('threshold / judgment protocols (not in catalogue) emit nothing', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        protocols: [
          { id: 'eco-shared-resource-load', name: 'Shared resource load' },
          { id: 'eco-member-capacity-balance', name: 'Member capacity balance' },
          { id: 'totally-unknown-protocol', name: 'Unknown' },
        ],
      }),
    );
    expect(rulesOfKind(out, 'protocol')).toEqual([]);
  });

  it('scopeNotes carried byte-verbatim through rule AND instance', () => {
    const scopeNotes =
      "Amanah: bayʿ mā laysa ʿindak — do not sell what you don't yet possess. Scholar-Council review required.";
    const out = generateCommunityWorkPlan(
      baseInput({
        protocols: [
          {
            id: 'eco-common-land-stewardship',
            name: 'Commons stewardship review',
            response: 'Walk the commons; assign diffuse care.',
            scopeNotes,
          },
        ],
      }),
    );
    const rule = out.rules.find(
      (r) => r.sourceProtocolId === 'eco-common-land-stewardship',
    );
    expect(rule?.scopeNotes).toBe(scopeNotes);
    const inst = out.instances.find((i) => i.ruleKey === rule?.key);
    expect(inst?.scopeNotes).toBe(scopeNotes);
  });
});

// ===========================================================================
// (d) membership + Amanah supersession
// ===========================================================================

describe('(d) membership', () => {
  it('one member-ratification rule per PENDING ratify member', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        ratifyCapturePresent: true,
        ratifyMembers: [
          { id: 'm1', name: 'Aisha', status: 'pending' },
          { id: 'm2', name: 'Bilal', status: 'confirmed' },
          { id: 'm3', name: 'Cara', status: 'pending' },
        ],
      }),
    );
    const rules = rulesOfKind(out, 'membership');
    expect(rules.map((r) => r.sourceId).sort()).toEqual(['m1', 'm3']);
    expect(rules.every((r) => r.kind === 'member-ratification')).toBe(true);
    expect(rules.every((r) => r.recurrence === 'once')).toBe(true);
  });

  it('invites generate nothing when ratify capture is present', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        ratifyCapturePresent: true,
        ratifyMembers: [],
        stewardInvites: [
          { id: 'i1', name: 'Dawud', email: 'dawud@x.org', role: 'team_member' },
        ],
      }),
    );
    expect(rulesOfKind(out, 'membership')).toEqual([]);
  });

  it('falls back to team_member invites with a real email when ratify absent', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        ratifyCapturePresent: false,
        stewardInvites: [
          { id: 'i1', name: 'Dawud', email: 'dawud@x.org', role: 'team_member' },
          { id: 'i2', name: 'Emine', email: '', role: 'team_member' }, // no email → skip
        ],
      }),
    );
    const rules = rulesOfKind(out, 'membership');
    expect(rules.map((r) => r.sourceId)).toEqual(['i1']);
  });

  it('contractor / landowner invites NEVER generate (Amanah)', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        ratifyCapturePresent: false,
        stewardInvites: [
          { id: 'c1', name: 'Contractor', email: 'c@x.org', role: 'contractor' },
          { id: 'l1', name: 'Landowner', email: 'l@x.org', role: 'landowner' },
        ],
      }),
    );
    expect(rulesOfKind(out, 'membership')).toEqual([]);
  });

  it('synthesized membership due date is today+14 and not hashed', () => {
    const a = generateCommunityWorkPlan(
      baseInput({
        todayISO: '2026-06-12',
        ratifyCapturePresent: true,
        ratifyMembers: [{ id: 'm1', name: 'Aisha', status: 'pending' }],
      }),
    );
    const inst = a.instances.find((i) => i.ruleKey === 'cwp__membership__m1');
    expect(inst?.dueDate).toBe('2026-06-26');
    expect(inst?.key).toBe('cwp__membership__m1__once');
  });
});

// ===========================================================================
// (e) legal
// ===========================================================================

describe('(e) legal', () => {
  it('incomplete advice gates → one aggregate legal-review rule listing them', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        legalAdviceGates: {
          allGateIds: ['gc1', 'gc2', 'gc3'],
          clearedGateIds: ['gc1'],
          labels: { gc2: 'Waqf dissolution clauses', gc3: 'Ground lease template' },
        },
      }),
    );
    const rules = rulesOfKind(out, 'legal').filter(
      (r) => r.sourceId === 'advice-gates',
    );
    expect(rules).toHaveLength(1);
    expect(rules[0]?.detail).toContain('Waqf dissolution clauses');
    expect(rules[0]?.detail).toContain('Ground lease template');
    expect(rules[0]?.detail).not.toContain('gc1');
  });

  it('all gates cleared → no advice-gate rule', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        legalAdviceGates: {
          allGateIds: ['gc1', 'gc2'],
          clearedGateIds: ['gc1', 'gc2'],
        },
      }),
    );
    expect(rulesOfKind(out, 'legal')).toEqual([]);
  });

  it('clearing one gate changes the hash (the SET is hashed) but the key is stable', () => {
    const before = generateCommunityWorkPlan(
      baseInput({
        legalAdviceGates: { allGateIds: ['gc1', 'gc2'], clearedGateIds: [] },
      }),
    );
    const after = generateCommunityWorkPlan(
      baseInput({
        legalAdviceGates: { allGateIds: ['gc1', 'gc2'], clearedGateIds: ['gc1'] },
      }),
    );
    const rb = before.rules.find((r) => r.sourceId === 'advice-gates');
    const ra = after.rules.find((r) => r.sourceId === 'advice-gates');
    expect(ra?.key).toBe(rb?.key);
    expect(ra?.inputsHash).not.toBe(rb?.inputsHash);
  });

  it('exit-succession toggles only generate when the field is present', () => {
    const absent = generateCommunityWorkPlan(baseInput());
    expect(
      rulesOfKind(absent, 'legal').filter(
        (r) => r.sourceId === 'exit-succession-toggles',
      ),
    ).toEqual([]);

    const present = generateCommunityWorkPlan(
      baseInput({
        exitSuccessionToggles: {
          toggles: [
            { key: 'exitEnforceable', label: 'Exit enforceable', state: 'on' },
            { key: 'resaleEmbedded', label: 'Resale embedded', state: 'off' },
          ],
        },
      }),
    );
    const rule = present.rules.find(
      (r) => r.sourceId === 'exit-succession-toggles',
    );
    expect(rule).toBeDefined();
    expect(rule?.detail).toContain('Resale embedded');
    expect(rule?.detail).not.toContain('Exit enforceable');
  });

  it('exit-succession all-on toggles → no rule', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        exitSuccessionToggles: {
          toggles: [
            { key: 'exitEnforceable', label: 'Exit enforceable', state: 'on' },
          ],
        },
      }),
    );
    expect(rulesOfKind(out, 'legal')).toEqual([]);
  });
});

// ===========================================================================
// (f) settlement
// ===========================================================================

describe('(f) settlement', () => {
  it('one rule per dated incomplete phase; explicitDueDate is HASHED', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        todayISO: '2026-06-12',
        settlementPhases: [
          { id: 'p1', label: 'Break ground', dateISO: '2026-07-01' },
          { id: 'p2', label: 'No date', complete: false }, // undated → skip
          { id: 'p3', label: 'Done', dateISO: '2026-07-15', complete: true }, // complete → skip
        ],
      }),
    );
    const rules = rulesOfKind(out, 'settlement');
    expect(rules.map((r) => r.sourceId)).toEqual(['p1']);
    expect(rules[0]?.explicitDueDate).toBe('2026-07-01');
  });

  it('changing the explicit date changes the hash and the instance dueDate; key stays stable', () => {
    const a = generateCommunityWorkPlan(
      baseInput({
        settlementPhases: [{ id: 'p1', label: 'Break ground', dateISO: '2026-07-01' }],
      }),
    );
    const b = generateCommunityWorkPlan(
      baseInput({
        settlementPhases: [{ id: 'p1', label: 'Break ground', dateISO: '2026-07-08' }],
      }),
    );
    const ra = ruleBySourceId(a, 'p1');
    const rb = ruleBySourceId(b, 'p1');
    expect(ra?.key).toBe(rb?.key);
    expect(ra?.inputsHash).not.toBe(rb?.inputsHash);
    const ia = a.instances.find((i) => i.ruleKey === ra?.key);
    const ib = b.instances.find((i) => i.ruleKey === rb?.key);
    expect(ia?.key).toBe('cwp__settlement__p1__once');
    expect(ib?.key).toBe('cwp__settlement__p1__once');
    expect(ia?.dueDate).toBe('2026-07-01');
    expect(ib?.dueDate).toBe('2026-07-08');
  });

  it('dated one-off OUTSIDE the horizon emits no instance (rule still exists)', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        todayISO: '2026-06-12',
        settlementPhases: [
          { id: 'far', label: 'Far future', dateISO: '2027-01-01' },
        ],
      }),
    );
    expect(ruleBySourceId(out, 'far')).toBeDefined();
    expect(out.instances.filter((i) => i.ruleKey === 'cwp__settlement__far')).toEqual([]);
  });
});

// ===========================================================================
// (g) onboarding
// ===========================================================================

describe('(g) onboarding', () => {
  it('one rule per (pending member × step), title "${step} — ${member}"', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        ratifyCapturePresent: true,
        ratifyMembers: [
          { id: 'm1', name: 'Aisha', status: 'pending' },
          { id: 'm2', name: 'Bilal', status: 'pending' },
        ],
        onboardingSteps: [
          { id: 's1', stage: 'orientation', name: 'Orientation' },
          { id: 's2', stage: 'agreement', name: 'Sign agreement' },
        ],
      }),
    );
    const rules = rulesOfKind(out, 'onboarding');
    expect(rules).toHaveLength(4);
    const titles = rules.map((r) => r.title).sort();
    expect(titles).toEqual([
      'Orientation — Aisha',
      'Orientation — Bilal',
      'Sign agreement — Aisha',
      'Sign agreement — Bilal',
    ]);
    // key discriminated by member id + step id
    expect(rules.some((r) => r.key === 'cwp__onboarding__m1__s1')).toBe(true);
  });

  it('caps at the first 12 steps per member', () => {
    const steps = Array.from({ length: 20 }, (_, i) => ({
      id: `s${i}`,
      stage: 'integration',
      name: `Step ${i}`,
    }));
    const out = generateCommunityWorkPlan(
      baseInput({
        ratifyCapturePresent: true,
        ratifyMembers: [{ id: 'm1', name: 'Aisha', status: 'pending' }],
        onboardingSteps: steps,
      }),
    );
    expect(rulesOfKind(out, 'onboarding')).toHaveLength(12);
  });

  it('pending set for onboarding = same as (d) resolves to (team_member invites when ratify absent)', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        ratifyCapturePresent: false,
        stewardInvites: [
          { id: 'i1', name: 'Dawud', email: 'd@x.org', role: 'team_member' },
          { id: 'c1', name: 'Contractor', email: 'c@x.org', role: 'contractor' },
        ],
        onboardingSteps: [{ id: 's1', stage: 'orientation', name: 'Orientation' }],
      }),
    );
    const rules = rulesOfKind(out, 'onboarding');
    expect(rules.map((r) => r.sourceId)).toEqual(['i1']); // contractor excluded
  });
});

// ===========================================================================
// One-off key stability across regenerations
// ===========================================================================

describe('one-off key stability across regenerations', () => {
  it('synthesized one-off keys + hashes are identical across two different todayISO; explicit-date hash changes only on date change', () => {
    const mk = (todayISO: string) =>
      generateCommunityWorkPlan(
        baseInput({
          todayISO,
          ratifyCapturePresent: true,
          ratifyMembers: [{ id: 'm1', name: 'Aisha', status: 'pending' }],
          settlementPhases: [
            { id: 'p1', label: 'Break ground', dateISO: '2026-07-01' },
          ],
        }),
      );
    const day1 = mk('2026-06-12');
    const day2 = mk('2026-06-13');

    // Synthesized membership one-off: key + hash stable across regen days.
    const m1 = day1.rules.find((r) => r.sourceId === 'm1');
    const m2 = day2.rules.find((r) => r.sourceId === 'm1');
    expect(m1?.key).toBe(m2?.key);
    expect(m1?.inputsHash).toBe(m2?.inputsHash);
    const mi1 = day1.instances.find((i) => i.ruleKey === m1?.key);
    const mi2 = day2.instances.find((i) => i.ruleKey === m2?.key);
    expect(mi1?.key).toBe(mi2?.key); // both `__once`

    // Explicit-date settlement one-off: hash identical across regen days
    // (date did not change).
    const p1 = day1.rules.find((r) => r.sourceId === 'p1');
    const p2 = day2.rules.find((r) => r.sourceId === 'p1');
    expect(p1?.inputsHash).toBe(p2?.inputsHash);

    // ... but changing the explicit date changes the hash.
    const moved = generateCommunityWorkPlan(
      baseInput({
        todayISO: '2026-06-12',
        ratifyCapturePresent: true,
        ratifyMembers: [{ id: 'm1', name: 'Aisha', status: 'pending' }],
        settlementPhases: [
          { id: 'p1', label: 'Break ground', dateISO: '2026-07-09' },
        ],
      }),
    );
    const p3 = moved.rules.find((r) => r.sourceId === 'p1');
    expect(p3?.inputsHash).not.toBe(p1?.inputsHash);
  });
});

// ===========================================================================
// Purity
// ===========================================================================

describe('purity', () => {
  it('same input object yields deep-equal results twice', () => {
    const input = baseInput({
      reviewCadence: {
        cfCadCheckin: 'Fortnightly',
        cfCadGovernance: 'Quarterly',
        cfCadAnnual: 'Annually (February)',
      },
      adaptiveReview: { timing: 'January', facilitator: 'Rotating founding member' },
      adaptiveFiveYear: true,
      foundingYear: 2025,
      protocols: [
        {
          id: 'eco-common-land-stewardship',
          name: 'Commons review',
          response: 'Walk the commons',
          scopeNotes: 'Amanah caution',
        },
      ],
      ratifyCapturePresent: true,
      ratifyMembers: [{ id: 'm1', name: 'Aisha', status: 'pending' }],
      settlementPhases: [{ id: 'p1', label: 'Break ground', dateISO: '2026-07-01' }],
      onboardingSteps: [{ id: 's1', stage: 'orientation', name: 'Orientation' }],
      legalAdviceGates: { allGateIds: ['gc1'], clearedGateIds: [] },
      exitSuccessionToggles: {
        toggles: [{ key: 't1', label: 'Item', state: 'off' }],
      },
    });
    const a = generateCommunityWorkPlan(input);
    const b = generateCommunityWorkPlan(input);
    expect(a).toEqual(b);
  });
});

// ===========================================================================
// Schema conformance
// ===========================================================================

describe('schema conformance', () => {
  it('every rule parses CommunityWorkRuleSchema and every instance parses CommunityWorkInstanceSchema', () => {
    const out = generateCommunityWorkPlan(
      baseInput({
        todayISO: '2026-06-12',
        reviewCadence: {
          cfCadCheckin: 'Weekly',
          cfCadGovernance: 'Biannual',
          cfCadAnnual: 'Annually (September)',
          cfCadFull: 'Every 5 years',
          cfCadFiveYear: 'Year 5 then every 5 years',
        },
        adaptiveReview: {
          timing: 'February -- after data year closes, before growing season',
          facilitator: 'SM -- consensus facilitation training',
        },
        adaptiveFiveYear: true,
        foundingYear: 2025,
        protocols: [
          {
            id: 'eco-common-land-stewardship',
            name: 'Commons review',
            response: 'Walk the commons',
            scopeNotes: 'Amanah caution carried verbatim',
            objectiveId: 'ev-s1-commons',
          },
        ],
        ratifyCapturePresent: true,
        ratifyMembers: [{ id: 'm1', name: 'Aisha', status: 'pending' }],
        settlementPhases: [{ id: 'p1', label: 'Break ground', dateISO: '2026-07-01' }],
        onboardingSteps: [{ id: 's1', stage: 'orientation', name: 'Orientation' }],
        legalAdviceGates: { allGateIds: ['gc1', 'gc2'], clearedGateIds: ['gc1'] },
        exitSuccessionToggles: {
          toggles: [{ key: 't1', label: 'Resale embedded', state: 'off' }],
        },
      }),
    );
    expect(out.rules.length).toBeGreaterThan(0);
    expect(out.instances.length).toBeGreaterThan(0);
    for (const rule of out.rules) {
      expect(() => CommunityWorkRuleSchema.parse(rule)).not.toThrow();
    }
    for (const inst of out.instances) {
      expect(() => CommunityWorkInstanceSchema.parse(inst)).not.toThrow();
    }
  });
});
