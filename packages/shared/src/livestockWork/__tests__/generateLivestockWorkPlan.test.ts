import { describe, expect, it } from 'vitest';
import {
  LivestockWorkInstanceSchema,
  LivestockWorkRuleSchema,
} from '../../schemas/livestockWork/livestockWork.schema.js';
import {
  generateLivestockWorkPlan,
  type LivestockWorkGenerationInput,
} from '../generateLivestockWorkPlan.js';

function baseInput(
  overrides: Partial<LivestockWorkGenerationInput> = {},
): LivestockWorkGenerationInput {
  return {
    todayISO: '2026-06-11',
    isSouthernHemisphere: true,
    speciesPresent: ['sheep'],
    protocols: [],
    husbandry: {
      health: null,
      breeding: null,
      welfare: null,
      halal: null,
      records: null,
    },
    grazing: { grazeRest: null, treeProtection: null, contingency: null },
    carers: { primaryCarer: '', reliefCarers: [] },
    ...overrides,
  };
}

const FULL_HUSBANDRY = {
  health: { vetNotes: 'District vet — annual program' },
  breeding: { strategy: 'autumn', notes: 'Rams in over April' },
  welfare: { notes: 'Daily walk-through' },
  halal: { pathwayAcknowledged: true, notes: '' },
  records: { notes: 'Paper register' },
};

describe('generateLivestockWorkPlan — composition', () => {
  it('returns empty output when no species are present, regardless of other inputs', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        speciesPresent: [],
        husbandry: FULL_HUSBANDRY,
        protocols: [
          {
            id: 'lvo-water-access',
            name: 'Water access',
            type: 'threshold',
            response: 'Restore access same day',
          },
        ],
      }),
    );
    expect(out.rules).toEqual([]);
    expect(out.instances).toEqual([]);
  });

  it('is pure: identical inputs yield identical outputs (no Date.now())', () => {
    const input = baseInput({ husbandry: FULL_HUSBANDRY });
    expect(generateLivestockWorkPlan(input)).toEqual(
      generateLivestockWorkPlan(input),
    );
  });

  it('every emitted rule and instance conforms to the schemas', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        husbandry: FULL_HUSBANDRY,
        grazing: {
          grazeRest: {
            seasons: [
              { grazePeriod: '3d', restPeriod: '45d', indicator: 'leaf stage 3' },
              { grazePeriod: '', restPeriod: '', indicator: '' },
              { grazePeriod: '2d', restPeriod: '30d', indicator: '' },
              { grazePeriod: '', restPeriod: '', indicator: '' },
            ],
          },
          treeProtection: { stageNotes: ['guards on', '', ''] },
          contingency: { tiers: [{ trigger: 'FOO < 1200kg DM/ha', action: 'open reserve' }] },
        },
        protocols: [
          {
            id: 'lvo-herd-health-surveillance',
            name: 'Herd health surveillance',
            type: 'cyclical',
            response: 'Inspect the mob',
            scopeNotes: 'Amanah: welfare before yield.',
            objectiveId: 'lvo-sec-s4-husbandry',
          },
        ],
        carers: { primaryCarer: 'Yousef', reliefCarers: ['Amina'] },
      }),
    );
    for (const r of out.rules) expect(() => LivestockWorkRuleSchema.parse(r)).not.toThrow();
    for (const i of out.instances) expect(() => LivestockWorkInstanceSchema.parse(i)).not.toThrow();
    expect(out.rules.length).toBeGreaterThan(0);
    expect(out.instances.length).toBeGreaterThan(0);
  });
});

describe('generateLivestockWorkPlan — protocol source', () => {
  it('cadences mapped protocols and carries scopeNotes VERBATIM', () => {
    const scopeNotes =
      'Sale of standing stock not yet possessed is excluded (bayʿ mā laysa ʿindak).';
    const out = generateLivestockWorkPlan(
      baseInput({
        protocols: [
          {
            id: 'lvo-water-access',
            name: 'Stock water access',
            type: 'threshold',
            response: 'Restore water access the same day.',
            scopeNotes,
            objectiveId: 'lvo-sec-s2-water',
          },
        ],
      }),
    );
    const rule = out.rules.find((r) => r.sourceProtocolId === 'lvo-water-access');
    expect(rule).toBeDefined();
    expect(rule!.key).toBe('lvp__protocol__lvo-water-access');
    expect(rule!.kind).toBe('feed-water-check');
    expect(rule!.recurrence).toBe('weekly');
    expect(rule!.scopeNotes).toBe(scopeNotes); // verbatim — never reworded
    expect(rule!.sourceObjectiveId).toBe('lvo-sec-s2-water');
    const inst = out.instances.find((i) => i.ruleKey === rule!.key);
    expect(inst?.scopeNotes).toBe(scopeNotes); // verbatim through to instances
  });

  it('falls back to quarterly custom for unmapped cyclical protocols', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        protocols: [
          {
            id: 'u-s7-phase-gate-review',
            name: 'Phase gate review',
            type: 'cyclical',
            response: 'Review the phase gate.',
          },
        ],
      }),
    );
    const rule = out.rules.find((r) => r.sourceProtocolId === 'u-s7-phase-gate-review');
    expect(rule?.recurrence).toBe('quarterly');
    expect(rule?.kind).toBe('custom');
  });

  it('skips unmapped threshold/judgment protocols (event-driven, no standing work)', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        protocols: [
          {
            id: 'made-up-threshold',
            name: 'Some threshold',
            type: 'threshold',
            response: 'Act when triggered.',
          },
        ],
      }),
    );
    expect(out.rules).toEqual([]);
  });
});

