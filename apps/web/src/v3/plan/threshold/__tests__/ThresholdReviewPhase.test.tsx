/**
 * @vitest-environment happy-dom
 *
 * ThresholdReviewPhase -- Phase 1 (Review) of Threshold 1. A READING surface:
 * the six evidence strands (derived coverage + optional steward stance/note) and
 * a read-only recap of the declared intent, then a single "proceed to Direction"
 * control. These tests pin: the six strands render with their survey rows; the
 * stance toggle writes (and clears) through the store; the recap groups intent by
 * type; the empty-intent fallback; and proceed flips `phase1Ready`. The phase
 * reads its stance/note state from a prop the parent surface re-derives from the
 * store, so a tiny store-subscribed harness mirrors that wiring exactly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  useRealityCheckStore,
  EMPTY_REALITY_CHECK,
} from '../../../../store/realityCheckStore.js';
import type { StrandSurveyEvidence } from '../realityCheckModel.js';
import type { IntentElement } from '../intentElements.js';
import ThresholdReviewPhase from '../ThresholdReviewPhase.js';
import { expectNoA11yViolations } from '../../../../test/a11y.js';

const PID = 'project-1';

const el = (
  id: string,
  text: string,
  type: IntentElement['type'],
): IntentElement => ({ id, text, type, source: 'classify' });

const ELEMENTS: IntentElement[] = [
  el('ie-nn-1', 'No interest-bearing debt', 'non-negotiable'),
  el('ie-cm-1', 'Water security for the homestead', 'committed'),
  el('ie-as-1', 'Off-grid living', 'aspirational'),
];

/** Store-subscribed harness: mirrors how RealityCheckSurface threads state down. */
function Harness({
  elements = ELEMENTS,
  perSurvey = {},
}: {
  elements?: IntentElement[];
  perSurvey?: Record<string, StrandSurveyEvidence>;
}) {
  const record = useRealityCheckStore(
    (s) => s.byProject[PID] ?? EMPTY_REALITY_CHECK,
  );
  return (
    <ThresholdReviewPhase
      projectId={PID}
      elements={elements}
      perSurvey={perSurvey}
      strandFindings={record.strandFindings}
    />
  );
}

beforeEach(() => {
  useRealityCheckStore.setState({ byProject: {} });
});

describe('ThresholdReviewPhase -- evidence strands', () => {
  it('renders all six evidence strands', () => {
    render(<Harness />);
    const strands = screen.getAllByTestId('evidence-strand');
    expect(strands).toHaveLength(6);
    expect(strands.map((s) => s.getAttribute('data-strand'))).toEqual([
      'water',
      'soil-fertility',
      'ecology-habitat',
      'infrastructure-access',
      'land-health',
      'landscape-context',
    ]);
  });

  it('lists the survey rows that belong to a strand', () => {
    render(
      <Harness
        perSurvey={{
          's3-hydrology': {
            objectiveId: 's3-hydrology',
            label: 'Hydrology survey',
            complete: true,
          },
        }}
      />,
    );
    const water = screen
      .getAllByTestId('evidence-strand')
      .find((s) => s.getAttribute('data-strand') === 'water')!;
    expect(within(water).getByText('Hydrology survey')).toBeTruthy();
  });

  it('toggles a steward stance through the store and clears it on re-click', () => {
    render(<Harness />);
    const water = screen
      .getAllByTestId('evidence-strand')
      .find((s) => s.getAttribute('data-strand') === 'water')!;
    const confirms = within(water).getByRole('button', { name: 'Confirms intent' });

    fireEvent.click(confirms);
    expect(
      useRealityCheckStore.getState().byProject[PID]?.strandFindings.water?.stance,
    ).toBe('confirmed');

    // Re-clicking the active stance clears it (store drops the empty finding).
    fireEvent.click(confirms);
    expect(
      useRealityCheckStore.getState().byProject[PID]?.strandFindings.water,
    ).toBeUndefined();
  });
});

describe('ThresholdReviewPhase -- intent recap (read-only)', () => {
  it('groups declared intent by type', () => {
    render(<Harness />);
    const recap = screen.getByTestId('intent-recap');
    expect(within(recap).getByText('No interest-bearing debt')).toBeTruthy();
    expect(within(recap).getByText('Water security for the homestead')).toBeTruthy();
    expect(within(recap).getByText('Off-grid living')).toBeTruthy();
  });

  it('shows the empty-intent fallback when there are no elements', () => {
    render(<Harness elements={[]} />);
    const recap = screen.getByTestId('intent-recap');
    expect(within(recap).getByText(/No declared intent elements/i)).toBeTruthy();
  });

  it('renders NO classification controls (Phase 1 decides nothing)', () => {
    render(<Harness />);
    expect(screen.queryByTestId('intent-element')).toBeNull();
    expect(screen.queryByTestId('planning-direction')).toBeNull();
  });
});

describe('ThresholdReviewPhase -- proceed', () => {
  it('proceed flips phase1Ready in the store', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('threshold-proceed'));
    expect(
      useRealityCheckStore.getState().byProject[PID]?.phase1Ready,
    ).toBe(true);
  });
});

describe('ThresholdReviewPhase (a11y)', () => {
  it('has no axe violations with declared intent (allowlisted rules)', async () => {
    const { container } = render(<Harness />);
    await expectNoA11yViolations(container);
  });

  it('has no axe violations in the empty-intent state', async () => {
    const { container } = render(<Harness elements={[]} />);
    await expectNoA11yViolations(container);
  });
});
