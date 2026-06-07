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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';

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
  afterEach(() => cleanup());

  // NB: call history is cleared per-test inside the two count-sensitive tests
  // below (1 and 2), NOT via a `beforeEach(mockReset/mockClear)`. Resetting the
  // vi.fn() spy immediately before a test whose mock REJECTS (test 3's `boom`)
  // makes vitest+tinyspy surface that intended rejection as a spurious
  // "unhandled rejection" and fail the test. A fresh (or only-resolving-context)
  // spy does not. Both count-sensitive tests clear in a resolving/no-call
  // context, so the artifact never arms. See the test-3 comment below.

  it('renders nothing when there are no zones', () => {
    mockFetch.mockClear();
    const { container } = render(<ZoneSomSidebar projectId="p1" zones={[]} />);
    expect(container.firstChild).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('renders a sparkline + current stock + delta per zone on the happy path', async () => {
    mockFetch.mockClear();
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
    // Deliberately do NOT mockClear/mockReset here: this mock rejects, and
    // resetting the spy immediately before a rejecting call makes vitest report
    // the intended rejection as an unhandled error. The component swallows it
    // via Promise.allSettled, which is exactly what this test asserts.
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

  it('shows skeletons while requests are in flight', async () => {
    // Hold both per-zone requests in flight behind a gate so we can observe
    // the loading state, then release the gate INSIDE act() so the resulting
    // state update flushes synchronously.
    //
    // Why act() matters here: a state update applied OUTSIDE act() makes
    // React 19 schedule the commit as a macrotask via happy-dom's
    // MessageChannel. That pending scheduler task survives the file's
    // environment teardown — the worker never finalizes the file,
    // `onFinished` never fires, and `vitest run` hangs to the CI job timeout.
    // Flushing inside act() applies the update synchronously, leaving nothing
    // pending at teardown. (The per-test timeout in vitest.config.ts is the
    // durable backstop if a future change reintroduces a hang.)
    let releaseRequests = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseRequests = resolve;
    });
    mockFetch.mockImplementation(async () => {
      await gate;
      return envelope([row(0, 5), row(10, 8)]);
    });

    const { container } = render(
      <ZoneSomSidebar
        projectId="p1"
        zones={[
          { id: 'north', label: 'North paddock' },
          { id: 'south', label: 'South paddock' },
        ]}
      />,
    );

    // While requests are in flight: labels render, no sparkline yet, and the
    // aria-hidden skeleton placeholders are shown.
    expect(screen.getByText('North paddock')).toBeTruthy();
    expect(screen.getByText('South paddock')).toBeTruthy();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();

    // Release both requests and let the loading→loaded transition flush
    // synchronously inside act() (see the teardown note above).
    await act(async () => {
      releaseRequests();
    });
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });
});
