/**
 * @vitest-environment happy-dom
 *
 * MonthCalendarGrid -- 12-cell colored frost/season calendar.
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

import { MonthCalendarGrid, MONTH_ABBR } from '../MonthCalendarGrid.js';

describe('MonthCalendarGrid', () => {
  it('renders 12 cells with month abbreviations', () => {
    render(<MonthCalendarGrid value={{}} onChange={() => {}} />);
    const cells = screen.getAllByRole('button');
    expect(cells).toHaveLength(12);
    for (const abbr of MONTH_ABBR) {
      expect(screen.getByText(abbr)).toBeTruthy();
    }
  });

  it("clicking a 'none' cell calls onChange setting it to 'low'", () => {
    const onChange = vi.fn();
    render(<MonthCalendarGrid value={{}} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('January'));
    expect(onChange).toHaveBeenCalledWith({ 0: 'low' });
  });

  it("clicking a 'high' cell wraps to 'none'", () => {
    const onChange = vi.fn();
    render(<MonthCalendarGrid value={{ 0: 'high' }} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('January'));
    expect(onChange).toHaveBeenCalledWith({ 0: 'none' });
  });

  it('data-state reflects value prop', () => {
    render(<MonthCalendarGrid value={{ 0: 'med', 2: 'high' }} onChange={() => {}} />);
    expect(screen.getByLabelText('January').getAttribute('data-state')).toBe('med');
    expect(screen.getByLabelText('February').getAttribute('data-state')).toBe('none');
    expect(screen.getByLabelText('March').getAttribute('data-state')).toBe('high');
  });

  it('applies the ariaLabel to the group', () => {
    render(<MonthCalendarGrid value={{}} onChange={() => {}} ariaLabel="Frost calendar" />);
    expect(screen.getByRole('group', { name: 'Frost calendar' })).toBeTruthy();
  });
});
