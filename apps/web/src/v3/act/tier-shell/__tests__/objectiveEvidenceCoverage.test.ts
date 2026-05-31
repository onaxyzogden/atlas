/**
 * Conformance guard for the Act tier-shell objective->evidence wiring.
 *
 * Mirrors actToolCoverage.test.ts. The Evidence section is now driven by a
 * per-objective relevance map (OBJECTIVE_EVIDENCE_OVERRIDE) resolved against a
 * descriptor catalogue (EVIDENCE_CATALOG). These invariants fail the build the
 * moment the map drifts from the real objective-id vocabulary or references a
 * descriptor that no longer exists -- the same rot that silently broke the tool
 * override map before its guard existed.
 *
 * All three pieces live in @ogden/shared (the Evidence descriptor data has no
 * app deps), so this test could live there; it is kept app-side for symmetry
 * with the tool coverage test and to sit beside the panel it protects.
 */

import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_CATALOG,
  OBJECTIVE_EVIDENCE_OVERRIDE,
  UNIVERSAL_PLAN_OBJECTIVES,
  getObjectiveEvidence,
} from '@ogden/shared';

describe('Act tier-shell objective->evidence coverage', () => {
  const objectiveIds = new Set(UNIVERSAL_PLAN_OBJECTIVES.map((o) => o.id));
  const kinds = new Set(['photo', 'confirm', 'note']);

  it('every override key is a real universal objective id', () => {
    const stale = Object.keys(OBJECTIVE_EVIDENCE_OVERRIDE).filter(
      (id) => !objectiveIds.has(id),
    );
    expect(stale).toEqual([]);
  });

  it('every universal objective has an explicit override entry', () => {
    const missing = UNIVERSAL_PLAN_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_EVIDENCE_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every id in every override list exists in the catalogue', () => {
    const unknown: string[] = [];
    for (const [objectiveId, ids] of Object.entries(
      OBJECTIVE_EVIDENCE_OVERRIDE,
    )) {
      for (const id of ids) {
        if (!(id in EVIDENCE_CATALOG)) unknown.push(`${objectiveId} -> ${id}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it('every resolved descriptor for any objective exists in the catalogue', () => {
    const unresolved: string[] = [];
    for (const objective of UNIVERSAL_PLAN_OBJECTIVES) {
      for (const descriptor of getObjectiveEvidence(objective)) {
        if (!(descriptor.id in EVIDENCE_CATALOG)) {
          unresolved.push(`${objective.id} -> ${descriptor.id}`);
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('every catalogue descriptor declares a known kind and matching id', () => {
    for (const [key, descriptor] of Object.entries(EVIDENCE_CATALOG)) {
      expect(descriptor.id).toBe(key);
      expect(kinds.has(descriptor.kind)).toBe(true);
      if (descriptor.kind === 'photo') {
        expect(descriptor.target ?? 1).toBeGreaterThan(0);
      }
    }
  });

  it('every objective emits at least a summary note', () => {
    for (const objective of UNIVERSAL_PLAN_OBJECTIVES) {
      const hasNote = getObjectiveEvidence(objective).some(
        (d) => d.id === 'summary-note',
      );
      expect(hasNote).toBe(true);
    }
  });
});
