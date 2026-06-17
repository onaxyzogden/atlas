/**
 * @vitest-environment happy-dom
 *
 * ReceptionCenter -- the Plan-stage Tier-2 / Reception (Systems Reading) header
 * that sits above the 2-pane workbench grid. Pure presentation over
 * receptionModel; these tests pin the rendered DOM:
 *   1. mode header copy + reception-rule callout.
 *   2. sequencing strip -- one node per present survey with its "2.x" + status,
 *      plus a terminal Threshold-1 node that tracks completion.
 *   3. the two gate cards (Tier-2 fraction + Threshold-1 open/locked).
 *   4. interactivity -- a non-locked node selects its survey; locked is static.
 *   5. Amanah -- the rendered center copy carries no advance-sale / CSA framing.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
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

import ReceptionCenter from '../ReceptionCenter.js';
import type { ReceptionProgressModel } from '../receptionModel.js';

// deriveReceptionSequencing only reads `o.id`, so a minimal stub suffices.
function obj(id: string): PlanStratumObjective {
  return { id } as PlanStratumObjective;
}

const FIVE = [
  obj('s3-hydrology'),
  obj('s3-soil'),
  obj('rf-s3-nutrient-cycling'),
  obj('rf-s3-pest-pressure'),
  obj('silv-sec-s3-stock-water'),
];

const PARTIAL_STATUSES: Record<string, PlanStratumObjectiveStatus> = {
  's3-hydrology': 'complete',
  's3-soil': 'active',
  'rf-s3-nutrient-cycling': 'available',
  'rf-s3-pest-pressure': 'locked',
  'silv-sec-s3-stock-water': 'locked',
};

const ALL_COMPLETE: Record<string, PlanStratumObjectiveStatus> = {
  's3-hydrology': 'complete',
  's3-soil': 'complete',
  'rf-s3-nutrient-cycling': 'complete',
  'rf-s3-pest-pressure': 'complete',
  'silv-sec-s3-stock-water': 'complete',
};

const PROGRESS_PARTIAL: ReceptionProgressModel = {
  tierOne: { complete: 4, total: 6 },
  tierTwo: { complete: 1, total: 5 },
  totalRecords: 11,
  capturedRecords: 0,
  thresholdOpen: false,
};

const PROGRESS_OPEN: ReceptionProgressModel = {
  tierOne: { complete: 6, total: 6 },
  tierTwo: { complete: 5, total: 5 },
  totalRecords: 11,
  capturedRecords: 11,
  thresholdOpen: true,
};

describe('ReceptionCenter -- header + rule', () => {
  it('renders the Mode 2 reception header copy', () => {
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={PARTIAL_STATUSES}
        progress={PROGRESS_PARTIAL}
      />,
    );
    const center = screen.getByTestId('reception-center');
    expect(center.textContent).toMatch(/Mode 2 -- Reception/);
    expect(center.textContent).toMatch(/Tier 2/);
    expect(center.textContent).toMatch(/beneath the surface/);
  });

  it('renders the reception-rule callout', () => {
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={PARTIAL_STATUSES}
        progress={PROGRESS_PARTIAL}
      />,
    );
    const rule = screen.getByTestId('reception-rule');
    expect(rule.textContent).toMatch(/Reception rule continues/);
    expect(rule.textContent).toMatch(/Still no decisions/);
  });
});

describe('ReceptionCenter -- sequencing strip', () => {
  it('renders one node per present survey with its 2.x + status', () => {
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={PARTIAL_STATUSES}
        progress={PROGRESS_PARTIAL}
      />,
    );
    expect(
      screen.getByTestId('seq-node-2.1').getAttribute('data-status'),
    ).toBe('complete');
    expect(
      screen.getByTestId('seq-node-2.2').getAttribute('data-status'),
    ).toBe('active');
    expect(
      screen.getByTestId('seq-node-2.4').getAttribute('data-status'),
    ).toBe('locked');
    // The new livestock-water survey is present at 2.5.
    expect(screen.getByTestId('seq-node-2.5').textContent).toMatch(
      /2\.5 Livestock Water/,
    );
  });

  it('keeps the terminal Threshold-1 node locked until all surveys complete', () => {
    const { unmount } = render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={PARTIAL_STATUSES}
        progress={PROGRESS_PARTIAL}
      />,
    );
    expect(
      screen.getByTestId('seq-node-threshold').getAttribute('data-status'),
    ).toBe('locked');
    unmount();

    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={ALL_COMPLETE}
        progress={PROGRESS_OPEN}
      />,
    );
    expect(
      screen.getByTestId('seq-node-threshold').getAttribute('data-status'),
    ).toBe('available');
  });

  it('shows the 2.5-benefits-from-2.1 note when the livestock survey is present', () => {
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={PARTIAL_STATUSES}
        progress={PROGRESS_PARTIAL}
      />,
    );
    expect(screen.getByTestId('reception-center').textContent).toMatch(
      /2\.5 Livestock Water benefits from 2\.1/,
    );
  });
});

describe('ReceptionCenter -- gate cards', () => {
  it('renders the Tier-2 progress fraction', () => {
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={PARTIAL_STATUSES}
        progress={PROGRESS_PARTIAL}
      />,
    );
    const gate = screen.getByTestId('reception-tier-gate');
    expect(gate.textContent).toMatch(/1\s*\/\s*5/);
  });

  it('keeps the Threshold-1 gate locked when the threshold is not open', () => {
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={PARTIAL_STATUSES}
        progress={PROGRESS_PARTIAL}
      />,
    );
    const gate = screen.getByTestId('reception-threshold-gate');
    expect(gate.getAttribute('data-open')).toBeNull();
    expect(gate.textContent).toMatch(/The Reality Check/);
    expect(gate.textContent).toMatch(/Locked/);
  });

  it('opens the Threshold-1 gate when both tiers are complete', () => {
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={ALL_COMPLETE}
        progress={PROGRESS_OPEN}
      />,
    );
    const gate = screen.getByTestId('reception-threshold-gate');
    expect(gate.getAttribute('data-open')).toBe('true');
    expect(gate.textContent).toMatch(/Open/);
  });
});

describe('ReceptionCenter -- interactivity', () => {
  it('selects a survey when a non-locked node is clicked', () => {
    const onSelectObjective = vi.fn();
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={PARTIAL_STATUSES}
        progress={PROGRESS_PARTIAL}
        onSelectObjective={onSelectObjective}
      />,
    );
    // 2.2 (s3-soil) is active -> interactive button.
    const node = screen.getByTestId('seq-node-2.2');
    expect(node.tagName).toBe('BUTTON');
    fireEvent.click(node);
    expect(onSelectObjective).toHaveBeenCalledTimes(1);
    expect(onSelectObjective).toHaveBeenCalledWith('s3-soil');
  });

  it('keeps a locked node static even when a handler is provided', () => {
    const onSelectObjective = vi.fn();
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={PARTIAL_STATUSES}
        progress={PROGRESS_PARTIAL}
        onSelectObjective={onSelectObjective}
      />,
    );
    // 2.4 (rf-s3-pest-pressure) is locked -> static span.
    const node = screen.getByTestId('seq-node-2.4');
    expect(node.tagName).toBe('SPAN');
    fireEvent.click(node);
    expect(onSelectObjective).not.toHaveBeenCalled();
  });

  it('renders every node static when no handler is provided', () => {
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={PARTIAL_STATUSES}
        progress={PROGRESS_PARTIAL}
      />,
    );
    expect(screen.getByTestId('seq-node-2.2').tagName).toBe('SPAN');
  });
});

describe('ReceptionCenter -- Amanah wording-pin (rendered DOM)', () => {
  it('carries no advance-sale / subscription / CSA framing', () => {
    render(
      <ReceptionCenter
        objectives={FIVE}
        objectiveStatuses={ALL_COMPLETE}
        progress={PROGRESS_OPEN}
      />,
    );
    const text = (
      screen.getByTestId('reception-center').textContent ?? ''
    ).toLowerCase();
    expect(text).not.toMatch(
      /subscription|presale|pre-sale|advance[ -]sale|csa|csra|yield[- ]share/,
    );
  });
});
