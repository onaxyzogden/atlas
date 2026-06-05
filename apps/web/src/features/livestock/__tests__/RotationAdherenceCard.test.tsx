/**
 * @vitest-environment happy-dom
 *
 * RotationAdherenceCard — B3 render-only plan-vs-actual audit surface.
 * Asserts the no-paddocks empty state, the on-track empty state, a
 * seeded-drift overgrazed recommendation with its severity tag, and
 * that no financing/capital lexicon leaks onto the surface. happy-dom
 * is mandatory: the move-log store runs persist.rehydrate() at import.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

/* ---------- factory helpers ---------- */

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
  localStorage.clear();
  useLivestockStore.setState({ paddocks: [] });
  useRotationPlanStore.setState({ byProject: {} });
  useLivestockMoveLogStore.setState({ events: [] });
});

describe('RotationAdherenceCard — B3', () => {
  it('renders the no-paddocks empty state', () => {
    render(<RotationAdherenceCard projectId="p1" />);
    expect(screen.getByText(/no paddocks/i)).toBeTruthy();
  });

  it('renders the on-track empty state with paddocks but no plan or moves', () => {
    useLivestockStore.setState({ paddocks: [paddock('a')] });
    render(<RotationAdherenceCard projectId="p1" />);
    expect(screen.getByText(/on track/i)).toBeTruthy();
  });

  it('renders an overgrazed recommendation with a HIGH severity tag', () => {
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
    useLivestockMoveLogStore.setState({
      events: [moveIn('m1', 'a', '2020-01-01T00:00:00.000Z')],
    });
    const { container } = render(<RotationAdherenceCard projectId="p1" />);
    // Structural assertion — decoupled from engine recommendation copy
    // so that wording changes in `rotationAdherence.ts` don't break
    // the card test.
    const rows = container.querySelectorAll('[data-testid="rec-row"]');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]?.getAttribute('data-severity')).toBe('high');
    expect(screen.getByText(/HIGH/)).toBeTruthy();
  });

  it('renders no financing/capital lexicon on the surface', () => {
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
    useLivestockMoveLogStore.setState({
      events: [moveIn('m1', 'a', '2020-01-01T00:00:00.000Z')],
    });
    const { container } = render(<RotationAdherenceCard projectId="p1" />);
    expect(container.textContent ?? '').not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i,
    );
  });
});
