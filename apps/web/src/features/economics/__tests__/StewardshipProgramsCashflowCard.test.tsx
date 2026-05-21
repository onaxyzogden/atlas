/**
 * @vitest-environment happy-dom
 *
 * Slice 7 (S7-B) — StewardshipProgramsCashflowCard render tests.
 *
 * Asserts the empty-state copy, the three-phase happy-path render
 * (cover-crop in Soil Year, habitat in Tree Year, unphased bucket
 * for orphan habitat), and ARIA table structure.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../../store/designElementsStore.js';
import type { BuildPhase } from '../../../store/phaseStore.js';
import StewardshipProgramsCashflowCard from '../StewardshipProgramsCashflowCard.js';

const NOW = '2026-05-21T00:00:00.000Z';

function phase(over: Partial<BuildPhase> & { id: string; order: number; name: string }): BuildPhase {
  return {
    projectId: 'p1',
    timeframe: '',
    description: '',
    color: '',
    completed: false,
    notes: '',
    completedAt: null,
    ...over,
  } as BuildPhase;
}

function habitatPoint(over: Partial<DesignElement> & { id: string; kind: string }): DesignElement {
  return {
    category: 'habitat',
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: NOW,
    ...over,
  } as DesignElement;
}

function wi(over: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'manual',
    overridden: false,
    createdAt: NOW,
    updatedAt: NOW,
    title: 'wi',
    phaseId: null,
    status: 'todo',
    doneAt: null,
    dependsOn: [],
    dependsOnAuto: [],
    precedesAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
  useWorkItemStore.setState({ items: [] });
  usePhaseStore.setState({ phases: [] });
  useCropStore.setState({ cropAreas: [] });
  useLandDesignStore.setState({ byProject: {} });
});

describe('StewardshipProgramsCashflowCard', () => {
  it('renders the empty-state copy when there is nothing to roll up', () => {
    render(<StewardshipProgramsCashflowCard projectId="p1" />);
    expect(
      screen.getByText(/Place habitat features.*cover-crop/i),
    ).toBeTruthy();
  });

  it('renders a row per declared phase + an unphased row for orphan habitat', () => {
    usePhaseStore.setState({
      phases: [
        phase({ id: 'ph-soil', order: 1, name: 'Soil Year' }),
        phase({ id: 'ph-trees', order: 2, name: 'Tree Year' }),
      ],
    });
    useLandDesignStore.setState({
      byProject: {
        p1: [
          habitatPoint({ id: 'el-a', kind: 'owl-box' }),
          habitatPoint({ id: 'el-b', kind: 'owl-box' }),
        ],
      },
    });
    useWorkItemStore.setState({
      items: [
        wi({
          id: 'hf__el-a',
          source: 'habitat-feature',
          generatedFromHabitatElement: 'el-a',
          phaseId: 'ph-trees',
        }),
        // No phaseId — falls into Unscheduled bucket.
        wi({
          id: 'hf__el-b',
          source: 'habitat-feature',
          generatedFromHabitatElement: 'el-b',
        }),
      ],
    });

    render(<StewardshipProgramsCashflowCard projectId="p1" />);

    const table = screen.getByRole('table');
    expect(table).toBeTruthy();
    // Tree Year row + Unscheduled row + Total row.
    expect(within(table).getByText('Tree Year')).toBeTruthy();
    expect(within(table).getByText('(Unscheduled)')).toBeTruthy();
    expect(within(table).getByText('Total')).toBeTruthy();

    // Column headers present.
    expect(within(table).getByText('Phase')).toBeTruthy();
    expect(within(table).getByText(/Combined cost/i)).toBeTruthy();
  });

  it('renders the agroforestry column for a hedgerow work-item (Slice 8-C)', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'ph-trees', order: 1, name: 'Tree Year' })],
    });
    const hedgerow: DesignElement = {
      id: 'el-h1',
      category: 'vegetation',
      kind: 'hedgerow',
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [0.001, 0],
        ],
      },
      phase: 'trees',
      createdAt: NOW,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    useLandDesignStore.setState({ byProject: { p1: [hedgerow] } });
    useWorkItemStore.setState({
      items: [
        wi({
          id: 'agf__el-h1',
          source: 'agroforestry',
          generatedFromAgroforestryElement: 'el-h1',
          phaseId: 'ph-trees',
        }),
      ],
    });

    render(<StewardshipProgramsCashflowCard projectId="p1" />);
    const table = screen.getByRole('table');
    expect(within(table).getByText(/Agroforestry labor/i)).toBeTruthy();
    expect(within(table).getByText(/Agroforestry cost/i)).toBeTruthy();
    expect(within(table).getByText('Tree Year')).toBeTruthy();
  });

  it('cover-crop rows render with a degenerate (single-value) cost when low=high', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'ph-soil', order: 1, name: 'Soil Year' })],
    });
    useCropStore.setState({
      cropAreas: [
        {
          id: 'ca1',
          projectId: 'p1',
          name: 'A',
          color: '#000',
          type: 'row_crop',
          geometry: { type: 'Polygon', coordinates: [] },
          areaM2: 4046.8564224,
          species: [],
          treeSpacingM: null,
          rowSpacingM: null,
          waterDemand: 'low',
          irrigationType: 'rain_fed',
          phase: 'ph-soil',
          notes: '',
          coverCropPlan: [
            {
              speciesId: 'sp-rye',
              startMonth: 9,
              endMonth: 12,
              role: 'winter_cover',
              seedCostUSDPerAcreOverride: 40,
              seedingLaborHrsPerAcreOverride: 0.5,
            },
          ],
          createdAt: NOW,
          updatedAt: NOW,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ],
    });

    render(<StewardshipProgramsCashflowCard projectId="p1" />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Soil Year')).toBeTruthy();
    // Degenerate band renders as a single $-value (low === high).
    // 40 USD/acre × 1 acre = $40.
    expect(within(table).getAllByText(/\$40\b/).length).toBeGreaterThan(0);
  });
});
