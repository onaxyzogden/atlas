// protocolActivation.test.ts
//
// Verifies the immutable ProtocolActivation record (OLOS Protocol System Object
// Model & Architecture Spec v1.1). An activation is the historical fact that a
// protocol's trigger was recognised in the field: it freezes a recipeSnapshot
// (name/condition/response) so later template edits never rewrite history, and
// records how the steward resolved the prompt (confirmation_status). The
// triggerContext defaults to the most common surface (Act proof capture).

import { describe, it, expect } from 'vitest';
import {
  ConfirmationStatus,
  SeasonName,
  ProtocolActivationSchema,
} from '../protocol.schema.js';

const MINIMAL = {
  id: 'act-001',
  projectId: 'proj-1',
  templateId: 'silvopasture-pest-diversion',
  severityTier: 'respond',
  confirmationStatus: 'confirmed',
  recipeSnapshot: {
    name: 'High Pest Pressure Protocol',
    condition: 'Pest count exceeds [auto-filled] threshold',
    response: 'Deploy poultry to affected silvopasture block',
  },
  activatedAt: '2026-06-01T12:00:00.000Z',
} as const;

describe('ConfirmationStatus', () => {
  it('enumerates the three confirmation states', () => {
    expect(ConfirmationStatus.options).toEqual([
      'confirmed',
      'false_positive',
      'pending_review',
    ]);
  });
});

describe('SeasonName', () => {
  it('enumerates the four seasons', () => {
    expect(SeasonName.options).toEqual([
      'spring',
      'summer',
      'autumn',
      'winter',
    ]);
  });
});

describe('ProtocolActivationSchema', () => {
  it('parses a minimal confirmed activation and defaults triggerContext', () => {
    const parsed = ProtocolActivationSchema.parse(MINIMAL);
    expect(parsed.triggerContext).toBe('act_proof_capture');
    expect(parsed.confirmationStatus).toBe('confirmed');
    expect(parsed.recipeSnapshot.name).toBe('High Pest Pressure Protocol');
  });

  it('honours an explicit triggerContext', () => {
    const parsed = ProtocolActivationSchema.parse({
      ...MINIMAL,
      triggerContext: 'observe_domain_detail',
    });
    expect(parsed.triggerContext).toBe('observe_domain_detail');
  });

  it('accepts the reserved season / cycle / weather fields', () => {
    const parsed = ProtocolActivationSchema.parse({
      ...MINIMAL,
      season: 'autumn',
      cycleNumber: 3,
      weatherConditionAtActivation: 'heavy rain',
    });
    expect(parsed.season).toBe('autumn');
    expect(parsed.cycleNumber).toBe(3);
  });

  it('rejects an unknown confirmationStatus', () => {
    expect(() =>
      ProtocolActivationSchema.parse({
        ...MINIMAL,
        confirmationStatus: 'maybe',
      }),
    ).toThrow();
  });

  it('rejects an unknown triggerContext', () => {
    expect(() =>
      ProtocolActivationSchema.parse({
        ...MINIMAL,
        triggerContext: 'plan_authoring',
      }),
    ).toThrow();
  });
});
