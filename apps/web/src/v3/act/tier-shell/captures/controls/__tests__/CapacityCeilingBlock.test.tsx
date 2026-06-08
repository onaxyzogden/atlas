/**
 * @vitest-environment happy-dom
 *
 * CapacityCeilingBlock -- computed max + pass/warn/fail surface.
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

import { CapacityCeilingBlock } from '../CapacityCeilingBlock.js';

describe('CapacityCeilingBlock', () => {
  it('renders label, value, unit, and note', () => {
    render(
      <CapacityCeilingBlock
        label="Carrying capacity ceiling"
        value={42}
        unit="AU"
        note="Based on forage yield"
      />,
    );
    expect(screen.getByText('Carrying capacity ceiling')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('AU')).toBeTruthy();
    expect(screen.getByText('Based on forage yield')).toBeTruthy();
  });

  it('sets data-tone from the tone prop', () => {
    const { container } = render(
      <CapacityCeilingBlock label="Ceiling" value={10} tone="fail" />,
    );
    const block = container.querySelector('[data-tone]');
    expect(block?.getAttribute('data-tone')).toBe('fail');
  });

  it("defaults tone to 'pass'", () => {
    const { container } = render(
      <CapacityCeilingBlock label="Ceiling" value={10} />,
    );
    const block = container.querySelector('[data-tone]');
    expect(block?.getAttribute('data-tone')).toBe('pass');
  });
});
