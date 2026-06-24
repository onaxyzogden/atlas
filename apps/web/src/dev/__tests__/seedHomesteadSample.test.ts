// @vitest-environment happy-dom
/**
 * seedHomesteadSample -- completion-seeder invariant guard (Phase 2).
 *
 * Locks the single load-bearing invariant of the homestead completion seeder:
 * given a homestead clone (the visitor's editable copy, carrying the real
 * `projectTypeRecord` + `visionProfile` + `team`), one `seedHomesteadSample`
 * call drives the ENTIRE journey to done --
 *   - every resolved objective computes `complete` (34 for homestead),
 *   - Threshold 1 (Reality Check) approved,
 *   - Threshold 2 (Coherence Check) SEALED -- the Amanah signal: a sealed record
 *     proves no curated amendment text tripped `detectCsaLikeText` (which would
 *     silently drop the text and leave the record unsealed),
 *   - Threshold 3 (Act Mandate) begun.
 *
 * `projectStore` is mocked read-only (the seeder only ever READS it -- find the
 * clone by id) so the heavy real store + its persist/hydration side effects stay
 * out of this unit, exactly as demoSession.test.ts does. The mock starts EMPTY at
 * import so the seeder's window-guarded auto-run hook finds no clone and never
 * fires on its own; the test drives the one seed call explicitly. All six real
 * progress stores are exercised in-memory (happy-dom localStorage; idb degrades
 * to in-memory), so the assertions reflect the actual store writes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// A mutable holder the projectStore mock reads. Empty at import time so the
// seeder's auto-run hook (active under happy-dom) sees no clone and stays inert;
// each test populates it before calling the seeder.
const projectHolder = vi.hoisted(() => ({ projects: [] as unknown[] }));

vi.mock('../../store/projectStore.js', () => ({
  useProjectStore: {
    getState: () => ({ projects: projectHolder.projects }),
    setState: () => {},
    subscribe: () => () => {},
  },
}));

import { seedHomesteadSample } from '../seedHomesteadSample.js';
import { usePlanStratumProgressStore } from '../../store/planStratumStore.js';
import { useActEvidenceStore } from '../../store/actEvidenceStore.js';
import { useRealityCheckStore } from '../../store/realityCheckStore.js';
import { useCoherenceCheckStore } from '../../store/coherenceCheckStore.js';
import { useLaunchMilestoneStore } from '../../store/launchMilestoneStore.js';
import { useCyclicalReviewStore } from '../../store/cyclicalReviewStore.js';
import { useActMandateStore } from '../../store/actMandateStore.js';

const HOMESTEAD_RESOLVED_COUNT = 34;

/**
 * A faithful copy of the load-bearing parts of `HOMESTEAD_SAMPLE_METADATA`
 * (projectStore.ts) -- `projectTypeRecord` drives the 34-objective resolution;
 * `visionProfile` feeds the Stratum-1 effective-progress derivations and the
 * Reality-Check intent elements; `team` feeds the steward derivations. Inlined
 * (not imported) because projectStore is mocked above; keep in sync with the
 * source of truth if the seed metadata changes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HOMESTEAD_METADATA: any = {
  wizardStatus: 'complete',
  projectTypeRecord: {
    primaryTypeId: 'homestead',
    secondaryTypeIds: [],
    tensionAcknowledgements: [],
    versionHistory: [],
    reopeningAcknowledgements: [],
  },
  visionProfile: {
    primaryType: 'homestead',
    secondaryTypes: [],
    landIdentity: ['A family homestead stewarded as an amanah.'],
    primaryOutcomes: ['household_food_security', 'soil_regeneration', 'water_resilience'],
    systemsInScope: {
      food: ['annual_vegetables', 'perennial_fruit', 'staple_crops'],
      animals: ['poultry', 'small_ruminants'],
      water: ['rainwater_harvesting', 'swales'],
      built: ['existing_dwelling', 'storage'],
    },
    economicIntentLevel: 'subsistence_plus',
    values: ['stewardship', 'self_reliance', 'family'],
    developmentStyle: 'incremental',
    willLiveOnLand: 'yes_full_time',
    livestock: {
      roles: ['eggs', 'meat', 'land_management'],
      intensity: 'low',
      managementStyle: 'rotational',
      priorities: ['household_provision', 'soil_fertility'],
    },
    budgetRange: 'modest',
    timelineProgress: 'three_to_five_years',
  },
  team: {
    primarySteward: { name: 'Yusuf & Amina', email: 'steward@homestead.example' },
    coStewards: [{ name: 'Bilal (eldest son)', email: 'bilal@homestead.example' }],
    queuedInvites: [],
  },
  instantiatedFromTemplate: 'homestead-sample',
};

/** Build a synthetic homestead CLONE row (a fresh id, NOT the canonical builtin). */
function cloneRow(id: string) {
  return {
    id,
    name: 'Homestead -- Atlas Sample (clone)',
    isBuiltin: false,
    projectType: 'homestead',
    metadata: HOMESTEAD_METADATA,
  };
}

