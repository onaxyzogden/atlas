/**
 * @vitest-environment happy-dom
 *
 * Per-kind rotation-adherence editors — Save/Cancel state machine.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useRotationPlanStore } from '../../../../store/rotationPlanStore.js';
import {
  OvergrazedEditor,
  RestEditor,
  UnplannedPaddockEditor,
} from '../index.js';

beforeEach(() => {
  localStorage.clear();
  useRotationPlanStore.setState({ byProject: {} });
});

function seedCell(targetGrazeDays = 5, targetRestDays = 30) {
  useRotationPlanStore.setState({
    byProject: {
      p1: {
        projectId: 'p1',
        cells: [
          {
            paddockId: 'a',
            cellGroup: 'A',
            sequenceOrder: 0,
            targetGrazeDays,
            targetRestDays,
          },
        ],
      },
    },
  });
}

describe('OvergrazedEditor', () => {
  it('Save patches targetGrazeDays via upsertCell and closes', () => {
    seedCell(5, 30);
    let closed = false;
    render(
      <OvergrazedEditor
        projectId="p1"
        paddockId="a"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    const input = screen.getByLabelText(/target graze days/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(
      useRotationPlanStore.getState().byProject.p1!.cells[0]!.targetGrazeDays,
    ).toBe(3);
    expect(closed).toBe(true);
  });

  it('Cancel discards the draft and closes without writing', () => {
    seedCell(5, 30);
    let closed = false;
    render(
      <OvergrazedEditor
        projectId="p1"
        paddockId="a"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    const input = screen.getByLabelText(/target graze days/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(
      useRotationPlanStore.getState().byProject.p1!.cells[0]!.targetGrazeDays,
    ).toBe(5);
    expect(closed).toBe(true);
  });
});

describe('RestEditor', () => {
  it('Save patches targetRestDays via upsertCell and closes', () => {
    seedCell(5, 30);
    let closed = false;
    render(
      <RestEditor
        projectId="p1"
        paddockId="a"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    const input = screen.getByLabelText(/target rest days/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(
      useRotationPlanStore.getState().byProject.p1!.cells[0]!.targetRestDays,
    ).toBe(45);
    expect(closed).toBe(true);
  });

  it('Cancel discards the draft and closes without writing', () => {
    seedCell(5, 30);
    let closed = false;
    render(
      <RestEditor
        projectId="p1"
        paddockId="a"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    const input = screen.getByLabelText(/target rest days/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(
      useRotationPlanStore.getState().byProject.p1!.cells[0]!.targetRestDays,
    ).toBe(30);
    expect(closed).toBe(true);
  });
});

describe('UnplannedPaddockEditor', () => {
  it('Save upserts a brand-new cell for the unplanned paddock', () => {
    let closed = false;
    render(
      <UnplannedPaddockEditor
        projectId="p1"
        paddockId="z"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/cell group/i), {
      target: { value: 'B' },
    });
    fireEvent.change(screen.getByLabelText(/sequence order/i), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText(/target graze days/i), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText(/target rest days/i), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    const cells = useRotationPlanStore.getState().byProject.p1!.cells;
    expect(cells.find((c) => c.paddockId === 'z')).toMatchObject({
      paddockId: 'z',
      cellGroup: 'B',
      sequenceOrder: 0,
      targetGrazeDays: 3,
      targetRestDays: 30,
    });
    expect(closed).toBe(true);
  });

  it('Cancel closes without inserting a new cell', () => {
    let closed = false;
    render(
      <UnplannedPaddockEditor
        projectId="p1"
        paddockId="z"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/cell group/i), {
      target: { value: 'B' },
    });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    const plan = useRotationPlanStore.getState().byProject.p1;
    // Either the project has no plan, or the plan has no cell for 'z'.
    expect(plan?.cells.some((c) => c.paddockId === 'z') ?? false).toBe(false);
    expect(closed).toBe(true);
  });
});

describe('editor source files — covenant + no spine-status touch', () => {
  const dir = join(__dirname, '..');
  for (const f of [
    'OvergrazedEditor.tsx',
    'RestEditor.tsx',
    'UnplannedPaddockEditor.tsx',
  ]) {
    it(`${f} carries no financing lexicon and no WorkItem.status read/write`, () => {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src).not.toMatch(
        /interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i,
      );
      expect(src).not.toMatch(/WorkItem\.status|useWorkItemStore/);
    });
  }
});
