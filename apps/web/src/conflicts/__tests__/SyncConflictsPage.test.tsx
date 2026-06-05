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
