/**
 * @vitest-environment happy-dom
 *
 * Dropdown -- controlled single-select native <select>.
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

import { Dropdown } from '../Dropdown.js';

const OPTIONS = ['Alpha', 'Beta', 'Gamma'] as const;

describe('Dropdown', () => {
  it('renders the placeholder plus every option', () => {
    render(<Dropdown options={OPTIONS} value="" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'Select...' })).toBeTruthy();
    for (const o of OPTIONS) {
      expect(screen.getByRole('option', { name: o })).toBeTruthy();
    }
  });

  it('uses a custom placeholder when provided', () => {
    render(
      <Dropdown options={OPTIONS} value="" onChange={() => {}} placeholder="Pick one" />,
    );
    expect(screen.getByRole('option', { name: 'Pick one' })).toBeTruthy();
  });

  it('reflects the controlled value', () => {
    render(<Dropdown options={OPTIONS} value="Beta" onChange={() => {}} ariaLabel="Greek" />);
    const select = screen.getByRole('combobox', { name: 'Greek' }) as HTMLSelectElement;
    expect(select.value).toBe('Beta');
  });

  it('changing the selection calls onChange with the chosen option', () => {
    const onChange = vi.fn();
    render(<Dropdown options={OPTIONS} value="" onChange={onChange} ariaLabel="Greek" />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Greek' }), {
      target: { value: 'Gamma' },
    });
    expect(onChange).toHaveBeenCalledWith('Gamma');
  });

  it('selecting the placeholder clears the value (emits empty string)', () => {
    const onChange = vi.fn();
    render(<Dropdown options={OPTIONS} value="Beta" onChange={onChange} ariaLabel="Greek" />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Greek' }), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('falls back to the placeholder when value is not a known option', () => {
    render(<Dropdown options={OPTIONS} value="Delta" onChange={() => {}} ariaLabel="Greek" />);
    const select = screen.getByRole('combobox', { name: 'Greek' }) as HTMLSelectElement;
    expect(select.value).toBe('');
  });

  it('applies the ariaLabel to the select', () => {
    render(<Dropdown options={OPTIONS} value="" onChange={() => {}} ariaLabel="Greek letter" />);
    expect(screen.getByRole('combobox', { name: 'Greek letter' })).toBeTruthy();
  });

  it('disables the select when disabled', () => {
    render(<Dropdown options={OPTIONS} value="" onChange={() => {}} ariaLabel="Greek" disabled />);
    expect((screen.getByRole('combobox', { name: 'Greek' }) as HTMLSelectElement).disabled).toBe(
      true,
    );
  });
});
