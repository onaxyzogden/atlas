/**
 * @vitest-environment happy-dom
 *
 * MonthBandPicker — pure UI tests (B5.2.x.c).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MonthBandPicker from '../MonthBandPicker.js';

describe('MonthBandPicker', () => {
  it('renders 12 month cells', () => {
    render(<MonthBandPicker startMonth={1} endMonth={12} onChange={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(12);
  });

  it('marks the selected range as aria-pressed (no wrap, Mar–Jun)', () => {
    render(<MonthBandPicker startMonth={3} endMonth={6} onChange={() => {}} />);
    const lit = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(lit).toHaveLength(4);
  });

  it('marks the selected range as aria-pressed (wrap, Oct–Mar = 6 months)', () => {
    render(<MonthBandPicker startMonth={10} endMonth={3} onChange={() => {}} />);
    const lit = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(lit).toHaveLength(6);
  });

  it('first click after mount sets startMonth; second click sets endMonth', () => {
    const onChange = vi.fn();
    render(<MonthBandPicker startMonth={1} endMonth={12} onChange={onChange} />);
    const cells = screen.getAllByRole('button');
    fireEvent.click(cells[4]!); // May
    expect(onChange).toHaveBeenLastCalledWith({ startMonth: 5, endMonth: 12 });
    // Props are still {1, 12} since the test parent doesn't propagate; the
    // toggle has advanced to 'end' so the next click writes endMonth only.
    fireEvent.click(cells[7]!); // Aug
    expect(onChange).toHaveBeenLastCalledWith({ startMonth: 1, endMonth: 8 });
  });
});
