import { describe, it, expect } from 'vitest';
import type { SwotEntry } from '../../../../../store/swotStore.js';
import { swotCounts, swotKpis, journalMetrics } from '../derivations.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeEntry(bucket: SwotEntry['bucket']): SwotEntry {
  return {
    id: `e-${Math.random()}`,
    projectId: 'p1',
    bucket,
    title: `${bucket} entry`,
    createdAt: new Date().toISOString(),
  };
}

// ── swotCounts ────────────────────────────────────────────────────────────────

describe('swotCounts', () => {
  it('returns all zeros for empty array', () => {
    const c = swotCounts([]);
    expect(c.total).toBe(0);
    expect(c.S).toBe(0);
    expect(c.W).toBe(0);
    expect(c.O).toBe(0);
    expect(c.T).toBe(0);
  });

  it('counts each bucket correctly', () => {
    const entries = [
      makeEntry('S'), makeEntry('S'), makeEntry('S'),
      makeEntry('W'),
      makeEntry('O'), makeEntry('O'),
      makeEntry('T'),
    ];
    const c = swotCounts(entries);
    expect(c.total).toBe(7);
    expect(c.S).toBe(3);
    expect(c.W).toBe(1);
    expect(c.O).toBe(2);
    expect(c.T).toBe(1);
  });
});

// ── swotKpis ──────────────────────────────────────────────────────────────────

describe('swotKpis', () => {
  it('all values are dash for empty entries', () => {
    const kpis = swotKpis([]);
    for (const kpi of kpis) {
      expect(kpi.value).toBe('—');
      expect(kpi.tone).toBe('dim');
    }
  });

  it('shows live count when strengths present', () => {
    const kpis = swotKpis([makeEntry('S'), makeEntry('S'), makeEntry('W')]);
    const s = kpis.find((k) => k.label === 'Strengths');
    expect(s?.value).toBe('2');
    expect(s?.tone).toBe('green');
  });

  it('threats entry shows red tone', () => {
    const kpis = swotKpis([makeEntry('T')]);
    const t = kpis.find((k) => k.label === 'Threats');
    expect(t?.value).toBe('1');
    expect(t?.tone).toBe('red');
  });
});

// ── journalMetrics ────────────────────────────────────────────────────────────

describe('journalMetrics', () => {
  it('all values are dash for empty entries', () => {
    const metrics = journalMetrics([]);
    for (const m of metrics) {
      expect(m.value).toBe('—');
    }
  });

  it('total entry count matches sum', () => {
    const entries = [makeEntry('S'), makeEntry('W'), makeEntry('O'), makeEntry('T')];
    const metrics = journalMetrics(entries);
    const total = metrics.find((m) => m.label === 'Total entries');
    expect(total?.value).toBe('4');
  });

  it('returns 5 metric items', () => {
    expect(journalMetrics([]).length).toBe(5);
  });
});
