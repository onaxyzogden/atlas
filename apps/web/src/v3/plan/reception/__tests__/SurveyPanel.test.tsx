/**
 * @vitest-environment happy-dom
 *
 * SurveyPanel -- the generic rail-width takeover editor for ONE reception
 * (Tier-2 Systems Reading) survey. Pins:
 *   1. renders the title, Done button, and one row per class.
 *   2. arming: clicking a class row sets that class's tool on useMapToolStore
 *      (aria-pressed); clicking it again disarms.
 *   3. readouts: a poly class shows a live `% of site` (via resolveSiteAcres,
 *      mocked to 100ac); a line/point class shows `--`; the unclassified row
 *      shows the poly remainder.
 *   4. per-feature delete: the selected class's drawn feature can be removed.
 *   5. the optional footnote (2.5 stock-water demand reference) renders.
 *
 * A throwaway bundle keeps the panel under test isolated from the five
 * production survey singletons. resolveSiteAcres + useV3Project are mocked so
 * the % math is deterministic and the panel never touches the project stores.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

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

// Deterministic site area (poly pct = measure / 100 * 100) + no project-store reads.
vi.mock('../../../data/siteArea.js', () => ({
  resolveSiteAcres: () => 100,
}));
vi.mock('../../../data/useV3Project.js', () => ({
  useV3Project: () => null,
}));

import SurveyPanel from '../SurveyPanel.js';
import {
  createSurveyStore,
  type SurveyClassDef,
} from '../../../../store/createSurveyStore.js';
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';

type PanelClass = 'wet' | 'dry' | 'creek' | 'sample';

const PANEL_CLASSES: readonly SurveyClassDef<PanelClass>[] = [
  { key: 'wet', label: 'Pooling / wet zone', color: '#4a90d9', kind: 'poly' },
  { key: 'dry', label: 'Dry / shedding zone', color: '#d9b365', kind: 'poly' },
  { key: 'creek', label: 'Seasonal creek', color: '#2c7bb6', kind: 'line' },
  { key: 'sample', label: 'Texture sample', color: '#8c6d4f', kind: 'point' },
];

const BUNDLE = createSurveyStore<PanelClass>({
  persistName: 'ogden-panel-test-survey',
  idPrefix: 'panel-test',
  toolPrefix: 'plan.test.panel',
  sourceObjectiveId: 's3-panel-test',
  classes: PANEL_CLASSES,
});

const SQUARE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
  ],
};

function reset(): void {
  BUNDLE.useStore.setState({ byProject: {}, active: false, activeProjectId: null });
  useMapToolStore.setState({ activeTool: null });
}

/** The class row <button> whose accessible label contains `labelFragment`. */
function classRow(labelFragment: RegExp): HTMLButtonElement {
  const btn = screen
    .getAllByRole('button')
    .find((b) => labelFragment.test(b.textContent ?? ''));
  if (!btn) throw new Error(`no class row matching ${labelFragment}`);
  return btn as HTMLButtonElement;
}

describe('SurveyPanel -- structure', () => {
  beforeEach(reset);

  it('renders the title, a Done button, and one row per class', () => {
    render(<SurveyPanel bundle={BUNDLE} projectId="p1" title="Water survey" />);
    expect(screen.getByText('Water survey')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
    expect(classRow(/Pooling \/ wet zone/)).toBeTruthy();
    expect(classRow(/Seasonal creek/)).toBeTruthy();
    expect(classRow(/Texture sample/)).toBeTruthy();
  });

  it('renders the optional footnote when provided', () => {
    render(
      <SurveyPanel
        bundle={BUNDLE}
        projectId="p1"
        footnote="Stock-water demand reference line."
      />,
    );
    expect(screen.getByText(/Stock-water demand reference line\./)).toBeTruthy();
  });
});

describe('SurveyPanel -- arming', () => {
  beforeEach(reset);

  it('clicking a class row arms its tool; clicking again disarms', () => {
    render(<SurveyPanel bundle={BUNDLE} projectId="p1" />);
    const wet = classRow(/Pooling \/ wet zone/);
    expect(wet.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(wet);
    expect(useMapToolStore.getState().activeTool).toBe('plan.test.panel-wet');
    expect(classRow(/Pooling \/ wet zone/).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(classRow(/Pooling \/ wet zone/));
    expect(useMapToolStore.getState().activeTool).toBeNull();
  });

  it('Done clears the armed tool and closes the takeover', () => {
    BUNDLE.useStore.getState().open('p1');
    render(<SurveyPanel bundle={BUNDLE} projectId="p1" />);
    fireEvent.click(classRow(/Dry \/ shedding zone/));
    expect(useMapToolStore.getState().activeTool).toBe('plan.test.panel-dry');

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(useMapToolStore.getState().activeTool).toBeNull();
    expect(BUNDLE.useStore.getState().active).toBe(false);
  });
});

describe('SurveyPanel -- readouts', () => {
  beforeEach(reset);

  it('shows a poly % of site, a -- for line/point, and the poly remainder', () => {
    // 25 acres of "wet" against a mocked 100ac site -> 25%, unclassified 75%.
    BUNDLE.useStore
      .getState()
      .addFeature('p1', { surveyClass: 'wet', kind: 'poly', geometry: SQUARE, measure: 25 });
    render(<SurveyPanel bundle={BUNDLE} projectId="p1" />);

    expect(classRow(/Pooling \/ wet zone/).textContent).toMatch(/25%/);
    // Line class pct cell is the em-dash placeholder (no meaningful % for lines).
    expect(classRow(/Seasonal creek/).textContent).toContain('—');
    // Unclassified remainder row: 100 - 25 = 75%.
    expect(screen.getByText(/Unclassified/).closest('div')!.textContent).toMatch(
      /75%/,
    );
  });
});

describe('SurveyPanel -- per-feature delete', () => {
  beforeEach(reset);

  it('removes the selected class feature via its delete button', () => {
    BUNDLE.useStore.getState().addFeature('p1', {
      surveyClass: 'wet',
      kind: 'poly',
      geometry: SQUARE,
      measure: 10,
      id: 'wet-1',
    });
    render(<SurveyPanel bundle={BUNDLE} projectId="p1" />);

    // Select the wet class so its feature list (with delete) renders.
    fireEvent.click(classRow(/Pooling \/ wet zone/));
    const del = screen.getByRole('button', { name: /Remove Pooling \/ wet zone 1/ });
    fireEvent.click(del);

    expect(BUNDLE.useStore.getState().listForProject('p1')).toHaveLength(0);
    expect(
      screen.queryByRole('button', { name: /Remove Pooling \/ wet zone 1/ }),
    ).toBeNull();
  });
});
