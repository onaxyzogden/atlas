/**
 * @vitest-environment happy-dom
 *
 * BaseMapCard — presence-gated, stage-consistent overlay legend.
 *
 * Asserts:
 *   - with a projectId and empty stores, only the two computed overlays
 *     (Topography, Sun path) are offered — every data-backed row is pruned
 *   - populating a store adds its row
 *   - Plan and Act render the IDENTICAL set of rows for the same project data
 *   - without a projectId, no presence-gating occurs (back-compat)
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

// happy-dom can't render lucide's icon objects as React children; stub the two
// chevrons BaseMapCard uses (the collapse toggle) with plain SVGs.
vi.mock('lucide-react', () => ({
  ChevronDown: (props: Record<string, unknown>) => <svg data-icon="chevron-down" {...props} />,
  ChevronUp: (props: Record<string, unknown>) => <svg data-icon="chevron-up" {...props} />,
}));

import BaseMapCard from '../BaseMapCard.js';
import { useZoneStore } from '../../../../store/zoneStore.js';

const P = 'proj-1';

const TOPOGRAPHY = 'Topography (contours + hillshade)';
const SUN_PATH = 'Sun path (hourly trajectory traces)';
const PLACED_ZONES = 'Placed zones';

/** All overlay row labels currently rendered inside a container. */
function rowLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('li')).map(
    (li) => li.textContent?.trim() ?? '',
  );
}

afterEach(() => {
  useZoneStore.setState({ zones: [] });
});

describe('BaseMapCard overlay legend', () => {
  it('offers only the computed overlays when the project has no features', () => {
    render(<BaseMapCard stage="act" projectId={P} />);
    expect(screen.getByText(TOPOGRAPHY)).toBeTruthy();
    expect(screen.getByText(SUN_PATH)).toBeTruthy();
    expect(screen.queryByText(PLACED_ZONES)).toBeNull();
  });

  it('adds a data-backed row once the project has that feature', () => {
    useZoneStore.setState({ zones: [{ id: 'z1', projectId: P } as never] });
    render(<BaseMapCard stage="act" projectId={P} />);
    expect(screen.getByText(PLACED_ZONES)).toBeTruthy();
  });

  it('renders the identical row set on Plan and Act for the same data', () => {
    useZoneStore.setState({ zones: [{ id: 'z1', projectId: P } as never] });
    const plan = render(<BaseMapCard stage="plan" projectId={P} />).container;
    const act = render(<BaseMapCard stage="act" projectId={P} />).container;
    expect(rowLabels(act).sort()).toEqual(rowLabels(plan).sort());
    // sanity: the data-backed row is present in both, not just an empty match
    expect(rowLabels(plan)).toContain(PLACED_ZONES);
  });

  it('does not presence-gate when no projectId is supplied (back-compat)', () => {
    const { container } = render(<BaseMapCard stage="act" />);
    // Placed zones has no features anywhere, yet the row still shows because
    // presence-gating is off without a projectId.
    expect(within(container).getByText(PLACED_ZONES)).toBeTruthy();
  });
});
