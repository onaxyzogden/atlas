/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SessionExpiredBanner from './SessionExpiredBanner.js';
import { useSessionExpiredStore } from '../store/sessionExpiredStore.js';
import { useAuthStore } from '../store/authStore.js';

describe('SessionExpiredBanner', () => {
  beforeEach(() => {
    useSessionExpiredStore.setState({ isExpired: false });
    useAuthStore.setState({
      token: 'tok',
      user: { id: 'u', email: 'a@b', displayName: null, defaultOrgId: 'org-1', emailVerified: true },
      error: null,
    });
  });
  afterEach(() => cleanup());

  it('renders nothing when not expired', () => {
    render(<SessionExpiredBanner />);
    expect(screen.queryByTestId('session-expired-banner')).toBeNull();
  });

  it('renders banner with Sign-in link carrying return path when triggered', () => {
    window.history.pushState({}, '', '/v3/project/mtc/plan');
    useSessionExpiredStore.getState().trigger();
    render(<SessionExpiredBanner />);
    const link = screen.getByText('Sign in again') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain('return=');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('/v3/project/mtc/plan');
  });

  it('Dismiss hides the banner', () => {
    useSessionExpiredStore.getState().trigger();
    const { rerender } = render(<SessionExpiredBanner />);
    expect(screen.getByTestId('session-expired-banner')).toBeTruthy();
    useSessionExpiredStore.getState().dismiss();
    rerender(<SessionExpiredBanner />);
    expect(screen.queryByTestId('session-expired-banner')).toBeNull();
  });
});
