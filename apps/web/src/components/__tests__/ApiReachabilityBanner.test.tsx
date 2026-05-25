/**
 * @vitest-environment happy-dom
 *
 * Locks the global ApiReachabilityBanner render priority + Retry wiring:
 *   - hidden when the API is reachable and the session is verified;
 *   - boot-specific copy when sessionUnverified (highest priority);
 *   - API-unreachable copy when !apiReachable;
 *   - Retry re-runs initFromStorage when a token is present.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';

import ApiReachabilityBanner from '../ApiReachabilityBanner';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';

beforeEach(() => {
  useConnectivityStore.setState({ apiReachable: true });
  useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ApiReachabilityBanner', () => {
  it('renders nothing when reachable and session is verified', () => {
    render(<ApiReachabilityBanner />);
    expect(screen.queryByTestId('api-reachability-banner')).toBeNull();
  });

  it('shows the boot-specific message when sessionUnverified', () => {
    useAuthStore.setState({ token: 'tok', user: null, sessionUnverified: true });
    render(<ApiReachabilityBanner />);

    const banner = screen.getByTestId('api-reachability-banner');
    expect(banner.textContent).toContain('verify your saved session');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('shows the API-unreachable message when !apiReachable', () => {
    useConnectivityStore.setState({ apiReachable: false });
    render(<ApiReachabilityBanner />);

    const banner = screen.getByTestId('api-reachability-banner');
    expect(banner.textContent).toContain('reach the server');
  });

  it('prioritises the sessionUnverified message over the unreachable one', () => {
    useConnectivityStore.setState({ apiReachable: false });
    useAuthStore.setState({ token: 'tok', user: null, sessionUnverified: true });
    render(<ApiReachabilityBanner />);

    expect(screen.getByTestId('api-reachability-banner').textContent).toContain(
      'verify your saved session',
    );
  });

  it('Retry re-runs initFromStorage when a token is present', async () => {
    const initSpy = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ token: 'tok', user: null, sessionUnverified: true, initFromStorage: initSpy });

    render(<ApiReachabilityBanner />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });

    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('no-token Retry pings api.health and flips apiReachable on success', async () => {
    useConnectivityStore.setState({ apiReachable: false });
    useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
    const healthSpy = vi.spyOn(api, 'health').mockResolvedValue({
      data: { status: 'ok', timestamp: 't', version: '0.1.0' },
      error: null,
    });

    render(<ApiReachabilityBanner />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });

    expect(healthSpy).toHaveBeenCalledTimes(1);
    expect(useConnectivityStore.getState().apiReachable).toBe(true);
    // Banner clears once reachability flips back.
    expect(screen.queryByTestId('api-reachability-banner')).toBeNull();
  });

  it('no-token Retry keeps the banner up when the health ping fails', async () => {
    useConnectivityStore.setState({ apiReachable: false });
    useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
    vi.spyOn(api, 'health').mockRejectedValue(new TypeError('Failed to fetch'));

    render(<ApiReachabilityBanner />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });

    expect(useConnectivityStore.getState().apiReachable).toBe(false);
    expect(screen.getByTestId('api-reachability-banner')).toBeTruthy();
  });
});
