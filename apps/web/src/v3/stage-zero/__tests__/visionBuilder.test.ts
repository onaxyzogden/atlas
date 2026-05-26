import { describe, expect, it } from 'vitest';
import { VisionProfile } from '@ogden/shared';
import {
  VISION_QUESTIONS,
  deriveDeferredTopics,
  hasLivestockInScope,
  toProjectType,
} from '../data/visionBuilderQuestions.js';
import {
  deriveActivatedModules,
  BASELINE_MODULES,
} from '../lib/deriveActivatedModules.js';

describe('VisionProfile schema round-trip', () => {
  it('accepts an empty profile (mid-flow state)', () => {
    const parsed = VisionProfile.parse({});
    expect(parsed).toEqual({});
  });

  it('round-trips a fully-populated profile', () => {
    const profile = {
      primaryType: 'regenerative_farm',
      secondaryTypes: ['agroforestry'],
      primaryOutcomes: ['soil_regeneration', 'food_for_sale'],
      systemsInScope: {
        food: ['market_garden'],
        animals: ['chickens_eggs'],
        water: ['rainwater'],
        built: ['barn'],
      },
      values: ['soil_first'],
      livestock: { roles: ['eggs'], intensity: 'daily_core' },
      budgetRange: '50k_150k',
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    const parsed = VisionProfile.parse(profile);
    expect(parsed).toEqual(profile);
  });

  it('rejects an over-long option id', () => {
    expect(() =>
      VisionProfile.parse({ primaryType: 'x'.repeat(121) }),
    ).toThrow();
  });
});

describe('conditional visibility (hasLivestockInScope)', () => {
  it('is false when no animals are in scope', () => {
    expect(hasLivestockInScope({})).toBe(false);
    expect(
      hasLivestockInScope({ systemsInScope: { animals: ['no_livestock'] } }),
    ).toBe(false);
    expect(
      hasLivestockInScope({ systemsInScope: { animals: ['wildlife_only'] } }),
    ).toBe(false);
  });

  it('is true once a real animal system is selected', () => {
    expect(
      hasLivestockInScope({ systemsInScope: { animals: ['goats'] } }),
    ).toBe(true);
    // Mixed: a real animal alongside the wildlife-only sentinel still counts.
    expect(
      hasLivestockInScope({
        systemsInScope: { animals: ['wildlife_only', 'cattle'] },
      }),
    ).toBe(true);
  });

  it('gates every livestock-* question behind animals in scope', () => {
    const livestockQs = VISION_QUESTIONS.filter((q) =>
      q.profilePath.startsWith('livestock.'),
    );
    expect(livestockQs.length).toBeGreaterThan(0);
    for (const q of livestockQs) {
      expect(q.visibleWhen).toBeDefined();
      expect(q.visibleWhen!({})).toBe(false);
      expect(
        q.visibleWhen!({ systemsInScope: { animals: ['sheep'] } }),
      ).toBe(true);
    }
  });
});

describe('toProjectType mapping', () => {
  it('maps builder ids to the closest strict ProjectType enum', () => {
    expect(toProjectType('regenerative_farm')).toBe('regenerative_farm');
    expect(toProjectType('agroforestry')).toBe('regenerative_farm');
    expect(toProjectType('homestead')).toBe('homestead');
    expect(toProjectType('retreat_education')).toBe('retreat_center');
    expect(toProjectType('eco_village')).toBe('multi_enterprise');
  });

  it('returns undefined for ids with no clean enum home', () => {
    expect(toProjectType('other')).toBeUndefined();
    expect(toProjectType(undefined)).toBeUndefined();
  });
});

describe('Lean Stage Zero question set', () => {
  // The six questions actually asked in Stage Zero, in catalog order. Everything
  // else is flagged `deferToPlan` and surfaced via deriveDeferredTopics().
  const KEPT_IDS = [
    'project-type',
    'primary-outcomes',
    'values',
    'budget-range',
    'timeline',
    'success',
  ];

  it('asks exactly the lean 6 (deferToPlan filtered), in catalog order', () => {
    const active = VISION_QUESTIONS.filter((q) => !q.deferToPlan).map(
      (q) => q.id,
    );
    expect(active).toEqual(KEPT_IDS);
  });

  it('removes selection caps from every kept multi question', () => {
    const keptMultis = VISION_QUESTIONS.filter(
      (q) => !q.deferToPlan && q.kind === 'multi',
    );
    expect(keptMultis.length).toBeGreaterThan(0);
    for (const q of keptMultis) {
      expect(q.maxSelections).toBeUndefined();
    }
  });

  it('defers everything except the lean 6, with none of the kept ids leaking', () => {
    const deferred = deriveDeferredTopics();
    const deferredIds = deferred.map((t) => t.id);

    // None of the kept ids appear in the deferred list…
    for (const id of KEPT_IDS) {
      expect(deferredIds).not.toContain(id);
    }
    // …and the deferred list is exactly the non-kept catalog questions.
    const expectedDeferred = VISION_QUESTIONS.filter(
      (q) => !KEPT_IDS.includes(q.id),
    ).map((q) => q.id);
    expect(deferredIds).toEqual(expectedDeferred);
    // Each deferred topic carries the surfacing fields.
    for (const topic of deferred) {
      expect(topic.eyebrow).toBeTruthy();
      expect(topic.title).toBeTruthy();
    }
  });
});

describe('deriveActivatedModules', () => {
  it('returns nothing for an empty profile', () => {
    // Baseline is gated on `primaryType`, so a blank profile stays empty
    // (preserves the strip's "Answer a few questions…" empty state).
    expect(deriveActivatedModules({})).toEqual([]);
  });

  it('seeds the baseline modules once a project type is chosen', () => {
    const mods = deriveActivatedModules({ primaryType: 'homestead' });
    for (const baseline of BASELINE_MODULES) {
      expect(mods).toContain(baseline);
    }
    // …plus homestead's type-distinctive modules.
    expect(mods).toContain('built-infrastructure');
    expect(mods).toContain('climate');
  });

  it('does not seed the baseline without a project type', () => {
    // Answers other than primaryType must not trigger the baseline. Use a kept
    // (non-deferred) question to activate a module: primary-outcomes →
    // water_resilience activates water-management.
    const mods = deriveActivatedModules({
      primaryOutcomes: ['water_resilience'], // water-management only
    });
    expect(mods).toContain('hydrology');
    expect(mods).not.toContain('soil');
    expect(mods).not.toContain('access-circulation');
    expect(mods).not.toContain('economics-capacity');
  });

  it('unions baseline with conservation-specific modules', () => {
    const mods = deriveActivatedModules({ primaryType: 'conservation' });
    for (const baseline of BASELINE_MODULES) {
      expect(mods).toContain(baseline);
    }
    expect(mods).toContain('ecology');
    expect(mods).toContain('ecology');
    expect(mods).toContain('ecology');
  });

  it('unions activated modules across answered questions, de-duplicated', () => {
    const mods = deriveActivatedModules({
      primaryType: 'regenerative_farm', // type: plant-systems… + baseline (water, soil…)
      primaryOutcomes: ['water_resilience'], // water-management (dup of baseline)
    });
    expect(mods).toContain('soil');
    expect(mods).toContain('plants-food');
    expect(mods).toContain('hydrology');
    // De-duplicated.
    expect(mods.filter((m) => m === 'hydrology')).toHaveLength(1);
  });

  it('returns modules in canonical PLAN_MODULES order', () => {
    const mods = deriveActivatedModules({
      // Both from the kept primary-outcomes question.
      primaryOutcomes: ['water_resilience', 'ecological_restoration'],
      // → water-management, habitat-allocation, regeneration-monitor
    });
    // water-management precedes habitat-allocation in PLAN_MODULES.
    expect(mods.indexOf('hydrology')).toBeLessThan(
      mods.indexOf('ecology'),
    );
  });

  it('ignores answers to deferred questions (vision-only projection)', () => {
    // systems-animals and livestock.roles are now deferToPlan, so even if their
    // profile paths carry values they must not contribute modules to the strip
    // — the projection is driven only by the lean Stage Zero questions.
    const mods = deriveActivatedModules({
      systemsInScope: { animals: ['goats'] }, // deferred → no 'animals-livestock'
      livestock: { roles: ['meat'] }, // deferred → no 'animals-livestock'
    });
    expect(mods).not.toContain('animals-livestock');
  });

  it('still excludes deferred modules even alongside a chosen project type', () => {
    // Baseline seeds on primaryType, but deferred answers add nothing extra.
    const mods = deriveActivatedModules({
      primaryType: 'homestead',
      systemsInScope: { animals: ['goats'] }, // deferred
    });
    expect(mods).not.toContain('animals-livestock');
  });
});
