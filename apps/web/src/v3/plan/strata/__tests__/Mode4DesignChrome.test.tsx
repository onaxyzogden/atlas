/**
 * @vitest-environment happy-dom
 *
 * Mode4DesignChrome -- the Plan-only Mode-4 (Design) objective chrome. These
 * tests pin its defining promise: it is DISPLAY-ONLY and arms ONLY on a
 * genuinely Mode-4 objective (one carrying monitoringProtocol / buildsOnDisplay
 * / planningDirectionMandate). A legacy objective -- even one with an actHandoff
 * -- renders nothing, so non-Design objective detail is untouched.
 *
 * lucide-react is stubbed to forwardRef SVGs (icons are decorative here), the
 * same harness the RealityCheckGateBanner tests use.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { PlanStratumObjective } from '@ogden/shared';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' && value !== null && '$$typeof' in (value as object)) ||
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

import Mode4DesignChrome from '../Mode4DesignChrome.js';

// The chrome reads only buildsOnDisplay / planningDirectionMandate /
// monitoringProtocol / actHandoff off the objective, so a partial fixture is
// sufficient and faithful to how it is mounted.
const objective = (over: Partial<PlanStratumObjective>): PlanStratumObjective =>
  ({
    id: 's5-water-infrastructure',
    stratumId: 's5-system-design',
    title: 'Water harvesting & storage design',
    ...over,
  }) as unknown as PlanStratumObjective;

const FULL = objective({
  buildsOnDisplay: 'Builds on 3.1 -- Water strategy.',
  planningDirectionMandate:
    'This design package CLOSES the Silvopasture water conditional raised at Threshold 1.',
  monitoringProtocol: {
    indicators: [
      { metric: 'Storage volume captured vs design target', frequency: 'per season' },
      { metric: 'Overflow events', frequency: 'per season' },
    ],
    triggers: ['Storage below 60% at season start -> review catchment sizing'],
    feeds: 'hydrology',
  },
  actHandoff: 'Water Harvesting & Storage Design Package',
});

describe('Mode4DesignChrome -- full Mode-4 objective', () => {
  it('renders builds-on, the amber mandate, the green monitoring stream, and the act handoff', () => {
    render(<Mode4DesignChrome objective={FULL} />);

    expect(screen.getByTestId('mode4-design-chrome')).toBeTruthy();
    expect(screen.getByTestId('mode4-builds-on').textContent).toContain('Builds on 3.1');
    expect(screen.getByTestId('mode4-mandate').textContent).toContain(
      'CLOSES the Silvopasture water conditional',
    );

    const stream = screen.getByTestId('monitoring-stream');
    expect(stream).toBeTruthy();
    expect(stream.textContent).toContain('Storage volume captured vs design target');
    // Threshold-2 tighten: each indicator now renders a structured frequency chip.
    expect(stream.textContent).toContain('per season');
    expect(screen.getAllByTestId('monitoring-stream-freq').length).toBe(2);
    expect(stream.textContent).toContain('Storage below 60% at season start');
    // feeds is a UniversalDomain id now, rendered through its human label.
    expect(screen.getByTestId('monitoring-stream-feeds').textContent).toContain(
      'Hydrology & Water',
    );

    expect(screen.getByTestId('mode4-act-handoff').textContent).toContain(
      'Water Harvesting & Storage Design Package',
    );
  });

  it('shows the "Mode 4 -- Design" eyebrow', () => {
    render(<Mode4DesignChrome objective={FULL} />);
    expect(screen.getByTestId('mode4-design-chrome').textContent).toContain(
      'Mode 4 -- Design',
    );
  });
});

describe('Mode4DesignChrome -- arming logic', () => {
  it('arms on monitoringProtocol alone (no builds-on / mandate)', () => {
    render(
      <Mode4DesignChrome
        objective={objective({
          monitoringProtocol: {
            indicators: [
              { metric: 'Indicator one', frequency: 'daily' },
              { metric: 'Indicator two', frequency: 'weekly' },
            ],
            triggers: ['y'],
            feeds: 'soil',
          },
        })}
      />,
    );
    expect(screen.getByTestId('monitoring-stream')).toBeTruthy();
    expect(screen.queryByTestId('mode4-builds-on')).toBeNull();
    expect(screen.queryByTestId('mode4-mandate')).toBeNull();
  });

  it('arms on buildsOnDisplay alone (no monitoring panel rendered)', () => {
    render(
      <Mode4DesignChrome objective={objective({ buildsOnDisplay: 'Builds on 3.2.' })} />,
    );
    expect(screen.getByTestId('mode4-design-chrome')).toBeTruthy();
    expect(screen.getByTestId('mode4-builds-on')).toBeTruthy();
    expect(screen.queryByTestId('monitoring-stream')).toBeNull();
  });

  it('renders nothing for a legacy objective with no Mode-4 fields', () => {
    const { container } = render(<Mode4DesignChrome objective={objective({})} />);
    expect(container.querySelector('[data-testid="mode4-design-chrome"]')).toBeNull();
  });

  it('does NOT arm on an actHandoff alone (it predates the restructure)', () => {
    const { container } = render(
      <Mode4DesignChrome objective={objective({ actHandoff: 'Some Package' })} />,
    );
    expect(container.querySelector('[data-testid="mode4-design-chrome"]')).toBeNull();
    expect(container.querySelector('[data-testid="mode4-act-handoff"]')).toBeNull();
  });
});
