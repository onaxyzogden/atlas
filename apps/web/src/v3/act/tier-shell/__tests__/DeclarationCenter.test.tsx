/**
 * @vitest-environment happy-dom
 *
 * DeclarationCenter -- the Plan-stage Tier-0 header band. Since the 2026-06-22
 * relocation it renders ONLY the mode banner; the canonical-object cards and the
 * objective-sequencing diagram moved to the right-rail DeclarationOrientationRail
 * (their cases now live in DeclarationOrientationRail.test.tsx). Pure presentation
 * over declarationModel; these tests pin the rendered DOM:
 *   1. mode header copy.
 *   2. the moved widgets (canonical cards + sequencing) no longer render here.
 *   3. Amanah -- the rendered copy carries no advance-sale / CSA framing.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { detectCovenantBanned } from '@ogden/shared';

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

import DeclarationCenter from '../DeclarationCenter.js';

// deriveStratumSequencing / deriveCanonicalObjects only read `o.id`, so a minimal
// stub suffices (mirrors declarationModel.test.ts).
function obj(id: string): PlanStratumObjective {
  return { id } as PlanStratumObjective;
}

const SIX = [
  obj('s1-vision'),
  obj('s1-steward'),
  obj('s1-boundaries'),
  obj('s1-stakeholders'),
  obj('rf-s1-enterprise-mix'),
  obj('res-s1-household-needs'),
];

const STATUSES: Record<string, PlanStratumObjectiveStatus> = {
  's1-vision': 'complete',
  's1-steward': 'active',
  's1-boundaries': 'available',
  's1-stakeholders': 'available',
  'rf-s1-enterprise-mix': 'locked',
  'res-s1-household-needs': 'locked',
};

describe('DeclarationCenter -- header band', () => {
  it('renders the mode header copy', () => {
    render(
      <DeclarationCenter objectives={SIX} objectiveStatuses={STATUSES} />,
    );
    const center = screen.getByTestId('declaration-center');
    expect(center.textContent).toMatch(/Mode 1 -- Declaration/);
    expect(center.textContent).toMatch(/Stratum 1/);
    expect(center.textContent).toMatch(/before the land is read/);
  });

  it('no longer renders the relocated canonical cards or sequencing diagram', () => {
    render(
      <DeclarationCenter objectives={SIX} objectiveStatuses={STATUSES} />,
    );
    // These widgets moved to DeclarationOrientationRail (right rail).
    expect(screen.queryByTestId('canonical-intent')).toBeNull();
    expect(screen.queryByTestId('canonical-team')).toBeNull();
    expect(screen.queryByTestId('seq-node-1.1')).toBeNull();
    expect(screen.queryByTestId('seq-node-next')).toBeNull();
  });
});

describe('DeclarationCenter -- Amanah wording-pin (rendered DOM)', () => {
  it('carries no advance-sale / subscription / CSA framing', () => {
    render(
      <DeclarationCenter objectives={SIX} objectiveStatuses={STATUSES} />,
    );
    const text = (
      screen.getByTestId('declaration-center').textContent ?? ''
    ).toLowerCase();
    expect(detectCovenantBanned(text), text).toBe(false);
  });
});
