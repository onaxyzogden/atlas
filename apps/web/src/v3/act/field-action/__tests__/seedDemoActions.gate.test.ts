// @vitest-environment happy-dom
/**
 * H5 (deep-audit 2026-07-03): the View B / ops-hub mount effects call
 * `seedActionsIfEmpty` on any project with zero field actions. Ungated, that
 * fabricated five demo tasks — including a fake `verified` record — into REAL
 * user projects, then persisted and sync-transported them. Two guarantees close
 * the hole:
 *
 *   1. the dispatcher only authors demo/sample content when the sample pipeline
 *      is enabled (`FLAGS.SEED_SAMPLES`); production (flag OFF) never seeds a
 *      real project;
 *   2. the generic demo seed never drives a `verified` status — attesting
 *      completed work that never happened is an integrity problem, so verified
 *      demo content lives only in the authored curated set.
 *
 * `FLAGS` is read from `@ogden/shared` at module-evaluation time (vitest aliases
 * the barrel to source), so each case stubs the env, resets the module registry,
 * and imports the seed + store fresh from the same graph (shared store instance).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const REAL_PROJECT = 'real-user-project';

/**
 * Load the seed dispatcher and the field-action store from one fresh module
 * graph under a chosen SEED_SAMPLES state. localStorage is cleared before the
 * import so the persist middleware rehydrates empty (no cross-case bleed), and
 * the in-memory map is reset after for belt-and-suspenders.
 */
async function loadFresh(seedSamples: boolean) {
  vi.resetModules();
  vi.stubEnv('FEATURE_SEED_SAMPLES', seedSamples ? 'true' : '');
  vi.stubEnv('FEATURE_DEMO_OFFLINE', '');
  localStorage.clear();
  const store = await import('../../../../store/fieldActionStore.js');
  const seed = await import('../seedDemoActions.js');
  store.useFieldActionStore.setState({ byProject: {} });
  return {
    seedActionsIfEmpty: seed.seedActionsIfEmpty,
    seedDemoActionsIfEmpty: seed.seedDemoActionsIfEmpty,
    useFieldActionStore: store.useFieldActionStore,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('seedActionsIfEmpty gate (H5)', () => {
  it('does not seed a real project when SEED_SAMPLES is off', async () => {
    const { seedActionsIfEmpty, useFieldActionStore } = await loadFresh(false);
    seedActionsIfEmpty(REAL_PROJECT, false);
    expect(useFieldActionStore.getState().getByProject(REAL_PROJECT)).toHaveLength(0);
  });

  it('does not seed the curated MTC set when SEED_SAMPLES is off', async () => {
    const { seedActionsIfEmpty, useFieldActionStore } = await loadFresh(false);
    seedActionsIfEmpty('mtc', true);
    expect(useFieldActionStore.getState().getByProject('mtc')).toHaveLength(0);
  });

  it('seeds the generic demo set when SEED_SAMPLES is on', async () => {
    const { seedActionsIfEmpty, useFieldActionStore } = await loadFresh(true);
    seedActionsIfEmpty(REAL_PROJECT, false);
    expect(
      useFieldActionStore.getState().getByProject(REAL_PROJECT).length,
    ).toBeGreaterThan(0);
  });

  it('never fabricates a verified status in the generic demo seed', async () => {
    const { seedDemoActionsIfEmpty, useFieldActionStore } = await loadFresh(true);
    seedDemoActionsIfEmpty(REAL_PROJECT);
    const statuses = useFieldActionStore
      .getState()
      .getByProject(REAL_PROJECT)
      .map((a) => a.status);
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses).not.toContain('verified');
  });
});
