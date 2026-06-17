/**
 * @vitest-environment happy-dom
 *
 * IntentLensAccordion -- the collapsible "Intent lens -- what to look for" block
 * inside the Reception (Tier-2) working panel. These tests pin:
 *   1. empty/absent lens -> renders nothing (the Act + non-reception guard).
 *   2. collapsed-by-default; the count chip reads the row count.
 *   3. toggles open on click, revealing one row per lens entry.
 *   4. defaultOpen renders the rows immediately.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { IntentLensRow } from '@ogden/shared';

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

import IntentLensAccordion from '../IntentLensAccordion.js';

const LENS: readonly IntentLensRow[] = [
  { typeId: 'regenerative_farm', text: 'Look for swale lines and contour flow' },
  { typeId: 'silvopasture', text: 'Trace stock-water reach across paddocks' },
  { typeId: 'residential', text: 'Check domestic supply and septic drainage' },
];

describe('IntentLensAccordion -- empty guard', () => {
  it('renders nothing when the lens is empty', () => {
    const { container } = render(<IntentLensAccordion lens={[]} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('intent-lens')).toBeNull();
  });
});

describe('IntentLensAccordion -- collapsed by default', () => {
  it('mounts the head with the row count but no rows until expanded', () => {
    render(<IntentLensAccordion lens={LENS} />);
    const root = screen.getByTestId('intent-lens');
    expect(root).toBeTruthy();
    // The count chip reads the number of lens rows.
    expect(root.textContent).toMatch(/3/);
    // Collapsed: aria-expanded false + no rows mounted.
    const toggle = root.querySelector('button')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('intent-lens-row-regenerative_farm')).toBeNull();
  });

  it('reveals one row per lens entry when the head is clicked', () => {
    render(<IntentLensAccordion lens={LENS} />);
    fireEvent.click(screen.getByTestId('intent-lens').querySelector('button')!);
    expect(
      screen.getByTestId('intent-lens-row-regenerative_farm'),
    ).toBeTruthy();
    expect(screen.getByTestId('intent-lens-row-silvopasture')).toBeTruthy();
    expect(screen.getByTestId('intent-lens-row-residential')).toBeTruthy();
    expect(
      screen.getByTestId('intent-lens-row-silvopasture').textContent,
    ).toMatch(/Trace stock-water reach/);
  });
});

describe('IntentLensAccordion -- defaultOpen', () => {
  it('renders the rows immediately when defaultOpen is set', () => {
    render(<IntentLensAccordion lens={LENS} defaultOpen />);
    expect(
      screen.getByTestId('intent-lens-row-regenerative_farm'),
    ).toBeTruthy();
    expect(
      screen.getByTestId('intent-lens').querySelector('button')!
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });
});
