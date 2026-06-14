/**
 * @vitest-environment happy-dom
 *
 * PlanToolDock — collapse-aware wrapper around the Plan bottom tools rail.
 * Proves:
 *   1. Expanded (default): renders the tools rail + a "Collapse tools" control.
 *   2. Collapsed: renders a "Show tools" handle and does NOT mount the rail.
 *   3. Clicking the control toggles the uiStore preference.
 *
 * Rendered with objective={null} so only the always-present Modules group shows
 * (rail's IntersectionObserver effect stays dormant under happy-dom).
 *
 * lucide-react ships CJS in this environment; stub the icons so the tests
 * do not crash on the "Objects are not valid as a React child" error
 * (same pattern as ChronicVerdictBanner.test.tsx).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useUIStore } from '../../../../store/uiStore.js';
import PlanToolDock from '../PlanToolDock.js';

// lucide-react ships CJS in this environment; stub every icon imported by
// PlanToolDock, planToolCatalog, actToolCatalog, and quickLogs so the tests
// do not crash on the "Objects are not valid as a React child" error
// (same pattern as ChronicVerdictBanner.test.tsx).
// NOTE: vi.mock is hoisted — the factory must be self-contained (no outer vars).
vi.mock('lucide-react', () => {
  const n = () => null;
  return {
    // PlanToolDock
    ChevronDown: n, ChevronUp: n,
    // planToolCatalog
    Compass: n, Sun: n, Droplets: n, Sprout: n, Leaf: n, Trees: n,
    Beef: n, Building2: n, Route: n, Wallet: n, ShieldCheck: n,
    Map: n, Mountain: n, Zap: n, Users: n, ClipboardList: n,
    // actToolCatalog (transitive via resolvePlanTools)
    Waves: n, FlaskConical: n, AlertTriangle: n, Droplet: n,
    DoorOpen: n, Car: n, Fence: n, Warehouse: n, Home: n, Box: n,
    TreeDeciduous: n, LayoutGrid: n, Recycle: n, Shuffle: n,
    Triangle: n, Spline: n, Waypoints: n, Wind: n, Flame: n,
    Snowflake: n, ShieldAlert: n, CloudRain: n, Container: n,
    Bird: n, Wheat: n, Ruler: n, StickyNote: n, CircleDashed: n,
    Footprints: n, MapPin: n, UserCheck: n, FileText: n, Target: n,
    HardHat: n, Lock: n, Layers: n, HelpCircle: n, Scissors: n, Eraser: n,
  };
});

function renderDock() {
  return render(
    <PlanToolDock objective={null} disabled={false} onActivate={() => {}} activeFormId={null} />,
  );
}

beforeEach(() => {
  useUIStore.setState({ planToolDockCollapsed: false });
});
afterEach(() => cleanup());

describe('PlanToolDock', () => {
  it('expanded: renders the tools rail and a collapse control', () => {
    renderDock();
    const dock = screen.getByTestId('plan-tool-dock');
    expect(dock.getAttribute('data-collapsed')).toBe('false');
    // The rail panel is identified by its aria-label.
    expect(screen.getByLabelText('Objective tools')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Collapse tools' })).toBeTruthy();
  });

  it('collapsed: renders the handle only, not the rail', () => {
    useUIStore.setState({ planToolDockCollapsed: true });
    renderDock();
    const dock = screen.getByTestId('plan-tool-dock');
    expect(dock.getAttribute('data-collapsed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Show tools' })).toBeTruthy();
    expect(screen.queryByLabelText('Objective tools')).toBeNull();
  });

  it('clicking the collapse control toggles the store preference', () => {
    renderDock();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse tools' }));
    expect(useUIStore.getState().planToolDockCollapsed).toBe(true);
  });
});
