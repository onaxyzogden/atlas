// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectedChart } from '../components/ProjectedChart';
import { PROJECTED_SERIES } from '../data/projectedTrajectories';

describe('ProjectedChart', () => {
  it('renders with a Projected badge and methodology anchor', () => {
    const series = PROJECTED_SERIES.find((s) => s.metric === 'soil_organic_matter')!;
    render(<ProjectedChart measured={[]} projected={series} unit="% OM" />);
    expect(screen.getByText(/Projected/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /methodology/i })).toBeTruthy();
  });
});
