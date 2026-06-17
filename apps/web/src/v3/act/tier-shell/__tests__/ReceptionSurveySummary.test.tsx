// @vitest-environment happy-dom
/**
 * ReceptionSurveySummary -- the generic Tier-1 Land-Reading "Observe Output"
 * affordance shown on a survey objective's lead decision. One component serves
 * all four new factory surveys, so this drives it over the real `climateSurvey`
 * bundle (a `createSurveyStore` instance) rather than a mock.
 *
 * Verified behaviours:
 *   - empty state: shows the "nothing drawn" hint + an "Open map survey" button,
 *     no per-class list;
 *   - populated state: shows the per-class count list (one row per non-zero
 *     class, zero classes skipped) + a "Continue map survey" button;
 *   - TAKEOVER COEXISTENCE (the Stage-3 gate's invariant): clicking the button
 *     opens this survey's takeover (`active` + `activeProjectId`) AND closes any
 *     open generic objective-tools takeover, so the two focused map modes never
 *     coexist.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established pattern).
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

import ReceptionSurveySummary from '../ReceptionSurveySummary.js';
import { climateSurvey } from '../../../../store/receptionSurveys.js';
import { useObjectiveToolsTakeoverStore } from '../../../../store/objectiveToolsTakeoverStore.js';

const PROJECT = 'p-reception';

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

beforeEach(() => {
  cleanup();
  climateSurvey.useStore.setState({
    byProject: {},
    active: false,
    activeProjectId: null,
  });
  useObjectiveToolsTakeoverStore.setState({
    active: false,
    activeProjectId: null,
    activeObjectiveId: null,
  });
});

describe('ReceptionSurveySummary -- empty state', () => {
  it('shows the empty hint and an "Open map survey" button, no count list', () => {
    render(
      <ReceptionSurveySummary bundle={climateSurvey} projectId={PROJECT} />,
    );
    expect(screen.getByTestId('reception-survey-summary')).toBeTruthy();
    expect(screen.getByTestId('reception-survey-empty')).toBeTruthy();
    expect(screen.queryByTestId('reception-survey-list')).toBeNull();
    expect(screen.getByTestId('reception-open-survey').textContent).toContain(
      'Open map survey',
    );
  });
});

describe('ReceptionSurveySummary -- populated state', () => {
  it('lists per-class counts (non-zero only) and offers "Continue map survey"', () => {
    // Two fire-sector polys + one wind-sector poly; the other three climate
    // classes stay zero and must NOT render a row.
    climateSurvey.useStore.getState().addFeature(PROJECT, {
      surveyClass: 'fire-sector',
      kind: 'poly',
      geometry: SQUARE,
      measure: 2,
    });
    climateSurvey.useStore.getState().addFeature(PROJECT, {
      surveyClass: 'fire-sector',
      kind: 'poly',
      geometry: SQUARE,
      measure: 1,
    });
    climateSurvey.useStore.getState().addFeature(PROJECT, {
      surveyClass: 'wind-sector',
      kind: 'poly',
      geometry: SQUARE,
      measure: 3,
    });

    render(
      <ReceptionSurveySummary bundle={climateSurvey} projectId={PROJECT} />,
    );

    expect(screen.queryByTestId('reception-survey-empty')).toBeNull();
    const list = screen.getByTestId('reception-survey-list');
    // Two non-zero classes -> two rows (three zero classes skipped).
    expect(list.children).toHaveLength(2);
    expect(list.textContent).toContain('Fire-risk sector');
    expect(list.textContent).toContain('Wind exposure sector');
    expect(list.textContent).not.toContain('Frost pocket');

    expect(screen.getByTestId('reception-open-survey').textContent).toContain(
      'Continue map survey',
    );
  });

  it('counts only the requested project, never another', () => {
    climateSurvey.useStore.getState().addFeature('other-project', {
      surveyClass: 'fire-sector',
      kind: 'poly',
      geometry: SQUARE,
      measure: 1,
    });
    render(
      <ReceptionSurveySummary bundle={climateSurvey} projectId={PROJECT} />,
    );
    // PROJECT has nothing drawn -> empty state despite the other project's feature.
    expect(screen.getByTestId('reception-survey-empty')).toBeTruthy();
  });
});

describe('ReceptionSurveySummary -- takeover coexistence', () => {
  it('opening the survey closes any generic objective-tools takeover', () => {
    // A generic objective-tools takeover is already open for this project ...
    useObjectiveToolsTakeoverStore.getState().open(PROJECT, 's2-climate');
    expect(useObjectiveToolsTakeoverStore.getState().active).toBe(true);

    render(
      <ReceptionSurveySummary bundle={climateSurvey} projectId={PROJECT} />,
    );
    fireEvent.click(screen.getByTestId('reception-open-survey'));

    // ... the survey takeover is now open for this project ...
    expect(climateSurvey.useStore.getState().active).toBe(true);
    expect(climateSurvey.useStore.getState().activeProjectId).toBe(PROJECT);
    // ... and the generic takeover was closed (the two never coexist).
    expect(useObjectiveToolsTakeoverStore.getState().active).toBe(false);
    expect(useObjectiveToolsTakeoverStore.getState().activeProjectId).toBeNull();
  });
});
