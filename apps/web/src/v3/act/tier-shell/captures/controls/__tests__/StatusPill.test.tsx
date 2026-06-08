/**
 * @vitest-environment happy-dom
 *
 * StatusPill -- small rounded status badge with per-tone tint.
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

import { StatusPill } from '../StatusPill.js';

void fireEvent;

describe('StatusPill', () => {
  it('renders its label', () => {
    render(<StatusPill label="Active" />);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('sets data-tone to the provided tone', () => {
    render(<StatusPill label="Done" tone="success" />);
    expect(screen.getByText('Done').getAttribute('data-tone')).toBe('success');
  });

  it('defaults tone to neutral', () => {
    render(<StatusPill label="Idle" />);
    expect(screen.getByText('Idle').getAttribute('data-tone')).toBe('neutral');
  });

  it('applies the pill class', () => {
    render(<StatusPill label="Live" tone="act" />);
    expect(screen.getByText('Live').className).toMatch(/pill/);
  });
});