function resetProgressStores(): void {
  usePlanStratumProgressStore.setState({
    byProject: {},
    celebratedByProject: {},
    deferredByProject: {},
    valuesByProject: {},
  });
  useActEvidenceStore.setState({ byProject: {} });
  useRealityCheckStore.setState({ byProject: {} });
  useCoherenceCheckStore.setState({ byProject: {} });
  useLaunchMilestoneStore.setState({ byProject: {} });
  useCyclicalReviewStore.setState({ byProject: {} });
  useActMandateStore.setState({ byProject: {} });
}

beforeEach(() => {
  projectHolder.projects = [];
  resetProgressStores();
  try {
    localStorage.clear();
  } catch {
    // best-effort
  }
});

describe('seedHomesteadSample -- completion invariant', () => {
  it('drives the full homestead journey to done in one call', () => {
    const cloneId = 'clone-homestead-main';
    projectHolder.projects = [cloneRow(cloneId)];

    const result = seedHomesteadSample(cloneId, { force: true });

    expect(result.ok).toBe(true);
    expect(result.objectives).toBe(HOMESTEAD_RESOLVED_COUNT);
    // Every resolved objective computes complete (prereqs cascade).
    expect(result.completed).toBe(HOMESTEAD_RESOLVED_COUNT);
    // All three thresholds passed.
    expect(result.approved).toBe(true);
    expect(result.sealed).toBe(true); // Amanah: sealed => no detectCsaLikeText refusal
    expect(result.mandated).toBe(true);
  });

  it('actually writes the completion state to the six progress stores', () => {
    const cloneId = 'clone-homestead-stores';
    projectHolder.projects = [cloneRow(cloneId)];

    seedHomesteadSample(cloneId, { force: true });

    // Plan progress landed under the clone id.
    expect(cloneId in usePlanStratumProgressStore.getState().byProject).toBe(true);
    // Reality Check approved, Coherence sealed, Act Mandate begun -- all stamped
    // with the fixed seed epoch (deterministic, byte-stable across reloads).
    expect(useRealityCheckStore.getState().byProject[cloneId]?.approvedAt).toBeDefined();
    expect(useCoherenceCheckStore.getState().byProject[cloneId]?.sealedAt).toBeDefined();
    expect(useActMandateStore.getState().byProject[cloneId]?.mandatedAt).toBeDefined();
    // Launch milestones reached for the S7 objectives that declare them.
    expect(cloneId in useLaunchMilestoneStore.getState().byProject).toBe(true);
    // Cyclical review noted for the objectives (none left "due").
    expect(cloneId in useCyclicalReviewStore.getState().byProject).toBe(true);
  });

  it('is idempotent: a second un-forced call no-ops, a forced replay reaches the same state', () => {
    const cloneId = 'clone-homestead-idem';
    projectHolder.projects = [cloneRow(cloneId)];

    const first = seedHomesteadSample(cloneId, { force: true });
    expect(first.completed).toBe(HOMESTEAD_RESOLVED_COUNT);

    // Without force, the in-memory `fired` guard short-circuits.
    const second = seedHomesteadSample(cloneId);
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/already seeded/);

    // Forced replay is safe (all store actions idempotent) and reaches the same
    // all-complete + sealed + mandated state.
    const third = seedHomesteadSample(cloneId, { force: true });
    expect(third.completed).toBe(HOMESTEAD_RESOLVED_COUNT);
    expect(third.sealed).toBe(true);
    expect(third.mandated).toBe(true);
  });

  it('bails cleanly when the project is absent or has no projectTypeRecord', () => {
    // Absent project.
    expect(seedHomesteadSample('missing-id', { force: true })).toMatchObject({
      ok: false,
    });

    // Present but no projectTypeRecord -> cannot resolve objectives.
    const cloneId = 'clone-homestead-noptr';
    projectHolder.projects = [
      { id: cloneId, name: 'broken', metadata: { wizardStatus: 'complete' } },
    ];
    expect(seedHomesteadSample(cloneId, { force: true })).toMatchObject({ ok: false });
  });
});
