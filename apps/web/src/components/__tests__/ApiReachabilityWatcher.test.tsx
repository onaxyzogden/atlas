/**
 * @vitest-environment happy-dom
 *
 * Locks the headless ApiReachabilityWatcher self-heal machinery (it renders
 * null, so assertions read store state + the api.health spy, not the DOM):
 *   - the `online` event triggers recovery only while a problem is showing;
 *   - the background poll pings api.health on the interval while unreachable and
 *     clears the flag on success, then tears down (no further pings);
 *   - no poll while healthy; immediate re-check on tab focus; skipped while the
 *     tab is hidden or the device is offline; interval cleared on unmount.
 *
 * The visible chip + Retry wiring live in ApiReachabilityStatus and are covered
 * by ApiReachabilityStatus.test.tsx.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

import ApiReachabilityWatcher from '../ApiReachabilityWatcher';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/apiClient';

const okHealth = () =>
  vi.spyOn(api, 'health').mockResolvedValue({
    data: { status: 'ok', timestamp: 't', version: '0.1.0' },
    error: null,
  });

beforeEach(() => {
  useConnectivityStore.setState({ apiReachable: true });
  useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ApiReachabilityWatcher — online listener', () => {
  it('attempts recovery on the online event while a problem is showing', async () => {
    useConnectivityStore.setState({ apiReachable: false });
    const healthSpy = okHealth();

    render(<ApiReachabilityWatcher />);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(healthSpy).toHaveBeenCalledTimes(1);
    expect(useConnectivityStore.getState().apiReachable).toBe(true);
  });

  it('ignores the online event while healthy', async () => {
    const healthSpy = okHealth();

    render(<ApiReachabilityWatcher />);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(healthSpy).not.toHaveBeenCalled();
  });
});

describe('ApiReachabilityWatcher — self-heal poll', () => {
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
    const healthSpy = okHealth();

    render(<ApiReachabilityWatcher />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(healthSpy).toHaveBeenCalledTimes(1);
    expect(useConnectivityStore.getState().apiReachable).toBe(true);
  });

  it('stops polling after recovery (no further pings)', async () => {
    useConnectivityStore.setState({ apiReachable: false });
    const healthSpy = okHealth();

    render(<ApiReachabilityWatcher />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(healthSpy).toHaveBeenCalledTimes(1);

    // Flag cleared → visible false → poll effect torn down → a later interval
    // fires nothing.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(healthSpy).toHaveBeenCalledTimes(1);
  });

  it('does not poll while healthy', async () => {
    const healthSpy = okHealth();

    render(<ApiReachabilityWatcher />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(healthSpy).not.toHaveBeenCalled();
  });

  it('re-checks immediately when the tab regains focus', async () => {
    useConnectivityStore.setState({ apiReachable: false });
    const healthSpy = okHealth();

    render(<ApiReachabilityWatcher />);
    // Fire visibilitychange well before the 15s tick — happy-dom defaults
    // visibilityState to 'visible', so the handler pings right away.
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(healthSpy).toHaveBeenCalledTimes(1);
  });

  it('skips the interval ping while the tab is hidden', async () => {
    useConnectivityStore.setState({ apiReachable: false });
    const healthSpy = okHealth();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });

    render(<ApiReachabilityWatcher />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(healthSpy).not.toHaveBeenCalled();
  });

  it('skips the interval ping while the device is offline', async () => {
    useConnectivityStore.setState({ apiReachable: false });
    const healthSpy = okHealth();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

    render(<ApiReachabilityWatcher />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(healthSpy).not.toHaveBeenCalled();
  });

  it('clears the interval on unmount (no ping afterwards)', async () => {
    useConnectivityStore.setState({ apiReachable: false });
    const healthSpy = okHealth();

    const { unmount } = render(<ApiReachabilityWatcher />);
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(healthSpy).not.toHaveBeenCalled();
  });
});
