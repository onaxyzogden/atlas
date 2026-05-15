import { describe, expect, it } from 'vitest';
import { seedRng } from '../rng.js';

describe('seedRng', () => {
  it('is deterministic for the same seed', () => {
    const a = seedRng('proj-1gen-1');
    const b = seedRng('proj-1gen-1');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs for different seeds', () => {
    const a = seedRng('proj-1gen-1');
    const b = seedRng('proj-1gen-2');
    expect(a.next()).not.toBe(b.next());
  });

  it('next() stays in [0,1)', () => {
    const r = seedRng('x');
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() respects inclusive bounds', () => {
    const r = seedRng('y');
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('int() with max<=min returns min', () => {
    const r = seedRng('z');
    expect(r.int(5, 5)).toBe(5);
    expect(r.int(9, 2)).toBe(9);
  });
});
