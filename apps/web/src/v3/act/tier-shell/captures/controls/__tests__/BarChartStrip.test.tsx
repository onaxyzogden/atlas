/**
 * @vitest-environment happy-dom
 *
 * BarChartStrip -- pure-presentation horizontal/vertical flexed bars w/ labels.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

import { BarChartStrip } from '../BarChartStrip.js';

const DATA = [
  { label: 'Jan', value: 100 },
  { label: 'Feb', value: 50 },
  { label: 'Mar', value: 0 },
] as const;

describe('BarChartStrip', () => {
  it('renders a labelled column per datum', () => {
    render(<BarChartStrip data={DATA} ariaLabel="Monthly" />);
    expect(screen.getByText('Jan')).toBeTruthy();
    expect(screen.getByText('Feb')).toBeTruthy();
    expect(screen.getByText('Mar')).toBeTruthy();
  });

  it('bar height % is proportional to max', () => {
    const { container } = render(<BarChartStrip data={DATA} ariaLabel="Monthly" />);
    const bars = Array.from(
      container.querySelectorAll<HTMLDivElement>('[title]'),
    );
    // max is 100 (default) → 100%, 50%, 0%
    expect(bars.map((b) => b.style.height)).toEqual(['100%', '50%', '0%']);
  });

  it('has role=img with the aria-label', () => {
    render(<BarChartStrip data={DATA} ariaLabel="Monthly" />);
    expect(screen.getByRole('img', { name: 'Monthly' })).toBeTruthy();
  });

  it('includes the value and unit in each bar title', () => {
    const { container } = render(
      <BarChartStrip data={DATA} ariaLabel="Monthly" unit="mm" />,
    );
    const bars = Array.from(
      container.querySelectorAll<HTMLDivElement>('[title]'),
    );
    expect(bars[0]?.getAttribute('title')).toBe('Jan: 100mm');
  });
});
