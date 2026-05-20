/**
 * @vitest-environment happy-dom
 *
 * Pins the rotation-adherence `now` staleness fix: the card re-renders
 * a HIGH-severity overgrazed recommendation purely from wall-clock
 * advance (no upstream store mutation), via the shared useNow tick.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  useLivestockStore,
  type Paddock,
  type LivestockSpecies,
} from '../../../store/livestockStore.js';
import { useRotationPlanStore } from '../../../store/rotationPlanStore.js';
import {
  useLivestockMoveLogStore,
  type LivestockMoveEvent,
} from '../../../store/livestockMoveLogStore.js';
import RotationAdherenceCard from '../RotationAdherenceCard.js';

const T0 = new Date('2026-05-20T00:00:00.000Z').getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

function paddock(id: string, overrides: Partial<Paddock> = {}): Paddock {
  return {
    id,
    projectId: 'p1',
    name: `Paddock ${id}`,
    color: '#000',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
    areaM2: 10_000,
    grazingCellGroup: 'A',
    species: [] as LivestockSpecies[],
    stockingDensity: null,
    fencing: 'electric',
    guestSafeBuffer: false,
    waterPointNote: '',
    shelterNote: '',
    phase: 'plan',
    notes: '',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function moveIn(
  id: string,
  paddockId: string,
  date: string,
  overrides: Partial<LivestockMoveEvent> = {},
): LivestockMoveEvent {
  return {
    id,
    projectId: 'p1',
    toPaddockId: paddockId,
    date,
    direction: 'move_in',
    species: 'sheep',
    headCount: 12,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(T0));
  localStorage.clear();
  useLivestockStore.setState({ paddocks: [] });
  useRotationPlanStore.setState({ byProject: {} });
  useLivestockMoveLogStore.setState({ events: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RotationAdherenceCard — staleness (time-driven re-render)', () => {
  it('flips on-track → overgrazed after the useNow tick crosses the threshold', async () => {
    useLivestockStore.setState({ paddocks: [paddock('a')] });
    useRotationPlanStore.setState({
      byProject: {
        p1: {
          projectId: 'p1',
          cells: [
            {
              paddockId: 'a',
              cellGroup: 'A',
              sequenceOrder: 0,
              targetGrazeDays: 3,
              targetRestDays: 0,
            },
          ],
        },
      },
    });
    // Open move_in 2.5 days before T0 — engine closes the interval at
    // `now`, so grazeDays ≈ 2.5 ≤ 3 → no recommendation.
    useLivestockMoveLogStore.setState({
      events: [
        moveIn('m1', 'a', new Date(T0 - 2.5 * DAY_MS).toISOString()),
      ],
    });

    render(<RotationAdherenceCard projectId="p1" />);

    expect(screen.queryAllByTestId('rec-row').length).toBe(0);
    expect(screen.getByText(/on track/i)).toBeTruthy();

    // Snapshot store state to prove the next assertion is purely
    // time-driven, not data-driven.
    const beforePaddocks = useLivestockStore.getState().paddocks;
    const beforePlan = useRotationPlanStore.getState().byProject;
    const beforeMoves = useLivestockMoveLogStore.getState().events;

    // Advance wall clock past the 3-day threshold and fire one useNow
    // interval tick. grazeDays ≈ 3.5 > 3 → overgrazed (HIGH).
    await act(async () => {
      vi.advanceTimersByTime(DAY_MS);
      await Promise.resolve();
    });

    const rows = screen.queryAllByTestId('rec-row');
    expect(rows.length).toBe(1);
    expect(rows[0]?.getAttribute('data-severity')).toBe('high');
    expect((rows[0]?.textContent ?? '')).toMatch(/grazed/i);

    // Negative control — no upstream store mutated between the two
    // assertions; the only thing that changed was the clock.
    expect(useLivestockStore.getState().paddocks).toBe(beforePaddocks);
    expect(useRotationPlanStore.getState().byProject).toBe(beforePlan);
    expect(useLivestockMoveLogStore.getState().events).toBe(beforeMoves);
  });
});
