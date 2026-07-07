/**
 * @vitest-environment happy-dom
 */
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { ConflictListItem } from '@ogden/shared';

// <Link> needs a RouterProvider; stub it to a plain anchor for unit isolation.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

// Toast is a side-effecting singleton (DOM portal); stub it so assertions stay
// focused on the page itself.
vi.mock('../../components/Toast.js', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

// Module-level mock (robust across ESM live bindings — the page imports the
// named exports directly).
vi.mock('../../lib/syncService.js', () => ({
  listRecordConflicts: vi.fn(),
  resolveRecordConflict: vi.fn(),
}));

import SyncConflictsPage from '../SyncConflictsPage.js';
import { listRecordConflicts, resolveRecordConflict } from '../../lib/syncService.js';
import { useConnectivityStore } from '../../store/connectivityStore.js';

const mockList = vi.mocked(listRecordConflicts);
const mockResolve = vi.mocked(resolveRecordConflict);

function makeConflict(over: Partial<ConflictListItem> = {}): ConflictListItem {
  return {
    syncLogId: '11111111-1111-1111-1111-111111111111',
    failedRecordId: '22222222-2222-2222-2222-222222222222',
    storeKey: 'ogden-field-actions',
    recordId: 'rec-1',
    localPayload: { title: 'my local edit' },
    serverPayload: { title: 'server version' },
    localRev: 3,
    serverRev: 4,
    observedAtLocal: '2026-05-29T10:00:00.000Z',
    observedAtServer: '2026-05-29T11:00:00.000Z',
    detectedAt: '2026-05-29T11:05:00.000Z',
    ...over,
  };
}

describe('SyncConflictsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders the empty state when there are no conflicts', async () => {
    mockList.mockResolvedValue([]);
    render(<SyncConflictsPage />);
    expect(await screen.findByText(/No open conflicts/i)).toBeTruthy();
  });

  it('lists each conflict with both payloads and Keep-mine/Keep-server actions', async () => {
    mockList.mockResolvedValue([makeConflict()]);
    render(<SyncConflictsPage />);
    expect(await screen.findByText('ogden-field-actions')).toBeTruthy();
    expect(screen.getByText(/my local edit/)).toBeTruthy();
    expect(screen.getByText(/server version/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /keep mine/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /keep server/i })).toBeTruthy();
  });

  it('resolves with keep_mine and removes the resolved card', async () => {
    const item = makeConflict();
    mockList.mockResolvedValue([item]);
    mockResolve.mockResolvedValue({
      storeKey: item.storeKey,
      recordId: item.recordId,
      rev: 5,
      payload: item.localPayload,
      resolutionStatus: 'resolved',
    });

    render(<SyncConflictsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /keep mine/i }));

    await waitFor(() => expect(mockResolve).toHaveBeenCalledWith(item, 'keep_mine'));
    await waitFor(() => expect(screen.queryByText('ogden-field-actions')).toBeNull());
  });

  it('resolves with keep_server when the server copy is chosen', async () => {
    const item = makeConflict();
    mockList.mockResolvedValue([item]);
    mockResolve.mockResolvedValue({
      storeKey: item.storeKey,
      recordId: item.recordId,
      rev: 4,
      payload: item.serverPayload,
      resolutionStatus: 'resolved',
    });

    render(<SyncConflictsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /keep server/i }));

    await waitFor(() => expect(mockResolve).toHaveBeenCalledWith(item, 'keep_server'));
  });

  it('reuses the same surface for an olos record conflict (Phase 3B, no new UI)', async () => {
    // olos observation/proof/verification conflicts share the sync_log +
    // failed_records surface, so they arrive through the SAME listConflicts and
    // render with the SAME Keep-mine/Keep-server controls — only the storeKey
    // differs. resolveRecordConflict (mocked here) dispatches the olos resolve
    // route internally; the page stays storeKey-agnostic.
    const olosItem = makeConflict({
      storeKey: 'ogden-olos-observation-records',
      recordId: 'obs-9c2f',
      localPayload: { status: 'observed', note: 'my local observation' },
      serverPayload: { status: 'observed', note: 'teammate observation' },
    });
    mockList.mockResolvedValue([olosItem]);
    mockResolve.mockResolvedValue({
      storeKey: olosItem.storeKey,
      recordId: olosItem.recordId,
      rev: 5,
      payload: olosItem.serverPayload,
      resolutionStatus: 'resolved',
    });

    render(<SyncConflictsPage />);
    expect(await screen.findByText('ogden-olos-observation-records')).toBeTruthy();
    expect(screen.getByText(/my local observation/)).toBeTruthy();
    expect(screen.getByText(/teammate observation/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /keep server/i }));
    await waitFor(() =>
      expect(mockResolve).toHaveBeenCalledWith(olosItem, 'keep_server'),
    );
    await waitFor(() =>
      expect(screen.queryByText('ogden-olos-observation-records')).toBeNull(),
    );
  });

  it('shows an error surface when listing conflicts fails', async () => {
    mockList.mockRejectedValue(new Error('network down'));
    render(<SyncConflictsPage />);
    expect(await screen.findByText(/network down/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
  });
});

describe('SyncConflictsPage -- dropped changes (H2, deep-audit 2026-07-03)', () => {
  // A dropped op left the sync queue for good (MAX_RETRIES exhausted, or a
  // deterministic server rejection). The only remaining record is
  // connectivityStore.droppedStores — this page is the surface the header
  // pill links to, so it must list them with honest copy and a dismiss.
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    useConnectivityStore.setState({ droppedStores: [] });
  });
  afterEach(() => {
    cleanup();
    useConnectivityStore.setState({ droppedStores: [] });
  });

  it('renders no dropped-changes section when nothing was dropped', async () => {
    render(<SyncConflictsPage />);
    await screen.findByText(/No open conflicts/i);
    expect(screen.queryByText(/Dropped changes/i)).toBeNull();
  });

  it('lists each dropped op parsed from its storeType:action:localId key', async () => {
    useConnectivityStore.setState({
      droppedStores: ['zone:create:z1', 'action:update:a-2:b'],
    });
    render(<SyncConflictsPage />);
    expect(await screen.findByText(/Dropped changes/i)).toBeTruthy();
    expect(screen.getByText(/zone/)).toBeTruthy();
    expect(screen.getByText(/z1/)).toBeTruthy();
    // localId may itself contain ':' — everything after the second colon.
    expect(screen.getByText(/a-2:b/)).toBeTruthy();
    // Honest copy: kept on this device, will not retry by itself. Appears in
    // the section lede and again on each row — assert at least one.
    expect(screen.getAllByText(/kept on this device/i).length).toBeGreaterThan(0);
  });

  it('dismisses a dropped op via clearDroppedStore and removes its row', async () => {
    useConnectivityStore.setState({ droppedStores: ['zone:create:z1'] });
    render(<SyncConflictsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /dismiss/i }));
    expect(useConnectivityStore.getState().droppedStores).toEqual([]);
    await waitFor(() => expect(screen.queryByText(/z1/)).toBeNull());
  });
});
