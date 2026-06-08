/**
 * @vitest-environment happy-dom
 *
 * ActTierZeroWorkbench (canvas-only) — verifies the post-refactor 2-pane shape:
 *   1. DecisionList items for the active objective are rendered.
 *   2. The objectives rail label ("Objectives") is gone.
 *   3. The "Completes Tier 0" next-box is gone.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import ActTierZeroWorkbench from '../../v3/act/tier-shell/ActTierZeroWorkbench.js';

// Lucide forwardRef icons spread [undefined] into <svg> children when childless,
// which React + happy-dom reject on re-render. Replace every component export
// with a clean <svg> stub (established pattern across the tier-shell test suite).
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

const mockObjective = {
  id: 's1-vision',
  title: 'A clear vision, goals & stewardship capacity',
  shortTitle: null,
  checklist: [
    {
      id: 's1-vision-purpose',
      label: 'State the primary purpose of this land project in plain language',
      optional: false,
      feedsInto: [],
      feedNote: null,
    },
  ],
  focusedQuestion: 'What is this project for, what does success look like, and what resources does the steward have to work with?',
  completionGate: null,
  actHandoff: null,
};

const baseProps = {
  projectId: 'test-project',
  objectives: [mockObjective],
  activeObjectiveId: 's1-vision',
  primaryTypeId: 'ecovillage' as const,
  secondaryTypeIds: [] as const,
  progressByObjective: {} as Record<string, readonly string[]>,
  formValues: {},
  rationales: {},
  deferredItems: {},
  onRecord: vi.fn(),
  onSaveRationale: vi.fn(),
  onToggleDefer: vi.fn(),
};

describe('ActTierZeroWorkbench (canvas-only)', () => {
  it('renders the decision list item for the active objective', () => {
    render(<ActTierZeroWorkbench {...baseProps} />);
    expect(
      screen.getAllByText('State the primary purpose of this land project in plain language').length,
    ).toBeGreaterThan(0);
  });

  it('does NOT render the objectives rail label', () => {
    render(<ActTierZeroWorkbench {...baseProps} />);
    expect(screen.queryByText('Objectives')).toBeNull();
  });

  it('does NOT render the Completes Tier 0 next-box', () => {
    render(<ActTierZeroWorkbench {...baseProps} />);
    expect(screen.queryByText('Completes Tier 0')).toBeNull();
  });
});
