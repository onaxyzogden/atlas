import { describe, expect, it } from 'vitest';
import { VisionProfile } from '@ogden/shared';
import {
  VISION_QUESTIONS,
  hasLivestockInScope,
  toProjectType,
} from '../data/visionBuilderQuestions.js';
import { deriveActivatedModules } from '../lib/deriveActivatedModules.js';

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

describe('deriveActivatedModules', () => {
  it('returns nothing for an empty profile', () => {
    expect(deriveActivatedModules({})).toEqual([]);
  });

  it('unions activated modules across answered questions, de-duplicated', () => {
    const mods = deriveActivatedModules({
      primaryType: 'regenerative_farm', // soil-fertility, plant-systems, water-management
      systemsInScope: { water: ['rainwater'] }, // water-management (dup)
    });
    expect(mods).toContain('soil-fertility');
    expect(mods).toContain('plant-systems');
    expect(mods).toContain('water-management');
    // De-duplicated.
    expect(mods.filter((m) => m === 'water-management')).toHaveLength(1);
  });

  it('returns modules in canonical PLAN_MODULES order', () => {
    const mods = deriveActivatedModules({
      systemsInScope: { water: ['rainwater'] }, // water-management
      primaryOutcomes: ['ecological_restoration'], // habitat-allocation, regeneration-monitor
    });
    // water-management precedes habitat-allocation in PLAN_MODULES.
    expect(mods.indexOf('water-management')).toBeLessThan(
      mods.indexOf('habitat-allocation'),
    );
  });

  it('excludes conditional (livestock) modules when animals are out of scope', () => {
    // livestock.roles would activate 'livestock', but the question is hidden
    // when no animals are in scope, so it must not leak into the strip.
    const mods = deriveActivatedModules({
      livestock: { roles: ['meat'] },
    });
    expect(mods).not.toContain('livestock');
  });

  it('includes livestock modules once animals are in scope', () => {
    const mods = deriveActivatedModules({
      systemsInScope: { animals: ['goats'] }, // activates livestock
      livestock: { roles: ['meat'] }, // now visible → activates livestock
    });
    expect(mods).toContain('livestock');
  });
});
