/**
 * @vitest-environment happy-dom
 *
 * Locks the ApiReachabilityStatus header chip — render priority + Retry wiring:
 *   - hidden when the API is reachable and the session is verified;
 *   - boot-specific copy (in `title`) when sessionUnverified (highest priority);
 *   - API-unreachable copy (in `title`) when !apiReachable;
 *   - short label in the chip body; full message in the `title`;
 *   - Retry runs the shared attemptApiRecovery (initFromStorage with a token;
 *     api.health + flip on the no-token path).
 *
 * The self-heal effects (online listener + poll) live in ApiReachabilityWatcher
 * and are covered by ApiReachabilityWatcher.test.tsx.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';

// lucide-react forwardRef icons crash on re-render under React 18 + happy-dom;
// stub them with a plain svg (the established workaround across this suite).
vi.mock('lucide-react', () => ({
  CloudOff: (props: Record<string, unknown>) => <svg data-icon="cloud-off" {...props} />,
}));

import ApiReachabilityStatus from '../ApiReachabilityStatus';
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

describe('ApiReachabilityStatus', () => {
  it('renders nothing when reachable and session is verified', () => {
    render(<ApiReachabilityStatus />);
    expect(screen.queryByTestId('api-reachability-status')).toBeNull();
  });

  it('shows the boot-specific message (title) when sessionUnverified', () => {
    useAuthStore.setState({ token: 'tok', user: null, sessionUnverified: true });
    render(<ApiReachabilityStatus />);

    const chip = screen.getByTestId('api-reachability-status');
    expect(chip.getAttribute('title')).toContain('verify your saved session');
    expect(chip.textContent).toContain('Server unreachable');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('shows the API-unreachable message (title) when !apiReachable', () => {
    useConnectivityStore.setState({ apiReachable: false });
    render(<ApiReachabilityStatus />);

    const chip = screen.getByTestId('api-reachability-status');
    expect(chip.getAttribute('title')).toContain('reach the server');
  });

  it('prioritises the sessionUnverified message over the unreachable one', () => {
    useConnectivityStore.setState({ apiReachable: false });
    useAuthStore.setState({ token: 'tok', user: null, sessionUnverified: true });
    render(<ApiReachabilityStatus />);

    expect(
      screen.getByTestId('api-reachability-status').getAttribute('title'),
    ).toContain('verify your saved session');
  });

  it('Retry re-runs initFromStorage when a token is present', async () => {
    const initSpy = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ token: 'tok', user: null, sessionUnverified: true, initFromStorage: initSpy });

    render(<ApiReachabilityStatus />);
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

    render(<ApiReachabilityStatus />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });

    expect(healthSpy).toHaveBeenCalledTimes(1);
    expect(useConnectivityStore.getState().apiReachable).toBe(true);
    // Chip clears once reachability flips back.
    expect(screen.queryByTestId('api-reachability-status')).toBeNull();
  });

  it('no-token Retry keeps the chip up when the health ping fails', async () => {
    useConnectivityStore.setState({ apiReachable: false });
    useAuthStore.setState({ token: null, user: null, sessionUnverified: false });
    vi.spyOn(api, 'health').mockRejectedValue(new TypeError('Failed to fetch'));

    render(<ApiReachabilityStatus />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });

    expect(useConnectivityStore.getState().apiReachable).toBe(false);
    expect(screen.getByTestId('api-reachability-status')).toBeTruthy();
  });
});
