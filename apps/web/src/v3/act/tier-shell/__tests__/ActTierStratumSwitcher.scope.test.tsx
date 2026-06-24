/**
 * @vitest-environment happy-dom
 *
 * Operational Role Layer -- the stratum switcher's per-stratum "N in focus / M
 * total" badge (Phase 6, Plan). The badge is the steward's reassurance that
 * scoped-away work still EXISTS in every stratum (never hide, only de-emphasize):
 *   - collapsed header carries the ACTIVE stratum's "N / M in focus" pill;
 *   - the expanded list carries a compact "N/M" on every stratum that has a
 *     count.
 * The whole feature is gated on the optional `focusCountByStratum` prop: when it
 * is absent (Act, solo, no-role, or full view) NO badge renders and the switcher
 * is byte-identical to before. Lucide is mocked per the repo convention.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PLAN_STRATA, type PlanStratumState } from '@ogden/shared';
import ActTierStratumSwitcher from '../ActTierStratumSwitcher.js';

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
const S3 = PLAN_STRATA[2]!;

const ALL_AVAILABLE: Record<string, PlanStratumState> = Object.fromEntries(
  PLAN_STRATA.map((s) => [s.id, 'available']),
);

function setup(
  overrides: Partial<React.ComponentProps<typeof ActTierStratumSwitcher>> = {},
) {
  render(
    <ActTierStratumSwitcher
      strata={PLAN_STRATA}
      stratumStates={ALL_AVAILABLE}
      lockedStratumIds={new Set()}
      activeStratumId={S1.id}
      activeStratum={S1}
      onSelectStratum={vi.fn()}
      projectTitle="Wadi Farm"
      typeChips={[{ label: 'Silvopasture', kind: 'primary' }]}
      {...overrides}
    />,
  );
}

const expand = () => fireEvent.click(screen.getByTestId('switcher-header'));

describe('ActTierStratumSwitcher (operational role focus counts)', () => {
  it('no focusCountByStratum -> no badge anywhere (byte-identical)', () => {
    setup();
    expect(screen.queryByTestId('switcher-active-focus')).toBeNull();
    expand();
    for (const s of PLAN_STRATA) {
      expect(screen.queryByTestId(`switcher-focus-${s.id}`)).toBeNull();
    }
  });

  it('scoped -> active stratum pill in the header, per-row "N/M" in the panel', () => {
    setup({
      focusCountByStratum: {
        [S1.id]: { inFocus: 2, total: 5 },
        [S2.id]: { inFocus: 0, total: 3 },
        // S3 deliberately omitted -> that row carries no badge.
      },
    });

    // Collapsed header carries the ACTIVE stratum's (S1) count.
    const headerBadge = screen.getByTestId('switcher-active-focus');
    expect(headerBadge.textContent?.replace(/\s+/g, ' ')).toContain(
      '2 / 5 in focus',
    );

    // Expanded list: each stratum WITH a count shows it; the omitted one does not.
    expand();
    expect(screen.getByTestId(`switcher-focus-${S1.id}`).textContent).toBe(
      '2/5',
    );
    expect(screen.getByTestId(`switcher-focus-${S2.id}`).textContent).toBe(
      '0/3',
    );
    expect(screen.queryByTestId(`switcher-focus-${S3.id}`)).toBeNull();
  });

  it('on a threshold surface the header pill is suppressed (no active stratum)', () => {
    setup({
      activeStratumId: '',
      activeStratum: undefined,
      thresholdActiveId: 'threshold-1',
      focusCountByStratum: { [S1.id]: { inFocus: 2, total: 5 } },
    });
    // The header reflects the threshold, not a stratum -> no in-focus pill.
    expect(screen.queryByTestId('switcher-active-focus')).toBeNull();
    // The per-row badge still appears once the panel is expanded.
    expand();
    expect(screen.getByTestId(`switcher-focus-${S1.id}`).textContent).toBe(
      '2/5',
    );
  });
});
