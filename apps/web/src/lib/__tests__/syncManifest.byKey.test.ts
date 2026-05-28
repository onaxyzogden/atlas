// @vitest-environment happy-dom
/**
 * byKey.apply guard: an empty/404 server bucket can hand the apply path
 * `undefined`. The original code wrote that straight into `byProject[pid]`
 * (or its `leaf`), leaving downstream renderers calling `.map` / `.filter`
 * on undefined and crashing the Vite refresh overlay on Act surfaces.
 *
 * The fix falls back to the descriptor's registered `empty` shape — the same
 * defensive pattern `tagged.apply` already uses (`Array.isArray(inc) ? inc : []`).
 *
 * `byKey` itself is private, so these tests exercise the guard through a
 * representative byKey descriptor (`ogden-hazards`, leaf-shaped) and a
 * leaf-less byKey descriptor for parity.
 */

import { describe, expect, it } from 'vitest';
import { SYNCED_STORES } from '../syncManifest';

function makeHandle(initial: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = { ...initial };
  return {
    getState: () => state,
    setState: (p: unknown) => {
      state = {
        ...state,
        ...(typeof p === 'function'
          ? (p as (s: Record<string, unknown>) => Record<string, unknown>)(state)
          : (p as Record<string, unknown>)),
      };
    },
    peek: () => state,
  };
}

describe('byKey.apply: undefined-incoming guard', () => {
  it('leaf-shaped descriptor falls back to registered empty when incoming is undefined', () => {
    // ogden-hazards is byKey('byProject', 'hazards', []) — leaf path.
    const hz = SYNCED_STORES.find((d) => d.storeKey === 'ogden-hazards');
    expect(hz, 'ogden-hazards must exist in SYNCED_STORES').toBeDefined();
    const handle = makeHandle({ byProject: {} });
    hz!.applyForProject!(handle as never, 'A', undefined as never);
    const after = handle.peek() as { byProject: Record<string, { hazards: unknown }> };
    expect(after.byProject.A!.hazards).toEqual([]);
    expect(after.byProject.A!.hazards).not.toBeUndefined();
  });

  it('leaf-shaped descriptor accepts null the same way', () => {
    const hz = SYNCED_STORES.find((d) => d.storeKey === 'ogden-hazards')!;
    const handle = makeHandle({ byProject: {} });
    hz.applyForProject!(handle as never, 'A', null as never);
    const after = handle.peek() as { byProject: Record<string, { hazards: unknown }> };
    expect(after.byProject.A!.hazards).toEqual([]);
  });

  it('does not disturb sibling projects when guarding undefined', () => {
    const hz = SYNCED_STORES.find((d) => d.storeKey === 'ogden-hazards')!;
    const handle = makeHandle({
      byProject: { B: { hazards: [{ id: 'b1' }] } },
    });
    hz.applyForProject!(handle as never, 'A', undefined as never);
    const after = handle.peek() as {
      byProject: Record<string, { hazards: unknown }>;
    };
    expect(after.byProject.A!.hazards).toEqual([]);
    expect(after.byProject.B!.hazards).toEqual([{ id: 'b1' }]);
  });

  it('leaf-less descriptor with {} empty: undefined → {}, not undefined', () => {
    // ogden-sectors is byKey('byProject', null, {}) — leaf-less, object empty.
    const sec = SYNCED_STORES.find((d) => d.storeKey === 'ogden-sectors')!;
    const handle = makeHandle({ byProject: {} });
    sec.applyForProject!(handle as never, 'A', undefined as never);
    const after = handle.peek() as { byProject: Record<string, unknown> };
    expect(after.byProject.A).toEqual({});
    expect(after.byProject.A).not.toBeUndefined();
  });

  it('leaf-less descriptor with [] empty: undefined → [], not undefined', () => {
    // ogden-soil-tests is byKey('byProject', null, []) — leaf-less, array empty.
    const soil = SYNCED_STORES.find((d) => d.storeKey === 'ogden-soil-tests')!;
    const handle = makeHandle({ byProject: {} });
    soil.applyForProject!(handle as never, 'A', undefined as never);
    const after = handle.peek() as { byProject: Record<string, unknown> };
    expect(after.byProject.A).toEqual([]);
    expect(after.byProject.A).not.toBeUndefined();
  });
});
