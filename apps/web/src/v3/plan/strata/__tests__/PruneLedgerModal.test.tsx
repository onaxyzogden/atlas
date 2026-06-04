/** @vitest-environment happy-dom */
//
// B2 specs for PruneLedgerModal: a steward-facing gated confirm dialog that
// dry-runs a chronic-safe ledger compaction (via previewProjectPrune) and, only
// after an explicit "I understand" tick, executes it (via pruneProjectRecords).
// Seeds the observation-log store directly with setState; resets between tests.

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
  useObservationLogStore.setState({ records: [] });
});

describe('PruneLedgerModal', () => {
  it('renders N and removable from a seeded over-window ledger', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    render(<PruneLedgerModal projectId="mtc" onClose={vi.fn()} />);
    expect(screen.getByTestId('prune-ledger-card').textContent).toContain(
      '3 of 15',
    );
  });

  it('keeps confirm disabled until the understood gate is checked', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    render(<PruneLedgerModal projectId="mtc" onClose={vi.fn()} />);

    const confirm = screen.getByTestId('prune-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.click(screen.getByTestId('prune-understood'));
    expect(confirm.disabled).toBe(false);
  });

  it('prunes on confirm, shows the result, and shrinks the ledger', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    render(<PruneLedgerModal projectId="mtc" onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId('prune-understood'));
    fireEvent.click(screen.getByTestId('prune-confirm'));

    expect(screen.getByTestId('prune-result').textContent).toContain(
      'Removed 3 records.',
    );
    expect(useObservationLogStore.getState().records.length).toBe(12);
    // The pending-action summary ("removes X of Y") is gone once the prune
    // lands, so no stale/contradictory count is left on screen.
    expect(screen.getByTestId('prune-ledger-card').textContent).not.toContain(
      'Compacting removes',
    );
  });

  it('swaps to a Done button that calls onClose after a successful prune', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    const onClose = vi.fn();
    render(<PruneLedgerModal projectId="mtc" onClose={onClose} />);

    fireEvent.click(screen.getByTestId('prune-understood'));
    fireEvent.click(screen.getByTestId('prune-confirm'));

    // Confirm is gone; Done is present and closes the modal.
    expect(screen.queryByTestId('prune-confirm')).toBeNull();
    fireEvent.click(screen.getByTestId('prune-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows nothing-to-compact copy and no enabled confirm when within retention', () => {
    useObservationLogStore.setState({ records: withinWindowLedger() });
    render(<PruneLedgerModal projectId="mtc" onClose={vi.fn()} />);

    expect(screen.getByTestId('prune-nothing')).toBeTruthy();
    const confirm = screen.queryByTestId('prune-confirm') as
      | HTMLButtonElement
      | null;
    expect(confirm === null || confirm.disabled === true).toBe(true);
  });

  it('calls onClose from the close button', () => {
    useObservationLogStore.setState({ records: overWindowLedger() });
    const onClose = vi.fn();
    render(<PruneLedgerModal projectId="mtc" onClose={onClose} />);

    fireEvent.click(screen.getByTestId('prune-ledger-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
