/**
 * @vitest-environment happy-dom
 *
 * uiStore.planToolDockCollapsed — global, persisted collapse preference for the
 * Plan tier-shell bottom tools dock. Mirrors the rightPanelCollapsed precedent:
 * default expanded (false), toggled, and written through to the persisted
 * `ogden-ui` localStorage payload (i.e. included in partialize).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore.js';

beforeEach(() => {
  useUIStore.setState({ planToolDockCollapsed: false });
  localStorage.removeItem('ogden-ui');
});

describe('uiStore.planToolDockCollapsed', () => {
  it('defaults to false (dock expanded)', () => {
    expect(useUIStore.getState().planToolDockCollapsed).toBe(false);
  });

  it('toggle flips the value', () => {
    useUIStore.getState().togglePlanToolDockCollapsed();
    expect(useUIStore.getState().planToolDockCollapsed).toBe(true);
    useUIStore.getState().togglePlanToolDockCollapsed();
    expect(useUIStore.getState().planToolDockCollapsed).toBe(false);
  });

  it('setter assigns the value', () => {
    useUIStore.getState().setPlanToolDockCollapsed(true);
    expect(useUIStore.getState().planToolDockCollapsed).toBe(true);
  });

  it('is persisted (included in partialize) to the ogden-ui payload', () => {
    useUIStore.getState().setPlanToolDockCollapsed(true);
    const raw = localStorage.getItem('ogden-ui');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.planToolDockCollapsed).toBe(true);
  });
});
