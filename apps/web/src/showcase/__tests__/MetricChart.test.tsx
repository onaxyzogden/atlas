// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricChart } from '../components/MetricChart';
import type { ShowcaseRegenerationEvent } from '../data/snapshot';

const events: ShowcaseRegenerationEvent[] = [
  { id: 'y0', event_date: '2024-01-15', event_type: 'observation', phase: 'Y0',
    observations: { metric: 'soil_om_pct', mean_om_pct_cropped: 2.1 }, parent_event_id: null },
  { id: 'y2', event_date: '2026-05-01', event_type: 'observation', phase: 'Y2',
    observations: { metric: 'soil_om_pct', mean_om_pct_cropped: 2.8 }, parent_event_id: null },
];

describe('MetricChart', () => {
  it('renders a labelled chart for soil_om_pct over Y0→Y2', () => {
    render(<MetricChart events={events} metric="soil_om_pct" unit="%" />);
    expect(screen.getByText(/soil_om_pct|Soil organic matter/i)).toBeTruthy();
    expect(screen.getByTestId('metric-chart-svg')).toBeTruthy();
  });
});
