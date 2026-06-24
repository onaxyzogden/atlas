/**
 * @vitest-environment happy-dom
 *
 * uiStore.planToolDockCollapsed — global, persisted collapse preference for the
 * Plan tier-shell bottom tools dock. Mirrors the rightPanelCollapsed precedent:
 * default expanded (false), toggled, and written through to the persisted
 * `ogden-ui` localStorage payload (i.e. included in partialize).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, migrateUIPersistedState } from '../uiStore.js';

beforeEach(() => {
  useUIStore.setState({ planToolDockCollapsed: false, viewFocusMode: {} });
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

describe('uiStore.viewFocusMode (Operational Role Layer)', () => {
  it('defaults to an empty per-project map', () => {
    expect(useUIStore.getState().viewFocusMode).toEqual({});
  });

  it('setter records a per-project override without touching siblings', () => {
    useUIStore.getState().setViewFocusMode('proj-a', 'full');
    useUIStore.getState().setViewFocusMode('proj-b', 'role');
    expect(useUIStore.getState().viewFocusMode).toEqual({
      'proj-a': 'full',
      'proj-b': 'role',
    });
    // Overwriting one leaves the other intact.
    useUIStore.getState().setViewFocusMode('proj-a', 'role');
    expect(useUIStore.getState().viewFocusMode).toEqual({
      'proj-a': 'role',
      'proj-b': 'role',
    });
  });

  it('is persisted (included in partialize) to the ogden-ui payload', () => {
    useUIStore.getState().setViewFocusMode('proj-a', 'full');
    const parsed = JSON.parse(localStorage.getItem('ogden-ui') as string);
    expect(parsed.state.viewFocusMode).toEqual({ 'proj-a': 'full' });
  });

  it('migrate does NOT inject viewFocusMode (default-merge supplies it; migrate stays idempotent)', () => {
    // The per-project viewFocusMode default is supplied by the store's initial
    // state via zustand's shallow persist-merge, NOT by migrate. Seeding it in
    // migrate would break the idempotent same-reference contract that
    // uiStoreMigrate.test.ts pins. A pre-v4 payload passes through untouched.
    const input = { sidebarGrouping: 'stage3', planToolDockCollapsed: true };
    const migrated = migrateUIPersistedState(input, 3);
    expect(migrated).toBe(input);
    expect((migrated as { viewFocusMode?: unknown }).viewFocusMode).toBeUndefined();
  });
});
