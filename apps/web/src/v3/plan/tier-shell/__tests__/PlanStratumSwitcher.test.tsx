/**
 * @vitest-environment happy-dom
 *
 * PlanStratumSwitcher -- the Plan rail-header stratum switcher that replaces the
 * horizontal spine. Verified behaviours:
 *   1. Collapsed (default): header shows the active stratum's eyebrow + title;
 *      the expanded panel is NOT rendered.
 *   2. Clicking the header expands the panel: all 7 strata rows render, with the
 *      two reachable threshold rows (T1 after S3, T2 after S5) AND the decorative
 *      T3 row present.
 *   3. Clicking a stratum row calls onSelectStratum with its id and collapses.
 *   4. Clicking the T1 row calls onSelectThreshold('threshold-1'); the T3 row is
 *      decorative (not a button) and fires nothing.
 *   5. With thresholdActiveId set, the collapsed header shows the threshold name
 *      (eyebrow "Checkpoint"), not the active stratum.
 *   6. A locked stratum row still calls onSelectStratum (the locked popover is
 *      handled upstream by the shell's handleSelectStratum).
 *
 * No jest-dom in this suite -> vanilla DOM assertions only. Lucide ships CJS ->
 * mock it (repo convention) with a generic <svg> stub.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PLAN_STRATA, type PlanStratumState } from '@ogden/shared';
import {
  THRESHOLDS,
  REACHABLE_THRESHOLD_IDS,
} from '../../../act/tier-shell/declarationModel.js';
import PlanStratumSwitcher from '../PlanStratumSwitcher.js';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    stubbed[key] = isComponent
      ? React.forwardRef<SVGSVGElement, Record<string, unknown>>(
          function LucideStub(_props, ref) {
            return React.createElement('svg', {
              ref,
              'data-lucide-icon': key,
              'aria-hidden': 'true',
            });
          },
        )
      : value;
  }
  return stubbed;
});

const S1 = PLAN_STRATA[0]!;
const S2 = PLAN_STRATA[1]!;

// All available except S2 locked (exercises the lock affordance + the
// "locked still calls handler" rule).
const STATES: Record<string, PlanStratumState> = Object.fromEntries(
  PLAN_STRATA.map((s) => [s.id, s.id === S2.id ? 'locked' : 'available']),
);

function setup(
  overrides: Partial<React.ComponentProps<typeof PlanStratumSwitcher>> = {},
) {
  const onSelectStratum = vi.fn();
  const onSelectThreshold = vi.fn();
  render(
    <PlanStratumSwitcher
      strata={PLAN_STRATA}
      stratumStates={STATES}
      lockedStratumIds={new Set([S2.id])}
      activeStratumId={S1.id}
      activeStratum={S1}
      thresholds={THRESHOLDS}
      clickableThresholdIds={[...REACHABLE_THRESHOLD_IDS]}
      onSelectStratum={onSelectStratum}
      onSelectThreshold={onSelectThreshold}
      projectTitle="Wadi Farm"
      typeChips={[{ label: 'Silvopasture', kind: 'primary' }]}
      {...overrides}
    />,
  );
  return { onSelectStratum, onSelectThreshold };
}

const expand = () => fireEvent.click(screen.getByTestId('switcher-header'));

describe('PlanStratumSwitcher', () => {
  it('collapsed by default: shows active stratum, no panel', () => {
    setup();
    expect(
      screen.getByTestId('switcher-header').getAttribute('aria-expanded'),
    ).toBe('false');
    expect(screen.getByText(`Stratum S${S1.ordinal}`)).toBeTruthy();
    expect(screen.getByText(S1.title)).toBeTruthy();
    expect(screen.queryByTestId('switcher-panel')).toBeNull();
  });

  it('expands to all 7 strata + reachable + decorative thresholds', () => {
    setup();
    expand();
    expect(screen.getByTestId('switcher-panel')).toBeTruthy();
    for (const s of PLAN_STRATA) {
      expect(screen.getByTestId(`switcher-stratum-${s.id}`)).toBeTruthy();
    }
    // Project identity preserved (what the spine carried).
    expect(screen.getByText('Wadi Farm')).toBeTruthy();
    expect(screen.getByText('Silvopasture')).toBeTruthy();
    // T1 + T2 reachable buttons, T3 present but decorative (separator, no button).
    const t1 = screen.getByTestId('switcher-threshold-threshold-1');
    const t2 = screen.getByTestId('switcher-threshold-threshold-2');
    const t3 = screen.getByTestId('switcher-threshold-threshold-3');
    expect(t1.tagName).toBe('BUTTON');
    expect(t2.tagName).toBe('BUTTON');
    expect(t3.tagName).not.toBe('BUTTON');
    expect(t3.getAttribute('role')).toBe('separator');
  });

  it('selecting a stratum calls onSelectStratum and collapses', () => {
    const { onSelectStratum } = setup();
    expand();
    fireEvent.click(
      screen.getByTestId(`switcher-stratum-${PLAN_STRATA[2]!.id}`),
    );
    expect(onSelectStratum).toHaveBeenCalledWith(PLAN_STRATA[2]!.id);
    expect(screen.queryByTestId('switcher-panel')).toBeNull();
  });

  it('clicking the T1 row navigates; the T3 row is decorative', () => {
    const { onSelectThreshold } = setup();
    expand();
    fireEvent.click(screen.getByTestId('switcher-threshold-threshold-1'));
    expect(onSelectThreshold).toHaveBeenCalledWith('threshold-1');

    // Re-expand (the click collapsed the panel) and click the decorative T3.
    expand();
    fireEvent.click(screen.getByTestId('switcher-threshold-threshold-3'));
    expect(onSelectThreshold).toHaveBeenCalledTimes(1);
  });

  it('active threshold shows in the collapsed header instead of the stratum', () => {
    setup({ activeStratumId: '', thresholdActiveId: 'threshold-1' });
    expect(screen.getByText('Checkpoint')).toBeTruthy();
    expect(screen.getByText('Threshold 1 -- Reality Check')).toBeTruthy();
    expect(screen.queryByText(`Stratum S${S1.ordinal}`)).toBeNull();
  });

  it('a locked stratum still calls onSelectStratum (popover handled upstream)', () => {
    const { onSelectStratum } = setup();
    expand();
    const lockedRow = screen.getByTestId(`switcher-stratum-${S2.id}`);
    expect(lockedRow.getAttribute('data-locked')).toBe('true');
    fireEvent.click(lockedRow);
    expect(onSelectStratum).toHaveBeenCalledWith(S2.id);
  });
});
