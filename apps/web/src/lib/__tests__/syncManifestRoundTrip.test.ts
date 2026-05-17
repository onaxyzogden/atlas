// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { SYNCED_STORES, type SyncedStoreDescriptor } from '../syncManifest';

/**
 * P0-1 contract: for EVERY versioned-blob store, `selectForProject` and
 * `applyForProject` must be true inverses across the JSON wire, and applying
 * one project's slice must never disturb another project's rows. Phase 4
 * shipped these on all 57 descriptors but `syncManifest.test.ts` only
 * spot-checks 2 — this table-driven guard exercises all of them.
 *
 * No syncService import → the module-global `blobBaseRev` /
 * `blobVersionSkewWarned` are irrelevant here. Each descriptor still gets a
 * fresh handle + unique project ids so no case can bleed into another.
 */

const blobStores = SYNCED_STORES.filter(
  (d) => d.classification === 'versioned-blob',
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeHandle(initial: any = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let state: any = { ...initial };
  return {
    getState: () => state,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setState: (p: any) => {
      state = { ...state, ...(typeof p === 'function' ? p(state) : p) };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peek: () => state,
  };
}

/**
 * Build a valid select-shaped payload for `pid` from the store's own empty
 * slice (so we never hard-code 57 fixtures or reach into private shapes).
 * Rows carry `projectId` so `projectId-tagged` select filters keep them.
 */
function seedFrom(empty: unknown, pid: string): unknown {
  if (Array.isArray(empty)) return [{ __rt: pid }];
  if (empty === null || empty === undefined) {
    return { __rt: pid, projectId: pid };
  }
  if (typeof empty === 'object') {
    const keys = Object.keys(empty as Record<string, unknown>);
    if (keys.length === 0) return { __rt: pid };
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      const v = (empty as Record<string, unknown>)[k];
      out[k] = Array.isArray(v)
        ? [{ __rt: pid, projectId: pid }]
        : { __rt: pid };
    }
    return out;
  }
  return { __rt: pid };
}

const wire = (x: unknown) => JSON.parse(JSON.stringify(x));

describe('versioned-blob select↔apply round-trip (all stores)', () => {
  it('enumerates the full blob surface', () => {
    expect(blobStores.length).toBeGreaterThanOrEqual(57);
  });

  it.each(blobStores.map((d) => [d.storeKey, d] as const))(
    '%s round-trips its project slice and isolates other projects',
    (_key, d: SyncedStoreDescriptor) => {
      const A = `${d.storeKey}-A`;
      const B = `${d.storeKey}-B`;
      const select = d.selectForProject!;
      const apply = d.applyForProject!;

      const emptyA = select({}, A);
      const seedA = seedFrom(emptyA, A);
      const seedB = seedFrom(select({}, B), B);

      // Seed B first, then A, on one handle — A must not clobber B.
      const h = makeHandle();
      apply(h as never, B, seedB);
      apply(h as never, A, seedA);

      const pulledA = wire(select(h.peek(), A));
      expect(pulledA, `${d.storeKey}: select(A) must equal seedA`).toEqual(
        wire(seedA),
      );

      // Hydrate A's wire payload onto a fresh handle pre-seeded with B.
      const h2 = makeHandle();
      apply(h2 as never, B, seedB);
      apply(h2 as never, A, pulledA);

      expect(
        wire(select(h2.peek(), A)),
        `${d.storeKey}: A survives the wire round-trip`,
      ).toEqual(wire(seedA));

      if (d.scope !== 'active-singleton') {
        expect(
          wire(select(h2.peek(), B)),
          `${d.storeKey}: B's slice must be untouched by A's apply`,
        ).toEqual(wire(seedB));
      }
    },
  );
});
