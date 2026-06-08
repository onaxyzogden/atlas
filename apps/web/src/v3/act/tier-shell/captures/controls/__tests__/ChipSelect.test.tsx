/**
 * @vitest-environment happy-dom
 *
 * ChipSelect -- controlled toggle chips (multi or single select).
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

import { ChipSelect } from '../ChipSelect.js';

const OPTIONS = ['Alpha', 'Beta', 'Gamma'] as const;

describe('ChipSelect', () => {
  it('renders all options', () => {
    render(<ChipSelect options={OPTIONS} value={[]} onChange={() => {}} />);
    for (const o of OPTIONS) expect(screen.getByText(o)).toBeTruthy();
  });

  it('clicking an unselected chip calls onChange with it added', () => {
    const onChange = vi.fn();
    render(<ChipSelect options={OPTIONS} value={['Alpha']} onChange={onChange} />);
    fireEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith(['Alpha', 'Beta']);
  });

  it('clicking a selected chip removes it', () => {
    const onChange = vi.fn();
    render(<ChipSelect options={OPTIONS} value={['Alpha', 'Beta']} onChange={onChange} />);
    fireEvent.click(screen.getByText('Alpha'));
    expect(onChange).toHaveBeenCalledWith(['Beta']);
  });

  it('with multi=false, selecting B when A is selected replaces', () => {
    const onChange = vi.fn();
    render(
      <ChipSelect options={OPTIONS} value={['Alpha']} onChange={onChange} multi={false} />,
    );
    fireEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith(['Beta']);
  });

  it('aria-pressed reflects selection', () => {
    render(<ChipSelect options={OPTIONS} value={['Beta']} onChange={() => {}} />);
    expect(screen.getByText('Alpha').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Beta').getAttribute('aria-pressed')).toBe('true');
  });

  it('applies the ariaLabel to the group', () => {
    render(
      <ChipSelect options={OPTIONS} value={[]} onChange={() => {}} ariaLabel="Pick" />,
    );
    expect(screen.getByRole('group', { name: 'Pick' })).toBeTruthy();
  });
});
