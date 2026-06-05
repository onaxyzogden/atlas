import { describe, it, expect } from 'vitest';
import { buildSequenceLayout } from '../goalCompassSequenceLayout.js';
import type { SelectedIntervention } from '../sequencingEngine.js';
import type { Intervention } from '../../../data/goalCompassTypes.js';
import type { PhaseKey } from '../../../types.js';

/** Minimal SelectedIntervention factory — only the fields the layout reads. */
function sel(
  id: string,
  yeomansPhase: PhaseKey,
  prerequisites: string[] = [],
  startYearOffset = 0,
): SelectedIntervention {
  const intervention = {
    id,
    name: id.toUpperCase(),
    yeomansPhase,
    prerequisites,
  } as unknown as Intervention;
  return {
    intervention,
    acresAllocated: 1,
    startYearOffset,
    laborHrsTotal: 10,
    costMidUSD: 100,
  };
}

describe('buildSequenceLayout', () => {
  it('creates a band only for used phases, ordered by Yeomans permanence', () => {
    // Provide soil first, climate second — output must reorder climate → soil.
    const layout = buildSequenceLayout([sel('a', 'soil'), sel('b', 'climate')], []);
    expect(layout.bands).toHaveLength(2);
    expect(layout.bands.map((band) => band.phaseKey)).toEqual(['climate', 'soil']);
    expect(layout.bands[0]?.index).toBe(0);
    // No band for unused phases (water/trees/etc.).
    expect(layout.bands.some((band) => band.phaseKey === 'water')).toBe(false);
  });

  it('draws an edge only when the prerequisite is itself selected', () => {
    // b depends on a (selected) and on "ghost" (NOT selected → dangling).
    const layout = buildSequenceLayout(
      [sel('a', 'climate'), sel('b', 'water', ['a', 'ghost'])],
      [],
    );
    expect(layout.edges).toEqual([{ fromId: 'a', toId: 'b' }]);
  });

  it('preserves build order within a band along the x axis', () => {
    const layout = buildSequenceLayout(
      [sel('first', 'trees'), sel('second', 'trees'), sel('third', 'trees')],
      [],
    );
    const xOf = (id: string): number =>
      layout.nodes.find((n) => n.id === id)?.x ?? -1;
    expect(xOf('first')).toBeLessThan(xOf('second'));
    expect(xOf('second')).toBeLessThan(xOf('third'));
  });

  it('places each node on the band centre matching its yeomansPhase', () => {
    const layout = buildSequenceLayout([sel('a', 'climate'), sel('b', 'soil')], []);
    const climateBand = layout.bands.find((band) => band.phaseKey === 'climate')!;
    const soilBand = layout.bands.find((band) => band.phaseKey === 'soil')!;
    expect(layout.nodes.find((n) => n.id === 'a')!.y).toBe(climateBand.centerY);
    expect(layout.nodes.find((n) => n.id === 'b')!.y).toBe(soilBand.centerY);
  });

  it('prefers the generated BuildPhase label + colour when available', () => {
    const layout = buildSequenceLayout(
      [sel('a', 'climate')],
      // Engine emits BuildPhase.name === PHASE_LABEL[phaseKey].
      [
        {
          id: 'p1',
          name: 'Climate & assessment',
          color: '#abcdef',
        } as never,
      ],
    );
    expect(layout.bands[0]?.label).toBe('Climate & assessment');
    expect(layout.bands[0]?.color).toBe('#abcdef');
  });
});
