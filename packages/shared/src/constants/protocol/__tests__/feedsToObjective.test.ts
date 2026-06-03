// feedsToObjective.test.ts
//
// TDD suite for the FEEDS_TO_OBJECTIVE table (T2.1).
// Tests written FIRST before implementation exists.
//
// Maps the 5 event-driven (NON-s6-bound) protocol templates to the deep
// universal Plan objective(s) they contradict, and asserts every target is a
// REAL universal-catalogue objective id (legacy-skeleton ids re-pointed).

import { describe, it, expect } from 'vitest';
import {
  FEEDS_TO_OBJECTIVE,
  TEMPLATE_DEPTH,
  S6_BOUND_TEMPLATE_IDS,
  STANDARD_PROTOCOL_TEMPLATES,
  findUniversalObjective,
} from '@ogden/shared';

// The FlagDepth enum literals (mirrors reviewFlag.schema.ts).
const FLAG_DEPTHS = ['threshold', 'soil', 'water', 'zones', 'structural'];

// Derive the event-driven set as the templates NOT in S6_BOUND_TEMPLATE_IDS.
const EVENT_DRIVEN_IDS = STANDARD_PROTOCOL_TEMPLATES.map((t) => t.id).filter(
  (id) => !S6_BOUND_TEMPLATE_IDS.has(id)
);

describe('FEEDS_TO_OBJECTIVE membership', () => {
  it('has a non-empty entry for every event-driven template', () => {
    expect(EVENT_DRIVEN_IDS.length).toBe(5);
    for (const id of EVENT_DRIVEN_IDS) {
      const targets = FEEDS_TO_OBJECTIVE[id];
      expect(targets, `missing entry for ${id}`).toBeDefined();
      expect(Array.isArray(targets)).toBe(true);
      expect((targets as readonly string[]).length).toBeGreaterThan(0);
    }
  });
});

describe('FEEDS_TO_OBJECTIVE targets are real universal objectives', () => {
  it('every target id resolves via findUniversalObjective', () => {
    for (const [templateId, targets] of Object.entries(FEEDS_TO_OBJECTIVE)) {
      for (const objId of targets) {
        expect(
          findUniversalObjective(objId),
          `${templateId} -> ${objId} is not a real universal objective`
        ).toBeDefined();
      }
    }
  });
});

describe('TEMPLATE_DEPTH covers event-driven templates', () => {
  it('every event-driven template has a valid FlagDepth entry', () => {
    for (const id of EVENT_DRIVEN_IDS) {
      const depth = TEMPLATE_DEPTH[id];
      expect(depth, `missing depth for ${id}`).toBeDefined();
      expect(FLAG_DEPTHS).toContain(depth);
    }
  });
});

describe('FEEDS_TO_OBJECTIVE specific mappings', () => {
  it('water-trough-inspection -> [s5-water-infrastructure] depth water', () => {
    expect(FEEDS_TO_OBJECTIVE['water-trough-inspection']).toEqual([
      's5-water-infrastructure',
    ]);
    expect(TEMPLATE_DEPTH['water-trough-inspection']).toBe('water');
  });

  it('silvopasture-pest-diversion -> [s4-zones] depth zones', () => {
    expect(FEEDS_TO_OBJECTIVE['silvopasture-pest-diversion']).toEqual([
      's4-zones',
    ]);
    expect(TEMPLATE_DEPTH['silvopasture-pest-diversion']).toBe('zones');
  });
});
