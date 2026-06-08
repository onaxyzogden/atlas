/**
 * @vitest-environment happy-dom
 *
 * Stepper -- numeric value with -/+ buttons and optional presets.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

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

import { Stepper } from '../Stepper.js';

describe('Stepper', () => {
  it('renders the value and unit', () => {
    render(<Stepper value={5} onChange={() => {}} unit="hrs" />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('hrs')).toBeTruthy();
  });

  it('increase calls onChange(value+step)', () => {
    const onChange = vi.fn();
    render(<Stepper value={5} onChange={onChange} step={2} />);
    fireEvent.click(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('decrease calls onChange(value-step)', () => {
    const onChange = vi.fn();
    render(<Stepper value={5} onChange={onChange} step={2} />);
    fireEvent.click(screen.getByLabelText('Decrease'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('decrease at min does not go below min', () => {
    const onChange = vi.fn();
    render(<Stepper value={0} onChange={onChange} min={0} />);
    fireEvent.click(screen.getByLabelText('Decrease'));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('increase at max does not go above max', () => {
    const onChange = vi.fn();
    render(<Stepper value={10} onChange={onChange} max={10} />);
    fireEvent.click(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('clicking a preset calls onChange with that preset', () => {
    const onChange = vi.fn();
    render(<Stepper value={5} onChange={onChange} presets={[8, 24]} />);
    fireEvent.click(screen.getByText('24'));
    expect(onChange).toHaveBeenCalledWith(24);
  });

  it('preset data-on reflects current value', () => {
    render(<Stepper value={8} onChange={() => {}} presets={[8, 24]} />);
    const presets = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('data-on') !== null);
    const on = presets.find((b) => b.textContent === '8');
    const off = presets.find((b) => b.textContent === '24');
    expect(on?.getAttribute('data-on')).toBe('true');
    expect(off?.getAttribute('data-on')).toBe('false');
  });

  it('applies the ariaLabel to the group', () => {
    render(<Stepper value={5} onChange={() => {}} ariaLabel="Hours" />);
    expect(screen.getByRole('group', { name: 'Hours' })).toBeTruthy();
  });
});
