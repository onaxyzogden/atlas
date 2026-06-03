// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  canApproveLoop,
  type LoopApprovalInput,
} from '../loopApprovalGate.js';

type Endpoint = { sourceId: string | null; sinkId: string | null };

function flow(sourceId: string | null, sinkId: string | null): Endpoint {
  return { sourceId, sinkId };
}

function input(over: Partial<LoopApprovalInput> = {}): LoopApprovalInput {
  return {
    vectors: [],
    fertilityWithoutFeedstock: [],
    orphanFertility: [],
    ...over,
  };
}

describe('canApproveLoop', () => {
  it('blocks an empty design with a no-flows reason', () => {
    const v = canApproveLoop(input(), false);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/no material flows/i);
    expect(v.counts).toEqual({
      flows: 0,
      danglingEndpoints: 0,
      orphanOutputs: 0,
      orphanFertility: 0,
    });
  });

  it('blocks when any flow has an unpinned endpoint', () => {
    const v = canApproveLoop(
      input({ vectors: [flow('a', 'b'), flow('c', null), flow(null, 'd')] }),
      false,
    );
    expect(v.ok).toBe(false);
    expect(v.counts.danglingEndpoints).toBe(2);
    expect(v.reason).toMatch(/unpinned endpoint/i);
  });

  it('blocks orphan fertility nodes before checking outputs', () => {
    const v = canApproveLoop(
      input({
        vectors: [flow('a', 'b')],
        orphanFertility: [{}, {}],
        fertilityWithoutFeedstock: [{}],
      }),
      true, // even with the escape hatch, orphan fertility still blocks
    );
    expect(v.ok).toBe(false);
    expect(v.counts.orphanFertility).toBe(2);
    expect(v.reason).toMatch(/no flow in or out/i);
  });

  it('blocks orphan outputs when the escape hatch is off', () => {
    const v = canApproveLoop(
      input({ vectors: [flow('a', 'b')], fertilityWithoutFeedstock: [{}] }),
      false,
    );
    expect(v.ok).toBe(false);
    expect(v.counts.orphanOutputs).toBe(1);
    expect(v.reason).toMatch(/no feedstock/i);
  });

  it('permits orphan outputs when the escape hatch is on', () => {
    const v = canApproveLoop(
      input({ vectors: [flow('a', 'b')], fertilityWithoutFeedstock: [{}, {}] }),
      true,
    );
    expect(v.ok).toBe(true);
    expect(v.counts.orphanOutputs).toBe(2);
    expect(v.reason).toMatch(/ready to approve/i);
  });

  it('approves a fully closed loop', () => {
    const v = canApproveLoop(
      input({ vectors: [flow('a', 'b'), flow('b', 'c')] }),
      false,
    );
    expect(v.ok).toBe(true);
    expect(v.counts).toEqual({
      flows: 2,
      danglingEndpoints: 0,
      orphanOutputs: 0,
      orphanFertility: 0,
    });
    expect(v.reason).toMatch(/ready to approve/i);
  });
});
