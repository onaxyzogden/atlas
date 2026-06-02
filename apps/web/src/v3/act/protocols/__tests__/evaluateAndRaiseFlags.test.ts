/**
 * evaluateAndRaiseFlags -- pure unit tests (T1.6).
 *
 * No React, no real stores, no rendering.
 * All fixture timestamps are explicit ISO strings so "latest" is deterministic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ProtocolActivation } from '@ogden/shared';
import type { RaiseFlagInput } from '../../../../store/reviewFlagStore.js';
import { evaluateAndRaiseFlags } from '../evaluateAndRaiseFlags.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let calls: RaiseFlagInput[];
let raiseFlag: (i: RaiseFlagInput) => void;

beforeEach(() => {
  calls = [];
  raiseFlag = (i: RaiseFlagInput) => {
    calls.push(i);
  };
});

function makeActivation(
  overrides: Partial<ProtocolActivation> & {
    id: string;
    projectId: string;
    templateId: string;
    confirmationStatus: ProtocolActivation['confirmationStatus'];
    activatedAt: string;
  },
): ProtocolActivation {
  return {
    severityTier: 'respond',
    recipeSnapshot: {
      name: overrides.templateId ?? 'Test Protocol',
      condition: 'Test condition',
      response: 'Test response',
    },
    triggerContext: 'act_proof_capture',
    ...overrides,
  } as ProtocolActivation;
}

const PROJECT = 'proj-test';

// ---------------------------------------------------------------------------
// Test 1 -- Existential, no expectedRate
// ---------------------------------------------------------------------------

describe('evaluateAndRaiseFlags', () => {
  it('1. existential template fires once -> raises 2 flags with deviationSign=existential', () => {
    const activation = makeActivation({
      id: 'a1',
      projectId: PROJECT,
      templateId: 'emergency-destocking',
      confirmationStatus: 'confirmed',
      activatedAt: '2024-01-15T10:00:00.000Z',
    });

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'emergency-destocking',
      activations: [activation],
      expectedRate: undefined,
      raiseFlag,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]!.deviationSign).toBe('existential');
    expect(calls[1]!.deviationSign).toBe('existential');
    expect(calls[0]!.objectiveId).toBe('s6-yield-flows');
    expect(calls[1]!.objectiveId).toBe('s7-phasing');
    expect(calls[1]!.reason).toMatch(/^downstream of s6-yield-flows:/);
  });

  // ---------------------------------------------------------------------------
  // Test 2 -- Over-expected (per season)
  // ---------------------------------------------------------------------------

  it('2. over-expected per season -> 2 flags with sign=over, direction=tighten, observedCount=5', () => {
    const activations: ProtocolActivation[] = [
      makeActivation({ id: 'b1', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-05T10:00:00.000Z', season: 'summer', cycleNumber: 1 }),
      makeActivation({ id: 'b2', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-06T10:00:00.000Z', season: 'summer', cycleNumber: 1 }),
      makeActivation({ id: 'b3', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-07T10:00:00.000Z', season: 'summer', cycleNumber: 1 }),
      makeActivation({ id: 'b4', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-08T10:00:00.000Z', season: 'summer', cycleNumber: 1 }),
      makeActivation({ id: 'b5', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-09T10:00:00.000Z', season: 'summer', cycleNumber: 1 }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'paddock-rotation-cover-trigger',
      activations,
      expectedRate: { count: 2, per: 'season' },
      raiseFlag,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]!.deviationSign).toBe('over');
    expect(calls[0]!.direction).toBe('tighten');
    expect(calls[0]!.observedCount).toBe(5);
    expect(calls[1]!.deviationSign).toBe('over');
    expect(calls[1]!.direction).toBe('tighten');
    expect(calls[1]!.observedCount).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // Test 3 -- Equal-to-expected (no flags)
  // ---------------------------------------------------------------------------

  it('3. equal-to-expected per season -> 0 flags', () => {
    const activations: ProtocolActivation[] = [
      makeActivation({ id: 'c1', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-05T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'c2', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-06T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'c3', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-07T10:00:00.000Z', season: 'summer' }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'paddock-rotation-cover-trigger',
      activations,
      expectedRate: { count: 3, per: 'season' },
      raiseFlag,
    });

    expect(calls).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Test 4 -- Under-expected (per cycle)
  // ---------------------------------------------------------------------------

  it('4. under-expected per cycle -> 2 flags with sign=under, direction=loosen', () => {
    const activations: ProtocolActivation[] = [
      makeActivation({ id: 'd1', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-05T10:00:00.000Z', cycleNumber: 0 }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'paddock-rotation-cover-trigger',
      activations,
      expectedRate: { count: 4, per: 'cycle' },
      raiseFlag,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]!.deviationSign).toBe('under');
    expect(calls[0]!.direction).toBe('loosen');
    expect(calls[1]!.deviationSign).toBe('under');
    expect(calls[1]!.direction).toBe('loosen');
  });

  // ---------------------------------------------------------------------------
  // Test 5 -- Missing expectedRate, NON-existential template (no flags)
  // ---------------------------------------------------------------------------

  it('5. missing expectedRate on non-existential template -> 0 flags', () => {
    const activations: ProtocolActivation[] = [
      makeActivation({ id: 'e1', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-05T10:00:00.000Z' }),
      makeActivation({ id: 'e2', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-06T10:00:00.000Z' }),
      makeActivation({ id: 'e3', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-01-07T10:00:00.000Z' }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'paddock-rotation-cover-trigger',
      activations,
      expectedRate: undefined,
      raiseFlag,
    });

    expect(calls).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Test 6 -- Non-s6-bound template (Tier-1 gate: no-op)
  // ---------------------------------------------------------------------------

  it('6. non-s6-bound template -> 0 flags (Tier-1 gate)', () => {
    const activations: ProtocolActivation[] = [
      makeActivation({ id: 'f1', projectId: PROJECT, templateId: 'water-trough-inspection', confirmationStatus: 'confirmed', activatedAt: '2024-01-05T10:00:00.000Z' }),
      makeActivation({ id: 'f2', projectId: PROJECT, templateId: 'water-trough-inspection', confirmationStatus: 'confirmed', activatedAt: '2024-01-06T10:00:00.000Z' }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'water-trough-inspection',
      activations,
      expectedRate: { count: 1, per: 'season' },
      raiseFlag,
    });

    expect(calls).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Test 7 -- Window isolation: activations span 2 seasons, latest=summer
  // ---------------------------------------------------------------------------

  it('7. window isolation: 5 summer + 1 autumn, latest=summer, expected 2/season -> count=5 (over)', () => {
    // Summer activations are NEWER (later activatedAt) so latest.season==='summer'
    const activations: ProtocolActivation[] = [
      // autumn (older)
      makeActivation({ id: 'g1', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-03-01T10:00:00.000Z', season: 'autumn' }),
      // summer (newer)
      makeActivation({ id: 'g2', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-06-01T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'g3', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-06-02T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'g4', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-06-03T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'g5', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-06-04T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'g6', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-06-05T10:00:00.000Z', season: 'summer' }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'paddock-rotation-cover-trigger',
      activations,
      expectedRate: { count: 2, per: 'season' },
      raiseFlag,
    });

    // Should flag for 5 summer activations (not 6 total) -- autumn excluded
    expect(calls).toHaveLength(2);
    expect(calls[0]!.observedCount).toBe(5);
    expect(calls[0]!.deviationSign).toBe('over');
  });
});
