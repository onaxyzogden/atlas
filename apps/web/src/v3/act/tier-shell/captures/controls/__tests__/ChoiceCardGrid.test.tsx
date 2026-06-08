/**
 * @vitest-environment happy-dom
 *
 * ChoiceCardGrid -- controlled single/multi-select cards (icon + title + desc).
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

import { ChoiceCardGrid, type ChoiceCardOption } from '../ChoiceCardGrid.js';

function StubIcon(props: { size?: number; 'aria-hidden'?: boolean }) {
  return React.createElement('svg', { 'data-test-icon': 'true', ...props });
}

const OPTIONS: readonly ChoiceCardOption[] = [
  { id: 'a', title: 'Alpha', description: 'First option', icon: StubIcon },
  { id: 'b', title: 'Beta', description: 'Second option' },
];

describe('ChoiceCardGrid', () => {
  it('renders all card titles and descriptions', () => {
    render(<ChoiceCardGrid options={OPTIONS} value={[]} onChange={() => {}} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('First option')).toBeTruthy();
    expect(screen.getByText('Second option')).toBeTruthy();
  });

  it('single-select click replaces value with the id', () => {
    const onChange = vi.fn();
    render(<ChoiceCardGrid options={OPTIONS} value={['a']} onChange={onChange} />);
    fireEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('multi toggles selection', () => {
    const onChange = vi.fn();
    render(
      <ChoiceCardGrid options={OPTIONS} value={['a']} onChange={onChange} multi />,
    );
    fireEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
  });

  it('multi click on selected card removes it', () => {
    const onChange = vi.fn();
    render(
      <ChoiceCardGrid options={OPTIONS} value={['a', 'b']} onChange={onChange} multi />,
    );
    fireEvent.click(screen.getByText('Alpha'));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('aria-pressed reflects selection', () => {
    render(<ChoiceCardGrid options={OPTIONS} value={['a']} onChange={() => {}} />);
    expect(screen.getByText('Alpha').closest('button')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByText('Beta').closest('button')?.getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('renders a provided icon component', () => {
    const { container } = render(
      <ChoiceCardGrid options={OPTIONS} value={[]} onChange={() => {}} />,
    );
    expect(container.querySelector('[data-test-icon="true"]')).toBeTruthy();
  });
});
