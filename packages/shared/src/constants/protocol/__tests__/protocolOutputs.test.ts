// protocolOutputs.test.ts
//
// Verifies the §10.1 parameter -> protocol-output derivation:
//   1. buildProtocolOutputs maps filled values to their tokens and omits blanks
//      (no fabrication — blank tokens stay unrendered downstream).
//   2. The ParameterGroup schema accepts the S6 seed and stays optional (every
//      existing objective validates without one).
//   3. DRIFT GUARD: every bracket token in the standard protocol catalogue has a
//      matching parameter item on the S6 Integration objective, so no protocol
//      condition can ever lack a steward-entry surface.

import { describe, it, expect } from 'vitest';
import {
  ParameterGroupSchema,
  PlanStratumObjectiveSchema,
} from '../../../schemas/plan/planStratumObjective.schema.js';
import {
  PLAN_STRATUM_OBJECTIVES,
  findPlanStratumObjective,
} from '../../plan/stratumObjectives.js';
import { STANDARD_PROTOCOL_TEMPLATES } from '../standardTemplates.js';
import { buildProtocolOutputs } from '../protocolOutputs.js';

const S6 = findPlanStratumObjective('s6-yield-flows');

/** Extract every `[token]` marker from a protocol condition string. */
function tokensIn(condition: string): string[] {
  return [...condition.matchAll(/\[([^\]]+)\]/g)]
    .map((m) => m[1])
    .filter((t): t is string => t !== undefined);
}

describe('buildProtocolOutputs', () => {
  const group = S6?.parameterGroup;

  it('maps each filled value to its token (trimmed)', () => {
    expect(group).toBeDefined();
    const values = {
      's6-yield-flows-param-cover-trigger': '1500',
      's6-yield-flows-param-day-limit': '  3  ',
    };
    const out = buildProtocolOutputs(group, values);
    expect(out['approved threshold']).toBe('1500');
    expect(out['approved day limit']).toBe('3');
  });

  it('omits blank / whitespace-only values so brackets render verbatim', () => {
    const values = {
      's6-yield-flows-param-cover-trigger': '',
      's6-yield-flows-param-day-limit': '   ',
    };
    const out = buildProtocolOutputs(group, values);
    expect(out['approved threshold']).toBeUndefined();
    expect(out['approved day limit']).toBeUndefined();
    expect(Object.keys(out)).toHaveLength(0);
  });

  it('returns an empty map for an undefined group', () => {
    expect(buildProtocolOutputs(undefined, { x: '1' })).toEqual({});
  });
});

describe('ParameterGroup schema', () => {
  it('accepts the S6 Integration parameter group', () => {
    expect(() => ParameterGroupSchema.parse(S6?.parameterGroup)).not.toThrow();
  });

  it('stays optional — every objective validates with or without one', () => {
    for (const o of PLAN_STRATUM_OBJECTIVES) {
      expect(() => PlanStratumObjectiveSchema.parse(o)).not.toThrow();
    }
  });
});

describe('§10.1 token <-> parameter drift guard', () => {
  it('every standard-template token has a matching S6 parameter item', () => {
    const paramTokens = new Set(
      (S6?.parameterGroup?.items ?? []).map((i) => i.token),
    );
    const catalogueTokens = new Set(
      STANDARD_PROTOCOL_TEMPLATES.flatMap((t) => tokensIn(t.condition)),
    );
    // Sanity: the catalogue actually carries tokens (guards a silent regex break).
    expect(catalogueTokens.size).toBeGreaterThan(0);
    for (const token of catalogueTokens) {
      expect(paramTokens.has(token)).toBe(true);
    }
  });

  it('has no orphan parameter items (every param token is used by a template)', () => {
    const catalogueTokens = new Set(
      STANDARD_PROTOCOL_TEMPLATES.flatMap((t) => tokensIn(t.condition)),
    );
    for (const item of S6?.parameterGroup?.items ?? []) {
      expect(catalogueTokens.has(item.token)).toBe(true);
    }
  });
});
