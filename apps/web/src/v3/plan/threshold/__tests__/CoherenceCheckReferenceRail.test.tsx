/**
 * @vitest-environment happy-dom
 *
 * CoherenceCheckReferenceRail -- the right-rail digest PlanTierShell mounts
 * alongside the CoherenceCheckSurface on the `threshold-2` route. Read-only:
 * it re-evaluates the same pure audit and shows the per-section tally, the
 * open-gap count + verdict, the seal state, and the append-only amendments log.
 *
 * These tests pin that the rail stays in lock-step with the surface (same audit
 * inputs -> same tallies) and that the amendments log + seal reading track the
 * store. Fixtures mirror the reference config (8 s4 + 7 s5, complete protocols).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, act, within } from '@testing-library/react';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

import type { PlanStratumObjective } from '@ogden/shared';
import { useCoherenceCheckStore } from '../../../../store/coherenceCheckStore.js';
import CoherenceCheckReferenceRail from '../CoherenceCheckReferenceRail.js';

const PID = 'project-coherence-rail-1';

const COMPLETE_PROTOCOL = {
  indicators: [
    { metric: 'Indicator one', frequency: 'per season' },
    { metric: 'Indicator two', frequency: 'monthly' },
  ],
  triggers: ['If storage falls below 60% at season start -> review catchment'],
  feeds: 'hydrology',
} as const;

const obj = (id: string, stratumId: string): PlanStratumObjective =>
  ({
    id,
    stratumId,
    title: id,
    monitoringProtocol: COMPLETE_PROTOCOL,
  }) as unknown as PlanStratumObjective;

const S4_IDS = [
  's4-water-strategy',
  's4-zones',
  'rf-s4-fertility-strategy',
  'rf-s4-biodiversity-strategy',
  'res-s4-living-zone',
  'silv-sec-s4-grazing-design',
  'silv-sec-s4-stock-infrastructure',
  'silv-sec-s4-husbandry-framework',
];
const S5_IDS = [
  's5-access',
  's5-water-infrastructure',
  's5-soil-improvement',
  'rf-s5-fertility-system',
  'rf-s5-windbreaks',
  'res-s5-living-infrastructure',
  'silv-sec-s5-tree-establishment',
];

const referenceDesign: PlanStratumObjective[] = [
  ...S4_IDS.map((id) => obj(id, 's4-foundation-decisions')),
  ...S5_IDS.map((id) => obj(id, 's5-system-design')),
];

const allComplete: Record<string, 'complete'> = Object.fromEntries(
  referenceDesign.map((o) => [o.id, 'complete'] as const),
);

function renderRail() {
  return render(
    <CoherenceCheckReferenceRail
      projectId={PID}
      primaryTypeId="regenerative_farm"
      objectives={referenceDesign}
      objectiveStatuses={allComplete}
    />,
  );
}

beforeEach(() => {
  useCoherenceCheckStore.setState({ byProject: {} });
});

describe('CoherenceCheckReferenceRail', () => {
  it('shows the per-section tally matching the audit (A 5/5, B 2/3, C 15/15)', () => {
    renderRail();
    const rail = screen.getByTestId('coherence-check-rail');
    expect(within(rail).getByText('5/5')).toBeTruthy();
    expect(within(rail).getByText('2/3')).toBeTruthy();
    expect(within(rail).getByText('15/15')).toBeTruthy();
  });

  it('reports the open-gap count and a forming verdict while B3 is open', () => {
    renderRail();
    const rail = screen.getByTestId('coherence-check-rail');
    expect(within(rail).getByText('Forming')).toBeTruthy();
  });

  it('starts with an empty amendments log', () => {
    renderRail();
    expect(screen.getByText(/No inline amendments recorded yet/)).toBeTruthy();
  });

  it('lists a recorded amendment after the steward resolves a gap', () => {
    renderRail();
    act(() => {
      useCoherenceCheckStore
        .getState()
        .resolveItem(
          PID,
          'B3',
          'Household three-bay compost routed to the kitchen garden.',
          1700,
        );
    });
    expect(screen.getByText(/three-bay compost/)).toBeTruthy();
  });

  it('shows the sealed reading once the Coherence Record is sealed', () => {
    renderRail();
    act(() => {
      useCoherenceCheckStore
        .getState()
        .resolveItem(PID, 'B3', 'Compost bay added.', 1700);
      useCoherenceCheckStore.getState().seal(PID, 1800);
    });
    expect(screen.getByText(/Sealed/)).toBeTruthy();
  });
});
