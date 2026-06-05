/**
 * @vitest-environment happy-dom
 *
 * CoverCropPopoverEditor — RTL render + save round-trip (B5.2.x.c).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoverCropPopoverEditor, {
  useCoverCropPopoverStore,
} from '../CoverCropPopoverEditor.js';
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
  useCropStore.setState({ cropAreas: [area()] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
  usePhaseStore.setState({ phases: [] });
  useCoverCropPopoverStore.setState({
    open: false,
    projectId: null,
    cropAreaId: null,
    anchor: null,
  });
});

describe('CoverCropPopoverEditor', () => {
  it('renders nothing when not open', () => {
    const { container } = render(<CoverCropPopoverEditor />);
    expect(container.firstChild).toBeNull();
  });

  it('opens via store.openFor and shows the empty-state copy', () => {
    useCoverCropPopoverStore.getState().openFor({
      projectId: PROJECT_ID,
      cropAreaId: 'ca1',
    });
    render(<CoverCropPopoverEditor />);
    expect(screen.getByText(/No cover-crop windows yet/i)).toBeTruthy();
    expect(screen.getByText(/Cover-crop ·/i)).toBeTruthy();
  });

  it('adds a window through the form and saves through pushCoverCropPlanToSpine', () => {
    useCoverCropPopoverStore.getState().openFor({
      projectId: PROJECT_ID,
      cropAreaId: 'ca1',
    });
    render(<CoverCropPopoverEditor />);

    fireEvent.click(screen.getByText(/Add cover-crop window/i));
    const speciesSelect = screen.getByLabelText(/Species/i) as HTMLSelectElement;
    fireEvent.change(speciesSelect, { target: { value: 'winter_rye' } });
    fireEvent.click(screen.getByRole('button', { name: /Add window/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    const stored = useCropStore.getState().cropAreas[0]!.coverCropPlan;
    expect(stored).toHaveLength(1);
    expect(stored![0]).toMatchObject({ speciesId: 'winter_rye' });

    const items = useWorkItemStore
      .getState()
      .items.filter((i) => i.source === 'cover-crop');
    expect(items).toHaveLength(1);
    expect(items[0]!.generatedFromCoverCropWindow).toBe('ca1__0');

    expect(useCoverCropPopoverStore.getState().open).toBe(false);
  });
});
