/**
 * @vitest-environment happy-dom
 *
 * DeclarationOrientationRail -- the right-rail Stratum-1 orientation surface
 * (canonical-object cards + objective-sequencing diagram), relocated from the
 * DeclarationCenter header band (2026-06-22). Pure presentation over
 * declarationModel; these tests pin the rendered DOM (ported from the former
 * DeclarationCenter cases since the data-testids are unchanged):
 *   1. canonical cards with status-driven tags.
 *   2. sequencing nodes carry their "1.x" + status; the terminal node tracks.
 *   3. interactivity -- a non-locked node selects its objective; locked is static.
 *   4. Amanah -- the rendered copy carries no advance-sale / CSA framing.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

import DeclarationOrientationRail from '../DeclarationOrientationRail.js';

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

describe('DeclarationOrientationRail -- canonical cards', () => {
  it('renders Intent + Team canonical cards with status-driven tags', () => {
    render(
      <DeclarationOrientationRail objectives={SIX} objectiveStatuses={STATUSES} />,
    );
    const intent = screen.getByTestId('canonical-intent');
    const team = screen.getByTestId('canonical-team');
    // s1-vision complete -> Established; s1-steward active -> In Progress.
    expect(intent.getAttribute('data-tag')).toBe('done');
    expect(intent.textContent).toMatch(/Established/);
    expect(intent.textContent).toMatch(/Intent Object/);
    expect(team.getAttribute('data-tag')).toBe('wip');
    expect(team.textContent).toMatch(/In Progress/);
    expect(team.textContent).toMatch(/Steward \/ Team Object/);
  });
});

describe('DeclarationOrientationRail -- sequencing diagram', () => {
  it('renders one node per present objective with its 1.x + status', () => {
    render(
      <DeclarationOrientationRail objectives={SIX} objectiveStatuses={STATUSES} />,
    );
    expect(screen.getByTestId('seq-node-1.1').getAttribute('data-status')).toBe(
      'complete',
    );
    expect(screen.getByTestId('seq-node-1.2').getAttribute('data-status')).toBe(
      'active',
    );
    expect(screen.getByTestId('seq-node-1.5').getAttribute('data-status')).toBe(
      'locked',
    );
    // Terminal node = next stratum ("Land Reading"), locked until all six complete.
    const next = screen.getByTestId('seq-node-next');
    expect(next.textContent).toBe('Land Reading');
    expect(next.getAttribute('data-status')).toBe('locked');
  });

  it('selects an objective when a non-locked node is clicked', () => {
    const onSelectObjective = vi.fn();
    render(
      <DeclarationOrientationRail
        objectives={SIX}
        objectiveStatuses={STATUSES}
        onSelectObjective={onSelectObjective}
      />,
    );
    // 1.2 (s1-steward) is active -> interactive button.
    const node = screen.getByTestId('seq-node-1.2');
    expect(node.tagName).toBe('BUTTON');
    fireEvent.click(node);
    expect(onSelectObjective).toHaveBeenCalledTimes(1);
    expect(onSelectObjective).toHaveBeenCalledWith('s1-steward');
  });

  it('keeps a locked node static even when a handler is provided', () => {
    const onSelectObjective = vi.fn();
    render(
      <DeclarationOrientationRail
        objectives={SIX}
        objectiveStatuses={STATUSES}
        onSelectObjective={onSelectObjective}
      />,
    );
    // 1.5 (rf-s1-enterprise-mix) is locked -> static span, not a button.
    const node = screen.getByTestId('seq-node-1.5');
    expect(node.tagName).toBe('SPAN');
    fireEvent.click(node);
    expect(onSelectObjective).not.toHaveBeenCalled();
  });

  it('renders every node static when no handler is provided', () => {
    render(
      <DeclarationOrientationRail objectives={SIX} objectiveStatuses={STATUSES} />,
    );
    expect(screen.getByTestId('seq-node-1.2').tagName).toBe('SPAN');
  });
});

describe('DeclarationOrientationRail -- Amanah wording-pin (rendered DOM)', () => {
  it('carries no advance-sale / subscription / CSA framing', () => {
    render(
      <DeclarationOrientationRail objectives={SIX} objectiveStatuses={STATUSES} />,
    );
    const text = (
      screen.getByTestId('declaration-orientation-rail').textContent ?? ''
    ).toLowerCase();
    expect(detectCovenantBanned(text), text).toBe(false);
  });
});
