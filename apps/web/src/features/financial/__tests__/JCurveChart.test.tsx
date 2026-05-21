/**
 * @vitest-environment happy-dom
 *
 * JCurveChart — D.4 render tests.
 *
 * Covers: empty input → null; standard rendering with trough + breakeven
 * markers + stage bands; a11y attributes on the SVG; secondary-axis
 * suppression when `naturalCapitalAppreciationByYear` is absent;
 * legend rendering.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import JCurveChart from '../JCurveChart.js';
import type { TransitionYear } from '../engine/transitionBudget.js';

function ty(year: number, capex: number, opex: number, revenue: number): TransitionYear {
  // Pre-compute cumulative on caller side for clarity in tests.
  return {
    year,
    phase: year <= 2 ? 'establishment' : year <= 5 ? 'build-up' : 'maturation',
    capex,
    opex,
    revenue,
    revenueScalar: 0,
    netCashflow: revenue - capex - opex,
    cumulativeNetCashflow: 0, // patched below
  };
}

/** Build a J-curve fixture: front-loaded capex (negative cumulative
 *  early), then revenue ramp lifts cumulative through breakeven. */
function fixture(): TransitionYear[] {
  const rows: TransitionYear[] = [
    ty(0, 200_000, 5_000, 0),
    ty(1, 100_000, 8_000, 5_000),
    ty(2, 50_000, 12_000, 15_000),
    ty(3, 20_000, 18_000, 50_000),
    ty(4, 10_000, 22_000, 90_000),
    ty(5, 0, 25_000, 120_000),
    ty(6, 0, 28_000, 150_000),
    ty(7, 0, 30_000, 180_000),
    ty(8, 0, 32_000, 200_000),
    ty(9, 0, 34_000, 220_000),
    ty(10, 0, 36_000, 240_000),
  ];
  let cum = 0;
  for (const r of rows) {
    cum += r.netCashflow;
    r.cumulativeNetCashflow = cum;
    r.revenueScalar = 0; // not exercised in chart
  }
  return rows;
}

describe('JCurveChart', () => {
  it('returns null on empty input', () => {
    const { container } = render(<JCurveChart transitionYears={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a labelled SVG with role=img and a non-empty aria-label', () => {
    const { container } = render(<JCurveChart transitionYears={fixture()} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('role')).toBe('img');
    expect(svg!.getAttribute('aria-label')).toBeTruthy();
    expect(svg!.getAttribute('aria-label')!.length).toBeGreaterThan(10);
  });

  it('renders one band rect per phase span (establishment, build-up, maturation)', () => {
    const { container } = render(<JCurveChart transitionYears={fixture()} />);
    // Phase labels are textual; presence proves the three bands rendered.
    const labels = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '');
    expect(labels.some((l) => l.includes('Establishment'))).toBe(true);
    expect(labels.some((l) => l.includes('Build-up'))).toBe(true);
    expect(labels.some((l) => l.includes('Maturation'))).toBe(true);
  });

  it('renders trough + breakeven markers when both exist in the horizon', () => {
    const { container } = render(<JCurveChart transitionYears={fixture()} />);
    const labels = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '');
    expect(labels.some((l) => l.startsWith('Trough Yr'))).toBe(true);
    expect(labels.some((l) => l.startsWith('BE Yr'))).toBe(true);
  });

  it('suppresses the secondary axis when naturalCapitalAppreciationByYear is undefined', () => {
    const { container, getAllByText, queryByText } = render(
      <JCurveChart transitionYears={fixture()} />,
    );
    // No "Natural-capital appreciation" legend entry
    expect(queryByText(/Natural-capital appreciation/i)).toBeNull();
    // Primary legend entry still present
    expect(getAllByText(/Cumulative net cashflow/i).length).toBeGreaterThan(0);
    // Right-side axis ($0 / max) not rendered (only the left-axis labels are).
    const axisTexts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '');
    expect(axisTexts.filter((t) => t === '$0').length).toBe(0);
  });

  it('renders the secondary line + nat-cap annotation when appreciation is provided', () => {
    const rows = fixture();
    const nat: Record<number, number> = {};
    let cum = 0;
    for (const r of rows) {
      cum += 1_500; // synthetic monotone series
      nat[r.year] = cum;
    }
    const { container, getAllByText } = render(
      <JCurveChart transitionYears={rows} naturalCapitalAppreciationByYear={nat} />,
    );
    expect(getAllByText(/Natural-capital appreciation/i).length).toBeGreaterThan(0);
    // Two <path> elements: secondary (dashed) + primary.
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
    // The Yr-10 nat-cap annotation surfaces the final value.
    expect(getAllByText(/Nat-cap @ Yr 10/i).length).toBeGreaterThan(0);
  });
});
