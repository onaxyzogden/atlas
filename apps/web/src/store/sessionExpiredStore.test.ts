/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionExpiredStore } from './sessionExpiredStore.js';
import { useAuthStore } from './authStore.js';
import { setAuthToken } from '../lib/apiClient.js';

describe('sessionExpiredStore', () => {
  beforeEach(() => {
    useSessionExpiredStore.setState({ isExpired: false });
    useAuthStore.setState({
      token: 'fake-token',
      user: { id: 'u1', email: 'u@x', displayName: null },
      error: null,
    });
    setAuthToken('fake-token');
    localStorage.clear();
  });

  it('trigger() flips isExpired=true and clears authStore.token', () => {
    useSessionExpiredStore.getState().trigger();
    expect(useSessionExpiredStore.getState().isExpired).toBe(true);
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('trigger() is idempotent while already expired', () => {
    useSessionExpiredStore.getState().trigger();
    useAuthStore.setState({ token: 'should-not-be-cleared-again' });
    useSessionExpiredStore.getState().trigger();
    expect(useAuthStore.getState().token).toBe('should-not-be-cleared-again');
  });

  it('dismiss() re-arms — a subsequent trigger() fires again', () => {
    useSessionExpiredStore.getState().trigger();
    useSessionExpiredStore.getState().dismiss();
    expect(useSessionExpiredStore.getState().isExpired).toBe(false);

    useAuthStore.setState({ token: 'fake-token-2' });
    useSessionExpiredStore.getState().trigger();
    expect(useSessionExpiredStore.getState().isExpired).toBe(true);
    expect(useAuthStore.getState().token).toBeNull();
  });
});
