/**
 * @vitest-environment happy-dom
 *
 * ReceptionReferencePanel -- the Plan-stage Stratum-3 RIGHT rail for a selected
 * systems-reading survey. Pure display over the objective + reception progress
 * model; these tests pin the rendered DOM:
 *   1. header -- "Objective 3.x - <status>" eyebrow + title + mode subtitle.
 *   2. the "Still listening" reception callout.
 *   3. expanded intent-lens rows (one per type).
 *   4. dual outputs -- Observe Output (teal) + Act handoff (amber).
 *   5. builds-on dependency line.
 *   6. both-stratum progress fractions + records caption.
 *   7. graceful omission when the optional sections have no data.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { PlanStratumObjective } from '@ogden/shared';

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

import ReceptionReferencePanel from '../ReceptionReferencePanel.js';
import type { ReceptionProgressModel } from '../receptionModel.js';

function makeObjective(
  overrides: Partial<PlanStratumObjective> = {},
): PlanStratumObjective {
  return {
    id: 's3-hydrology',
    stratumId: 's3-systems-reading',
    title: 'Water movement & hydrology',
    shortTitle: 'Water movement & hydrology',
    intentLens: [
      { typeId: 'regenerative_farm', text: 'Look for swale lines and contour flow' },
      { typeId: 'silvopasture', text: 'Trace stock-water reach across paddocks' },
    ],
    observeOutput: 'Hydrology Survey Record',
    actHandoff: 'Water Infrastructure Brief',
    buildsOnDisplay: 'Stratum 2.1 Terrain & topography',
    ...overrides,
  } as PlanStratumObjective;
}

const PROGRESS: ReceptionProgressModel = {
  tierOne: { complete: 4, total: 6 },
  tierTwo: { complete: 1, total: 5 },
  totalRecords: 11,
  capturedRecords: 0,
  thresholdOpen: false,
};

describe('ReceptionReferencePanel -- header', () => {
  it('renders the objective eyebrow, title, and mode subtitle', () => {
    render(
      <ReceptionReferencePanel
        objective={makeObjective()}
        status="active"
        progress={PROGRESS}
      />,
    );
    const ref = screen.getByTestId('reception-reference');
    // 3.1 derived from the display map; status "active" -> "In Progress".
    expect(ref.textContent).toMatch(/Objective 3\.1/);
    expect(ref.textContent).toMatch(/In Progress/);
    expect(ref.textContent).toMatch(/Water movement & hydrology/);
    expect(ref.textContent).toMatch(/Mode 2 -- Reception - Stratum 3/);
  });
});

describe('ReceptionReferencePanel -- sections', () => {
  it('renders the Still-listening reception callout', () => {
    render(
      <ReceptionReferencePanel
        objective={makeObjective()}
        status="active"
        progress={PROGRESS}
      />,
    );
    const callout = screen.getByTestId('reception-still-listening');
    expect(callout.textContent).toMatch(/Still listening/);
    expect(callout.textContent).toMatch(/Mode 4 Design/);
  });

  it('renders an intent-lens row per authored type', () => {
    render(
      <ReceptionReferencePanel
        objective={makeObjective()}
        status="active"
        progress={PROGRESS}
      />,
    );
    expect(
      screen.getByTestId('reference-lens-regenerative_farm').textContent,
    ).toMatch(/swale lines/);
    expect(
      screen.getByTestId('reference-lens-silvopasture').textContent,
    ).toMatch(/stock-water reach/);
  });

  it('renders both Observe and Act feed rows', () => {
    render(
      <ReceptionReferencePanel
        objective={makeObjective()}
        status="active"
        progress={PROGRESS}
      />,
    );
    expect(
      screen.getByTestId('reference-feed-observe').textContent,
    ).toMatch(/Hydrology Survey Record/);
    expect(screen.getByTestId('reference-feed-act').textContent).toMatch(
      /Water Infrastructure Brief/,
    );
  });

  it('renders the builds-on dependency line', () => {
    render(
      <ReceptionReferencePanel
        objective={makeObjective()}
        status="active"
        progress={PROGRESS}
      />,
    );
    expect(screen.getByTestId('reference-builds-on').textContent).toMatch(
      /Stratum 2\.1 Terrain & topography/,
    );
  });

  it('renders both-tier progress fractions and the records caption', () => {
    render(
      <ReceptionReferencePanel
        objective={makeObjective()}
        status="active"
        progress={PROGRESS}
      />,
    );
    expect(
      screen.getByTestId('reference-prog-tier1').textContent,
    ).toMatch(/4\/6/);
    expect(
      screen.getByTestId('reference-prog-tier2').textContent,
    ).toMatch(/1\/5/);
    expect(screen.getByTestId('reference-records').textContent).toMatch(
      /11 survey records/,
    );
  });
});

describe('ReceptionReferencePanel -- tier1 (Land Reading) parameterization', () => {
  function makeTierOneObjective(): PlanStratumObjective {
    return makeObjective({
      id: 's2-terrain',
      stratumId: 's2-land-reading',
      title: 'Survey terrain & topography',
      shortTitle: 'Terrain & topography',
      intentLens: [
        { typeId: 'regenerative_farm', text: 'Slope, aspect, water flow paths' },
        { typeId: 'residential', text: 'Candidate habitation zones' },
      ],
      observeOutput: 'Terrain & Topography Survey Record',
      actHandoff: 'Earthworks & Access Brief',
      // Stratum 2 has no prior reception stratum -- buildsOnDisplay is omitted.
      buildsOnDisplay: undefined,
    });
  }

  it('renders the 2.x eyebrow, the Tier-1 subtitle, and the Tier-1 callout', () => {
    render(
      <ReceptionReferencePanel
        objective={makeTierOneObjective()}
        status="active"
        progress={PROGRESS}
        tier="tier1"
      />,
    );
    const ref = screen.getByTestId('reception-reference');
    expect(ref.textContent).toMatch(/Objective 2\.1/);
    expect(ref.textContent).toMatch(/Mode 2 -- Reception - Stratum 2/);

    const callout = screen.getByTestId('reception-still-listening');
    expect(callout.textContent).toMatch(/Listening, not deciding/);
    expect(callout.textContent).toMatch(/Reality Check/);
    // The Tier-2 "Mode 4 Design" deferral wording is NOT used on Stratum 2.
    expect(callout.textContent).not.toMatch(/Mode 4 Design/);
  });

  it('omits the builds-on line for Tier-1 surveys', () => {
    render(
      <ReceptionReferencePanel
        objective={makeTierOneObjective()}
        status="active"
        progress={PROGRESS}
        tier="tier1"
      />,
    );
    expect(screen.queryByTestId('reference-builds-on')).toBeNull();
    // The residential intent-lens row still renders.
    expect(
      screen.getByTestId('reference-lens-residential').textContent,
    ).toMatch(/habitation zones/);
  });
});

describe('ReceptionReferencePanel -- graceful omission', () => {
  it('omits the optional sections when their data is absent', () => {
    render(
      <ReceptionReferencePanel
        objective={makeObjective({
          intentLens: [],
          observeOutput: undefined,
          actHandoff: undefined,
          buildsOnDisplay: undefined,
        })}
        status="locked"
        progress={PROGRESS}
      />,
    );
    expect(
      screen.queryByTestId('reference-lens-regenerative_farm'),
    ).toBeNull();
    expect(screen.queryByTestId('reference-feed-observe')).toBeNull();
    expect(screen.queryByTestId('reference-feed-act')).toBeNull();
    expect(screen.queryByTestId('reference-builds-on')).toBeNull();
    // The header + progress remain (always rendered).
    expect(screen.getByTestId('reception-reference').textContent).toMatch(
      /Locked/,
    );
    expect(screen.getByTestId('reference-records')).toBeTruthy();
  });
});