describe('generateLivestockWorkPlan — husbandry source', () => {
  it('welfare yields daily feed-water + weekly welfare rules with the suggested carer', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        husbandry: { ...FULL_HUSBANDRY, health: null, breeding: null, halal: null, records: null },
        carers: { primaryCarer: 'Yousef', reliefCarers: [] },
      }),
    );
    const daily = out.rules.find((r) => r.key === 'lvp__husbandry__welfare-daily');
    const weekly = out.rules.find((r) => r.key === 'lvp__husbandry__welfare-weekly');
    expect(daily?.recurrence).toBe('daily');
    expect(daily?.kind).toBe('feed-water-check');
    expect(daily?.suggestedCarer).toBe('Yousef');
    expect(weekly?.recurrence).toBe('weekly');
    expect(weekly?.kind).toBe('welfare-check');
  });

  it('health yields annual vaccination (window from breeding strategy) + quarterly parasite monitoring', () => {
    const out = generateLivestockWorkPlan(baseInput({ husbandry: FULL_HUSBANDRY }));
    const vax = out.rules.find((r) => r.key === 'lvp__husbandry__health-vaccination');
    const parasite = out.rules.find((r) => r.key === 'lvp__husbandry__health-parasite');
    expect(vax?.recurrence).toBe('annual');
    // autumn joining → winter-quarter pre-lambing booster
    expect(vax?.seasonalWindow).toEqual({ season: 'winter' });
    expect(vax?.detail).toContain('District vet — annual program');
    expect(parasite?.recurrence).toBe('quarterly');
    expect(parasite?.kind).toBe('parasite-monitoring');
  });

  it('breeding strategy autumn/spring yields a windowed joining event; aiet yields none', () => {
    const autumn = generateLivestockWorkPlan(baseInput({ husbandry: FULL_HUSBANDRY }));
    const joining = autumn.rules.find((r) => r.key === 'lvp__husbandry__breeding');
    expect(joining?.title).toBe('Autumn joining — rams in');
    expect(joining?.seasonalWindow).toEqual({ season: 'autumn' });
    expect(joining?.detail).toBe('Rams in over April');

    const aiet = generateLivestockWorkPlan(
      baseInput({
        husbandry: { ...FULL_HUSBANDRY, breeding: { strategy: 'aiet', notes: '' } },
      }),
    );
    const aietRule = aiet.rules.find((r) => r.key === 'lvp__husbandry__breeding');
    expect(aietRule?.title).toBe('AI / ET program planning');
    expect(aietRule?.seasonalWindow).toBeUndefined();
  });

  it('records yields quarterly reconciliation', () => {
    const out = generateLivestockWorkPlan(baseInput({ husbandry: FULL_HUSBANDRY }));
    const rec = out.rules.find((r) => r.key === 'lvp__husbandry__records');
    expect(rec?.recurrence).toBe('quarterly');
    expect(rec?.kind).toBe('records-reconciliation');
  });
});

