/**
 * @vitest-environment happy-dom
 *
 * RotationAdherenceActionsCard — B3.1 editable companion render host.
 *
 * Asserts: empty states, drift rows render with the right severity,
 * Edit opens the right kind-matched editor, Save patches the store
 * and closes the editor, Schedule make-good pushes a draft, no
 * financing lexicon on the surface.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  useLivestockStore,
  type Paddock,
  type LivestockSpecies,
} from '../../../store/livestockStore.js';
import { useRotationPlanStore } from '../../../store/rotationPlanStore.js';
import { useLivestockMoveLogStore } from '../../../store/livestockMoveLogStore.js';
import { useWorkItemDraftStore } from '../../../store/workItemDraftStore.js';
import RotationAdherenceActionsCard from '../RotationAdherenceActionsCard.js';

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

function seedDrift() {
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
    events: [
      {
        id: 'm1',
        projectId: 'p1',
        toPaddockId: 'a',
        date: '2020-01-01T00:00:00.000Z',
        direction: 'move_in',
        species: 'sheep',
        headCount: 12,
      },
    ],
  });
}

beforeEach(() => {
  localStorage.clear();
  useLivestockStore.setState({ paddocks: [] });
  useRotationPlanStore.setState({ byProject: {} });
  useLivestockMoveLogStore.setState({ events: [] });
  useWorkItemDraftStore.setState({ draft: null });
});

describe('RotationAdherenceActionsCard — B3.1', () => {
  it('renders the no-paddocks empty state', () => {
    render(<RotationAdherenceActionsCard projectId="p1" />);
    expect(screen.getByText(/no paddocks/i)).toBeTruthy();
  });

  it('renders the on-track empty state with paddocks but no drift', () => {
    useLivestockStore.setState({ paddocks: [paddock('a')] });
    render(<RotationAdherenceActionsCard projectId="p1" />);
    expect(screen.getByText(/on track/i)).toBeTruthy();
  });

  it('renders a drift row with severity and an Edit button', () => {
    seedDrift();
    const { container } = render(
      <RotationAdherenceActionsCard projectId="p1" />,
    );
    const rows = container.querySelectorAll('[data-testid="action-row"]');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]?.getAttribute('data-severity')).toBe('high');
    expect(screen.getAllByRole('button', { name: /edit/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('clicking Edit opens the matched editor; Save patches the store and closes', () => {
    seedDrift();
    render(<RotationAdherenceActionsCard projectId="p1" />);
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]!);
    const input = screen.getByLabelText(/target graze days/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(
      useRotationPlanStore.getState().byProject.p1!.cells[0]!.targetGrazeDays,
    ).toBe(1);
    expect(screen.queryByLabelText(/target graze days/i)).toBeNull();
  });

  it('clicking Schedule make-good task pushes a WorkItemDraft', () => {
    seedDrift();
    render(<RotationAdherenceActionsCard projectId="p1" />);
    fireEvent.click(
      screen.getAllByRole('button', { name: /schedule make-good/i })[0]!,
    );
    const draft = useWorkItemDraftStore.getState().draft;
    expect(draft).not.toBeNull();
    expect(draft!.source).toBe('rotation-adherence');
    expect(draft!.paddockId).toBe('a');
    expect(draft!.title).toMatch(/make-good/i);
  });

  it('renders no financing/capital lexicon on the surface', () => {
    seedDrift();
    const { container } = render(
      <RotationAdherenceActionsCard projectId="p1" />,
    );
    expect(container.textContent ?? '').not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i,
    );
  });
});
