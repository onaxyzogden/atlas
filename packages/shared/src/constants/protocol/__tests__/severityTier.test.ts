// severityTier.test.ts
//
// Verifies the severity-tier dimension added to the protocol model (OLOS
// Protocol System Object Model & Architecture Spec v1.1). SeverityTier is
// ORTHOGONAL to the existing ProtocolType: `type` is the evaluation model;
// `severityTier` is the response posture. The field is optional so the existing
// catalogue (authored before tiers existed) stays schema-valid and resolves to
// the safe RESPOND default.

import { describe, it, expect } from 'vitest';
import {
  SeverityTier,
  resolveSeverityTier,
  StandardProtocolTemplateSchema,
} from '../../../schemas/protocol/protocol.schema.js';
import { STANDARD_PROTOCOL_TEMPLATES } from '../standardTemplates.js';

describe('SeverityTier', () => {
  it('enumerates the four tiers in spec order', () => {
    expect(SeverityTier.options).toEqual([
      'stop',
      'respond',
      'watch',
      'abundance',
    ]);
  });

  it('defaults legacy templates (no severityTier) to respond', () => {
    for (const t of STANDARD_PROTOCOL_TEMPLATES) {
      expect(resolveSeverityTier(t)).toBe('respond');
    }
  });

  it('keeps every catalogue template schema-valid with severityTier optional', () => {
    for (const t of STANDARD_PROTOCOL_TEMPLATES) {
      expect(() => StandardProtocolTemplateSchema.parse(t)).not.toThrow();
    }
  });

  it('honours an explicit tier when one is set', () => {
    expect(resolveSeverityTier({ severityTier: 'stop' })).toBe('stop');
    expect(resolveSeverityTier({ severityTier: 'abundance' })).toBe('abundance');
  });
});