describe('generateLivestockWorkPlan — covenant gates', () => {
  it('emits NO slaughter-prep when the halal pathway is not acknowledged', () => {
    for (const halal of [null, { pathwayAcknowledged: false, notes: 'considering' }]) {
      const out = generateLivestockWorkPlan(
        baseInput({ husbandry: { ...FULL_HUSBANDRY, halal } }),
      );
      expect(out.rules.filter((r) => r.kind === 'slaughter-prep')).toEqual([]);
    }
  });

  it('emits per-species slaughter-prep only when pathwayAcknowledged === true', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        speciesPresent: ['sheep', 'goats'],
        husbandry: FULL_HUSBANDRY,
      }),
    );
    const prep = out.rules.filter((r) => r.kind === 'slaughter-prep');
    expect(prep.map((r) => r.species).sort()).toEqual(['goats', 'sheep']);
    expect(prep.map((r) => r.key).sort()).toEqual([
      'lvp__husbandry__halal__goats',
      'lvp__husbandry__halal__sheep',
    ]);
  });

  it('NEVER emits slaughter/consumption work for pigs under any input (working-role only)', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        speciesPresent: ['pigs', 'pig', 'sheep'],
        husbandry: FULL_HUSBANDRY,
      }),
    );
    const prep = out.rules.filter((r) => r.kind === 'slaughter-prep');
    expect(prep.map((r) => r.species)).toEqual(['sheep']);
    // pigs still receive care work — only the consumption pathway is excluded
    expect(out.rules.some((r) => r.key === 'lvp__husbandry__welfare-daily')).toBe(true);
  });

  it('generates NO move work — rotation moves stay owned by rotationSequenceSpineSync', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        husbandry: FULL_HUSBANDRY,
        grazing: {
          grazeRest: {
            seasons: [
              { grazePeriod: '3d', restPeriod: '45d', indicator: '' },
              { grazePeriod: '3d', restPeriod: '45d', indicator: '' },
              { grazePeriod: '3d', restPeriod: '45d', indicator: '' },
              { grazePeriod: '3d', restPeriod: '45d', indicator: '' },
            ],
          },
          treeProtection: { stageNotes: [] },
          contingency: { tiers: [] },
        },
        protocols: [
          {
            id: 'lvo-herd-health-surveillance',
            name: 'Herd health',
            type: 'cyclical',
            response: 'Inspect',
          },
        ],
      }),
    );
    for (const r of out.rules) {
      expect(r.kind).not.toMatch(/move/i);
      expect(r).not.toHaveProperty('direction');
      expect(r.title).not.toMatch(/move (in|out|to)/i);
    }
  });
});

describe('generateLivestockWorkPlan — grazing source', () => {
  it('grazeRest yields four seasonal annual reviews with target details', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        grazing: {
          grazeRest: {
            seasons: [
              { grazePeriod: '3 days', restPeriod: '45 days', indicator: 'leaf stage 3' },
              { grazePeriod: '', restPeriod: '', indicator: '' },
              { grazePeriod: '', restPeriod: '', indicator: '' },
              { grazePeriod: '', restPeriod: '', indicator: '' },
            ],
          },
          treeProtection: null,
          contingency: null,
        },
        grazingObjectiveId: 'silv-sec-s4-grazing-design',
      }),
    );
    const reviews = out.rules.filter((r) => r.kind === 'graze-rest-review');
    expect(reviews.map((r) => r.sourceId).sort()).toEqual([
      'grazeRest-autumn',
      'grazeRest-spring',
      'grazeRest-summer',
      'grazeRest-winter',
    ]);
    const autumn = reviews.find((r) => r.sourceId === 'grazeRest-autumn');
    expect(autumn?.seasonalWindow).toEqual({ season: 'autumn' });
    expect(autumn?.detail).toContain('graze 3 days');
    expect(autumn?.detail).toContain('rest 45 days');
    expect(autumn?.detail).toContain('move on: leaf stage 3');
    expect(autumn?.sourceObjectiveId).toBe('silv-sec-s4-grazing-design');
  });

  it('treeProtection yields a monthly check and contingency a quarterly review', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        grazing: {
          grazeRest: null,
          treeProtection: { stageNotes: ['guards', '', ''] },
          contingency: { tiers: [{ trigger: 'dry spell', action: 'open reserve' }] },
        },
      }),
    );
    const tree = out.rules.find((r) => r.sourceId === 'treeProtection');
    const cont = out.rules.find((r) => r.sourceId === 'contingency');
    expect(tree?.kind).toBe('tree-protection-check');
    expect(tree?.recurrence).toBe('monthly');
    expect(cont?.kind).toBe('contingency-review');
    expect(cont?.recurrence).toBe('quarterly');
  });
});

describe('generateLivestockWorkPlan — instances and hashing', () => {
  it('expands rules over the default 90-day horizon', () => {
    const out = generateLivestockWorkPlan(
      baseInput({
        husbandry: { ...FULL_HUSBANDRY, health: null, breeding: null, halal: null, records: null },
      }),
    );
    const dailies = out.instances.filter((i) => i.ruleKey === 'lvp__husbandry__welfare-daily');
    expect(dailies).toHaveLength(91); // inclusive 90-day horizon
    expect(dailies[0]!.dueDate).toBe('2026-06-11');
    expect(dailies[dailies.length - 1]!.dueDate).toBe('2026-09-09');
  });

  it('inputsHash is stable for identical content and changes when content changes', () => {
    const a = generateLivestockWorkPlan(baseInput({ husbandry: FULL_HUSBANDRY }));
    const b = generateLivestockWorkPlan(baseInput({ husbandry: FULL_HUSBANDRY }));
    const c = generateLivestockWorkPlan(
      baseInput({
        husbandry: {
          ...FULL_HUSBANDRY,
          health: { vetNotes: 'Different vet program entirely' },
        },
      }),
    );
    const key = 'lvp__husbandry__health-vaccination';
    const hashOf = (plan: typeof a) => plan.rules.find((r) => r.key === key)?.inputsHash;
    expect(hashOf(a)).toBe(hashOf(b));
    expect(hashOf(c)).not.toBe(hashOf(a));
  });
});
