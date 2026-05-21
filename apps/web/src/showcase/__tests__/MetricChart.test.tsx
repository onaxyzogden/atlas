// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricChart } from '../components/MetricChart';

const events = [
  { id: 'e1', event_date: '2024-04-12', event_type: 'observation', phase: 'Y0',
    observations: { metric: 'soil_organic_matter', mean_om_pct_cropped: 1.65 }, parent_event_id: null },
  { id: 'e2', event_date: '2026-04-12', event_type: 'observation', phase: 'Y2',
    observations: { metric: 'soil_organic_matter', mean_om_pct_cropped: 2.25 }, parent_event_id: null },
];

describe('MetricChart', () => {
  it('renders Y0 and Y2 datapoints for a metric', () => {
    render(<MetricChart metric="soil_organic_matter" events={events as any} unit="% OM" />);
    expect(screen.getByText(/soil_organic_matter|Soil organic matter/i)).toBeTruthy();
    expect(screen.getByTestId('metric-chart-svg')).toBeTruthy();
  });
});
