/**
 * @vitest-environment happy-dom
 *
 * StageSpine render + interaction suite.
 *
 * `StageSpine` is purely presentational (no router import) — it takes an
 * `activeStage`, Observe's aggregate progress, and an `onNavigateStage`
 * callback. So the only mock required is `lucide-react`: its `forwardRef` icons
 * spread `[undefined]` into <svg> children when childless, which React 18 +
 * happy-dom reject. We harvest every export via `importOriginal` and replace
 * components with a clean <svg> stub (pattern from V3LifecycleSidebar.test.tsx).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { ObjectiveProgress } from '../compassGating.js';

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

// Import AFTER the mock so the SUT captures the stubbed icons.
import StageSpine from '../StageSpine';

const progress = (pct: number): ObjectiveProgress => ({
  verified: pct,
  total: 100,
  pct,
});

afterEach(() => cleanup());

describe('StageSpine', () => {
  it('shows Observe’s real % and an em dash for Plan/Act', () => {
    const { container } = render(
      <StageSpine
        activeStage="observe"
        observeProgress={progress(37)}
        onNavigateStage={vi.fn()}
      />,
    );
    const observe = container.querySelector('[data-stage="observe"]');
    const plan = container.querySelector('[data-stage="plan"]');
    const act = container.querySelector('[data-stage="act"]');
    expect(observe?.textContent).toContain('37%');
    expect(plan?.textContent).toContain('—');
    expect(act?.textContent).toContain('—');
    // Plan/Act never show a percent.
    expect(plan?.textContent).not.toContain('%');
    expect(act?.textContent).not.toContain('%');
  });

  it('marks only the active stage (observe)', () => {
    const { container } = render(
      <StageSpine
        activeStage="observe"
        observeProgress={progress(37)}
        onNavigateStage={vi.fn()}
      />,
    );
    expect(
      container.querySelector('[data-stage="observe"]')?.getAttribute('data-active'),
    ).toBe('true');
    expect(
      container.querySelector('[data-stage="plan"]')?.getAttribute('data-active'),
    ).toBe('false');
  });

  it('moves the active highlight to Plan while Observe keeps its %', () => {
    const { container } = render(
      <StageSpine
        activeStage="plan"
        observeProgress={progress(37)}
        onNavigateStage={vi.fn()}
      />,
    );
    expect(
      container.querySelector('[data-stage="plan"]')?.getAttribute('data-active'),
    ).toBe('true');
    expect(
      container.querySelector('[data-stage="observe"]')?.getAttribute('data-active'),
    ).toBe('false');
    // Observe still reports its real progress regardless of which stage is active.
    expect(
      container.querySelector('[data-stage="observe"]')?.textContent,
    ).toContain('37%');
  });

  it('highlights nothing when activeStage is null (Report route)', () => {
    const { container } = render(
      <StageSpine
        activeStage={null}
        observeProgress={progress(37)}
        onNavigateStage={vi.fn()}
      />,
    );
    for (const id of ['observe', 'plan', 'act']) {
      expect(
        container.querySelector(`[data-stage="${id}"]`)?.getAttribute('data-active'),
      ).toBe('false');
    }
  });

  it('forwards the clicked stage id to onNavigateStage', () => {
    const onNavigateStage = vi.fn();
    const { container } = render(
      <StageSpine
        activeStage="observe"
        observeProgress={progress(37)}
        onNavigateStage={onNavigateStage}
      />,
    );
    fireEvent.click(container.querySelector('[data-stage="plan"]')!);
    expect(onNavigateStage).toHaveBeenCalledWith('plan');
    fireEvent.click(container.querySelector('[data-stage="observe"]')!);
    expect(onNavigateStage).toHaveBeenCalledWith('observe');
  });

  it('renders all three stage labels', () => {
    render(
      <StageSpine
        activeStage="observe"
        observeProgress={progress(0)}
        onNavigateStage={vi.fn()}
      />,
    );
    expect(screen.getByText('Observe')).toBeTruthy();
    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.getByText('Act')).toBeTruthy();
  });
});
