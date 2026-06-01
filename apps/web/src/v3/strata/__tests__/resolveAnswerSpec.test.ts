/**
 * resolveAnswerSpec — pure resolver that reads a checklist item's `answerSpec`
 * out of ProjectMetadata and reports whether the answer was already captured
 * upstream (creation wizard / Vision Builder / team step) plus the normalised
 * raw token(s) the Act `AnswerRecap` renderer maps to labels.
 *
 * Pins: dotted-path read, multi-value flattening (incl. object-of-arrays like
 * systemsInScope), the band "all axes present" rule, steward formatting, and
 * the render-safe empty result when metadata is missing.
 */

import { describe, it, expect } from 'vitest';
import type { AnswerSpec, ProjectMetadata } from '@ogden/shared';
import { resolveAnswerSpec } from '../resolveAnswerSpec.js';

/** Helper: build a metadata stub with only the fields a test reads. */
function meta(partial: Record<string, unknown>): ProjectMetadata {
  return partial as unknown as ProjectMetadata;
}

const WIZARD = { kind: 'wizard-step', step: 'vision' } as const;

describe('resolveAnswerSpec', () => {
  it('returns an empty, render-safe result when metadata is missing', () => {
    const spec: AnswerSpec = {
      fieldType: 'single_select',
      optionSetId: 'projectPrimaryType',
      sourceField: 'projectTypeRecord.primaryTypeId',
      editRoute: { kind: 'plan-type' },
    };
    const r = resolveAnswerSpec(null, spec);
    expect(r.isAnswered).toBe(false);
    expect(r.values).toEqual([]);
    expect(r.fieldType).toBe('single_select');
    expect(r.optionSetId).toBe('projectPrimaryType');
  });

  it('single_select reads a dotted path and is answered when present', () => {
    const spec: AnswerSpec = {
      fieldType: 'single_select',
      optionSetId: 'projectPrimaryType',
      sourceField: 'projectTypeRecord.primaryTypeId',
      editRoute: { kind: 'plan-type' },
    };
    const r = resolveAnswerSpec(
      meta({ projectTypeRecord: { primaryTypeId: 'food-forest' } }),
      spec,
    );
    expect(r.isAnswered).toBe(true);
    expect(r.values).toEqual(['food-forest']);
  });

  it('single_select is unanswered when the path is empty/missing', () => {
    const spec: AnswerSpec = {
      fieldType: 'single_select',
      optionSetId: 'projectPrimaryType',
      sourceField: 'projectTypeRecord.primaryTypeId',
      editRoute: { kind: 'plan-type' },
    };
    expect(resolveAnswerSpec(meta({}), spec).isAnswered).toBe(false);
    expect(
      resolveAnswerSpec(meta({ projectTypeRecord: { primaryTypeId: '' } }), spec)
        .isAnswered,
    ).toBe(false);
  });

  it('multi_select flattens a string array', () => {
    const spec: AnswerSpec = {
      fieldType: 'multi_select',
      optionSetId: 'visionPrimaryOutcomes',
      sourceField: 'visionProfile.primaryOutcomes',
      editRoute: WIZARD,
    };
    const r = resolveAnswerSpec(
      meta({ visionProfile: { primaryOutcomes: ['food', 'water', 'habitat'] } }),
      spec,
    );
    expect(r.isAnswered).toBe(true);
    expect(r.values).toEqual(['food', 'water', 'habitat']);
  });

  it('multi_select flattens an object-of-arrays (systemsInScope shape)', () => {
    const spec: AnswerSpec = {
      fieldType: 'multi_select',
      optionSetId: 'visionSystems',
      sourceField: 'visionProfile.systemsInScope',
      editRoute: WIZARD,
    };
    const r = resolveAnswerSpec(
      meta({
        visionProfile: {
          systemsInScope: { food: ['orchard', 'annuals'], water: ['swales'] },
        },
      }),
      spec,
    );
    expect(r.isAnswered).toBe(true);
    expect([...r.values].sort()).toEqual(['annuals', 'orchard', 'swales']);
  });

  it('band requires ALL axes present (mirrors s1-vision-c3)', () => {
    const spec: AnswerSpec = {
      fieldType: 'band',
      sourceField: ['visionProfile.budgetRange', 'visionProfile.timelineProgress'],
      editRoute: WIZARD,
    };
    // both axes present -> answered, one entry per axis in order
    const both = resolveAnswerSpec(
      meta({
        visionProfile: { budgetRange: 'band-2', timelineProgress: 'season-1' },
      }),
      spec,
    );
    expect(both.isAnswered).toBe(true);
    expect(both.values).toEqual(['band-2', 'season-1']);

    // only one axis -> NOT answered
    const one = resolveAnswerSpec(
      meta({ visionProfile: { budgetRange: 'band-2' } }),
      spec,
    );
    expect(one.isAnswered).toBe(false);
  });

  it('steward formats name + email and collects array entries', () => {
    const spec: AnswerSpec = {
      fieldType: 'steward',
      sourceField: 'team.members',
      editRoute: { kind: 'wizard-step', step: 'team' },
    };
    const r = resolveAnswerSpec(
      meta({
        team: {
          members: [
            { name: 'Aisha', email: 'aisha@ogden.ag' },
            { name: 'Bilal' },
          ],
        },
      }),
      spec,
    );
    expect(r.isAnswered).toBe(true);
    expect(r.values).toEqual(['Aisha <aisha@ogden.ag>', 'Bilal']);
  });

  it('text passes the stored prose through verbatim', () => {
    const spec: AnswerSpec = {
      fieldType: 'text',
      sourceField: 'visionProfile.landVisionStatement',
      editRoute: WIZARD,
    };
    const r = resolveAnswerSpec(
      meta({ visionProfile: { landVisionStatement: 'A thriving food forest.' } }),
      spec,
    );
    expect(r.isAnswered).toBe(true);
    expect(r.values).toEqual(['A thriving food forest.']);
  });
});
