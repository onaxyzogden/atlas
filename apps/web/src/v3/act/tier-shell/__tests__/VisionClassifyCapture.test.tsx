/**
 * @vitest-environment happy-dom
 *
 * VisionClassifyCapture -- a CONTROLLED renderer over the vision-classify value
 * shape `{ committed: string[]; aspirational: string[] }` (BOTH native string[]
 * -- the SAME shape the existing vision-classify form tool persists, so
 * persistence is byte-compatible). It implements the mockup's two-column
 * committed/aspirational sort with a TRANSIENT Unclassified staging zone,
 * suggestion chips, and a write-your-own input. The Unclassified list is
 * component-local UI state and is NOT persisted.
 *
 * Verified behaviours (VC2 TDD checklist):
 *   1. decodeClassify is total: missing/garbage keys collapse to [].
 *   2. isVisionClassifyValid requires at least one entry across both columns.
 *   3. summariseVisionClassify reports "{n} committed, {m} aspirational".
 *   4. clicking a suggestion chip stages it in Unclassified + marks chip used.
 *   5. moving an unclassified card emits onChange with it in the target column.
 *   6. write-your-own with the aspirational role appends to aspirational.
 *   7. deleting a classified card removes it.
 *   8. show-more reveals hidden suggestions.
 *
 * Mirrors SuccessCriteriaCapture.test.tsx / LabourInventoryCapture.test.tsx
 * (happy-dom + testing-library; the lucide-react svg stub avoids the
 * childless-forwardRef re-render crash).
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

import VisionClassifyCapture, {
  decodeClassify,
  isVisionClassifyValid,
  summariseVisionClassify,
  type ClassifyValue,
} from '../VisionClassifyCapture.js';

const SUGGESTIONS = ['Grow food', 'Restore soil', 'Habitat', 'Resilience'] as const;

function renderCapture(
  value: ClassifyValue = { committed: [], aspirational: [] },
  suggestions: readonly string[] = SUGGESTIONS,
) {
  const onChange = vi.fn();
  render(
    <VisionClassifyCapture
      value={value}
      onChange={onChange}
      suggestions={suggestions}
    />,
  );
  return { onChange };
}

// --------------------------------------------------------------------------
// decodeClassify
// --------------------------------------------------------------------------

describe('VisionClassifyCapture -- decodeClassify', () => {
  it('returns empty arrays for an empty value', () => {
    expect(decodeClassify({})).toEqual({ committed: [], aspirational: [] });
  });

  it('coerces a non-array field to an empty array', () => {
    expect(decodeClassify({ committed: 'x' })).toEqual({
      committed: [],
      aspirational: [],
    });
  });

  it('passes through populated string arrays', () => {
    expect(decodeClassify({ committed: ['a'], aspirational: ['b'] })).toEqual({
      committed: ['a'],
      aspirational: ['b'],
    });
  });

  it('filters non-string elements within an array (total over garbage)', () => {
    expect(
      decodeClassify({ committed: [1, null, 'x'] as unknown as string[], aspirational: [] }),
    ).toEqual({ committed: ['x'], aspirational: [] });
  });
});

// --------------------------------------------------------------------------
// isVisionClassifyValid / summariseVisionClassify
// --------------------------------------------------------------------------

describe('VisionClassifyCapture -- validity & summary', () => {
  it('is invalid when both columns are empty', () => {
    expect(isVisionClassifyValid({ committed: [], aspirational: [] })).toBe(false);
  });

  it('is valid with at least one committed entry', () => {
    expect(isVisionClassifyValid({ committed: ['a'], aspirational: [] })).toBe(true);
  });

  it('is valid with at least one aspirational entry', () => {
    expect(isVisionClassifyValid({ committed: [], aspirational: ['b'] })).toBe(true);
  });

  it('summarises the counts per column', () => {
    expect(
      summariseVisionClassify({ committed: ['a', 'b'], aspirational: ['c'] }),
    ).toBe('2 committed, 1 aspirational');
  });
});

// --------------------------------------------------------------------------
// suggestion chips + staging
// --------------------------------------------------------------------------

describe('VisionClassifyCapture -- staging', () => {
  it('clicking a suggestion chip stages it in Unclassified and marks the chip used', () => {
    renderCapture();
    fireEvent.click(screen.getByRole('button', { name: /Grow food/ }));
    expect(screen.getByTestId('unclassified-card-Grow food')).toBeTruthy();
    // After staging, the staged card's "Discard Grow food" button also matches
    // /Grow food/ by accessible name; scope to the disabled suggestion chip.
    const chip = screen
      .getAllByRole('button', { name: /Grow food/ })
      .find((b) => b.hasAttribute('disabled'))!;
    expect(chip.getAttribute('data-used')).toBe('true');
  });

  it('moving an unclassified card emits onChange with it in committed', () => {
    const { onChange } = renderCapture();
    fireEvent.click(screen.getByRole('button', { name: /Restore soil/ }));
    fireEvent.click(screen.getByTestId('to-committed-Restore soil'));
    expect(onChange).toHaveBeenCalledWith({
      committed: ['Restore soil'],
      aspirational: [],
    });
  });
});

// --------------------------------------------------------------------------
// write-your-own
// --------------------------------------------------------------------------

describe('VisionClassifyCapture -- write-your-own', () => {
  it('adds a custom element to the selected aspirational role', () => {
    const { onChange } = renderCapture();
    fireEvent.click(screen.getByTestId('own-role-aspirational'));
    fireEvent.change(screen.getByPlaceholderText(/Add your own vision element/i), {
      target: { value: 'Custom dream' },
    });
    fireEvent.click(screen.getByTestId('own-add'));
    expect(onChange).toHaveBeenCalledWith({
      committed: [],
      aspirational: ['Custom dream'],
    });
  });
});

// --------------------------------------------------------------------------
// own-role selector accessibility
// --------------------------------------------------------------------------

describe('VisionClassifyCapture -- own-role selector a11y', () => {
  it('communicates the active own-role via aria-pressed and toggles it on click', () => {
    renderCapture();
    const committed = screen.getByTestId('own-role-committed');
    const aspirational = screen.getByTestId('own-role-aspirational');
    // Default role is committed.
    expect(committed.getAttribute('aria-pressed')).toBe('true');
    expect(aspirational.getAttribute('aria-pressed')).toBe('false');
    // Selecting aspirational flips the pressed state.
    fireEvent.click(aspirational);
    expect(committed.getAttribute('aria-pressed')).toBe('false');
    expect(aspirational.getAttribute('aria-pressed')).toBe('true');
  });
});

// --------------------------------------------------------------------------
// classified cards
// --------------------------------------------------------------------------

describe('VisionClassifyCapture -- classified cards', () => {
  it('deleting a classified card removes it', () => {
    const { onChange } = renderCapture({ committed: ['Keep'], aspirational: [] });
    fireEvent.click(screen.getByTestId('delete-committed-Keep'));
    expect(onChange).toHaveBeenCalledWith({ committed: [], aspirational: [] });
  });

  it('switching a committed card moves it to aspirational', () => {
    const { onChange } = renderCapture({ committed: ['Move me'], aspirational: [] });
    fireEvent.click(screen.getByTestId('switch-committed-Move me'));
    expect(onChange).toHaveBeenCalledWith({ committed: [], aspirational: ['Move me'] });
  });
});

// --------------------------------------------------------------------------
// show-more
// --------------------------------------------------------------------------

describe('VisionClassifyCapture -- show more', () => {
  it('reveals hidden suggestions when the toggle is clicked', () => {
    renderCapture();
    expect(screen.queryByRole('button', { name: /Resilience/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Show 1 more/ }));
    expect(screen.getByRole('button', { name: /Resilience/ })).toBeTruthy();
  });

  it('toggle copy reads "Show {n} more" collapsed and "Show fewer" expanded', () => {
    renderCapture();
    const toggle = screen.getByRole('button', { name: /Show 1 more/ });
    expect(toggle.textContent).toContain('Show 1 more');
    expect(toggle.textContent).not.toContain('suggestions');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Show fewer/ }).textContent).toBe(
      'Show fewer',
    );
  });
});

// --------------------------------------------------------------------------
// fidelity re-skin: column sub-labels, tier-3 note, inline hint, corrected copy
// --------------------------------------------------------------------------

describe('VisionClassifyCapture -- column sub-labels', () => {
  it('renders the committed sub-label verbatim', () => {
    renderCapture();
    expect(
      screen.getByText('Will happen. Regardless of conditions.'),
    ).toBeTruthy();
  });

  it('renders the aspirational sub-label verbatim', () => {
    renderCapture();
    expect(
      screen.getByText('Hoped for. Depends on capacity or land.'),
    ).toBeTruthy();
  });
});

describe('VisionClassifyCapture -- tier 3 note', () => {
  it('renders the Tier 3 reclassification note verbatim', () => {
    renderCapture();
    // "Tier 3" sits inside a <strong>, so match on the paragraph's full
    // textContent (whitespace-collapsed) rather than a single text node.
    const note = screen.getByText((_content, el) => {
      if (!el || el.tagName !== 'P') return false;
      const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      return (
        t ===
        'At Tier 3, each element gets reclassified against observed land conditions -- feasible, conditional, deferred, or rejected. This is your intent. The land has its own answer.'
      );
    });
    expect(note).toBeTruthy();
  });
});

describe('VisionClassifyCapture -- write-own inline hint', () => {
  it('renders the italic "Unclassified if unsure" hint next to the role buttons', () => {
    renderCapture();
    const hint = screen.getByText('Unclassified if unsure');
    expect(hint).toBeTruthy();
    // Informational text, not a button.
    expect(hint.tagName).not.toBe('BUTTON');
  });
});

describe('VisionClassifyCapture -- corrected copy', () => {
  it('unclassified staging zone reads "Unclassified" + "Assign each below"', () => {
    renderCapture();
    fireEvent.click(screen.getByRole('button', { name: /Grow food/ }));
    expect(screen.getByText('Unclassified')).toBeTruthy();
    expect(screen.getByText('Assign each below')).toBeTruthy();
    expect(screen.queryByText(/sort each one/)).toBeNull();
  });

  it('suggestion header reads "Add from suggestions" with a neutral example sub-label', () => {
    renderCapture();
    expect(screen.getByText('Add from suggestions')).toBeTruthy();
    expect(screen.getByText('Examples for this project')).toBeTruthy();
    expect(screen.queryByText(/Suggested vision elements/)).toBeNull();
    expect(screen.queryByText(/Regen Farm/)).toBeNull();
  });
});
