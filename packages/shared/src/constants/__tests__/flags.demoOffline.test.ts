/**
 * H3 (deep-audit 2026-07-03): the offline demo depends on the builtin sample
 * seeds — the guest tour auto-opens against the homestead clone, which only
 * exists if the builtins seeded. The clean-slate gate (FLAGS.SEED_SAMPLES,
 * default OFF) must therefore never evaluate OFF in a FEATURE_DEMO_OFFLINE
 * build, or the first demo refresh after the gate lands strands the tour
 * (empty portfolio, hollow 9-step tour).
 *
 * flags.ts reads process.env at module-evaluation time, so each case stubs
 * the env, resets the module registry, and imports fresh.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('FLAGS.SEED_SAMPLES × FEATURE_DEMO_OFFLINE (H3)', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stays false when neither env var is set', async () => {
    vi.stubEnv('FEATURE_SEED_SAMPLES', '');
    vi.stubEnv('FEATURE_DEMO_OFFLINE', '');
    const { FLAGS } = await import('../flags.js');
    expect(FLAGS.SEED_SAMPLES).toBe(false);
  });

  it('turns on via FEATURE_SEED_SAMPLES=true (the explicit switch)', async () => {
    vi.stubEnv('FEATURE_SEED_SAMPLES', 'true');
    vi.stubEnv('FEATURE_DEMO_OFFLINE', '');
    const { FLAGS } = await import('../flags.js');
    expect(FLAGS.SEED_SAMPLES).toBe(true);
  });

  it('turns on via FEATURE_DEMO_OFFLINE=true even without the explicit switch (the H3 trip-wire)', async () => {
    vi.stubEnv('FEATURE_SEED_SAMPLES', '');
    vi.stubEnv('FEATURE_DEMO_OFFLINE', 'true');
    const { FLAGS } = await import('../flags.js');
    expect(FLAGS.SEED_SAMPLES).toBe(true);
  });
});
