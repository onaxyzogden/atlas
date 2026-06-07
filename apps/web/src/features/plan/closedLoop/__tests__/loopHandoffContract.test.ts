// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { buildLoopActPayload } from '../loopHandoffContract.js';
import type { MaterialFlow } from '../../../../store/closedLoopStore.js';

function mkFlow(over: Partial<MaterialFlow> & { id: string }): MaterialFlow {
  return {
    projectId: 'p1',
    label: over.id,
    materialKind: 'compost',
    sourceId: null,
    sinkId: null,
    origin: 'list',
    createdAt: '2026-06-03T00:00:00.000Z',
    ...over,
  };
}

const PROJECT = { id: 'p1' };
const NODES = {
  nodes: [
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'coop', label: 'Chicken coop' },
    { id: 'composter', label: 'Composter' },
    { id: 'orchard', label: 'Orchard' },
  ],
};

describe('buildLoopActPayload', () => {
  it('returns empty arrays + a no-flows workScope for an empty design', () => {
    const { payload, summary } = buildLoopActPayload(PROJECT, [], [], NODES);
    expect(payload.materials).toEqual([]);
    expect(payload.monitoringRequirements).toEqual([]);
    expect(payload.successCriteria).toEqual([]);
    expect(payload.sequence).toEqual([]);
    expect(payload.workScope).toMatch(/no flows/i);
    expect(summary).toEqual({
      flowCount: 0,
      closedLoopCount: 0,
      withCadenceCount: 0,
      withThroughputCount: 0,
      materialCount: 0,
      monitoringCount: 0,
      sequenceCount: 0,
    });
  });

  it('maps throughput to a material with the dominant unit', () => {
    const flows = [
      mkFlow({ id: 'f-mass', sourceId: 'coop', sinkId: 'composter', massKgPerMonth: 12 }),
      mkFlow({ id: 'f-vol', sourceId: 'kitchen', sinkId: 'coop', volumeLPerMonth: 40 }),
      mkFlow({ id: 'f-none', sourceId: 'composter', sinkId: 'orchard' }),
    ];
    const { payload, summary } = buildLoopActPayload(PROJECT, flows, [], NODES);
    const mass = payload.materials!.find((m) => m.id === 'mat-f-mass')!;
    expect(mass.quantity).toBe(12);
    expect(mass.unit).toBe('kg/month');
    const vol = payload.materials!.find((m) => m.id === 'mat-f-vol')!;
    expect(vol.quantity).toBe(40);
    expect(vol.unit).toBe('L/month');
    const none = payload.materials!.find((m) => m.id === 'mat-f-none')!;
    expect(none.quantity).toBeUndefined();
    expect(none.sourceNote).toContain('Composter -> Orchard');
    expect(summary.withThroughputCount).toBe(2);
    expect(summary.materialCount).toBe(3);
  });

  it('emits monitoring only for flows with a cadence, labelled', () => {
    const flows = [
      mkFlow({ id: 'f1', sourceId: 'coop', sinkId: 'composter', cadence: 'weekly' }),
      mkFlow({ id: 'f2', sourceId: 'kitchen', sinkId: 'coop' }),
    ];
    const { payload, summary } = buildLoopActPayload(PROJECT, flows, [], NODES);
    expect(payload.monitoringRequirements).toHaveLength(1);
    expect(payload.monitoringRequirements![0]!.id).toBe('mon-f1');
    expect(payload.monitoringRequirements![0]!.cadence).toBe('Weekly');
    expect(summary.withCadenceCount).toBe(1);
  });

  it('emits success criteria only for closed-loop flows', () => {
    const flows = [
      mkFlow({ id: 'closed', sourceId: 'coop', sinkId: 'composter' }),
      mkFlow({ id: 'dangling', sourceId: 'kitchen', sinkId: null }),
    ];
    const { payload, summary } = buildLoopActPayload(PROJECT, flows, [], NODES);
    expect(payload.successCriteria).toHaveLength(1);
    expect(payload.successCriteria![0]!.id).toBe('sc-closed');
    expect(summary.closedLoopCount).toBe(1);
  });

  it('orders the sequence upstream-to-downstream and names via waypoints', () => {
    // Designed out of order: orchard<-composter is downstream of kitchen->coop.
    const flows = [
      mkFlow({ id: 'b', sourceId: 'composter', sinkId: 'orchard' }),
      mkFlow({ id: 'a', sourceId: 'kitchen', sinkId: 'composter', transformationNodeIds: ['coop'] }),
    ];
    const { payload } = buildLoopActPayload(PROJECT, flows, [], NODES);
    expect(payload.sequence).toEqual([
      'Kitchen -> Chicken coop -> Composter: a',
      'Composter -> Orchard: b',
    ]);
  });

  it('breaks a pure cycle deterministically in input order', () => {
    const flows = [
      mkFlow({ id: 'x', sourceId: 'coop', sinkId: 'composter' }),
      mkFlow({ id: 'y', sourceId: 'composter', sinkId: 'coop' }),
    ];
    const { payload } = buildLoopActPayload(PROJECT, flows, [], NODES);
    expect(payload.sequence).toEqual([
      'Chicken coop -> Composter: x',
      'Composter -> Chicken coop: y',
    ]);
  });

  it('falls back to free-text labels then ids for unresolved endpoints', () => {
    const flows = [
      mkFlow({ id: 'f', sourceId: null, sinkId: 'unknownId', sourceLabel: 'Roadside stall' }),
    ];
    const { payload } = buildLoopActPayload(PROJECT, flows, [], NODES);
    expect(payload.sequence![0]).toBe('Roadside stall -> unknownId: f');
  });
});
