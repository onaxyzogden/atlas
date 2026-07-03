/**
 * @vitest-environment happy-dom
 *
 * WorkConflictSection — the pinned "Needs your decision" section of the Act
 * work panel (ADR 2026-06-12-atlas-work-items-typed-record-transport).
 *
 * Pins:
 *   - Renders NOTHING when there are no `ogden-work-items` conflicts —
 *     including when other stores have conflicts (those stay on the
 *     toasts → /conflicts path).
 *   - A work-item conflict row shows the item title and a yours-vs-server
 *     summary (due date + status) — the operator decides in-panel, where the
 *     schedule lives, without decoding raw payloads.
 *   - Keep mine / Keep server resolve through `resolveRecordConflict` with
 *     the matching choice and remove the row; nothing else is written from
 *     here (the seam owns convergence).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { ConflictListItem } from '@ogden/shared';

const { listMock, resolveMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  resolveMock: vi.fn(),
}));
vi.mock('../../../../../lib/syncService.js', () => ({
  listRecordConflicts: listMock,
  resolveRecordConflict: resolveMock,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import WorkConflictSection from '../WorkConflictSection.js';

function conflict(over: Partial<ConflictListItem> = {}): ConflictListItem {
  return {
    syncLogId: 'log-1',
    failedRecordId: 'fr-1',
    storeKey: 'ogden-work-items',
    recordId: 'lvw__lvp__husbandry__welfare-weekly__2026-06-15',
    localPayload: {
      id: 'lvw__lvp__husbandry__welfare-weekly__2026-06-15',
      title: 'Weekly welfare & condition check',
      status: 'todo',
      scheduledEnd: '2026-06-15T00:00:00.000Z',
    },
    serverPayload: {
      id: 'lvw__lvp__husbandry__welfare-weekly__2026-06-15',
      title: 'Weekly welfare & condition check',
      status: 'done',
      scheduledEnd: '2026-06-18T00:00:00.000Z',
    },
    localRev: 3,
    serverRev: 5,
    observedAtLocal: '2026-06-12T08:00:00.000Z',
    observedAtServer: '2026-06-12T09:00:00.000Z',
    detectedAt: '2026-06-12T09:00:01.000Z',
    ...over,
  } as ConflictListItem;
}

beforeEach(() => {
  listMock.mockReset();
  resolveMock.mockReset();
  resolveMock.mockResolvedValue({ storeKey: 'ogden-work-items' });
});

describe('WorkConflictSection', () => {
  it('renders nothing when there are no conflicts', async () => {
    listMock.mockResolvedValue([]);
    render(<WorkConflictSection />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(screen.queryByTestId('work-conflict-section')).toBeNull();
  });

  it('renders nothing when only OTHER stores have conflicts', async () => {
    listMock.mockResolvedValue([
      conflict({ storeKey: 'ogden-field-actions', syncLogId: 'log-x' }),
    ]);
    render(<WorkConflictSection />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(screen.queryByTestId('work-conflict-section')).toBeNull();
  });

  it('shows a work-item conflict with title + yours-vs-server due/status summary', async () => {
    listMock.mockResolvedValue([
      conflict(),
      conflict({ storeKey: 'ogden-hazards', syncLogId: 'log-other' }),
    ]);
    render(<WorkConflictSection />);

    const section = await screen.findByTestId('work-conflict-section');
    expect(section.textContent).toContain('Needs your decision (1)');
    expect(screen.getAllByTestId('work-conflict-row')).toHaveLength(1);
    expect(section.textContent).toContain('Weekly welfare & condition check');
    expect(section.textContent).toContain('Yours: due 2026-06-15 · todo');
    expect(section.textContent).toContain('Server: due 2026-06-18 · done');
    // Escape hatch to the full side-by-side diff page.
    expect(section.querySelector('a[href="/conflicts"]')).not.toBeNull();
  });

  it('Keep mine resolves with keep_mine and removes the row', async () => {
    const item = conflict();
    listMock.mockResolvedValue([item]);
    render(<WorkConflictSection />);
    await screen.findByTestId('work-conflict-row');

    fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }));

    await waitFor(() => expect(resolveMock).toHaveBeenCalledTimes(1));
    expect(resolveMock.mock.calls[0]![0].syncLogId).toBe(item.syncLogId);
    expect(resolveMock.mock.calls[0]![1]).toBe('keep_mine');
    await waitFor(() =>
      expect(screen.queryByTestId('work-conflict-section')).toBeNull(),
    );
  });

  it('Keep server resolves with keep_server', async () => {
    listMock.mockResolvedValue([conflict()]);
    render(<WorkConflictSection />);
    await screen.findByTestId('work-conflict-row');

    fireEvent.click(screen.getByRole('button', { name: 'Keep server' }));

    await waitFor(() => expect(resolveMock).toHaveBeenCalledTimes(1));
    expect(resolveMock.mock.calls[0]![1]).toBe('keep_server');
  });

  it('falls back to the server title, then the record id, when a side is missing', async () => {
    listMock.mockResolvedValue([
      conflict({
        syncLogId: 'log-del',
        localPayload: null,
        serverPayload: { title: 'Fence integrity check', status: 'todo' },
      }),
    ]);
    render(<WorkConflictSection />);

    const section = await screen.findByTestId('work-conflict-section');
    expect(section.textContent).toContain('Fence integrity check');
    expect(section.textContent).toContain('Yours: no copy');
  });
});
