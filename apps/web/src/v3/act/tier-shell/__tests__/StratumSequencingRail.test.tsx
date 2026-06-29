/**
 * @vitest-environment happy-dom
 *
 * StratumSequencingRail -- the reusable per-stratum objective-sequencing stepper
 * (Strata 2-7 mount it directly; Stratum 1 mounts it via DeclarationOrientationRail
 * beneath its canonical cards). Pure presentation over declarationModel; these
 * tests pin the rendered DOM, using the REAL PLAN_STRATA so the next-stratum
 * terminal label is exercised end-to-end:
 *   1. heading "Stratum N -- Objective Sequencing" + N.x node numbering.
 *   2. terminal node = the NEXT stratum's title; the LAST stratum reads "Plan complete".
 *   3. terminal locked until every present objective is complete.
 *   4. interactivity -- a non-locked node selects its objective; a locked one is static.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  PLAN_STRATA,
  type PlanStratum,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
} from '@ogden/shared';

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

import StratumSequencingRail from '../StratumSequencingRail.js';

// deriveWaves only reads o.id (+ optional prerequisiteObjectiveIds), so a minimal
// stub suffices (mirrors declarationModel.test.ts).
function obj(id: string): PlanStratumObjective {
  return { id } as PlanStratumObjective;
}

function stratumByOrdinal(ordinal: number): PlanStratum {
  const s = PLAN_STRATA.find((x) => x.ordinal === ordinal);
  if (!s) throw new Error(`no stratum with ordinal ${ordinal}`);
  return s;
}

// A non-Stratum-1 stratum (no curated override -> a single prereq-free wave) and
// the final stratum (terminal "Plan complete").
const S2 = stratumByOrdinal(2);
const S7 = stratumByOrdinal(7);
const S2_OBJECTIVES = [obj('s2-a'), obj('s2-b'), obj('s2-c')];

describe('StratumSequencingRail -- generic stratum', () => {
  it('renders the "Stratum N -- Objective Sequencing" heading and N.x nodes', () => {
    render(
      <StratumSequencingRail
        stratum={S2}
        objectives={S2_OBJECTIVES}
        objectiveStatuses={{
          's2-a': 'active',
          's2-b': 'available',
          's2-c': 'available',
        }}
      />,
    );
    const root = screen.getByTestId('stratum-sequencing-rail');
    expect(root.textContent).toMatch(/Stratum 2 -- Objective Sequencing/);
    // One prereq-free wave -> 2.1 / 2.2 / 2.3 in objective order.
    expect(screen.getByTestId('seq-node-2.1').getAttribute('data-status')).toBe(
      'active',
    );
    expect(screen.getByTestId('seq-node-2.2')).toBeTruthy();
    expect(screen.getByTestId('seq-node-2.3')).toBeTruthy();
  });

  it('labels the terminal node with the NEXT stratum title, locked until all complete', () => {
    render(
      <StratumSequencingRail
        stratum={S2}
        objectives={S2_OBJECTIVES}
        objectiveStatuses={{ 's2-a': 'active' }}
      />,
    );
    const next = screen.getByTestId('seq-node-next');
    // S2 (Land Reading) -> next stratum is S3 (Systems Reading).
    expect(next.textContent).toBe(stratumByOrdinal(3).title);
    expect(next.getAttribute('data-status')).toBe('locked');
  });

  it('unlocks the terminal node once every present objective is complete', () => {
    render(
      <StratumSequencingRail
        stratum={S2}
        objectives={S2_OBJECTIVES}
        objectiveStatuses={{
          's2-a': 'complete',
          's2-b': 'complete',
          's2-c': 'complete',
        }}
      />,
    );
    expect(
      screen.getByTestId('seq-node-next').getAttribute('data-status'),
    ).toBe('available');
  });
});

describe('StratumSequencingRail -- final stratum', () => {
  it('reads "Plan complete" at the terminal of the last stratum', () => {
    render(
      <StratumSequencingRail
        stratum={S7}
        objectives={[obj('s7-a')]}
        objectiveStatuses={{ 's7-a': 'active' }}
      />,
    );
    expect(screen.getByTestId('seq-node-next').textContent).toBe('Plan complete');
  });
});

describe('StratumSequencingRail -- interactivity', () => {
  it('makes a non-locked node a button that selects its objective', () => {
    const onSelectObjective = vi.fn();
    render(
      <StratumSequencingRail
        stratum={S2}
        objectives={S2_OBJECTIVES}
        objectiveStatuses={{ 's2-a': 'active' }}
        onSelectObjective={onSelectObjective}
      />,
    );
    const node = screen.getByTestId('seq-node-2.1');
    expect(node.tagName).toBe('BUTTON');
    fireEvent.click(node);
    expect(onSelectObjective).toHaveBeenCalledTimes(1);
    expect(onSelectObjective).toHaveBeenCalledWith('s2-a');
  });

  it('keeps a locked node static even when a handler is provided', () => {
    const onSelectObjective = vi.fn();
    render(
      <StratumSequencingRail
        stratum={S2}
        objectives={S2_OBJECTIVES}
        objectiveStatuses={{ 's2-a': 'active' }}
        onSelectObjective={onSelectObjective}
      />,
    );
    // s2-b has no status override -> defaults to 'locked' -> static span.
    const node = screen.getByTestId('seq-node-2.2');
    expect(node.tagName).toBe('SPAN');
    fireEvent.click(node);
    expect(onSelectObjective).not.toHaveBeenCalled();
  });
});
