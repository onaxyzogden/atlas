/**
 * @vitest-environment happy-dom
 *
 * PlanExecutionTrackerCard — D2.1 per-WorkItem manual resourcing-override
 * editor. Mirrors the existing DependencyEditor pattern in the same card.
 *
 * Pins:
 *   1. a "Resourcing" toggle renders in a task row and opens the editor;
 *   2. adding equipment + a material then Save writes manual fields +
 *      overridden:true to the store and leaves *Auto fields untouched;
 *   3. seeded *Auto fields are NOT visible/editable in the editor;
 *   4. Cancel performs no store write (updatedAt unchanged).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { WorkItem } from '@ogden/shared';
import type { LocalProject } from '../../../store/projectStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import PlanExecutionTrackerCard from '../PlanExecutionTrackerCard.js';

const PROJECT = { id: 'p1' } as LocalProject;

function wi(p: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'goal-compass',
    overridden: false,
    createdAt: 'c',
    updatedAt: 'u',
    title: p.id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...p,
  } as WorkItem;
}

beforeEach(() => {
  localStorage.clear();
  useWorkItemStore.setState({ items: [] });
});

function renderCard() {
  return render(
    <PlanExecutionTrackerCard project={PROJECT} onSwitchToMap={() => {}} />,
  );
}

describe('PlanExecutionTrackerCard — D2.1 resourcing editor', () => {
  it('renders a Resourcing toggle that opens the editor', () => {
    useWorkItemStore.setState({ items: [wi({ id: 'gc1', overridden: false })] });
    renderCard();

    const toggle = screen.getByRole('button', { name: /resourcing/i });
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);
    expect(
      screen
        .getByRole('button', { name: /resourcing/i })
        .getAttribute('aria-expanded'),
    ).toBe('true');
    expect(screen.getByRole('button', { name: /^save$/i })).toBeTruthy();
  });

  it('Save writes manual fields + overridden, leaving *Auto untouched', () => {
    useWorkItemStore.setState({ items: [wi({ id: 'gc1' })] });
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /resourcing/i }));

    // Add equipment.
    fireEvent.change(screen.getByPlaceholderText(/equipment/i), {
      target: { value: 'excavator' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    // Add a material row, then fill it.
    fireEvent.click(screen.getByRole('button', { name: /add material/i }));
    fireEvent.change(screen.getByPlaceholderText(/^label$/i), {
      target: { value: 'compost' },
    });
    fireEvent.change(screen.getByPlaceholderText(/^unit$/i), {
      target: { value: 'm³' },
    });
    fireEvent.change(screen.getByPlaceholderText(/per acre/i), {
      target: { value: '2' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    const it = useWorkItemStore.getState().items.find((x) => x.id === 'gc1')!;
    expect(it.overridden).toBe(true);
    expect(it.equipmentRequired).toEqual(['excavator']);
    expect(it.materials).toEqual([
      { label: 'compost', unit: 'm³', quantityPerAcre: 2 },
    ]);
    expect(it.equipmentRequiredAuto).toEqual([]);
    expect(it.materialsAuto).toEqual([]);
  });

  it('does not show or edit *Auto fields in the editor', () => {
    useWorkItemStore.setState({
      items: [
        wi({
          id: 'gc1',
          equipmentRequired: ['tractor'],
          equipmentRequiredAuto: ['hidden-auto'],
        }),
      ],
    });
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /resourcing/i }));

    const dialog = screen.getByRole('button', { name: /^save$/i })
      .closest('div')!.parentElement as HTMLElement;
    expect(within(dialog).getByText('tractor')).toBeTruthy();
    expect(within(dialog).queryByText('hidden-auto')).toBeNull();
  });

  it('Cancel performs no store write (updatedAt unchanged)', () => {
    useWorkItemStore.setState({ items: [wi({ id: 'gc1', updatedAt: 'orig' })] });
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /resourcing/i }));
    fireEvent.change(screen.getByPlaceholderText(/equipment/i), {
      target: { value: 'should-not-persist' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    const it = useWorkItemStore.getState().items.find((x) => x.id === 'gc1')!;
    expect(it.updatedAt).toBe('orig');
    expect(it.equipmentRequired).toBeUndefined();
  });
});
