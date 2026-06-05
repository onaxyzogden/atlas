/**
 * @vitest-environment happy-dom
 *
 * Phase E.3 — DetailsDrawer unit tests.
 *
 * Layer-fetch path stubs out `api.layers.get` via vi.mock so the suite stays
 * hermetic (no network in vitest).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../lib/apiClient.js', () => ({
  api: {
    layers: {
      get: vi.fn(async (_projectId: string, _layerType: string) => ({
        layerType: 'soils',
        summary: { score: 'C3', somPct: 1.2 },
      })),
    },
  },
}));

import DetailsDrawer from '../DetailsDrawer.js';
import { api } from '../../../lib/apiClient.js';

const DETAILS = {
  rawGeoJsonRef: 'layer:soils',
  rawSummaryRef: 'site_assessments.score_breakdown',
};

describe('DetailsDrawer', () => {
  beforeEach(() => {
    (api.layers.get as ReturnType<typeof vi.fn>).mockClear();
  });
  afterEach(() => cleanup());

  it('renders both refs and a backdrop', () => {
    render(
      <DetailsDrawer
        title="Land verdict — details"
        details={DETAILS}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('details-drawer')).toBeTruthy();
    expect(screen.getByTestId('details-backdrop')).toBeTruthy();
    expect(screen.getByTestId('details-summary-ref').textContent).toContain(
      'site_assessments.score_breakdown',
    );
    expect(screen.getByTestId('details-geojson-ref').textContent).toContain(
      'layer:soils',
    );
  });

  it('clicking close + backdrop both invoke onClose', () => {
    const onClose = vi.fn();
    render(
      <DetailsDrawer
        title="x"
        details={DETAILS}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId('details-close'));
    fireEvent.click(screen.getByTestId('details-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('skips layer fetch when projectId is absent', () => {
    render(
      <DetailsDrawer title="x" details={DETAILS} onClose={() => {}} />,
    );
    expect(api.layers.get).not.toHaveBeenCalled();
  });

  it('fetches and renders the layer payload when projectId is provided', async () => {
    render(
      <DetailsDrawer
        title="x"
        details={DETAILS}
        projectId="proj-1"
        onClose={() => {}}
      />,
    );
    await waitFor(() => {
      expect(api.layers.get).toHaveBeenCalledWith('proj-1', 'soils');
    });
    await waitFor(() => {
      expect(screen.getByTestId('details-layer-payload').textContent).toContain('"somPct"');
    });
  });
});
