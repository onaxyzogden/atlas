/**
 * @vitest-environment happy-dom
 *
 * EdgeConnectivityCard — Rec #4 v2 render + apply test. Seeds one homogenized
 * orchard polygon, asserts the HOMOGENIZED flag, expands "Suggest edge
 * variants", and clicks Apply on the first variant — asserting the source
 * polygon is rewritten with a longer (more-vertex) ring via landDesignStore.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EdgeConnectivityCard from '../EdgeConnectivityCard.js';
import { useLandDesignStore } from '../../../../../store/landDesignStore.js';
import type { DesignElement } from '../../../../../store/designElementsStore.js';
import type { LocalProject } from '../../../../../store/projectStore.js';

const PROJECT_ID = 'p1';
const project = { id: PROJECT_ID } as LocalProject;

// A ~200 m square orchard → PP ≈ 0.785, above the 0.7 homogenized cut and
// well past the 2 000 m² scoring floor.
function orchard(): DesignElement {
  return {
    id: 'el1',
    category: 'grazing',
    kind: 'orchard',
    label: 'North orchard',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.0018, 0],
          [0.0018, 0.0018],
          [0, 0.0018],
          [0, 0],
        ],
      ],
    },
    phase: 'trees',
  } as DesignElement;
}

beforeEach(() => {
  localStorage.clear();
  useLandDesignStore.setState({ byProject: {} });
});

describe('EdgeConnectivityCard — Rec #4 v2', () => {
  it('renders the empty state when no planting polygons exist', () => {
    render(<EdgeConnectivityCard project={project} onSwitchToMap={() => {}} />);
    expect(screen.getByText(/No planting polygons drawn yet/i)).toBeTruthy();
  });

  it('flags a compact orchard as homogenized and offers edge variants', () => {
    useLandDesignStore.setState({ byProject: { [PROJECT_ID]: [orchard()] } });
    render(<EdgeConnectivityCard project={project} onSwitchToMap={() => {}} />);

    expect(screen.getByText('HOMOGENIZED')).toBeTruthy();

    fireEvent.click(screen.getByText('Suggest edge variants'));
    expect(screen.getByText('Peninsula spike')).toBeTruthy();
    expect(screen.getByText('Scalloped border')).toBeTruthy();
    expect(screen.getByText('Keyhole lobe')).toBeTruthy();
  });

  it('applies a variant — rewrites the polygon with a longer ring', () => {
    useLandDesignStore.setState({ byProject: { [PROJECT_ID]: [orchard()] } });
    render(<EdgeConnectivityCard project={project} onSwitchToMap={() => {}} />);

    const ringBefore =
      useLandDesignStore.getState().byProject[PROJECT_ID]![0]!.geometry;
    const lenBefore =
      ringBefore.type === 'Polygon' ? ringBefore.coordinates[0]!.length : 0;

    fireEvent.click(screen.getByText('Suggest edge variants'));
    fireEvent.click(screen.getAllByText('Apply')[0]!);

    const after =
      useLandDesignStore.getState().byProject[PROJECT_ID]![0]!.geometry;
    expect(after.type).toBe('Polygon');
    const lenAfter =
      after.type === 'Polygon' ? after.coordinates[0]!.length : 0;
    expect(lenAfter).toBeGreaterThan(lenBefore);
  });
});
