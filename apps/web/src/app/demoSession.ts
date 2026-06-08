/**
 * Demo-mode session helper.
 *
 * On the live test deployment the login gate is disabled (the real login is not
 * working yet, and a sign-in wall makes the product look more "ready" than it
 * is). Instead of removing the gate — which would drop visitors into an app that
 * 401s on every protected route — demo mode silently provisions a real,
 * working session per visitor by auto-registering a unique throwaway account on
 * boot (see `bootAuth` in ./bootAuthed.ts). This requires NO change to the
 * backend auth middleware: registration is already open and returns a JWT.
 *
 * Gated entirely behind the build-time flag FEATURE_DEMO_MODE — off everywhere
 * except the live build. With the flag off, behaviour is unchanged.
 */

import type { ApiAuthUser } from '../lib/apiClient.js';

/**
 * True only when the build was produced with FEATURE_DEMO_MODE=true. Vite's
 * `define` replaces `process.env.FEATURE_DEMO_MODE` with a literal string at
 * build time (see vite.config.ts); in Node/test it reads the real env var.
 */
export const DEMO_MODE_ENABLED = process.env.FEATURE_DEMO_MODE === 'true';

/**
 * Domain stamped onto auto-provisioned guest accounts. Lets us recognise a demo
 * session after the fact (isDemoUser) and keeps these addresses visibly
 * non-real / non-deliverable.
 */
export const DEMO_EMAIL_DOMAIN = 'demo.ogden.ag';

export interface GuestCredentials {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Build a unique throwaway identity for an auto-registered demo session. The
 * UUID makes email collisions effectively impossible; the password comfortably
 * clears the register endpoint's 8-char minimum.
 */
export function makeGuestCredentials(): GuestCredentials {
  const id = crypto.randomUUID();
  return {
    email: `guest-${id}@${DEMO_EMAIL_DOMAIN}`,
    // Random, never shown to or reused by the visitor — only needs to satisfy
    // the register schema (min 8 chars). A second UUID is ample entropy.
    password: `Demo-${crypto.randomUUID()}`,
    displayName: 'Guest Explorer',
  };
}

/** True when the signed-in user is an auto-provisioned demo guest. */
export function isDemoUser(user: ApiAuthUser | null | undefined): boolean {
  return Boolean(user?.email?.endsWith(`@${DEMO_EMAIL_DOMAIN}`));
}

export interface DemoBootDeps {
  /** Current session token (null when logged out). */
  getToken: () => string | null;
  /** Auth-store register action — persists the JWT on success. */
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  /** Override the build flag (tests). Defaults to DEMO_MODE_ENABLED. */
  enabled?: boolean;
  /** Bound on the register call so a slow/hung API never blocks boot. */
  timeoutMs?: number;
}

/**
 * If demo mode is on and there's no session, auto-register a throwaway guest so
 * the visitor lands in a working app. No-op when disabled or already signed in.
 * Never throws — a failed/unreachable API resolves false and boot falls through
 * to the normal landing/login. Returns true only when a guest session was
 * provisioned (or the register call won the race against the timeout).
 */
export async function maybeBootDemoSession(deps: DemoBootDeps): Promise<boolean> {
  const enabled = deps.enabled ?? DEMO_MODE_ENABLED;
  if (!enabled || deps.getToken()) return false;
  try {
    const guest = makeGuestCredentials();
    const register = deps.register(guest.email, guest.password, guest.displayName);
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, deps.timeoutMs ?? 1500));
    await Promise.race([register, timeout]);
    return Boolean(deps.getToken());
  } catch {
    return false;
  }
}

// Server UUID for the "351 House -- Atlas Sample" builtin project (migration 017).
const SAMPLE_PROJECT_SERVER_ID = '00000000-0000-0000-0000-0000005a3791';
// localStorage key prefix — one entry per demo user (keyed by user.id).
const DEMO_CLONE_FLAG = 'demo-cloned-';

/**
 * For demo users: clone each builtin project into an editable personal copy,
 * seed observe data on the clone, then mark done in localStorage so this is
 * idempotent across page reloads.
 *
 * Called from two sites to survive the boot race between hydrateBuiltins and
 * maybeBootDemoSession (see bootAuthed.ts and projectStore.ts):
 *  1. End of hydrateBuiltins() (dynamic import from projectStore.ts)
 *  2. After maybeBootDemoSession() resolves in bootAuthed.ts (fallback)
 *
 * No-ops when: demo mode off, user not a demo user, builtins not yet in
 * store, or cloning already done (localStorage flag).
 */
/**
 * Override the build flag — for tests only. When omitted, the production
 * build-time constant DEMO_MODE_ENABLED governs.
 */
export async function maybeCloneBuiltinsForDemo(
  _enabled = DEMO_MODE_ENABLED,
): Promise<void> {
  if (!_enabled) return;

  // Dynamic imports avoid a static circular dep:
  // projectStore.ts calls this function via dynamic import, so
  // demoSession.ts must not statically import projectStore.ts.
  const [
    { useAuthStore },
    { useProjectStore },
    { seedBuiltinObserveData },
  ] = await Promise.all([
    import('../store/authStore.js'),
    import('../store/projectStore.js'),
    import('../data/builtinSampleObserveData.js'),
  ]);

  const user = useAuthStore.getState().user;
  if (!isDemoUser(user) || !user) return;

  const flagKey = DEMO_CLONE_FLAG + user.id;
  if (localStorage.getItem(flagKey)) return;

  const { projects, duplicateProject } = useProjectStore.getState();

  const house351 = projects.find((p) => p.serverId === SAMPLE_PROJECT_SERVER_ID);
  const mtc = projects.find((p) => p.id === 'mtc');

  // If neither builtin is in the store yet, bail — the other trigger will retry.
  if (!house351 && !mtc) return;

  for (const builtin of ([house351, mtc] as const).filter(Boolean)) {
    const clone = duplicateProject(builtin!.id, builtin!.name);
    if (!clone) continue;

    // duplicateProject spreads ...rest which carries isBuiltin: true from source.
    // Clear it so RBAC treats the clone as a normal editable project.
    useProjectStore.setState((s) => ({
      projects: s.projects.map((p) =>
        p.id === clone.id ? { ...p, isBuiltin: undefined } : p,
      ),
    }));

    // Seed rich observe data so demo users start with explore-stage content.
    seedBuiltinObserveData(clone.id);
  }

  localStorage.setItem(flagKey, '1');
}
