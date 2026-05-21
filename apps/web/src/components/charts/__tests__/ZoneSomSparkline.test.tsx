/**
 * @vitest-environment happy-dom
 *
 * ZoneSomSparkline — K.2 render tests.
 *
 * Covers: empty rows → inert aria-hidden cell (no path); single year →
 * collapses to an endpoint dot with no line; monotonic increase → path
 * endpoints track the data range (last point higher = smaller y than
 * first); determinism → identical input yields byte-identical DOM.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ZoneSomSparkline from '../ZoneSomSparkline.js';
import type { SomYearRow } from '../../../features/financial/somAppreciation.js';

function row(year: number, stock: number): SomYearRow {
  return {
    year,
    som_stock_tc: stock,
    sequestration_tcyr: 0,
    j_curve_stage: year <= 2 ? 'establishment' : year <= 5 ? 'build-up' : 'maturation',
  };
}

describe('ZoneSomSparkline', () => {
  it('renders an inert aria-hidden cell with no path for empty rows', () => {
    const { container } = render(<ZoneSomSparkline rows={[]} ariaLabel="Empty zone" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
    expect(svg!.getAttribute('role')).toBeNull();
    expect(container.querySelector('path')).toBeNull();
    expect(container.querySelector('circle')).toBeNull();
  });

  it('collapses a single year to an endpoint dot with no line', () => {
    const { container } = render(
      <ZoneSomSparkline rows={[row(0, 42)]} ariaLabel="Single year" />,
    );
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('role')).toBe('img');
    expect(svg!.getAttribute('aria-label')).toBe('Single year');
    // No multi-point line for a one-row series.
    expect(container.querySelector('path')).toBeNull();
    // The dot stands in for the current value.
    expect(container.querySelector('circle')).not.toBeNull();
  });

  it('draws a path whose last point sits higher (smaller y) for an increasing series', () => {
    const rows = [row(0, 10), row(1, 20), row(2, 30), row(3, 50)];
    const { container } = render(<ZoneSomSparkline rows={rows} ariaLabel="Rising zone" />);
    const d = container.querySelector('path')!.getAttribute('d')!;
    // Path format: "M x0 y0 L x1 y1 L ...". Pull the y of the first and last points.
    const coords = d
      .replace(/[ML]/g, '')
      .trim()
      .split(/\s+/)
      .map(Number);
    const firstY = coords[1]!;
    const lastY = coords[coords.length - 1]!;
    // Increasing stock → last point is visually higher → smaller y.
    expect(lastY).toBeLessThan(firstY);
    // The min value anchors the bottom (largest y within the inner band).
    expect(firstY).toBeGreaterThan(lastY);
  });

  it('is deterministic: identical input yields byte-identical DOM', () => {
    const rows = [row(0, 10), row(1, 25), row(2, 18), row(3, 40)];
    const a = render(<ZoneSomSparkline rows={rows} ariaLabel="Zone A" />);
    const b = render(<ZoneSomSparkline rows={rows} ariaLabel="Zone A" />);
    expect(a.container.innerHTML).toBe(b.container.innerHTML);
  });
});
