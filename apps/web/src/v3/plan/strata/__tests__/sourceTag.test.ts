import { describe, expect, it } from 'vitest';
import type { PlanStratumObjective } from '@ogden/shared';
import { getSourceTag } from '../sourceTag';

// Minimal objective fixture — only the fields getSourceTag reads matter; the
// rest are filled with valid-shaped defaults so the cast is honest.
function makeObjective(
  patch: Partial<PlanStratumObjective>,
): PlanStratumObjective {
  return {
    id: 'obj-test',
    stratumId: 's1-project-foundation',
    title: 'Test objective',
    focusedQuestion: 'What?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    checklist: [],
    outputKind: 'plan-decision-record',
    ...patch,
  } as PlanStratumObjective;
}

describe('getSourceTag', () => {
  it('reads an unset source as universal (legacy skeleton)', () => {
    const tag = getSourceTag(makeObjective({}));
    expect(tag).toEqual({ kind: 'universal', label: 'Universal' });
  });

  it('labels an explicit universal objective', () => {
    const tag = getSourceTag(makeObjective({ source: 'universal' }));
    expect(tag).toEqual({ kind: 'universal', label: 'Universal' });
  });

  it('labels a primary objective', () => {
    const tag = getSourceTag(
      makeObjective({ source: 'primary', sourceTypeId: 'regenerative_farm' }),
    );
    expect(tag).toEqual({ kind: 'primary', label: 'Primary' });
  });

  it('labels a secondary objective with the contributing type name', () => {
    const tag = getSourceTag(
      makeObjective({ source: 'secondary', sourceTypeId: 'silvopasture' }),
    );
    expect(tag.kind).toBe('secondary');
    expect(tag.label).toBe('Secondary - Silvopasture');
  });

  it('falls back to the raw id when the secondary type is unknown', () => {
    const tag = getSourceTag(
      makeObjective({
        source: 'secondary',
        // deliberately not a real ProjectTypeId
        sourceTypeId: 'mystery' as PlanStratumObjective['sourceTypeId'],
      }),
    );
    expect(tag.label).toBe('Secondary - mystery');
  });

  it('uses a safe placeholder when a secondary has no sourceTypeId', () => {
    const tag = getSourceTag(makeObjective({ source: 'secondary' }));
    expect(tag.label).toBe('Secondary - Secondary type');
  });
});
