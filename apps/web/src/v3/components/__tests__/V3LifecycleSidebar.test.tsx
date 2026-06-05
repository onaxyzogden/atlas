/**
 * @vitest-environment happy-dom
 *
 * V3LifecycleSidebar render-smoke suite.
 *
 * Two mocks are required:
 *
 * 1. `@tanstack/react-router` — full module replaced. Vitest 2 enforces every
 *    named export referenced from the SUT, so we declare each used hook +
 *    `Link` explicitly.
 *
 * 2. `lucide-react` — `forwardRef`'d `Icon` in `1.x` spreads `[undefined]`
 *    into <svg> children when no children are passed (verified up to
 *    `1.14.0`, see Icon.mjs). React 18 strict child reconciliation under
 *    happy-dom rejects that with "Objects are not valid as a React child."
 *    Rather than enumerate the ~60 transitive icon imports (act/types,
 *    plan/types, observe/types) by hand, we use `importOriginal` to harvest
 *    every export from the real module and replace anything that looks like
 *    a React component with a clean <svg> stub. This satisfies Vitest 2's
 *    static-export check (every name forwards) without inheriting the
 *    spread-undefined bug.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// ── lucide-react mock ────────────────────────────────────────────────────────
// `importOriginal` in vi.mock factories is allowed and well-supported.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    // `forwardRef` components and ordinary function components both have
    // typeof === 'object' (forwardRef) or 'function'. Replace either with
    // a tiny, deterministic <svg> stub keyed by icon name.
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

// ── @tanstack/react-router mock ──────────────────────────────────────────────
const navigateSpy = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('a', rest, children),
  useParams: () => ({ projectId: 'mtc' }),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: '/v3/project/mtc/plan' } }),
  useNavigate: () => navigateSpy,
}));

// Import AFTER mocks so the module captures the mocked deps.
import V3LifecycleSidebar from '../V3LifecycleSidebar';

afterEach(() => {
  cleanup();
  navigateSpy.mockClear();
});

describe('V3LifecycleSidebar', () => {
  it('renders the three lifecycle stage labels', () => {
    render(<V3LifecycleSidebar activeStage="plan" />);
    expect(screen.getByText('Observe')).toBeTruthy();
    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.getByText('Act')).toBeTruthy();
  });

  it('marks the Plan stage as active when activeStage="plan"', () => {
    const { container } = render(<V3LifecycleSidebar activeStage="plan" />);
    const planSection = container.querySelector('[data-stage="plan"]');
    expect(planSection?.getAttribute('data-active')).toBe('true');
    const observeSection = container.querySelector('[data-stage="observe"]');
    expect(observeSection?.getAttribute('data-active')).toBe('false');
  });

  it('expands only the active stage by default (Plan visible, others collapsed)', () => {
    const { container } = render(<V3LifecycleSidebar activeStage="plan" />);
    const planHeader = container.querySelector('[data-stage="plan"] button');
    const observeHeader = container.querySelector('[data-stage="observe"] button');
    expect(planHeader?.getAttribute('aria-expanded')).toBe('true');
    expect(observeHeader?.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders the lucide chevron stub (no [undefined] child injection)', () => {
    const { container } = render(<V3LifecycleSidebar activeStage="plan" />);
    // Expanded stage uses ChevronDown; collapsed stages use ChevronRight.
    const chevrons = container.querySelectorAll('[data-lucide-icon]');
    expect(chevrons.length).toBeGreaterThanOrEqual(3);
    const names = Array.from(chevrons).map((el) => el.getAttribute('data-lucide-icon'));
    expect(names).toContain('ChevronDown');
    expect(names).toContain('ChevronRight');
  });

  it('renders a standalone Report link to the report route', () => {
    render(<V3LifecycleSidebar activeStage="plan" />);
    const report = screen.getByText('Report');
    expect(report).toBeTruthy();
    expect(report.getAttribute('to')).toBe('/v3/project/$projectId/report');
  });

  it('marks the Report link active when activeStage="report"', () => {
    render(<V3LifecycleSidebar activeStage="report" />);
    const report = screen.getByText('Report');
    expect(report.getAttribute('data-active')).toBe('true');
  });
});
