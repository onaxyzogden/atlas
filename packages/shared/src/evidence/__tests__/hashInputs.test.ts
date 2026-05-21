/**
 * hashInputs — F.4 reproducibility-anchor unit tests.
 */

import { describe, it, expect } from 'vitest';
import { stableStringify, hashInputs } from '../hashInputs.js';

describe('stableStringify — F.4', () => {
  it('is key-order insensitive at the top level', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  it('is key-order insensitive recursively', () => {
    expect(stableStringify({ outer: { a: 1, b: 2 } })).toBe(
      stableStringify({ outer: { b: 2, a: 1 } }),
    );
  });

  it('preserves array order (arrays are ordered data)', () => {
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });

  it('drops undefined values inside objects (JSON.stringify parity)', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
  });
});

describe('hashInputs — F.4', () => {
  it('returns a 64-char lowercase hex digest', async () => {
    const hash = await hashInputs({ a: 1 });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('identical inputs hash equal (reproducibility invariant)', async () => {
    const h1 = await hashInputs({ acreage: 12.4, koppen: 'Csa' });
    const h2 = await hashInputs({ acreage: 12.4, koppen: 'Csa' });
    expect(h1).toBe(h2);
  });

  it('key-order does not change the hash', async () => {
    const h1 = await hashInputs({ a: 1, b: 2 });
    const h2 = await hashInputs({ b: 2, a: 1 });
    expect(h1).toBe(h2);
  });

  it('differs when a value differs', async () => {
    const h1 = await hashInputs({ acreage: 12.4 });
    const h2 = await hashInputs({ acreage: 12.5 });
    expect(h1).not.toBe(h2);
  });
});
