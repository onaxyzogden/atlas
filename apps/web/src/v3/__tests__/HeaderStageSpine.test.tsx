/**
 * @vitest-environment happy-dom
 *
 * HeaderStageSpine route/navigation suite.
 *
 * Three mocks:
 *  1. `lucide-react` — childless `forwardRef` icons inject `[undefined]`
 *     children (rejected by React 18 + happy-dom); replaced with <svg> stubs.
 *  2. `@tanstack/react-router` — `useRouterState` reads a hoisted mutable
 *     pathname so each test can place the spine on a different route;
 *     `useNavigate` returns a spy.
 *  3. `../compass/useCompassData.js` — returns a hoisted Observe aggregate so we
 *     can exercise the < 100 (→ Compass) vs === 100 (→ Command Centre) branch.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({
  pathname: '/v3/project/mtc/compass',
  pct: 50,
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

// Import AFTER mocks so the SUT captures them.
import HeaderStageSpine from '../HeaderStageSpine';

beforeEach(() => {
  h.pathname = '/v3/project/mtc/compass';
  h.pct = 50;
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

  it('renders the spine with Observe active on the compass route', () => {
    h.pathname = '/v3/project/mtc/compass';
    const { container } = render(<HeaderStageSpine />);
    expect(container.querySelector('[aria-label="Lifecycle stages"]')).not.toBeNull();
    expect(
      container.querySelector('[data-stage="observe"]')?.getAttribute('data-active'),
    ).toBe('true');
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

  it('navigates to the stage route when an inactive stage is clicked', () => {
    h.pathname = '/v3/project/mtc/compass';
    const { container } = render(<HeaderStageSpine />);
    fireEvent.click(container.querySelector('[data-stage="plan"]')!);
    expect(h.navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/v3/project/$projectId/plan',
        params: { projectId: 'mtc' },
      }),
    );
  });

  it('routes Observe to the Compass while Observe is incomplete', () => {
    h.pathname = '/v3/project/mtc/plan';
    h.pct = 60;
    const { container } = render(<HeaderStageSpine />);
    fireEvent.click(container.querySelector('[data-stage="observe"]')!);
    expect(h.navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/v3/project/$projectId/compass',
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

  it('does not navigate when the already-active stage is clicked', () => {
    h.pathname = '/v3/project/mtc/plan';
    const { container } = render(<HeaderStageSpine />);
    fireEvent.click(container.querySelector('[data-stage="plan"]')!);
    expect(h.navigateSpy).not.toHaveBeenCalled();
  });
});
