/**
 * @vitest-environment happy-dom
 *
 * Operational Role Layer -- ObserveModuleBar scope (Phase 5). The bottom domain
 * navigator (retained-for-fidelity surface + the chrome-free debug route) leads
 * with in-focus domain tiles and collapses out-of-focus ones behind a "+N more"
 * expander -- never hidden, only de-emphasized. The monitoring-records custodian
 * note names its owner for viewers who lack that role. With no scope every tile
 * renders inline exactly as before. useNavigate is mocked (router-free mount).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { scopeForRoles } from '@ogden/shared';
import ObserveModuleBar from '../ObserveModuleBar.js';
import { OBSERVE_MODULES } from '../../types.js';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

const TOTAL = OBSERVE_MODULES.length; // 16

function renderBar(extra: Partial<React.ComponentProps<typeof ObserveModuleBar>> = {}) {
  return render(
    <ObserveModuleBar
      activeModule={null}
      onSelectModule={() => {}}
      slideUpOpen={false}
      onOpenSlideUp={() => {}}
      onCloseSlideUp={() => {}}
      {...extra}
    />,
  );
}

describe('ObserveModuleBar (operational role scope)', () => {
  afterEach(cleanup);

  it('no scope -> all 16 tiles render inline, no expander, no toggle', () => {
    const { container } = renderBar();
    expect(container.querySelectorAll('[data-scope="in"]').length).toBe(TOTAL);
    expect(container.querySelectorAll('[data-scope="out"]').length).toBe(0);
    expect(screen.queryByTestId('observe-outside-focus-toggle')).toBeNull();
    expect(screen.queryByTestId('view-focus-toggle')).toBeNull();
  });

  it('scoped -> in-focus tile leads, out-of-focus collapse behind "+N more", custodian note on reveal', () => {
    const food = scopeForRoles(['food_production']); // { plants-food }
    const onFocusModeChange = vi.fn();
    const { container } = renderBar({
      scopedDomains: food,
      showFocusToggle: true,
      focusMode: 'role',
      onFocusModeChange,
    });

    // Exactly one in-focus tile (plants-food); the other 15 stay collapsed.
    expect(container.querySelectorAll('[data-scope="in"]').length).toBe(1);
    expect(container.querySelectorAll('[data-scope="out"]').length).toBe(0);

    const expander = screen.getByTestId('observe-outside-focus-toggle');
    expect(expander.textContent).toContain(`+${TOTAL - 1} more`);
    expect(screen.getByTestId('view-focus-role').textContent).toContain(
      `1 / ${TOTAL}`,
    );
    // Custodian note is for the out-of-focus monitoring-records tile, not yet mounted.
    expect(screen.queryByText('Owned by Ecology & Soils')).toBeNull();

    // Reveal: the 15 out-of-focus tiles mount (dimmed), and monitoring-records
    // names its custodian for a viewer who lacks the ecology_soils role.
    fireEvent.click(expander);
    expect(container.querySelectorAll('[data-scope="out"]').length).toBe(TOTAL - 1);
    expect(screen.getByText('Owned by Ecology & Soils')).toBeTruthy();

    // Full view is one click away.
    fireEvent.click(screen.getByTestId('view-focus-full'));
    expect(onFocusModeChange).toHaveBeenCalledWith('full');
  });
});
