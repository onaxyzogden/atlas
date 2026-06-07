/**
 * @vitest-environment happy-dom
 *
 * ZoneSomSidebar — K.3 render tests.
 *
 * Covers: empty `zones` → renders null; two zones happy path → two
 * sparklines + current-stock + delta captions; one zone erroring →
 * sibling unaffected; loading → skeletons while requests are in flight.
 *
 * `api.soilRegeneration.getSomTrajectoryByZone` is stubbed via vi.mock so
 * the suite stays hermetic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

vi.mock('../../../lib/apiClient.js', () => ({
  api: {
    soilRegeneration: {
      getSomTrajectoryByZone: vi.fn(),
    },
  },
}));

import ZoneSomSidebar from '../ZoneSomSidebar.js';
import { api } from '../../../lib/apiClient.js';
import type { SomYearRow } from '../somAppreciation.js';

const mockFetch = api.soilRegeneration.getSomTrajectoryByZone as ReturnType<typeof vi.fn>;

function row(year: number, stock: number): SomYearRow {
  return {
    year,
    som_stock_tc: stock,
    sequestration_tcyr: 0,
    j_curve_stage: year <= 2 ? 'establishment' : year <= 5 ? 'build-up' : 'maturation',
  };
}

/** Wrap rows in the ApiEnvelope shape the real request() helper returns. */
function envelope(rows: SomYearRow[]) {
  return { data: rows, error: null };
}

describe('ZoneSomSidebar', () => {
  beforeEach(() => mockFetch.mockReset());
  afterEach(() => cleanup());

  it('renders nothing when there are no zones', () => {
    const { container } = render(<ZoneSomSidebar projectId="p1" zones={[]} />);
    expect(container.firstChild).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('renders a sparkline + current stock + delta per zone on the happy path', async () => {
    mockFetch.mockImplementation(async (_projectId: string, zoneId: string) => {
      if (zoneId === 'north') return envelope([row(0, 10), row(10, 40)]);
      return envelope([row(0, 5), row(10, 8)]);
    });

    render(
      <ZoneSomSidebar
        projectId="p1"
        zones={[
          { id: 'north', label: 'North paddock' },
          { id: 'south', label: 'South paddock' },
        ]}
      />,
    );

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2));

    expect(screen.getByLabelText('North paddock SOM trajectory')).toBeTruthy();
    expect(screen.getByLabelText('South paddock SOM trajectory')).toBeTruthy();
    // Current stock = last row.
    expect(screen.getByText('40.0 tC')).toBeTruthy();
    expect(screen.getByText('8.0 tC')).toBeTruthy();
    // Delta captions.
    expect(screen.getByText('Δ +30.0 tC over 10 yr')).toBeTruthy();
    expect(screen.getByText('Δ +3.0 tC over 10 yr')).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('isolates a per-zone error so siblings still render', async () => {
    mockFetch.mockImplementation(async (_projectId: string, zoneId: string) => {
      if (zoneId === 'north') return envelope([row(0, 10), row(10, 40)]);
      throw new Error('boom');
    });

    render(
      <ZoneSomSidebar
        projectId="p1"
        zones={[
          { id: 'north', label: 'North paddock' },
          { id: 'south', label: 'South paddock' },
        ]}
      />,
    );

    await waitFor(() => expect(screen.getByText('Trajectory unavailable')).toBeTruthy());
    // The healthy sibling still renders its sparkline.
    expect(screen.getByLabelText('North paddock SOM trajectory')).toBeTruthy();
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('shows skeletons while requests are in flight', () => {
    // Never resolves → stays in the loading state.
    mockFetch.mockImplementation(() => new Promise<SomYearRow[]>(() => {}));

    const { container } = render(
      <ZoneSomSidebar
        projectId="p1"
        zones={[
          { id: 'north', label: 'North paddock' },
          { id: 'south', label: 'South paddock' },
        ]}
      />,
    );

    // Labels render, but no sparkline yet.
    expect(screen.getByText('North paddock')).toBeTruthy();
    expect(screen.getByText('South paddock')).toBeTruthy();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    // Skeleton placeholders are aria-hidden.
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
