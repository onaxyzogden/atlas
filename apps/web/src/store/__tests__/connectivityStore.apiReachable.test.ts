/**
 * @vitest-environment happy-dom
 *
 * Locks the `apiReachable` reachability signal added for the global
 * API reachability surface (ApiReachabilityWatcher + ApiReachabilityStatus):
 * it toggles, and — critically — `setApiReachable`
 * is a no-op when the value is unchanged, so the apiClient success hook
 * (which fires on every successful response) never notifies subscribers
 * needlessly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useConnectivityStore } from '../connectivityStore';

beforeEach(() => {
  useConnectivityStore.setState({ apiReachable: true });
});

describe('connectivityStore.apiReachable', () => {
  it('defaults to true', () => {
    expect(useConnectivityStore.getState().apiReachable).toBe(true);
  });

  it('toggles via setApiReachable', () => {
    useConnectivityStore.getState().setApiReachable(false);
    expect(useConnectivityStore.getState().apiReachable).toBe(false);
    useConnectivityStore.getState().setApiReachable(true);
    expect(useConnectivityStore.getState().apiReachable).toBe(true);
  });

  it('does NOT notify subscribers when the value is unchanged', () => {
    const spy = vi.fn();
    const unsub = useConnectivityStore.subscribe(spy);

    // Already true → no-op, no notification.
    useConnectivityStore.getState().setApiReachable(true);
    expect(spy).not.toHaveBeenCalled();

    // Real change → exactly one notification.
    useConnectivityStore.getState().setApiReachable(false);
    expect(spy).toHaveBeenCalledTimes(1);

    // Same value again → still no further notification.
    useConnectivityStore.getState().setApiReachable(false);
    expect(spy).toHaveBeenCalledTimes(1);

    unsub();
  });
});
