/**
 * @vitest-environment happy-dom
 *
 * ObjectiveColumn -- review-flag chip threading (T1.7).
 *
 * Verified behaviour: when reviewFlagStore has an open flag for an objective
 * in the rendered column, the corresponding ObjectiveCard shows the amber
 * "Review" chip (confirming that useReviewFlagCountsByObjective is wired
 * through and passed as reviewFlagCount to each card).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useReviewFlagStore } from '../../../../store/reviewFlagStore.js';
import { findObjectiveGlobally } from '../../objectiveCatalog.js';
import ObjectiveColumn from '../ObjectiveColumn.js';
import type { PlanStratum } from '@ogden/shared';

// lucide-react -- stub icons using the importOriginal + forwardRef-SVG pattern
// (established in ActTierExecutionPanel.protocols.test.tsx). Avoids the CJS
// React-instance mismatch crash and the Proxy infinite-recursion crash.
vi.mock('lucide-react', async (importOriginal) => {
  const React = await import('react');
  let actual: Record<string, unknown>;
  try {
    actual = await importOriginal<Record<string, unknown>>();
  } catch {
    actual = {};
  }
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' && value !== null && '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', { ref, 'data-lucide-icon': key, 'aria-hidden': 'true' });
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

const PROJECT_ID = 'test-objcol-reviewflags';

// Use s6-yield-flows as a real objective belonging to s6-integration-design.
const objective = findObjectiveGlobally('s6-yield-flows')!;

const STRATUM: PlanStratum = {
  id: 's6-integration-design',
  ordinal: 6,
  title: 'Integration Design',
  summary: 'How the systems integrate -- yield flows, ecology, stewardship intensity.',
};

beforeEach(() => {
  // Reset store state and localStorage between tests.
  useReviewFlagStore.setState({ byProject: {} });
  window.localStorage.clear();
});

describe('ObjectiveColumn -- reviewFlagCount threading', () => {
  it('shows the Review chip on an objective card when an open flag exists', () => {
    // Seed one open review flag for the objective.
    useReviewFlagStore.getState().raiseFlag({
      projectId: PROJECT_ID,
      objectiveId: objective.id,
      sourceTemplateId: 'paddock_rotation_cover_trigger',
      observedCount: 3,
      deviationSign: 'over',
      depth: 'threshold',
      direction: 'tighten',
      reason: 'Rotation activated 3x above expected rate -- consider tightening threshold',
    });

    render(
      <ObjectiveColumn
        stratum={STRATUM}
        objectives={[objective]}
        objectiveStatuses={{ [objective.id]: 'active' }}
        activeObjectiveId={null}
        projectId={PROJECT_ID}
        onSelectObjective={vi.fn()}
      />,
    );

    // The chip should be visible on the card for this objective.
    const chip = screen.queryByTestId(`objective-review-flag-${objective.id}`);
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toBe('Review');
  });

  it('does NOT show the Review chip when there are no open flags', () => {
    render(
      <ObjectiveColumn
        stratum={STRATUM}
        objectives={[objective]}
        objectiveStatuses={{ [objective.id]: 'active' }}
        activeObjectiveId={null}
        projectId={PROJECT_ID}
        onSelectObjective={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId(`objective-review-flag-${objective.id}`),
    ).toBeNull();
  });

  it('does NOT show the chip for a resolved flag (closed = not open)', () => {
    // Raise and immediately resolve the flag.
    const flagId = crypto.randomUUID();
    useReviewFlagStore.getState().raiseFlag({
      id: flagId,
      projectId: PROJECT_ID,
      objectiveId: objective.id,
      sourceTemplateId: 'paddock_rotation_cover_trigger',
      observedCount: 1,
      deviationSign: 'under',
      depth: 'threshold',
      direction: 'loosen',
      reason: 'Under-triggered -- threshold may be too conservative',
    });
    useReviewFlagStore.getState().resolveFlag(PROJECT_ID, flagId);

    render(
      <ObjectiveColumn
        stratum={STRATUM}
        objectives={[objective]}
        objectiveStatuses={{ [objective.id]: 'active' }}
        activeObjectiveId={null}
        projectId={PROJECT_ID}
        onSelectObjective={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId(`objective-review-flag-${objective.id}`),
    ).toBeNull();
  });
});
