/**
 * @vitest-environment happy-dom
 *
 * Guards the optional left-sidebar slot. The v3 workspace now runs without the
 * "Project chrome" sidebar (sidebar prop omitted), while the legacy
 * LifecycleProjectPage still passes one — both behaviours must hold.
 */
import * as React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// lucide-react `1.x` Icon spreads `[undefined]` into <svg> children when no
// children are passed, which React 18 strict child reconciliation rejects under
// happy-dom ("Objects are not valid as a React child"). Replace every exported
// component with a clean <svg> stub (same approach as V3LifecycleSidebar.test).
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
          return React.createElement('svg', { ref, 'data-lucide-icon': key, 'aria-hidden': 'true' });
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

import LandOsShell from '../LandOsShell.js';

afterEach(cleanup);

describe('LandOsShell — optional left sidebar', () => {
  it('omits the sidebar aside and its col-edge when no sidebar prop is given', () => {
    render(
      <LandOsShell rail={<div data-testid="rail">rail</div>}>
        <div data-testid="content">content</div>
      </LandOsShell>,
    );

    // The left nav and its drag/collapse edge are gone.
    expect(screen.queryByLabelText('Lifecycle navigation')).toBeNull();
    expect(
      screen.queryByLabelText(/^Sidebar — drag to resize/),
    ).toBeNull();

    // Content still renders; the rail track (separator) is still present
    // (its body mounts only when expanded — it starts collapsed).
    expect(screen.getByTestId('content')).toBeTruthy();
    expect(screen.getByLabelText(/^Rail — drag to resize/)).toBeTruthy();

    // Grid has no left tracks — starts at the content's 1fr (rail adds 28px + a
    // collapsed 0px track at the end).
    const shell = screen.getByLabelText('Workspace content').parentElement!;
    expect(shell.style.gridTemplateColumns).toBe('1fr 28px 0px');
  });

  it('renders the sidebar aside and left col-edge when a sidebar is provided', () => {
    render(
      <LandOsShell sidebar={<nav data-testid="nav">nav</nav>}>
        <div>content</div>
      </LandOsShell>,
    );

    expect(screen.getByLabelText('Lifecycle navigation')).toBeTruthy();
    expect(screen.getByLabelText(/^Sidebar — drag to resize/)).toBeTruthy();
  });
});
