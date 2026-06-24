/**
 * @vitest-environment happy-dom
 *
 * Operational Role Layer -- lens-spine scope (Phase 5, the LIVE Observe
 * navigator). The lens dashboard is the all-domains overview, so it never
 * collapses out-of-focus lenses: it rings in-focus ones (data-scope="in") and
 * softly mutes the rest (data-scope="out"), and offers the My-focus / Full-view
 * toggle. With no scope it is byte-identical to before (no data-scope, no
 * toggle). Asserts against the real lens->domain grouping in mockBundle.lenses.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { scopeForRoles } from '@ogden/shared';
import { LensDataProvider } from '../lensData/LensDataContext.js';
import { mockBundle } from '../lensData/mockBundle.js';
import ObserveLensSpine from '../ObserveLensSpine.js';

const LENSES = mockBundle.lenses;

function renderSpine(extra: Partial<React.ComponentProps<typeof ObserveLensSpine>> = {}) {
  return render(
    <LensDataProvider bundle={mockBundle}>
      <ObserveLensSpine
        activeLens="all"
        onSelectLens={() => {}}
        projectTitle="Test Project"
        projectType="Regen Farm"
        {...extra}
      />
    </LensDataProvider>,
  );
}

describe('ObserveLensSpine (operational role scope)', () => {
  afterEach(cleanup);

  it('no scope -> every lens chip is unmarked and no focus toggle renders', () => {
    renderSpine();
    const tabs = screen.getAllByRole('tab');
    // One "All lenses" chip + one per lens.
    expect(tabs.length).toBe(LENSES.length + 1);
    for (const tab of tabs) expect(tab.getAttribute('data-scope')).toBeNull();
    expect(screen.queryByTestId('view-focus-toggle')).toBeNull();
  });

  it('scoped -> in-focus lenses ring (data-scope=in), the rest mute (out), toggle shows the count', () => {
    const food = scopeForRoles(['food_production']); // { plants-food }
    const onFocusModeChange = vi.fn();
    renderSpine({
      scopedDomains: food,
      showFocusToggle: true,
      focusMode: 'role',
      onFocusModeChange,
    });

    // tabs[0] is the lens-agnostic "All lenses" chip (never carries a scope).
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]!.getAttribute('data-scope')).toBeNull();

    let inCount = 0;
    LENSES.forEach((lens, i) => {
      const expected = lens.domains.some((d) => food.has(d)) ? 'in' : 'out';
      if (expected === 'in') inCount += 1;
      expect(tabs[i + 1]!.getAttribute('data-scope')).toBe(expected);
    });
    // Food touches at least one lens but never all of them -- so the dashboard
    // genuinely de-emphasizes without ever emptying.
    expect(inCount).toBeGreaterThan(0);
    expect(inCount).toBeLessThan(LENSES.length);

    expect(screen.getByTestId('view-focus-toggle')).toBeTruthy();
    expect(screen.getByTestId('view-focus-role').textContent).toContain(
      `${inCount} / ${LENSES.length}`,
    );

    // Full view is always one click away.
    fireEvent.click(screen.getByTestId('view-focus-full'));
    expect(onFocusModeChange).toHaveBeenCalledWith('full');
  });
});
