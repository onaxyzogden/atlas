import { describe, it, expect, vi } from 'vitest';

import {
  DEMO_EMAIL_DOMAIN,
  makeGuestCredentials,
  isDemoUser,
  maybeBootDemoSession,
} from '../demoSession';
import type { ApiAuthUser } from '../../lib/apiClient';

const guestUser = (email: string): ApiAuthUser => ({
  id: 'u1',
  email,
  displayName: 'Guest Explorer',
  defaultOrgId: 'org1',
  emailVerified: false,
});

describe('makeGuestCredentials', () => {
  it('produces a unique throwaway email on the demo domain', () => {
    const a = makeGuestCredentials();
    const b = makeGuestCredentials();
    expect(a.email).toMatch(new RegExp(`^guest-.+@${DEMO_EMAIL_DOMAIN}$`));
    expect(a.email).not.toBe(b.email);
  });

  it('generates a password that clears the 8-char register minimum', () => {
    expect(makeGuestCredentials().password.length).toBeGreaterThanOrEqual(8);
  });

  it('sets a friendly display name', () => {
    expect(makeGuestCredentials().displayName).toBe('Guest Explorer');
  });
});

describe('isDemoUser', () => {
  it('is true for an auto-provisioned guest', () => {
    expect(isDemoUser(guestUser(`guest-abc@${DEMO_EMAIL_DOMAIN}`))).toBe(true);
  });

  it('is false for a real account', () => {
    expect(isDemoUser(guestUser('yousef@ogden.ag'))).toBe(false);
  });

  it('is false for null/undefined', () => {
    expect(isDemoUser(null)).toBe(false);
    expect(isDemoUser(undefined)).toBe(false);
  });
});

describe('maybeBootDemoSession', () => {
  it('registers a guest when enabled and no token exists', async () => {
    let token: string | null = null;
    const register = vi.fn(
      (_email: string, _password: string, _displayName?: string): Promise<void> => {
        token = 'fresh-jwt';
        return Promise.resolve();
      },
    );

    const provisioned = await maybeBootDemoSession({
      enabled: true,
      getToken: () => token,
      register,
    });

    expect(register).toHaveBeenCalledTimes(1);
    expect(provisioned).toBe(true);
    // Throwaway identity, not real credentials.
    const [email, password] = register.mock.calls[0]!;
    expect(email).toContain(`@${DEMO_EMAIL_DOMAIN}`);
    expect(password.length).toBeGreaterThanOrEqual(8);
  });

  it('does nothing when disabled', async () => {
    const register = vi.fn(async () => {});
    const provisioned = await maybeBootDemoSession({
      enabled: false,
      getToken: () => null,
      register,
    });
    expect(register).not.toHaveBeenCalled();
    expect(provisioned).toBe(false);
  });

  it('does nothing when a token already exists (real/returning user)', async () => {
    const register = vi.fn(async () => {});
    const provisioned = await maybeBootDemoSession({
      enabled: true,
      getToken: () => 'existing-token',
      register,
    });
    expect(register).not.toHaveBeenCalled();
    expect(provisioned).toBe(false);
  });

  it('swallows a register failure and resolves false (boot is never blocked)', async () => {
    const register = vi.fn(async () => {
      throw new Error('API down');
    });
    const provisioned = await maybeBootDemoSession({
      enabled: true,
      getToken: () => null,
      register,
    });
    expect(provisioned).toBe(false);
  });

  it('does not hang when register never settles (bounded by timeout)', async () => {
    const register = vi.fn(() => new Promise<void>(() => {})); // never resolves
    const provisioned = await maybeBootDemoSession({
      enabled: true,
      getToken: () => null,
      register,
      timeoutMs: 10,
    });
    // Timeout won the race; no token was set.
    expect(provisioned).toBe(false);
  });
});
