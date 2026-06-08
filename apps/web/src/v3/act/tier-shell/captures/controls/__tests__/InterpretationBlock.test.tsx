/**
 * @vitest-environment happy-dom
 *
 * InterpretationBlock -- a tone-colored note fed by a computed value.
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

import { InterpretationBlock } from '../InterpretationBlock.js';

describe('InterpretationBlock', () => {
  it('renders its children', () => {
    render(<InterpretationBlock tone="pass">All good</InterpretationBlock>);
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('sets the data-tone attribute', () => {
    render(<InterpretationBlock tone="warn">Careful</InterpretationBlock>);
    expect(screen.getByText('Careful').getAttribute('data-tone')).toBe('warn');
  });

  it('has role=note', () => {
    render(<InterpretationBlock tone="info">Note</InterpretationBlock>);
    expect(screen.getByRole('note')).toBeTruthy();
  });
});
