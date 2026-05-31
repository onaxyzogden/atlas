// standardTemplates.test.ts
//
// Verifies the standard protocol catalogue (Protocol Layer Spec 4.2) and the
// enterprise-filtering rule (4.3). The headline assertion is the Pest Diversion
// gate: a Silvopasture property WITHOUT poultry must not see the Silvopasture
// Pest Diversion template; adding poultry surfaces it.

import { describe, it, expect } from 'vitest';
import { StandardProtocolTemplateSchema } from '../../../schemas/protocol/protocol.schema.js';
import {
  STANDARD_PROTOCOL_TEMPLATES,
  templatesForEnterprises,
} from '../standardTemplates.js';

const PEST_DIVERSION_ID = 'silvopasture-pest-diversion';

describe('STANDARD_PROTOCOL_TEMPLATES', () => {
  it('encodes the 10 standard animal templates from spec 4.2', () => {
    expect(STANDARD_PROTOCOL_TEMPLATES).toHaveLength(10);
  });

  it('every template conforms to the schema', () => {
    for (const t of STANDARD_PROTOCOL_TEMPLATES) {
      expect(() => StandardProtocolTemplateSchema.parse(t)).not.toThrow();
    }
  });

  it('has unique ids', () => {
    const ids = STANDARD_PROTOCOL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('records tierAuthored provenance on every template (spec §9.1 / §10.1)', () => {
    for (const t of STANDARD_PROTOCOL_TEMPLATES) {
      expect(t.tierAuthored).toBe('Stratum 6 — Integration');
    }
  });

  it('scopes only Pest Diversion to poultry; all others to sheep_beef', () => {
    for (const t of STANDARD_PROTOCOL_TEMPLATES) {
      if (t.id === PEST_DIVERSION_ID) {
        expect(t.enterpriseScope).toEqual(['poultry']);
      } else {
        expect(t.enterpriseScope).toEqual(['sheep_beef']);
      }
    }
  });
});

describe('templatesForEnterprises (spec 4.3 enterprise filtering)', () => {
  it('Sheep & Beef only → 9 templates, Pest Diversion HIDDEN', () => {
    const result = templatesForEnterprises(['sheep_beef']);
    expect(result).toHaveLength(9);
    expect(result.some((t) => t.id === PEST_DIVERSION_ID)).toBe(false);
  });

  it('Poultry added → all 10 templates, Pest Diversion SHOWN', () => {
    const result = templatesForEnterprises(['sheep_beef', 'poultry']);
    expect(result).toHaveLength(10);
    expect(result.some((t) => t.id === PEST_DIVERSION_ID)).toBe(true);
  });

  it('No livestock → no animal protocol templates', () => {
    expect(templatesForEnterprises([])).toHaveLength(0);
  });

  it('preserves catalogue order', () => {
    const all = templatesForEnterprises(['sheep_beef', 'poultry']);
    expect(all.map((t) => t.id)).toEqual(
      STANDARD_PROTOCOL_TEMPLATES.map((t) => t.id),
    );
  });
});
