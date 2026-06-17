/**
 * realityCheckModel -- Mode-4 soft-gate + downstream grouping (Stage D). Pure
 * model tests. These pin the load-bearing rules of the SOFT gate:
 *   - the four Mode-4 strata are exactly the `PLAN_STRATA` ordinals 4-7;
 *   - `realityCheckGateState` arms `pending` ONLY on a Mode-4 stratum that is
 *     not yet approved, and is silent (`mode4:false`) everywhere else -- it is
 *     a derivation, never an enforcement;
 *   - `groupClassifications` buckets classified elements by status, omitting the
 *     unclassified and preserving order;
 *   - AMANAH: all Mode-4 gate copy is covenant-clean (no advance-sale / CSA /
 *     subscription / yield-share framing).
 */

import { describe, it, expect } from 'vitest';
import { PLAN_STRATA } from '@ogden/shared';
import type { IntentElement } from '../intentElements.js';
import {
  MODE_4_STRATUM_IDS,
  MODE4_GATE_COPY,
  isMode4Stratum,
  realityCheckGateState,
  groupClassifications,
  detectCsaLikeText,
  type ElementClassification,
} from '../realityCheckModel.js';

const el = (
  id: string,
  text: string,
  type: IntentElement['type'] = 'committed',
): IntentElement => ({ id, text, type, source: 'classify' });

// ---------------------------------------------------------------------------
// Mode-4 strata constant
// ---------------------------------------------------------------------------

describe('MODE_4_STRATUM_IDS', () => {
  it('is exactly the PLAN_STRATA ordinals 4-7, in order', () => {
    const fromCatalogue = PLAN_STRATA.filter((s) => s.ordinal >= 4).map(
      (s) => s.id,
    );
    expect([...MODE_4_STRATUM_IDS]).toEqual(fromCatalogue);
  });

  it('isMode4Stratum is true for Design strata, false otherwise', () => {
    expect(isMode4Stratum('s4-foundation-decisions')).toBe(true);
    expect(isMode4Stratum('s7-phasing-resourcing')).toBe(true);
    // Reception strata (Mode 2) and unknowns are NOT gated.
    expect(isMode4Stratum('s3-systems-reading')).toBe(false);
    expect(isMode4Stratum('s1-project-foundation')).toBe(false);
    expect(isMode4Stratum(null)).toBe(false);
    expect(isMode4Stratum(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Gate state derivation -- the soft gate never enforces
// ---------------------------------------------------------------------------

describe('realityCheckGateState', () => {
  it('is silent off a Mode-4 stratum (Reception surfaces unaffected)', () => {
    expect(realityCheckGateState('s2-land-reading', null)).toEqual({
      mode4: false,
      approved: false,
      pending: false,
    });
    // Even with an approval recorded, a non-Mode-4 stratum stays silent.
    expect(realityCheckGateState('s3-systems-reading', 1700000000000)).toEqual({
      mode4: false,
      approved: true,
      pending: false,
    });
  });

  it('arms the pending reminder on a Mode-4 stratum until approval', () => {
    expect(realityCheckGateState('s5-system-design', null)).toEqual({
      mode4: true,
      approved: false,
      pending: true,
    });
    expect(realityCheckGateState('s5-system-design', undefined).pending).toBe(
      true,
    );
  });

  it('clears pending once a Planning Direction is approved', () => {
    expect(realityCheckGateState('s6-integration-design', 1700000000000)).toEqual(
      { mode4: true, approved: true, pending: false },
    );
  });
});

// ---------------------------------------------------------------------------
// Downstream grouping (display-only registers)
// ---------------------------------------------------------------------------

describe('groupClassifications', () => {
  const elements: IntentElement[] = [
    el('ie-1', 'Water security', 'non-negotiable'),
    el('ie-2', 'Silvopasture grazing', 'committed'),
    el('ie-3', 'Food forest', 'aspirational'),
    el('ie-4', 'Off-grid power', 'aspirational'),
    el('ie-5', 'Unclassified yet', 'committed'),
  ];
  const classifications: Record<string, ElementClassification> = {
    'ie-1': { status: 'feasible' },
    'ie-2': { status: 'conditional', condition: 'stock water confirmed first' },
    'ie-3': { status: 'deferred' },
    'ie-4': { status: 'released', note: 'no viable site' },
    // ie-5 deliberately omitted.
  };

  it('buckets each classified element by status and omits the unclassified', () => {
    const g = groupClassifications(elements, classifications);
    expect(g.feasible.map((c) => c.element.id)).toEqual(['ie-1']);
    expect(g.conditional.map((c) => c.element.id)).toEqual(['ie-2']);
    expect(g.deferred.map((c) => c.element.id)).toEqual(['ie-3']);
    expect(g.released.map((c) => c.element.id)).toEqual(['ie-4']);
  });

  it('carries the condition + note through with the element', () => {
    const g = groupClassifications(elements, classifications);
    expect(g.conditional[0]?.classification.condition).toBe(
      'stock water confirmed first',
    );
    expect(g.released[0]?.classification.note).toBe('no viable site');
  });

  it('preserves element order within a group', () => {
    const two: IntentElement[] = [
      el('a', 'Alpha'),
      el('b', 'Beta'),
      el('c', 'Gamma'),
    ];
    const cls: Record<string, ElementClassification> = {
      a: { status: 'conditional' },
      b: { status: 'feasible' },
      c: { status: 'conditional' },
    };
    expect(groupClassifications(two, cls).conditional.map((c) => c.element.id)).toEqual([
      'a',
      'c',
    ]);
  });

  it('returns empty groups when nothing is classified', () => {
    const g = groupClassifications(elements, {});
    expect(g.feasible).toEqual([]);
    expect(g.conditional).toEqual([]);
    expect(g.deferred).toEqual([]);
    expect(g.released).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Amanah -- the gate copy is covenant-clean
// ---------------------------------------------------------------------------

describe('MODE4_GATE_COPY -- Amanah wording pin', () => {
  function allStrings(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (value && typeof value === 'object') {
      return Object.values(value).flatMap(allStrings);
    }
    return [];
  }

  it('contains no advance-sale / CSA / subscription / yield-share framing', () => {
    for (const s of allStrings(MODE4_GATE_COPY)) {
      expect(detectCsaLikeText(s)).toBe(false);
    }
  });
});
