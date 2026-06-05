/**
 * @vitest-environment happy-dom
 *
 * CoverCropEconomicsCard — RTL render test (B5.2.x.b C4).
 *
 * Seeds two CropAreas across two declared phases plus one area whose
 * `phase` doesn't resolve, then asserts the per-phase rollup +
 * unphased bucket render with override-wins-vs-catalog totals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CoverCropEconomicsCard from '../CoverCropEconomicsCard.js';
import { useCropStore, type CropArea } from '../../../store/cropStore.js';
import { usePhaseStore, type BuildPhase } from '../../../store/phaseStore.js';
import type { LocalProject } from '../../../store/projectStore.js';

const PROJECT_ID = 'p1';
const ONE_ACRE_M2 = 4046.8564224;

function area(over: Partial<CropArea> & { id: string }): CropArea {
  return {
    projectId: PROJECT_ID,
    name: 'A',
    color: '#888',
    type: 'row_crop',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    },
    areaM2: ONE_ACRE_M2,
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

function phase(
  over: Partial<BuildPhase> & { id: string; order: number; name: string },
): BuildPhase {
  return {
    projectId: PROJECT_ID,
    timeframe: '',
    description: '',
    color: '#888',
    completed: false,
    notes: '',
    completedAt: null,
    ...over,
  };
}

function project(): LocalProject {
  return {
    id: PROJECT_ID,
    name: 'Test',
    description: null,
    status: 'active',
    projectType: null,
    country: 'US',
    provinceState: null,
    conservationAuthId: null,
    address: null,
    parcelId: null,
    acreage: null,
    dataCompletenessScore: null,
    hasParcelBoundary: false,
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
    parcelBoundaryGeojson: null,
    ownerNotes: null,
    zoningNotes: null,
    accessNotes: null,
    waterRightsNotes: null,
    visionStatement: null,
    units: 'imperial',
    attachments: [],
  };
}

beforeEach(() => {
  localStorage.clear();
  useCropStore.setState({ cropAreas: [] });
  usePhaseStore.setState({ phases: [] });
});

describe('CoverCropEconomicsCard — B5.2.x.b', () => {
  it('renders the empty state when no cover-crop windows exist', () => {
    useCropStore.setState({ cropAreas: [area({ id: 'ca1' })] });
    render(<CoverCropEconomicsCard project={project()} />);
    expect(
      screen.getByText(/No cover-crop windows with cost data yet/i),
    ).toBeTruthy();
  });

  it('renders per-phase totals + unphased bucket across two declared phases', () => {
    usePhaseStore.setState({
      phases: [
        phase({ id: 'phase-1', order: 0, name: 'Year 0' }),
        phase({ id: 'phase-2', order: 1, name: 'Year 1' }),
      ],
    });
    useCropStore.setState({
      cropAreas: [
        // phase-1: 1 acre, winter_rye catalog ($25/acre, 0.4 h/acre)
        area({
          id: 'ca1',
          name: 'North field',
          phase: 'phase-1',
          coverCropPlan: [
            { speciesId: 'winter_rye', role: 'winter_cover', startMonth: 9, endMonth: 11 },
          ],
        }),
        // phase-2: 2 acres, override $80/acre seed, override 1.0 h/acre labor
        area({
          id: 'ca2',
          name: 'South field',
          phase: 'phase-2',
          areaM2: ONE_ACRE_M2 * 2,
          coverCropPlan: [
            {
              speciesId: 'winter_rye',
              role: 'winter_cover',
              startMonth: 9,
              endMonth: 11,
              seedCostUSDPerAcreOverride: 80,
              seedingLaborHrsPerAcreOverride: 1.0,
            },
          ],
        }),
        // unphased: free-text phase doesn't resolve, 1 acre clover ($40/acre, 0.5 h/acre)
        area({
          id: 'ca3',
          name: 'Orphan',
          phase: 'no-such-phase',
          coverCropPlan: [
            { speciesId: 'clover', role: 'living_mulch', startMonth: 4, endMonth: 9 },
          ],
        }),
      ],
    });

    render(<CoverCropEconomicsCard project={project()} />);

    // Project totals: 25 + 160 + 40 = $225; labor 0.4 + 2.0 + 0.5 = 2.9 h
    expect(screen.getByText('$225')).toBeTruthy();
    expect(screen.getByText('2.9 h')).toBeTruthy();

    // Per-phase row labels
    expect(screen.getByText('Year 0')).toBeTruthy();
    expect(screen.getByText('Year 1')).toBeTruthy();

    // Unphased bucket label
    expect(screen.getByText('(Unphased)')).toBeTruthy();
    expect(
      screen.getByText(/crop area phase not joined to a declared phase/i),
    ).toBeTruthy();

    // Per-phase totals (rendered as "$X · Y.Y h" in a single span)
    expect(screen.getByText(/\$25 · 0\.4 h/)).toBeTruthy();
    expect(screen.getByText(/\$160 · 2\.0 h/)).toBeTruthy();
    expect(screen.getByText(/\$40 · 0\.5 h/)).toBeTruthy();
  });
});
