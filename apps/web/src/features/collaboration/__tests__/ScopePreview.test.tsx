/**
 * @vitest-environment happy-dom
 *
 * ScopePreview -- pure presentational summary of the domain scope a set of
 * operational roles produces (ADR 2026-06-24 Operational Role Layer). No store,
 * no hooks: render with props, read the DOM back. Pins the two empty surfaces
 * ('full' vs 'none'), the "M of 16" count, the near-full advisory, and the
 * read-only domain chip list.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  OPERATIONAL_ROLES,
  scopeForRoles,
  UNIVERSAL_DOMAINS,
  type OperationalRole,
} from '@ogden/shared';
import ScopePreview from '../ScopePreview.js';

describe('ScopePreview -- empty role set', () => {
  it("emptyMeans='full' reads as the full unfiltered view", () => {
    render(<ScopePreview roles={[]} emptyMeans="full" />);
    const root = screen.getByTestId('scope-preview');
    expect(root.getAttribute('data-empty')).toBe('true');
    expect(screen.getByTestId('scope-preview-summary').textContent).toMatch(
      /full view/i,
    );
    // No chips rendered in the empty state.
    expect(screen.queryByLabelText('Domains in focus')).toBeNull();
  });

  it("emptyMeans='none' reads as nothing assigned yet", () => {
    render(<ScopePreview roles={[]} emptyMeans="none" />);
    expect(screen.getByTestId('scope-preview-summary').textContent).toMatch(
      /no operational roles assigned yet/i,
    );
    // No near-full warning, no chips.
    expect(screen.queryByTestId('scope-preview-warning')).toBeNull();
  });
});

describe('ScopePreview -- a single role', () => {
  it('summarises the count out of 16 and lists each in-focus domain chip', () => {
    const roles: OperationalRole[] = ['livestock'];
    render(<ScopePreview roles={roles} emptyMeans="full" />);

    const summary = screen.getByTestId('scope-preview-summary');
    expect(summary.textContent).toMatch(/1 role\b/); // singular
    expect(summary.textContent).toMatch(/1 of 16/);

    // Exactly the livestock domain is in focus.
    expect(screen.getByTestId('scope-chip-animals-livestock')).toBeTruthy();
    const chips = screen.getByLabelText('Domains in focus').querySelectorAll('li');
    expect(chips).toHaveLength(1);

    // A single narrow role is well below the near-full threshold.
    expect(screen.queryByTestId('scope-preview-warning')).toBeNull();
  });

  it('pluralises "roles" for two or more', () => {
    render(<ScopePreview roles={['livestock', 'food_production']} emptyMeans="full" />);
    expect(screen.getByTestId('scope-preview-summary').textContent).toMatch(
      /2 roles\b/,
    );
  });
});

describe('ScopePreview -- near-full scope advisory', () => {
  it('warns when stacking every role widens the view past the threshold', () => {
    render(<ScopePreview roles={[...OPERATIONAL_ROLES]} emptyMeans="full" />);

    // The six-role union is every domain except the steward-only one.
    const expected = scopeForRoles(OPERATIONAL_ROLES).size;
    expect(screen.getByTestId('scope-preview-summary').textContent).toMatch(
      new RegExp(`${expected} of ${UNIVERSAL_DOMAINS.length}`),
    );
    expect(screen.getByTestId('scope-preview-warning')).toBeTruthy();
    expect(
      screen.getByLabelText('Domains in focus').querySelectorAll('li'),
    ).toHaveLength(expected);
  });
});
