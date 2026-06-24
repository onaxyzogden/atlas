/**
 * @vitest-environment happy-dom
 *
 * PurposeCapture -- bespoke right-panel capture for the s1-vision-c1 checklist
 * item ("State the primary purpose of this land project"). Read-only type grid
 * + optional elaboration field.
 *
 * TDD: tests written first (will fail until PurposeCapture.tsx is created).
 *
 * Mirrors StewardCapture.test.tsx / Stepper.test.tsx setup:
 *   - happy-dom environment
 *   - lucide-react forwardRef stub block (verbatim)
 *   - projectStore mocked with a fake project
 *   - EditInPlanButton mocked to a stub (avoids useNavigate from router)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PROJECT_TYPES } from '@ogden/shared';

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

// Mock projectStore -- provide a fake project with homestead as primary and
// market_garden as a chosen secondary. Mutable (vi.hoisted) so the empty-state
// test can swap in a type-less project; reset to the default in afterEach.
const DEFAULT_TYPE_RECORD = {
  primaryTypeId: 'homestead' as string | null,
  secondaryTypeIds: ['market_garden'] as readonly string[],
};
const mockState = vi.hoisted(() => ({
  projects: [
    {
      id: 'proj-test',
      serverId: undefined,
      metadata: {
        projectTypeRecord: {
          primaryTypeId: 'homestead' as string | null,
          secondaryTypeIds: ['market_garden'] as readonly string[],
        } as { primaryTypeId: string | null; secondaryTypeIds: readonly string[] } | undefined,
      },
    },
  ],
}));
vi.mock('../../../../store/projectStore.js', () => ({
  useProjectStore: (sel: (s: { projects: unknown[] }) => unknown) =>
    sel(mockState),
}));

// Mock EditInPlanButton to avoid useNavigate / router dependency in unit tests.
vi.mock('../EditInPlanButton.js', () => ({
  default: function EditInPlanButtonStub() {
    return React.createElement('button', { type: 'button' }, 'Edit in Plan');
  },
}));

import PurposeCapture, {
  decodePurpose,
  isPurposeValid,
  summarisePurpose,
  PURPOSE_GRID_CARDS,
} from '../PurposeCapture.js';
import type { FormValue } from '../actToolCatalog.js';

afterEach(() => {
  cleanup();
  // Restore the default (homestead + market_garden) project after any test that
  // mutated the mock (e.g. the type-less empty-state case).
  mockState.projects[0]!.metadata.projectTypeRecord = {
    primaryTypeId: DEFAULT_TYPE_RECORD.primaryTypeId,
    secondaryTypeIds: DEFAULT_TYPE_RECORD.secondaryTypeIds,
  };
});

// ---------------------------------------------------------------------------
// 1. Renders ONLY the chosen type cards (primary + secondary), not the full grid
// ---------------------------------------------------------------------------

describe('PurposeCapture -- renders only chosen type cards', () => {
  it('renders exactly the chosen cards (homestead + market_garden) and no others', () => {
    render(
      <PurposeCapture
        itemId="s1-vision-c1"
        value={{}}
        onChange={() => {}}
        projectId="proj-test"
      />,
    );

    // Only the two chosen cards are present in the grid.
    const cards = document.querySelectorAll('[data-type-id]');
    const ids = Array.from(cards).map((el) => el.getAttribute('data-type-id'));
    expect(ids).toContain('homestead');
    expect(ids).toContain('market_garden');
    expect(cards.length).toBe(2);

    // A non-chosen primary type (e.g. regenerative_farm) is NOT rendered.
    const nonChosen = PURPOSE_GRID_CARDS.find(
      (c) => c.id !== 'homestead' && c.id !== 'market_garden',
    );
    expect(nonChosen).toBeTruthy();
    expect(
      document.querySelector(`[data-type-id="${nonChosen!.id}"]`),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Excludes residential
// ---------------------------------------------------------------------------

describe('PurposeCapture -- excludes residential', () => {
  it('does not render a Residential card in the grid', () => {
    render(
      <PurposeCapture
        itemId="s1-vision-c1"
        value={{}}
        onChange={() => {}}
        projectId="proj-test"
      />,
    );
    expect(screen.queryByText(/residential/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Primary type card has data-selected="true"; no other card selected
// ---------------------------------------------------------------------------

describe('PurposeCapture -- primary type selection', () => {
  it('marks the primary type card with data-selected="true"', () => {
    render(
      <PurposeCapture
        itemId="s1-vision-c1"
        value={{}}
        onChange={() => {}}
        projectId="proj-test"
      />,
    );
    const selected = document.querySelectorAll('[data-selected="true"]');
    expect(selected.length).toBe(1);
    // The selected card should be homestead (our mock primary)
    const selectedText = selected[0]?.textContent ?? '';
    expect(selectedText.toLowerCase()).toContain('homestead');
  });
});

// ---------------------------------------------------------------------------
// 4. No +2 capability badge (only chosen cards render, so the hint is gone)
// ---------------------------------------------------------------------------

describe('PurposeCapture -- no capability badge', () => {
  it('does not render any +2 capability badge', () => {
    render(
      <PurposeCapture
        itemId="s1-vision-c1"
        value={{}}
        onChange={() => {}}
        projectId="proj-test"
      />,
    );
    expect(screen.queryByText('+2')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4b. Type-less project: muted fallback, no cards, Edit-in-Plan still present
// ---------------------------------------------------------------------------

describe('PurposeCapture -- type-less project fallback', () => {
  it('shows the "No project type set yet" fallback and still renders Edit in Plan', () => {
    mockState.projects[0]!.metadata.projectTypeRecord = undefined;
    render(
      <PurposeCapture
        itemId="s1-vision-c1"
        value={{}}
        onChange={() => {}}
        projectId="proj-test"
      />,
    );
    expect(document.querySelectorAll('[data-type-id]').length).toBe(0);
    expect(screen.getByText(/no project type set yet/i)).toBeTruthy();
    // The read-only note's affordance still renders (stubbed EditInPlanButton).
    expect(
      screen.getByRole('button', { name: /edit in plan/i }),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 5. Chosen secondary has data-secondary="true"
// ---------------------------------------------------------------------------

describe('PurposeCapture -- secondary type marking', () => {
  it('marks chosen secondary cards with data-secondary="true"', () => {
    render(
      <PurposeCapture
        itemId="s1-vision-c1"
        value={{}}
        onChange={() => {}}
        projectId="proj-test"
      />,
    );
    const secondaries = document.querySelectorAll('[data-secondary="true"]');
    expect(secondaries.length).toBe(1);
    // market_garden is our mock secondary
    const secondaryText = secondaries[0]?.textContent ?? '';
    expect(secondaryText.toLowerCase()).toContain('market garden');
  });
});

// ---------------------------------------------------------------------------
// 6. Cards are not buttons
// ---------------------------------------------------------------------------

describe('PurposeCapture -- cards are not buttons', () => {
  it('Homestead card is not a button (no role=button)', () => {
    render(
      <PurposeCapture
        itemId="s1-vision-c1"
        value={{}}
        onChange={() => {}}
        projectId="proj-test"
      />,
    );
    // The card itself is a plain div; querying by role button with "Homestead" text should return null
    expect(
      screen.queryByRole('button', { name: /homestead/i }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. Typing in the elaboration textarea calls onChange with { elaboration: <typed> }
// ---------------------------------------------------------------------------

describe('PurposeCapture -- elaboration textarea', () => {
  it('calls onChange with encoded elaboration when typing', () => {
    const onChange = vi.fn<(next: FormValue) => void>();
    render(
      <PurposeCapture
        itemId="s1-vision-c1"
        value={{}}
        onChange={onChange}
        projectId="proj-test"
      />,
    );
    const ta = screen.getByRole('textbox', {
      name: /primary purpose elaboration/i,
    });
    fireEvent.change(ta, { target: { value: 'A 45 ha property.' } });
    expect(onChange).toHaveBeenCalledWith({ elaboration: 'A 45 ha property.' });
  });
});

// ---------------------------------------------------------------------------
// 8. isPurposeValid always returns true
// ---------------------------------------------------------------------------

describe('isPurposeValid', () => {
  it('returns true for empty elaboration', () => {
    expect(isPurposeValid({ elaboration: '' })).toBe(true);
  });

  it('returns true for non-empty elaboration', () => {
    expect(isPurposeValid({ elaboration: 'Some text' })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. summarisePurpose
// ---------------------------------------------------------------------------

describe('summarisePurpose', () => {
  it('returns "Primary purpose confirmed" when elaboration is empty', () => {
    expect(summarisePurpose({ elaboration: '' })).toBe(
      'Primary purpose confirmed',
    );
  });

  it('returns "Primary purpose confirmed" when elaboration is whitespace only', () => {
    expect(summarisePurpose({ elaboration: '   ' })).toBe(
      'Primary purpose confirmed',
    );
  });

  it('starts with "Purpose:" when elaboration has content', () => {
    const result = summarisePurpose({ elaboration: 'A 45 ha property.' });
    expect(result.startsWith('Purpose:')).toBe(true);
  });

  it('truncates long elaborations to ~60 chars with ...', () => {
    const long =
      'A very long description that is definitely more than sixty characters in total length here.';
    const result = summarisePurpose({ elaboration: long });
    expect(result.endsWith('...')).toBe(true);
    // Should be "Purpose: " + up to 60 chars + "..."
    expect(result.length).toBeLessThan(75);
  });
});

// ---------------------------------------------------------------------------
// 10. COMPLETENESS GUARD: every canBePrimary type in PURPOSE_GRID_CARDS
// ---------------------------------------------------------------------------

describe('PURPOSE_GRID_CARDS completeness guard', () => {
  it('contains exactly one entry for every PROJECT_TYPES entry with canBePrimary === true', () => {
    const primaryTypes = PROJECT_TYPES.filter((t) => t.canBePrimary);
    expect(PURPOSE_GRID_CARDS.length).toBe(primaryTypes.length);

    // Every canBePrimary id appears exactly once in the grid
    for (const pt of primaryTypes) {
      const matches = PURPOSE_GRID_CARDS.filter((c) => c.id === pt.id);
      expect(matches.length).toBe(1);
    }
  });
});
