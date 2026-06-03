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
      name: overrides.templateId,
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
    expect(calls[0]!.objectiveId).toBe('s6-monitoring');
    expect(calls[1]!.objectiveId).toBe('s7-phase1');
    expect(calls[1]!.reason).toMatch(/^downstream of s6-monitoring:/);
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

  // ---------------------------------------------------------------------------
  // Test 8 -- project filter: activations for another project are ignored
  // ---------------------------------------------------------------------------

  it('8. confirmed activations for a different project do not count', () => {
    const activations: ProtocolActivation[] = [
      // 5 confirmed but for OTHER project -- must be excluded by the projectId filter.
      makeActivation({ id: 'h1', projectId: 'other-proj', templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-06-01T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'h2', projectId: 'other-proj', templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-06-02T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'h3', projectId: 'other-proj', templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-06-03T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'h4', projectId: 'other-proj', templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-06-04T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'h5', projectId: 'other-proj', templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'confirmed', activatedAt: '2024-06-05T10:00:00.000Z', season: 'summer' }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'paddock-rotation-cover-trigger',
      activations,
      expectedRate: { count: 2, per: 'season' },
      raiseFlag,
    });

    // No activations match PROJECT -> empty confirmed set -> no flags.
    expect(calls).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Test 9 -- status filter: non-confirmed activations are ignored
  // ---------------------------------------------------------------------------

  it('9. pending_review / false_positive activations do not count', () => {
    const activations: ProtocolActivation[] = [
      makeActivation({ id: 'i1', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'pending_review', activatedAt: '2024-06-01T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'i2', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'false_positive', activatedAt: '2024-06-02T10:00:00.000Z', season: 'summer' }),
      makeActivation({ id: 'i3', projectId: PROJECT, templateId: 'paddock-rotation-cover-trigger', confirmationStatus: 'false_positive', activatedAt: '2024-06-03T10:00:00.000Z', season: 'summer' }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'paddock-rotation-cover-trigger',
      activations,
      expectedRate: { count: 1, per: 'season' },
      raiseFlag,
    });

    // No confirmed activations -> empty confirmed set -> no flags.
    expect(calls).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Tests 10-12 -- Establishment re-frame (T1.9)
  // ---------------------------------------------------------------------------

  it('10. commencementDate within 2 years -> flag reason prefixed with establishment annotation', () => {
    // commencementDate 1 year ago (establishment window: effectiveYear <= 2)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10); // YYYY-MM-DD

    const activations: ProtocolActivation[] = [
      makeActivation({
        id: 'j1',
        projectId: PROJECT,
        templateId: 'paddock-rotation-cover-trigger',
        confirmationStatus: 'confirmed',
        activatedAt: '2024-06-01T10:00:00.000Z',
        season: 'summer',
      }),
      makeActivation({
        id: 'j2',
        projectId: PROJECT,
        templateId: 'paddock-rotation-cover-trigger',
        confirmationStatus: 'confirmed',
        activatedAt: '2024-06-02T10:00:00.000Z',
        season: 'summer',
      }),
      makeActivation({
        id: 'j3',
        projectId: PROJECT,
        templateId: 'paddock-rotation-cover-trigger',
        confirmationStatus: 'confirmed',
        activatedAt: '2024-06-03T10:00:00.000Z',
        season: 'summer',
      }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'paddock-rotation-cover-trigger',
      activations,
      expectedRate: { count: 1, per: 'season' },
      commencementDate: oneYearAgo,
      raiseFlag,
    });

    expect(calls).toHaveLength(2);
    const ESTABLISHMENT_PREFIX = '[Establishment - expected; interpret, don\'t conclude design failure] ';
    // Primary flag reason starts with the prefix
    expect(calls[0]!.reason).toMatch(new RegExp('^' + ESTABLISHMENT_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    // Cascade flag reason contains "downstream of" but also embeds the prefixed base reason
    expect(calls[1]!.reason).toContain('[Establishment');
  });

  it('11. commencementDate absent -> NO establishment prefix on reason', () => {
    const activations: ProtocolActivation[] = [
      makeActivation({
        id: 'k1',
        projectId: PROJECT,
        templateId: 'paddock-rotation-cover-trigger',
        confirmationStatus: 'confirmed',
        activatedAt: '2024-06-01T10:00:00.000Z',
        season: 'summer',
      }),
      makeActivation({
        id: 'k2',
        projectId: PROJECT,
        templateId: 'paddock-rotation-cover-trigger',
        confirmationStatus: 'confirmed',
        activatedAt: '2024-06-02T10:00:00.000Z',
        season: 'summer',
      }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'paddock-rotation-cover-trigger',
      activations,
      expectedRate: { count: 1, per: 'season' },
      commencementDate: undefined,
      raiseFlag,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]!.reason).not.toMatch(/^\[Establishment/);
  });

  it('12. commencementDate older than 2 years -> NO establishment prefix on reason', () => {
    // commencementDate 3 years ago (outside establishment window)
    const threeYearsAgo = new Date(Date.now() - 3 * 365.25 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);

    const activations: ProtocolActivation[] = [
      makeActivation({
        id: 'l1',
        projectId: PROJECT,
        templateId: 'paddock-rotation-cover-trigger',
        confirmationStatus: 'confirmed',
        activatedAt: '2024-06-01T10:00:00.000Z',
        season: 'summer',
      }),
      makeActivation({
        id: 'l2',
        projectId: PROJECT,
        templateId: 'paddock-rotation-cover-trigger',
        confirmationStatus: 'confirmed',
        activatedAt: '2024-06-02T10:00:00.000Z',
        season: 'summer',
      }),
    ];

    evaluateAndRaiseFlags({
      projectId: PROJECT,
      templateId: 'paddock-rotation-cover-trigger',
      activations,
      expectedRate: { count: 1, per: 'season' },
      commencementDate: threeYearsAgo,
      raiseFlag,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]!.reason).not.toMatch(/^\[Establishment/);
  });
});
