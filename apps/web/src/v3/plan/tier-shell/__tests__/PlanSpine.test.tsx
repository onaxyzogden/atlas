// @vitest-environment happy-dom
/**
 * PlanSpine — pins the Plan-only collapse wrapper around the shared ActTierSpine.
 *
 * Expanded (default): the full S1-S7 stratum tablist renders alongside a
 * "Collapse strata" chevron. Collapsed: the tablist is unmounted and a slim
 * summary bar shows the project name + the active stratum (S{ordinal} · {title})
 * + an "Expand strata" chevron. The choice lives in the real persisted uiStore.
 *
 * Act renders ActTierSpine directly (no wrapper, no collapse) — not exercised
 * here; this test only covers the Plan wrapper's two branches.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// lucide-react ships CJS in this environment; stub the icons rendered here
// (PlanSpine's chevrons + ActTierSpine's state chips) so the tests do not crash
// on the "Objects are not valid as a React child" error (same pattern as
// PlanToolDock.test.tsx). vi.mock is hoisted — the factory must be self-contained.
vi.mock('lucide-react', () => {
  const n = () => null;
  return {
    ChevronUp: n, ChevronDown: n, // PlanSpine
    Check: n, Loader: n, Lock: n, // ActTierSpine
  };
});

import { PLAN_STRATA } from '@ogden/shared';
import PlanSpine from '../PlanSpine.js';
import { useUIStore } from '../../../../store/uiStore.js';

const s1 = PLAN_STRATA[0]!;

function renderSpine() {
  return render(
    <PlanSpine
      strata={PLAN_STRATA}
      objectives={[]}
      stratumStates={{}}
      lockedStratumIds={new Set()}
      activeStratumId={s1.id}
      onSelectStratum={vi.fn()}
      projectTitle="Moontrance Creek"
      projectTypeLabel={null}
      ariaLabel="Plan strata"
    />,
  );
}

beforeEach(() => {
  useUIStore.getState().setSpineCollapsed(false);
});
afterEach(cleanup);

describe('PlanSpine collapse', () => {
  it('renders the full spine plus a Collapse chevron when expanded', () => {
    renderSpine();
    expect(screen.getByRole('tablist', { name: 'Plan strata' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: new RegExp(s1.title) })).toBeTruthy();
    expect(screen.getByLabelText('Collapse strata')).toBeTruthy();
  });

  it('collapses to a slim summary bar showing project + active stratum', () => {
    renderSpine();
    fireEvent.click(screen.getByLabelText('Collapse strata'));

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('Moontrance Creek')).toBeTruthy();
    expect(
      screen.getByText(`S${s1.ordinal} · ${s1.title}`),
    ).toBeTruthy();
    expect(screen.getByLabelText('Expand strata')).toBeTruthy();
  });

  it('expands again from the collapsed bar', () => {
    renderSpine();
    fireEvent.click(screen.getByLabelText('Collapse strata'));
    fireEvent.click(screen.getByLabelText('Expand strata'));

    expect(screen.getByRole('tablist', { name: 'Plan strata' })).toBeTruthy();
    expect(screen.queryByLabelText('Expand strata')).toBeNull();
  });
});
