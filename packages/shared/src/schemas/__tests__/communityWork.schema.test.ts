import { describe, it, expect } from 'vitest';
import {
  CommunityWorkKindSchema,
  CommunityWorkSourceKindSchema,
  CommunityWorkRecurrenceSchema,
  CommunityWorkRuleSchema,
  CommunityWorkInstanceSchema,
} from '../communityWork/communityWork.schema.js';

const baseRule = {
  key: 'cwp__protocol__eco-governance-decision-cadence',
  kind: 'governance-meeting' as const,
  title: 'Quarterly Governance Meeting',
  sourceKind: 'protocol' as const,
  sourceId: 'eco-governance-decision-cadence',
  recurrence: 'quarterly' as const,
  inputsHash: 'abc12345',
};

const baseInstance = {
  key: 'cwp__protocol__eco-governance-decision-cadence__2026-07-01',
  ruleKey: 'cwp__protocol__eco-governance-decision-cadence',
  kind: 'governance-meeting' as const,
  dueDate: '2026-07-01',
  title: 'Quarterly Governance Meeting',
  inputsHash: 'abc12345',
};

describe('CommunityWorkKindSchema', () => {
  it('accepts all valid kinds', () => {
    const kinds = [
      'governance-meeting',
      'commons-review',
      'adaptive-review',
      'five-year-review',
      'member-ratification',
      'onboarding-step',
      'legal-review',
      'settlement-milestone',
      'custom',
    ];
    for (const kind of kinds) {
      expect(() => CommunityWorkKindSchema.parse(kind)).not.toThrow();
    }
  });

  it('rejects an unknown kind', () => {
    expect(() => CommunityWorkKindSchema.parse('welfare-check')).toThrow();
  });
});

describe('CommunityWorkSourceKindSchema', () => {
  it('accepts all valid source kinds', () => {
    const kinds = [
      'protocol',
      'governance',
      'adaptive',
      'membership',
      'legal',
      'settlement',
      'onboarding',
    ];
    for (const kind of kinds) {
      expect(() => CommunityWorkSourceKindSchema.parse(kind)).not.toThrow();
    }
  });

  it('rejects a livestock-only source kind', () => {
    expect(() => CommunityWorkSourceKindSchema.parse('husbandry')).toThrow();
    expect(() => CommunityWorkSourceKindSchema.parse('grazing')).toThrow();
  });
});

describe('CommunityWorkRecurrenceSchema', () => {
  it('accepts all standard WorkItemRecurrence values', () => {
    const standard = [
      'daily',
      'weekly',
      'monthly',
      'quarterly',
      'annual',
      'biennial',
      'every-3-years',
    ];
    for (const r of standard) {
      expect(() => CommunityWorkRecurrenceSchema.parse(r)).not.toThrow();
    }
  });

  it('accepts community-layer extension recurrences', () => {
    const extras = ['once', 'fortnightly', 'biannual', 'every-5-years'];
    for (const r of extras) {
      expect(() => CommunityWorkRecurrenceSchema.parse(r)).not.toThrow();
    }
  });

  it('rejects an unknown recurrence', () => {
    expect(() => CommunityWorkRecurrenceSchema.parse('hourly')).toThrow();
  });
});

describe('CommunityWorkRuleSchema', () => {
  it('parses a minimal valid rule', () => {
    const parsed = CommunityWorkRuleSchema.parse(baseRule);
    expect(parsed.key).toBe('cwp__protocol__eco-governance-decision-cadence');
    expect(parsed.kind).toBe('governance-meeting');
    expect(parsed.recurrence).toBe('quarterly');
  });

  it('accepts optional fields', () => {
    const parsed = CommunityWorkRuleSchema.parse({
      ...baseRule,
      detail: 'Convene the agreed decision process.',
      scopeNotes: 'VERBATIM Amanah caution.',
      sourceProtocolId: 'eco-governance-decision-cadence',
      sourceObjectiveId: 'ev-s1-conflict-framework',
      suggestedCarer: 'Yousef',
      anchorMonth: 1,
    });
    expect(parsed.scopeNotes).toBe('VERBATIM Amanah caution.');
    expect(parsed.anchorMonth).toBe(1);
  });

  it('accepts community-layer recurrences (once, every-5-years)', () => {
    expect(() =>
      CommunityWorkRuleSchema.parse({ ...baseRule, recurrence: 'once', explicitDueDate: '2026-09-01' }),
    ).not.toThrow();
    expect(() =>
      CommunityWorkRuleSchema.parse({ ...baseRule, recurrence: 'every-5-years' }),
    ).not.toThrow();
  });

  it('rejects a missing key', () => {
    const { key: _k, ...noKey } = baseRule;
    expect(() => CommunityWorkRuleSchema.parse(noKey)).toThrow();
  });

  it('rejects anchorMonth out of range', () => {
    expect(() =>
      CommunityWorkRuleSchema.parse({ ...baseRule, anchorMonth: 0 }),
    ).toThrow();
    expect(() =>
      CommunityWorkRuleSchema.parse({ ...baseRule, anchorMonth: 13 }),
    ).toThrow();
  });

  it('does NOT contain livestock-only fields (species, paddockId, seasonalWindow)', () => {
    const parsed = CommunityWorkRuleSchema.parse(baseRule);
    expect(parsed).not.toHaveProperty('species');
    expect(parsed).not.toHaveProperty('paddockId');
    expect(parsed).not.toHaveProperty('seasonalWindow');
  });
});

describe('CommunityWorkInstanceSchema', () => {
  it('parses a minimal valid instance', () => {
    const parsed = CommunityWorkInstanceSchema.parse(baseInstance);
    expect(parsed.key).toBe(
      'cwp__protocol__eco-governance-decision-cadence__2026-07-01',
    );
    expect(parsed.dueDate).toBe('2026-07-01');
    expect(parsed.inputsHash).toBe('abc12345');
  });

  it('accepts an optional windowEnd', () => {
    const parsed = CommunityWorkInstanceSchema.parse({
      ...baseInstance,
      windowEnd: '2026-09-30',
    });
    expect(parsed.windowEnd).toBe('2026-09-30');
  });

  it('accepts all optional provenance fields', () => {
    const parsed = CommunityWorkInstanceSchema.parse({
      ...baseInstance,
      detail: 'Convene.',
      scopeNotes: 'VERBATIM caution.',
      sourceProtocolId: 'eco-governance-decision-cadence',
      sourceObjectiveId: 'ev-s1-conflict-framework',
      suggestedCarer: 'Yousef',
    });
    expect(parsed.sourceObjectiveId).toBe('ev-s1-conflict-framework');
  });

  it('is structurally compatible with WorkPlanInstanceBase (key, ruleKey, dueDate, title, inputsHash required)', () => {
    // Structural check: all WorkPlanInstanceBase required fields present
    const parsed = CommunityWorkInstanceSchema.parse(baseInstance);
    expect(typeof parsed.key).toBe('string');
    expect(typeof parsed.ruleKey).toBe('string');
    expect(typeof parsed.dueDate).toBe('string');
    expect(typeof parsed.title).toBe('string');
    expect(typeof parsed.inputsHash).toBe('string');
  });

  it('does NOT contain livestock-only fields (species, paddockId)', () => {
    const parsed = CommunityWorkInstanceSchema.parse(baseInstance);
    expect(parsed).not.toHaveProperty('species');
    expect(parsed).not.toHaveProperty('paddockId');
  });
});
