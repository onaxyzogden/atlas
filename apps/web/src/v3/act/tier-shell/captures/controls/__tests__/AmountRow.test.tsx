/**
 * @vitest-environment happy-dom
 *
 * AmountRow -- label + numeric text input + unit, with optional interpretation.
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

import { AmountRow } from '../AmountRow.js';

describe('AmountRow', () => {
  it('renders the label and unit', () => {
    render(
      <AmountRow label="Rainfall" value="" onChange={() => {}} unit="mm" id="rain" />,
    );
    expect(screen.getByText('Rainfall')).toBeTruthy();
    expect(screen.getByText('mm')).toBeTruthy();
  });

  it('typing fires onChange with the new string', () => {
    const onChange = vi.fn();
    render(<AmountRow label="Rainfall" value="" onChange={onChange} id="rain" />);
    fireEvent.change(screen.getByLabelText('Rainfall'), {
      target: { value: '42' },
    });
    expect(onChange).toHaveBeenCalledWith('42');
  });

  it('renders the interpretation node when provided', () => {
    render(
      <AmountRow
        label="Rainfall"
        value="42"
        onChange={() => {}}
        id="rain"
        interpretation={<span>Above average</span>}
      />,
    );
    expect(screen.getByText('Above average')).toBeTruthy();
  });

  it('associates the label with the input via htmlFor/id', () => {
    render(<AmountRow label="Rainfall" value="" onChange={() => {}} id="rain" />);
    const input = screen.getByLabelText('Rainfall');
    expect(input.getAttribute('id')).toBe('rain');
  });
});
