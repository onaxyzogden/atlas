import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the modules that maybeCloneBuiltinsForDemo dynamically imports.
// vi.mock is hoisted so these intercept both static and dynamic imports.
const mockGetAuthState = vi.fn();
const mockGetProjectState = vi.fn();
const mockSetProjectState = vi.fn();
const mockSeedBuiltinObserveData = vi.fn();

vi.mock('../../store/authStore.js', () => ({
  useAuthStore: {
    getState: () => mockGetAuthState(),
  },
}));

vi.mock('../../store/projectStore.js', () => ({
  useProjectStore: {
    getState: () => mockGetProjectState(),
    setState: (updater: unknown) => mockSetProjectState(updater),
  },
}));

// Minimal localStorage shim for the node test environment.
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, val: string) => { localStorageStore[key] = val; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]); },
};
vi.stubGlobal('localStorage', localStorageMock);

vi.mock('../../data/builtinSampleObserveData.js', () => ({
  seedBuiltinObserveData: mockSeedBuiltinObserveData,
}));

import {
  DEMO_EMAIL_DOMAIN,
  makeGuestCredentials,
  isDemoUser,
  maybeBootDemoSession,
  maybeCloneBuiltinsForDemo,
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

// ---------------------------------------------------------------------------
// maybeCloneBuiltinsForDemo
// ---------------------------------------------------------------------------

const DEMO_USER: ApiAuthUser = {
  id: 'demo-uid',
  email: `guest-abc@${DEMO_EMAIL_DOMAIN}`,
  displayName: 'Guest Explorer',
  defaultOrgId: 'org1',
  emailVerified: false,
};

const REAL_USER: ApiAuthUser = {
  id: 'real-uid',
  email: 'yousef@ogden.ag',
  displayName: 'Yousef',
  defaultOrgId: 'org1',
  emailVerified: true,
};

const BUILTIN_HOUSE: { id: string; serverId: string; isBuiltin: boolean; name: string } = {
  id: 'local-house-id',
  serverId: '00000000-0000-0000-0000-0000005a3791',
  isBuiltin: true,
  name: '351 House -- Atlas Sample',
};

const BUILTIN_MTC: { id: string; serverId?: string; isBuiltin: boolean; name: string } = {
  id: 'mtc',
  isBuiltin: true,
  name: 'Moontrance Creek',
};

describe('maybeCloneBuiltinsForDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('no-ops when flag is off', async () => {
    await maybeCloneBuiltinsForDemo(false);
    expect(mockGetAuthState).not.toHaveBeenCalled();
  });

  it('no-ops when user is not a demo user', async () => {
    mockGetAuthState.mockReturnValue({ user: REAL_USER });
    mockGetProjectState.mockReturnValue({ projects: [BUILTIN_HOUSE], duplicateProject: vi.fn() });

    await maybeCloneBuiltinsForDemo(true);
    expect(mockGetProjectState).not.toHaveBeenCalled();
  });

  it('no-ops when no builtins are in the store yet', async () => {
    mockGetAuthState.mockReturnValue({ user: DEMO_USER });
    const dup = vi.fn();
    mockGetProjectState.mockReturnValue({ projects: [], duplicateProject: dup });

    await maybeCloneBuiltinsForDemo(true);
    expect(dup).not.toHaveBeenCalled();
    expect(localStorage.getItem(`demo-cloned-${DEMO_USER.id}`)).toBeNull();
  });

  it('clones both builtins, clears isBuiltin, seeds observe data, sets flag', async () => {
    mockGetAuthState.mockReturnValue({ user: DEMO_USER });

    const cloneHouse = { id: 'clone-house', isBuiltin: true, name: BUILTIN_HOUSE.name };
    const cloneMtc = { id: 'clone-mtc', isBuiltin: true, name: BUILTIN_MTC.name };
    const dup = vi.fn()
      .mockReturnValueOnce(cloneHouse)
      .mockReturnValueOnce(cloneMtc);

    mockGetProjectState.mockReturnValue({
      projects: [BUILTIN_HOUSE, BUILTIN_MTC],
      duplicateProject: dup,
    });

    await maybeCloneBuiltinsForDemo(true);

    // Both builtins duplicated
    expect(dup).toHaveBeenCalledTimes(2);
    expect(dup).toHaveBeenCalledWith(BUILTIN_HOUSE.id, BUILTIN_HOUSE.name);
    expect(dup).toHaveBeenCalledWith(BUILTIN_MTC.id, BUILTIN_MTC.name);

    // setState called to clear isBuiltin on each clone
    expect(mockSetProjectState).toHaveBeenCalledTimes(2);

    // Observe data seeded for each clone
    expect(mockSeedBuiltinObserveData).toHaveBeenCalledTimes(2);
    expect(mockSeedBuiltinObserveData).toHaveBeenCalledWith(cloneHouse.id);
    expect(mockSeedBuiltinObserveData).toHaveBeenCalledWith(cloneMtc.id);

    // Idempotency flag set
    expect(localStorage.getItem(`demo-cloned-${DEMO_USER.id}`)).toBe('1');
  });

  it('is idempotent — second call with flag already set does nothing', async () => {
    localStorage.setItem(`demo-cloned-${DEMO_USER.id}`, '1');
    mockGetAuthState.mockReturnValue({ user: DEMO_USER });
    mockGetProjectState.mockReturnValue({ projects: [BUILTIN_HOUSE], duplicateProject: vi.fn() });

    await maybeCloneBuiltinsForDemo(true);
    expect(mockGetProjectState).not.toHaveBeenCalled();
  });
});
