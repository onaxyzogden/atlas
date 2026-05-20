/**
 * @vitest-environment happy-dom
 *
 * CoverCropPlannerCard — B5.2.x happy-path render + write test.
 * Renders with one CropArea, opens the add-window form, picks
 * winter_rye, accepts pre-fills, clicks Add, then Save → asserts
 * `updateCropArea` was called with the expected `coverCropPlan`
 * shape. Also checks the remove-window path and that the Save
 * button is disabled when the draft equals the stored array.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoverCropPlannerCard from '../CoverCropPlannerCard.js';
import { useCropStore, type CropArea } from '../../../store/cropStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';

const PROJECT_ID = 'p1';

function area(over: Partial<CropArea> = {}): CropArea {
  return {
    id: 'ca1',
    projectId: PROJECT_ID,
    name: 'North row crop',
    color: '#888',
    type: 'row_crop',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    },
    areaM2: 1200,
    species: [],
    treeSpacingM: null,
    rowSpacingM: null,
    waterDemand: 'medium',
    irrigationType: 'drip',
    phase: 'phase-1',
    notes: '',
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
  useCropStore.setState({ cropAreas: [] });
  useWorkItemStore.setState({ items: [] });
  usePhaseStore.setState({ phases: [] });
});

describe('CoverCropPlannerCard — B5.2.x', () => {
  it('renders the empty-state copy when the project has no crop areas', () => {
    render(<CoverCropPlannerCard projectId={PROJECT_ID} />);
    expect(screen.getByText(/No crop areas yet/i)).toBeTruthy();
  });

  it('writes a new winter_rye window through updateCropArea on Save', () => {
    useCropStore.setState({ cropAreas: [area()] });
    render(<CoverCropPlannerCard projectId={PROJECT_ID} />);

    fireEvent.click(screen.getByText(/Add cover-crop window/i));

    const speciesSelect = screen.getByLabelText(/Species/i) as HTMLSelectElement;
    fireEvent.change(speciesSelect, { target: { value: 'winter_rye' } });

    fireEvent.click(screen.getByRole('button', { name: /Add window/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    const stored = useCropStore.getState().cropAreas[0]!.coverCropPlan;
    expect(stored).toHaveLength(1);
    expect(stored![0]).toMatchObject({
      speciesId: 'winter_rye',
      role: 'winter_cover',
      startMonth: 9,
      endMonth: 5,
    });
  });

  it('disables Save when the draft equals the stored array', () => {
    useCropStore.setState({
      cropAreas: [
        area({
          coverCropPlan: [
            { speciesId: 'winter_rye', role: 'winter_cover', startMonth: 9, endMonth: 5 },
          ],
        }),
      ],
    });
    render(<CoverCropPlannerCard projectId={PROJECT_ID} />);

    const save = screen.getByRole('button', { name: /Save changes/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('removes a window through the row ✕ button and reflects on Save', () => {
    useCropStore.setState({
      cropAreas: [
        area({
          coverCropPlan: [
            { speciesId: 'winter_rye', role: 'winter_cover', startMonth: 9, endMonth: 5 },
          ],
        }),
      ],
    });
    render(<CoverCropPlannerCard projectId={PROJECT_ID} />);

    fireEvent.click(screen.getByLabelText(/Remove Winter rye window/i));
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    expect(useCropStore.getState().cropAreas[0]!.coverCropPlan).toEqual([]);
  });

  it('B5.2.x.c — shows orphan-cash-crop warning when no planting-calendar WorkItem on the area', () => {
    useCropStore.setState({ cropAreas: [area()] });
    render(<CoverCropPlannerCard projectId={PROJECT_ID} />);
    expect(
      screen.getByText(/No cash crop scheduled on this area yet/i),
    ).toBeTruthy();
  });

  it('B5.2.x.c — orphan warning disappears once a cash-crop WorkItem on the area exists', () => {
    useCropStore.setState({ cropAreas: [area()] });
    useWorkItemStore.setState({
      items: [
        {
          id: 'pc-1',
          projectId: PROJECT_ID,
          source: 'nursery-batch',
          overridden: false,
          createdAt: '2026-05-20T00:00:00.000Z',
          updatedAt: '2026-05-20T00:00:00.000Z',
          title: 'plant',
          phaseId: null,
          status: 'todo',
          dependsOn: [],
          dependsOnAuto: [],
          materialsAuto: [],
          equipmentRequiredAuto: [],
          generatedFromPlantingCalendar: 'tomato:ca1:2026',
        } as never,
      ],
    });
    render(<CoverCropPlannerCard projectId={PROJECT_ID} />);
    expect(screen.queryByText(/No cash crop scheduled/i)).toBeNull();
  });

  it('B5.2.x.c — bulk apply: select 2 other areas, save once, all 3 get the window', () => {
    useCropStore.setState({
      cropAreas: [
        area({ id: 'ca1', name: 'North' }),
        area({ id: 'ca2', name: 'East' }),
        area({ id: 'ca3', name: 'West' }),
      ],
    });
    render(<CoverCropPlannerCard projectId={PROJECT_ID} />);

    // Open the add-window form on the first area
    const addButtons = screen.getAllByText(/Add cover-crop window/i);
    fireEvent.click(addButtons[0]!);
    const speciesSelect = screen.getAllByLabelText(/Species/i)[0] as HTMLSelectElement;
    fireEvent.change(speciesSelect, { target: { value: 'winter_rye' } });
    fireEvent.click(screen.getByRole('button', { name: /Add window/i }));

    // Open the bulk-apply chip list on the first area & select the others
    const bulkToggles = screen.getAllByRole('button', {
      name: /Apply to other areas/i,
    });
    fireEvent.click(bulkToggles[0]!);
    fireEvent.click(screen.getByRole('option', { name: 'East' }));
    fireEvent.click(screen.getByRole('option', { name: 'West' }));

    // Save first area's changes
    fireEvent.click(screen.getAllByRole('button', { name: /Save changes/i })[0]!);

    const cropAreas = useCropStore.getState().cropAreas;
    const byId = new Map(cropAreas.map((a) => [a.id, a]));
    expect(byId.get('ca1')!.coverCropPlan).toHaveLength(1);
    expect(byId.get('ca2')!.coverCropPlan).toHaveLength(1);
    expect(byId.get('ca3')!.coverCropPlan).toHaveLength(1);

    // pushCoverCropPlanToSpine called once → all 3 cover-crop WorkItems present
    const items = useWorkItemStore
      .getState()
      .items.filter((i) => i.source === 'cover-crop');
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.generatedFromCoverCropWindow).sort()).toEqual([
      'ca1__0',
      'ca2__0',
      'ca3__0',
    ]);
  });

  it('pushes cover-crop WorkItems onto the spine on Save (B5.2.x.b C5)', () => {
    useCropStore.setState({ cropAreas: [area()] });
    render(<CoverCropPlannerCard projectId={PROJECT_ID} />);

    fireEvent.click(screen.getByText(/Add cover-crop window/i));
    const speciesSelect = screen.getByLabelText(/Species/i) as HTMLSelectElement;
    fireEvent.change(speciesSelect, { target: { value: 'winter_rye' } });
    fireEvent.click(screen.getByRole('button', { name: /Add window/i }));

    expect(useWorkItemStore.getState().items).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    const items = useWorkItemStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]!).toMatchObject({
      source: 'cover-crop',
      generatedFromCoverCropWindow: 'ca1__0',
      projectId: PROJECT_ID,
    });
  });
});
