/**
 * @vitest-environment happy-dom
 *
 * HeaderStageSpine route/navigation suite.
 *
 * Four mocks:
 *  1. `lucide-react` — childless `forwardRef` icons inject `[undefined]`
 *     children (rejected by React 18 + happy-dom); replaced with <svg> stubs.
 *  2. `@tanstack/react-router` — `useRouterState` reads a hoisted mutable
 *     pathname so each test can place the spine on a different route;
 *     `useNavigate` returns a spy.
 *  3. `../compass/useCompassData.js` — returns a hoisted Observe aggregate so we
 *     can exercise the < 100 (→ stage surface) vs === 100 (→ Command Centre)
 *     branch. (Compass pages retired 2026-05-31; incomplete stages land on the
 *     stage base route, not a compass.)
 *  4. `../plan/compass/usePlanCompassData.js` + `../act/compass/useActCompassData.js`
 *     — return hoisted Plan/Act aggregates so every header segment shows its
 *     own real %.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({
  pathname: '/v3/project/mtc/observe',
  pct: 50,
  planPct: 12,
  actPct: 0,
  navigateSpy: vi.fn(),
}));

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

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (s: { location: { pathname: string } }) => unknown;
  }) => select({ location: { pathname: h.pathname } }),
  useNavigate: () => h.navigateSpy,
}));

vi.mock('../compass/useCompassData.js', () => ({
  useCompassData: () => ({
    views: [],
    byId: {},
    stage: { verified: h.pct, total: 100, pct: h.pct },
  }),
}));

vi.mock('../plan/compass/usePlanCompassData.js', () => ({
  usePlanCompassData: () => ({
    views: [],
    byId: {},
    stage: { verified: h.planPct, total: 100, pct: h.planPct },
  }),
}));

vi.mock('../act/compass/useActCompassData.js', () => ({
  useActCompassData: () => ({
    views: [],
    byId: {},
    stage: { verified: h.actPct, total: 100, pct: h.actPct },
  }),
}));

// Import AFTER mocks so the SUT captures them.
import HeaderStageSpine from '../HeaderStageSpine';

beforeEach(() => {
  h.pathname = '/v3/project/mtc/observe';
  h.pct = 50;
  h.planPct = 12;
  h.actPct = 0;
});
afterEach(() => {
  cleanup();
  h.navigateSpy.mockClear();
});

describe('HeaderStageSpine', () => {
  it('renders nothing off a recognised v3 project stage route', () => {
    h.pathname = '/v3/project';
    const { container } = render(<HeaderStageSpine />);
    expect(container.querySelector('[aria-label="Lifecycle stages"]')).toBeNull();
  });

  it('renders the spine with Observe active on the observe route', () => {
    h.pathname = '/v3/project/mtc/observe';
    const { container } = render(<HeaderStageSpine />);
    expect(container.querySelector('[aria-label="Lifecycle stages"]')).not.toBeNull();
    expect(
      container.querySelector('[data-stage="observe"]')?.getAttribute('data-active'),
    ).toBe('true');
  });

  it('shows each stage’s own real % from its compass hook (no em dash)', () => {
    h.pathname = '/v3/project/mtc/observe';
    h.pct = 50;
    h.planPct = 12;
    h.actPct = 0;
    const { container } = render(<HeaderStageSpine />);
    expect(
      container.querySelector('[data-stage="observe"]')?.textContent,
    ).toContain('50%');
    expect(
      container.querySelector('[data-stage="plan"]')?.textContent,
    ).toContain('12%');
    expect(
      container.querySelector('[data-stage="act"]')?.textContent,
    ).toContain('0%');
    for (const id of ['observe', 'plan', 'act']) {
      expect(
        container.querySelector(`[data-stage="${id}"]`)?.textContent,
      ).not.toContain('—');
    }
  });

  it('marks Plan active on the plan route', () => {
    h.pathname = '/v3/project/mtc/plan';
    const { container } = render(<HeaderStageSpine />);
    expect(
      container.querySelector('[data-stage="plan"]')?.getAttribute('data-active'),
    ).toBe('true');
    expect(
      container.querySelector('[data-stage="observe"]')?.getAttribute('data-active'),
    ).toBe('false');
  });

  it('renders the spine with no active stage on the report route', () => {
    h.pathname = '/v3/project/mtc/report';
    const { container } = render(<HeaderStageSpine />);
    expect(container.querySelector('[aria-label="Lifecycle stages"]')).not.toBeNull();
    for (const id of ['observe', 'plan', 'act']) {
      expect(
        container.querySelector(`[data-stage="${id}"]`)?.getAttribute('data-active'),
      ).toBe('false');
    }
  });

  it('routes Plan to the Plan surface while Plan is incomplete', () => {
    h.pathname = '/v3/project/mtc/observe';
    h.planPct = 12;
    const { container } = render(<HeaderStageSpine />);
    fireEvent.click(container.querySelector('[data-stage="plan"]')!);
    expect(h.navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/v3/project/$projectId/plan',
        params: { projectId: 'mtc' },
      }),
    );
  });

  it('routes Plan to the Command Centre once Plan is complete (pct === 100)', () => {
    h.pathname = '/v3/project/mtc/observe';
    h.planPct = 100;
    const { container } = render(<HeaderStageSpine />);
    fireEvent.click(container.querySelector('[data-stage="plan"]')!);
    expect(h.navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/v3/project/$projectId/plan/command-centre',
        params: { projectId: 'mtc' },
      }),
    );
  });

  it('routes Observe to the Observe surface while Observe is incomplete', () => {
    h.pathname = '/v3/project/mtc/plan';
    h.pct = 60;
    const { container } = render(<HeaderStageSpine />);
    fireEvent.click(container.querySelector('[data-stage="observe"]')!);
    expect(h.navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/v3/project/$projectId/observe',
        params: { projectId: 'mtc' },
      }),
    );
  });

  it('routes Observe to the Command Centre once Observe is complete (pct === 100)', () => {
    h.pathname = '/v3/project/mtc/plan';
    h.pct = 100;
    const { container } = render(<HeaderStageSpine />);
    fireEvent.click(container.querySelector('[data-stage="observe"]')!);
    expect(h.navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/v3/project/$projectId/observe/command-centre',
        params: { projectId: 'mtc' },
      }),
    );
  });

  it('routes Act to the Act surface while Act is incomplete', () => {
    h.pathname = '/v3/project/mtc/observe';
    h.actPct = 0;
    const { container } = render(<HeaderStageSpine />);
    fireEvent.click(container.querySelector('[data-stage="act"]')!);
    expect(h.navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/v3/project/$projectId/act',
        params: { projectId: 'mtc' },
      }),
    );
  });

  it('routes Act to the Command Centre once Act is complete (pct === 100)', () => {
    h.pathname = '/v3/project/mtc/observe';
    h.actPct = 100;
    const { container } = render(<HeaderStageSpine />);
    fireEvent.click(container.querySelector('[data-stage="act"]')!);
    expect(h.navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/v3/project/$projectId/act/command-centre',
        params: { projectId: 'mtc' },
      }),
    );
  });

  it('does not navigate when the already-active stage is clicked', () => {
    h.pathname = '/v3/project/mtc/plan';
    const { container } = render(<HeaderStageSpine />);
    fireEvent.click(container.querySelector('[data-stage="plan"]')!);
    expect(h.navigateSpy).not.toHaveBeenCalled();
  });
});
