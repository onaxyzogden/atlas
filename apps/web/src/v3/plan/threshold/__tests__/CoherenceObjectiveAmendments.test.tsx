/**
 * @vitest-environment happy-dom
 *
 * CoherenceObjectiveAmendments -- the Plan-only on-objective overlay (Stage 5).
 * These tests pin the "render on the amended objective ONLY" contract:
 *   - an objective with no recorded amendment renders nothing (self-gates);
 *   - a Section-B amendment (B3) surfaces on the residential design objective it
 *     cites as evidence, and NOT on an unrelated objective;
 *   - a Section-C coverage amendment surfaces on its own objective, labelled
 *     "C / <id>" with a permanent recorded date.
 *
 * The overlay reads the real coherenceCheckStore (driven through `resolveItem`),
 * exactly as it does at runtime.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, act } from '@testing-library/react';

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

import { useCoherenceCheckStore } from '../../../../store/coherenceCheckStore.js';
import { COHERENCE_COPY, coverageItemId } from '../coherenceCheckModel.js';
import CoherenceObjectiveAmendments from '../CoherenceObjectiveAmendments.js';

const PID = 'project-coherence-overlay-1';
const TS = 1700000000000; // 2023-11-14 (deterministic)

beforeEach(() => {
  useCoherenceCheckStore.setState({ byProject: {} });
});

describe('CoherenceObjectiveAmendments', () => {
  it('renders nothing for an objective with no recorded amendment', () => {
    const { container } = render(
      <CoherenceObjectiveAmendments
        projectId={PID}
        objectiveId="res-s5-living-infrastructure"
      />,
    );
    expect(
      container.querySelector('[data-testid="objective-coherence-amendments"]'),
    ).toBeNull();
  });

  it('surfaces a B3 amendment on the residential design objective it touches', () => {
    act(() => {
      useCoherenceCheckStore
        .getState()
        .resolveItem(
          PID,
          'B3',
          'Household three-bay compost routed to the kitchen garden.',
          TS,
        );
    });
    render(
      <CoherenceObjectiveAmendments
        projectId={PID}
        objectiveId="res-s5-living-infrastructure"
      />,
    );
    expect(screen.getByTestId('objective-coherence-amendments')).toBeTruthy();
    expect(screen.getByTestId('coherence-amendment-B3')).toBeTruthy();
    expect(screen.getByText(/three-bay compost/)).toBeTruthy();
    expect(screen.getByText(COHERENCE_COPY.onObjective.label)).toBeTruthy();
  });

  it('does NOT surface that amendment on an unrelated objective', () => {
    act(() => {
      useCoherenceCheckStore
        .getState()
        .resolveItem(PID, 'B3', 'Compost bay added.', TS);
    });
    const { container } = render(
      <CoherenceObjectiveAmendments projectId={PID} objectiveId="s4-zones" />,
    );
    expect(
      container.querySelector('[data-testid="objective-coherence-amendments"]'),
    ).toBeNull();
  });

  it('surfaces a Section-C coverage amendment on its own objective, labelled "C / <id>"', () => {
    const itemId = coverageItemId('s5-access');
    act(() => {
      useCoherenceCheckStore
        .getState()
        .resolveItem(
          PID,
          itemId,
          'Two indicators with frequency, a trigger, and an Observe feed added.',
          TS,
        );
    });
    render(
      <CoherenceObjectiveAmendments projectId={PID} objectiveId="s5-access" />,
    );
    const item = screen.getByTestId(`coherence-amendment-${itemId}`);
    expect(item.textContent).toContain('C / s5-access');
    expect(screen.getByText(/Recorded 2023-11-14/)).toBeTruthy();
  });
});
