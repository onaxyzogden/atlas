/**
 * @vitest-environment happy-dom
 *
 * OfflineBanner conflict surface (Phase 5):
 *   - Renders a conflict bar listing every conflicted store when online.
 *   - Conflict takes precedence over the offline state (highest severity).
 *   - Dismiss calls clearConflictedStore and the chip disappears.
 *   - Stays hidden when online, no pending, no conflicts (regression lock).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OfflineBanner from '../OfflineBanner.js';
import { useConnectivityStore } from '../../store/connectivityStore.js';

beforeEach(() => {
  useConnectivityStore.setState({
    isOnline: true,
    syncStatus: 'idle',
    pendingChanges: 0,
    conflictedStores: [],
  });
});

describe('OfflineBanner — conflict surface', () => {
  it('lists every conflicted store with an alert role when online', () => {
    useConnectivityStore.setState({
      conflictedStores: ['ogden-vision', 'ogden-hazards'],
    });
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/ogden-vision/)).toBeTruthy();
    expect(screen.getByText(/ogden-hazards/)).toBeTruthy();
    expect(screen.getByText(/local copy is kept/i)).toBeTruthy();
  });

  it('shows the conflict bar even when offline (conflict wins)', () => {
    useConnectivityStore.setState({
      isOnline: false,
      conflictedStores: ['ogden-paths'],
    });
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/ogden-paths/)).toBeTruthy();
  });

  it('dismissing a store clears it and removes the chip', () => {
    useConnectivityStore.setState({ conflictedStores: ['ogden-vision'] });
    render(<OfflineBanner />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss ogden-vision/i }));
    expect(useConnectivityStore.getState().conflictedStores).toEqual([]);
    expect(screen.queryByText(/ogden-vision/)).toBeNull();
  });

  it('renders nothing when online, no pending, no conflicts', () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });
});
