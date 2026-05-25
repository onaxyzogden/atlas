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

  // Background self-heal poll: clears the banner without any user action when the
  // server recovers. Fake timers are scoped to this block so the real-timer tests
  // above are unaffected.
  describe('self-heal poll', () => {
    const okHealth = () =>
      vi.spyOn(api, 'health').mockResolvedValue({
        data: { status: 'ok', timestamp: 't', version: '0.1.0' },
        error: null,
      });

    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
      // Reset DOM env overrides to their defaults. We use Object.defineProperty
      // (not vi.spyOn) for visibilityState/onLine because restoring a spied
      // prototype getter corrupts it into a self-recursive one, blowing the stack
      // in the next test that reads it.
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    });

    it('pings api.health on the interval while unreachable and clears on success', async () => {
      useConnectivityStore.setState({ apiReachable: false });
      useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
      const healthSpy = okHealth();

      render(<ApiReachabilityBanner />);
      expect(screen.getByTestId('api-reachability-banner')).toBeTruthy();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });

      expect(healthSpy).toHaveBeenCalledTimes(1);
      expect(useConnectivityStore.getState().apiReachable).toBe(true);
      expect(screen.queryByTestId('api-reachability-banner')).toBeNull();
    });

    it('stops polling after recovery (no further pings)', async () => {
      useConnectivityStore.setState({ apiReachable: false });
      useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
      const healthSpy = okHealth();

      render(<ApiReachabilityBanner />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(healthSpy).toHaveBeenCalledTimes(1);

      // Banner cleared → poll effect torn down → a later interval fires nothing.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(healthSpy).toHaveBeenCalledTimes(1);
    });

    it('does not poll while healthy (banner hidden)', async () => {
      const healthSpy = okHealth();

      render(<ApiReachabilityBanner />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });

      expect(healthSpy).not.toHaveBeenCalled();
    });

    it('re-checks immediately when the tab regains focus', async () => {
      useConnectivityStore.setState({ apiReachable: false });
      useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
      const healthSpy = okHealth();

      render(<ApiReachabilityBanner />);
      // Fire visibilitychange well before the 15s tick — happy-dom defaults
      // visibilityState to 'visible', so the handler pings right away.
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(healthSpy).toHaveBeenCalledTimes(1);
    });

    it('skips the interval ping while the tab is hidden', async () => {
      useConnectivityStore.setState({ apiReachable: false });
      useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
      const healthSpy = okHealth();
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });

      render(<ApiReachabilityBanner />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });

      expect(healthSpy).not.toHaveBeenCalled();
    });

    it('skips the interval ping while the device is offline', async () => {
      useConnectivityStore.setState({ apiReachable: false });
      useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
      const healthSpy = okHealth();
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

      render(<ApiReachabilityBanner />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });

      expect(healthSpy).not.toHaveBeenCalled();
    });

    it('clears the interval on unmount (no ping afterwards)', async () => {
      useConnectivityStore.setState({ apiReachable: false });
      useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
      const healthSpy = okHealth();

      const { unmount } = render(<ApiReachabilityBanner />);
      unmount();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(healthSpy).not.toHaveBeenCalled();
    });
  });
});
