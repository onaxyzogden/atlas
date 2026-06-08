/**
 * @vitest-environment happy-dom
 *
 * SectionEyebrow -- uppercase letter-spaced section label atom.
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

import { SectionEyebrow } from '../SectionEyebrow.js';

void fireEvent;

describe('SectionEyebrow', () => {
  it('renders its children text', () => {
    render(<SectionEyebrow>Boundary</SectionEyebrow>);
    expect(screen.getByText('Boundary')).toBeTruthy();
  });

  it('applies the eyebrow class', () => {
    render(<SectionEyebrow>Label</SectionEyebrow>);
    const el = screen.getByText('Label');
    expect(el.className).toMatch(/eyebrow/);
  });

  it('merges an extra className', () => {
    render(<SectionEyebrow className="extra">Label</SectionEyebrow>);
    const el = screen.getByText('Label');
    expect(el.className).toMatch(/extra/);
  });
});
