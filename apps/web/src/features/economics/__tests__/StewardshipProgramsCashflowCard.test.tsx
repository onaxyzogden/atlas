/**
 * @vitest-environment happy-dom
 *
 * Slice 7 (S7-B) — StewardshipProgramsCashflowCard render tests.
 * Slice 8-D — refactored to assert the compact
 * Phase | Labor (hrs) | Cost (USD) layout + per-program breakdown in
 * each cell's `title` attribute.
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

function treePoint(over: Partial<DesignElement> & { id: string; kind: string }): DesignElement {
  return {
    category: 'vegetation',
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

describe('StewardshipProgramsCashflowCard (Slice 8-D collapse)', () => {
  it('renders the empty-state copy when there is nothing to roll up', () => {
    render(<StewardshipProgramsCashflowCard projectId="p1" />);
    expect(
      screen.getByText(/Place habitat features.*cover-crop/i),
    ).toBeTruthy();
  });

  it('renders the compact 3-column layout (Phase | Labor (hrs) | Cost (USD))', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'ph-trees', order: 1, name: 'Tree Year' })],
    });
    useLandDesignStore.setState({
      byProject: {
        p1: [habitatPoint({ id: 'el-a', kind: 'owl-box' })],
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
      ],
    });

    render(<StewardshipProgramsCashflowCard projectId="p1" />);
    const table = screen.getByRole('table');
    // Compact header set — the per-program columns are gone.
    expect(within(table).getByText('Phase')).toBeTruthy();
    expect(within(table).getByText(/Labor \(hrs\)/i)).toBeTruthy();
    expect(within(table).getByText(/Cost \(USD\)/i)).toBeTruthy();
    // Per-program column headers no longer exist.
    expect(within(table).queryByText(/Combined cost/i)).toBeNull();
    expect(within(table).queryByText(/Agroforestry cost/i)).toBeNull();
    // Row + total still rendered.
    expect(within(table).getByText('Tree Year')).toBeTruthy();
    expect(within(table).getByText('Total')).toBeTruthy();
  });

  it("Tree Year row carries per-program breakdown in each cell's title attribute", () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'ph-trees', order: 1, name: 'Tree Year' })],
    });
    useLandDesignStore.setState({
      byProject: {
        p1: [
          habitatPoint({ id: 'el-a', kind: 'owl-box' }),
          treePoint({ id: 'oak1', kind: 'oak-tree' }),
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
        wi({
          id: 'tree__oak1',
          source: 'tree-planting',
          generatedFromTreeElement: 'oak1',
          phaseId: 'ph-trees',
        }),
      ],
    });

    render(<StewardshipProgramsCashflowCard projectId="p1" />);
    const table = screen.getByRole('table');
    const treeRow = within(table)
      .getByText('Tree Year')
      .closest('tr') as HTMLTableRowElement;
    expect(treeRow).toBeTruthy();
    const cells = treeRow.querySelectorAll('td');
    // Cell 0 = phase, cell 1 = labor (with title), cell 2 = cost (with title).
    const laborTitle = cells[1]!.getAttribute('title') ?? '';
    const costTitle = cells[2]!.getAttribute('title') ?? '';
    expect(laborTitle).toMatch(/Cover-crop:/);
    expect(laborTitle).toMatch(/Habitat:/);
    expect(laborTitle).toMatch(/Agroforestry:/);
    expect(laborTitle).toMatch(/Tree-planting:/);
    expect(costTitle).toMatch(/Cover-crop:/);
    expect(costTitle).toMatch(/Habitat:/);
    expect(costTitle).toMatch(/Agroforestry:/);
    expect(costTitle).toMatch(/Tree-planting:/);
  });

  it('renders a tree-planting work-item with populated cells (Slice 8-D)', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'ph-trees', order: 1, name: 'Tree Year' })],
    });
    useLandDesignStore.setState({
      byProject: { p1: [treePoint({ id: 'oak1', kind: 'oak-tree' })] },
    });
    useWorkItemStore.setState({
      items: [
        wi({
          id: 'tree__oak1',
          source: 'tree-planting',
          generatedFromTreeElement: 'oak1',
          phaseId: 'ph-trees',
        }),
      ],
    });

    render(<StewardshipProgramsCashflowCard projectId="p1" />);
    const table = screen.getByRole('table');
    const treeRow = within(table)
      .getByText('Tree Year')
      .closest('tr') as HTMLTableRowElement;
    const cells = treeRow.querySelectorAll('td');
    // Oak-tree catalog: 1.5 hr, $8–$150.
    expect(cells[1]!.textContent).toMatch(/1\.5 hr/);
    expect(cells[2]!.textContent).toMatch(/\$8/);
    // The title carries the per-program breakdown — confirm tree-planting
    // line is non-zero.
    expect(cells[1]!.getAttribute('title')).toMatch(/Tree-planting: 1\.5 hr/);
  });

  it('renders an unphased row for orphan habitat alongside a declared phase', () => {
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
        wi({
          id: 'hf__el-b',
          source: 'habitat-feature',
          generatedFromHabitatElement: 'el-b',
        }),
      ],
    });

    render(<StewardshipProgramsCashflowCard projectId="p1" />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Tree Year')).toBeTruthy();
    expect(within(table).getByText('(Unscheduled)')).toBeTruthy();
    expect(within(table).getByText('Total')).toBeTruthy();
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
