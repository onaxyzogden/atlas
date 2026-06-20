// @vitest-environment happy-dom
/**
 * planPhaseTabs — pins the Plan-stage tab strip after 2026-06-15:
 *   - exactly two view tabs, in order Current Land -> Vision Layout,
 *   - no "3D Terrain" tab and no "Year scrub" toggle,
 *   - clicking a tab fires onChange with that PlanView.
 *
 * The component no longer imports lucide-react or any store, so no mocks are
 * needed — it's a pure (active, onChange) -> tablist render.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import PlanPhaseTabs from '../PlanPhaseTabs.js';

afterEach(cleanup);

describe('PlanPhaseTabs', () => {
  it('renders exactly two tabs in order Current Land then Vision Layout', () => {
    render(<PlanPhaseTabs active="current" onChange={vi.fn()} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs.map((t) => t.textContent)).toEqual(['Current Land', 'Vision Layout']);
  });

  it('has no 3D Terrain tab and no Year scrub button', () => {
    render(<PlanPhaseTabs active="current" onChange={vi.fn()} />);
    expect(screen.queryByText('3D Terrain')).toBeNull();
    expect(screen.queryByText('Year scrub')).toBeNull();
    expect(screen.queryByRole('button', { name: /year scrubber/i })).toBeNull();
  });

  it('marks the active tab and fires onChange when another tab is clicked', () => {
    const onChange = vi.fn();
    render(<PlanPhaseTabs active="current" onChange={onChange} />);

    const current = screen.getByRole('tab', { name: 'Current Land' });
    const vision = screen.getByRole('tab', { name: 'Vision Layout' });
    expect(current.getAttribute('aria-selected')).toBe('true');
    expect(vision.getAttribute('aria-selected')).toBe('false');

    fireEvent.click(vision);
    expect(onChange).toHaveBeenCalledWith('vision');
  });
});
