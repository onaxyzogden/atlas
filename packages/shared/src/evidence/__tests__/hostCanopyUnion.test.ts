// packages/shared/src/evidence/__tests__/hostCanopyUnion.test.ts
//
// Phase H.1 — unit tests for the host-canopy-union evidence selector.

import { describe, expect, it } from 'vitest';

import { selectEvidenceFor } from '../selectEvidence.js';
import {
  selectHostCanopyUnionEvidence,
  type HostCanopyUnionEntry,
  type HostCanopyUnionEvidenceInputs,
} from '../selectors/hostCanopyUnion.js';
import { stableStringify } from '../hashInputs.js';

const entry = (overrides: Partial<HostCanopyUnionEntry> = {}): HostCanopyUnionEntry => ({
  hostId: 'host:apple-1',
  hostName: 'Apple',
  unionAreaM2: 100,
  rawSumM2: 100,
  guildCount: 2,
  memberCount: 4,
  ...overrides,
});

describe('selectHostCanopyUnionEvidence', () => {
  it('returns an empty-but-valid item when no entries are present', () => {
    const item = selectHostCanopyUnionEvidence({ entries: [] });
    expect(item.panelKey).toBe('host-canopy-union');
    expect(item.summary.value).toBe(0);
    expect(item.summary.unit).toBe('m²');
    const hostsFragment = item.evidence.find((f) => f.label === 'Hosts in union');
    expect(hostsFragment?.value).toBe(0);
    // No per-host fragments when entries is empty.
    expect(item.evidence.some((f) => f.label === 'Apple')).toBe(false);
  });

  it('assigns high confidence when union ≈ raw (no overlap)', () => {
    const item = selectHostCanopyUnionEvidence({
      entries: [entry({ unionAreaM2: 200, rawSumM2: 200 })],
    });
    const overlap = item.evidence.find((f) => f.label === 'Overlap correction');
    expect(overlap?.source.confidence).toBe('high');
    expect(overlap?.value).toBe('100%');
  });

  it('assigns medium confidence at moderate overlap (≈ 0.7)', () => {
    const item = selectHostCanopyUnionEvidence({
      entries: [
        entry({ hostId: 'h1', hostName: 'Apple', unionAreaM2: 70, rawSumM2: 100 }),
      ],
    });
    const host = item.evidence.find((f) => f.label === 'Apple');
    expect(host?.source.confidence).toBe('medium');
  });

  it('assigns low confidence under heavy overlap (< 0.5)', () => {
    const item = selectHostCanopyUnionEvidence({
      entries: [
        entry({ hostId: 'h1', hostName: 'Pear', unionAreaM2: 30, rawSumM2: 100 }),
      ],
    });
    const host = item.evidence.find((f) => f.label === 'Pear');
    expect(host?.source.confidence).toBe('low');
  });

  it('caps per-host fragments at 6 and surfaces an overflow fragment', () => {
    const entries: HostCanopyUnionEntry[] = Array.from({ length: 9 }, (_, i) =>
      entry({ hostId: `h${i}`, hostName: `Host ${i}` }),
    );
    const item = selectHostCanopyUnionEvidence({ entries });
    const hostFragments = item.evidence.filter((f) =>
      f.source.derivation?.startsWith('host:'),
    );
    expect(hostFragments).toHaveLength(6);
    const overflow = item.evidence.find((f) => f.label === 'Additional hosts');
    expect(overflow?.value).toBe(3);
  });

  it('is deterministic — identical inputs produce identical stable-stringified output', () => {
    const inputs: HostCanopyUnionEvidenceInputs = {
      entries: [
        entry({ hostId: 'h1', hostName: 'Apple', unionAreaM2: 80, rawSumM2: 100 }),
        entry({ hostId: 'h2', hostName: 'Pear', unionAreaM2: 60, rawSumM2: 100 }),
      ],
    };
    const a = stableStringify(selectHostCanopyUnionEvidence(inputs));
    const b = stableStringify(selectHostCanopyUnionEvidence(inputs));
    expect(a).toBe(b);
  });

  it('routes through the top-level dispatcher', () => {
    const item = selectEvidenceFor({
      panelKey: 'host-canopy-union',
      inputs: { entries: [entry()] },
    });
    expect(item?.panelKey).toBe('host-canopy-union');
  });
});
