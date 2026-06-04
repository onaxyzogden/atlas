/** @vitest-environment happy-dom */
//
// B2 specs for PruneLedgerModal: a steward-facing single-click confirm dialog
// that archive-not-erases one project's observation ledger. Seeds the
// observation-log store directly with setState; resets between tests.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ObservationLogRecord } from '@ogden/shared';
import { useObservationLogStore } from '../../../../store/observationLogStore.js';
import PruneLedgerModal from '../PruneLedgerModal.js';

vi.mock('lucide-react', () => ({ Archive: () => null, X: () => null }));

let seq = 0;

/** Mirror of the factory in observationLogStore.prune.test.ts. */
const makeRecord = (
  over: Partial<ObservationLogRecord> = {},
): ObservationLogRecord => {
  seq += 1;
  const season = 'season' in over ? over.season : 'spring';
  const cycleNumber = 'cycleNumber' in over ? over.cycleNumber : 1;
  const bucketKey =
    cycleNumber === undefined
      ? `${season ?? 'unknown'}:undated`
      : `${season ?? 'unknown'}:${cycleNumber}`;
  return {
    id: `rec-${seq}`,
    projectId: 'mtc',
    flagId: `flag-${seq}`,
    sourceTemplateId: `tpl-${seq}`,
    objectiveId: 'obj-1',
    bucketKey,
    ...(season !== undefined ? { season } : {}),
    ...(cycleNumber !== undefined ? { cycleNumber } : {}),
    depth: 'water',
    deviationSign: 'over',
    raisedAt: '2026-03-01T00:00:00.000Z',
    closedAt: '2026-04-01T00:00:00.000Z',
    closeKind: 'resolved',
    ...over,
  };
};

/** Spring cycles 1..15, each a distinct template (no chronic pair forms). With
 *  the default keepWithinCycles=12 the top-12 [4..15] are kept, so cycles
 *  1,2,3 are removable => removable 3, total 15. */
const overWindowLedger = (): ObservationLogRecord[] =>
  Array.from({ length: 15 }, (_, i) => i + 1).map((cycleNumber) =>
    makeRecord({
      id: `c${cycleNumber}`,
      season: 'spring',
      cycleNumber,
      sourceTemplateId: `tpl-${cycleNumber}`,
    }),
  );

/** Spring cycles 1..5, all within the default 12-cycle window => removable 0. */
const withinWindowLedger = (): ObservationLogRecord[] =>
  [1, 2, 3, 4, 5].map((cycleNumber) =>
    makeRecord({
      id: `c${cycleNumber}`,
      season: 'spring',
      cycleNumber,
      sourceTemplateId: `tpl-${cycleNumber}`,
    }),
  );

beforeEach(() => {
  seq = 0;
  useObservationLogStore.setState({ records: [], archivedRecords: [] });
});

describe('PruneLedgerModal', () => {
  it('renders N and removable from a seeded over-window ledger', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    render(<PruneLedgerModal projectId="mtc" onClose={vi.fn()} />);
    expect(screen.getByTestId('prune-ledger-card').textContent).toContain(
      '3 of 15',
    );
  });

  it('names the rotation-cycle retention unit in the always-kept copy', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    render(<PruneLedgerModal projectId="mtc" onClose={vi.fn()} />);
    expect(screen.getByTestId('prune-ledger-card').textContent).toContain(
      'rotation cycles within each season',
    );
  });

  it('enables confirm immediately when something is removable (no checkbox gate)', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    render(<PruneLedgerModal projectId="mtc" onClose={vi.fn()} />);

    expect(screen.queryByTestId('prune-understood')).toBeNull();
    const confirm = screen.getByTestId('prune-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  it('archives on confirm, shows the archived result, and shrinks the active ledger', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    render(<PruneLedgerModal projectId="mtc" onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId('prune-confirm'));

    expect(screen.getByTestId('prune-result').textContent).toContain(
      'Archived 3 records.',
    );
    expect(useObservationLogStore.getState().records.length).toBe(12);
    expect(useObservationLogStore.getState().archivedRecords.length).toBe(3);
    expect(screen.getByTestId('prune-ledger-card').textContent).not.toContain(
      'Compacting archives',
    );
  });

  it('swaps to a Done button that calls onClose after a successful archive', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    const onClose = vi.fn();
    render(<PruneLedgerModal projectId="mtc" onClose={onClose} />);

    fireEvent.click(screen.getByTestId('prune-confirm'));

    expect(screen.queryByTestId('prune-confirm')).toBeNull();
    fireEvent.click(screen.getByTestId('prune-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a Restore affordance once rows are archived and round-trips them', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    render(<PruneLedgerModal projectId="mtc" onClose={vi.fn()} />);

    expect(screen.queryByTestId('prune-restore')).toBeNull();

    fireEvent.click(screen.getByTestId('prune-confirm'));
    const restore = screen.getByTestId('prune-restore');
    expect(restore.textContent).toContain('3');

    fireEvent.click(restore);
    expect(useObservationLogStore.getState().records.length).toBe(15);
    expect(useObservationLogStore.getState().archivedRecords.length).toBe(0);
  });

  it('shows nothing-to-compact copy and no enabled confirm when within retention', () => {
    useObservationLogStore.setState({ records: withinWindowLedger() });
    render(<PruneLedgerModal projectId="mtc" onClose={vi.fn()} />);

    expect(screen.getByTestId('prune-nothing')).toBeTruthy();
    // The modal renders no Compact button at all when nothing is removable (the
    // JSX gates on `removable > 0`), so assert outright absence -- a disabled
    // button would be a regression this stricter check would catch.
    expect(screen.queryByTestId('prune-confirm')).toBeNull();
  });

  it('calls onClose from the close button', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    const onClose = vi.fn();
    render(<PruneLedgerModal projectId="mtc" onClose={onClose} />);

    fireEvent.click(screen.getByTestId('prune-ledger-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
