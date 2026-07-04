/**
 * @vitest-environment happy-dom
 *
 * ProofSyncIndicator — header sync pill (H2, deep-audit 2026-07-03).
 *
 * A dropped op (sync queue gave up after MAX_RETRIES, or the server rejected
 * the write deterministically) leaves the queue, so `pendingChanges` returns
 * to 0 — before this fix the pill rendered "All synced" while a write was
 * silently lost. The pill must surface `droppedStores` as a persistent error
 * state that OUTRANKS every other branch and links to /conflicts (the only
 * mounted surface that can show the dropped ops; the OfflineBanner that used
 * to badge them was unmounted in 4895b07d).
 */
import { render, cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// <Link> needs a RouterProvider; stub it to a plain anchor for unit isolation.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

// lucide-react forwardRef icons crash on re-render under React 18 + happy-dom;
// stub them with a plain svg (the established workaround across this suite).
import { buildLucideStub } from '../../test/lucideStub.js';
vi.mock('lucide-react', async (importOriginal) =>
  buildLucideStub(await importOriginal<Record<string, unknown>>()),
);

import ProofSyncIndicator from '../ProofSyncIndicator.js';
import { useConnectivityStore } from '../../store/connectivityStore.js';

beforeEach(() => {
  useConnectivityStore.setState({
    isOnline: true,
    pendingChanges: 0,
    syncStatus: 'idle',
    droppedStores: [],
  });
});

afterEach(() => {
  cleanup();
});

describe('ProofSyncIndicator', () => {
  it('renders "All synced" as a plain (non-link) pill when nothing is dropped', () => {
    render(<ProofSyncIndicator />);
    const pill = screen.getByTestId('proof-sync-indicator');
    expect(pill.textContent).toContain('All synced');
    expect(pill.closest('a')).toBeNull();
  });

  it('shows pending uploads when the queue has work and nothing is dropped', () => {
    useConnectivityStore.setState({ pendingChanges: 2 });
    render(<ProofSyncIndicator />);
    expect(screen.getByTestId('proof-sync-indicator').textContent).toContain(
      '2 pending uploads',
    );
  });

  it('surfaces a dropped op as an unsaved-change pill linking to /conflicts', () => {
    useConnectivityStore.setState({ droppedStores: ['zone:create:z1'] });
    render(<ProofSyncIndicator />);
    const pill = screen.getByTestId('proof-sync-indicator');
    expect(pill.textContent).toContain('1 unsaved change');
    expect(pill.getAttribute('data-dropped')).toBe('true');
    const link = pill.closest('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/conflicts');
  });

  it('dropped ops outrank every other state — never masked by syncing or "All synced"', () => {
    useConnectivityStore.setState({
      droppedStores: ['zone:create:z1', 'action:update:a2'],
      pendingChanges: 3,
      syncStatus: 'syncing',
    });
    render(<ProofSyncIndicator />);
    const pill = screen.getByTestId('proof-sync-indicator');
    expect(pill.textContent).toContain('2 unsaved changes');
    expect(pill.textContent).not.toContain('Syncing');
    expect(pill.textContent).not.toContain('All synced');
  });
});
