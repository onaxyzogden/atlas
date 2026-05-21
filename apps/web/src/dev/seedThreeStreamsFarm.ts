/**
 * seedThreeStreamsFarm — Phase-2 client-side seeder for the
 * Three Streams Farm showcase project.
 *
 * The server side ships parcel boundary, observe layers, terrain,
 * site assessment, designed features, spiritual zones, project
 * relationships, and 24 months of regeneration events through
 * migrations 029 + 030. Everything else — Goal-Compass phases,
 * WorkItems on the canonical spine, current Y2 nursery batches,
 * Site-Profile facets — lives in client Zustand stores that have
 * no migration substrate. This seeder fills that gap so a fresh
 * logged-in user can traverse Observe → Plan → Goal Compass →
 * Act → Monitor with every surface populated to canon.
 *
 * Idempotent: a `three-streams-seeded@v1` localStorage sentinel
 * guards against re-seeding on every reload. The inner
 * `seedGoalCompassPlan` call also refuses if any goal-compass
 * WorkItems already exist on the spine — defence in depth.
 *
 * Auto-runs from `projectStore.applyBuiltinsToStore` when the
 * Three Streams project lands in the local store (see hook at
 * `seedBuiltinObserveData(lp.id)` adjacent). Also exposed as
 * `window.__ogdenSeedThreeStreamsFarm()` for manual replay.
 *
 * Canon source-of-truth: wiki/entities/three-streams-farm.md.
 */

import { THREE_STREAMS_PROJECT_ID } from '@ogden/shared';
import { useProjectStore } from '../store/projectStore.js';
import { usePhaseStore } from '../store/phaseStore.js';
import { useSiteProfileStore } from '../store/siteProfileStore.js';
import { useWorkItemStore } from '../store/workItemStore.js';
import { useNurseryStore, type PropagationBatch } from '../store/nurseryStore.js';
import { seedGoalCompassPlan } from './seedGoalCompassPlan.js';

const SENTINEL_KEY = 'three-streams-seeded@v1';

interface SeedResult {
  ok: boolean;
  reason?: string;
  inserted?: {
    phasesCustomised: number;
    workItems: number;
    nurseryBatches: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Canon — verbatim from wiki/entities/three-streams-farm.md.
// 4-phase scaffold mapped to Yeomans cap sequence.
// ─────────────────────────────────────────────────────────────────────────

const CANON_PHASE_NAMES: Array<{
  timeframe: string;
  name: string;
  description: string;
}> = [
  {
    timeframe: 'Year 0-1',
    name: 'Water + Cover',
    description:
      'Stabilise the corn-cropped baseline. Keyline swales on contour, ' +
      'riparian buffers along the three creek tributaries, winter rye + ' +
      'crimson clover cover crop. Yeomans cap: water.',
  },
  {
    timeframe: 'Year 1-3',
    name: 'Perennials + Livestock',
    description:
      'Land the orchard block, cow-calf herd, mobile poultry follow, ' +
      'and Y2 nursery propagation. Pole barn + cistern complete. ' +
      'Yeomans cap: buildings.',
  },
  {
    timeframe: 'Year 3-5',
    name: 'Polyculture Maturation',
    description:
      'Silvopasture savanna, woodlot extension along the escarpment ' +
      'edge, perennial polyculture block fills in. Yeomans cap: ' +
      'subdivision.',
  },
  {
    timeframe: 'Year 5+',
    name: 'Ecosystem Stability',
    description:
      'Stable polyculture, adaptive stewardship, monitoring instrument ' +
      'set tuned to MDPI Y5/Y9 cadence. Yeomans cap: soil.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Y2 nursery propagation batches (current state, May 2026).
// Species drawn from canon "Species & Guild Canon" section.
// ─────────────────────────────────────────────────────────────────────────

function buildNurseryBatches(projectId: string): PropagationBatch[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'ts-nursery-001',
      projectId,
      species: 'Hawthorn (Crataegus mollis)',
      method: 'cutting',
      quantity: 80,
      stage: 'juvenile',
      sowDate: '2025-09-15',
      expectedReadyDate: '2026-09-15',
      destinationZoneId: null,
      seedSaving: false,
      notes: 'Hedgerow whip propagation for north + west boundary gap-fill.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ts-nursery-002',
      projectId,
      species: 'Elderberry (Sambucus canadensis)',
      method: 'cutting',
      quantity: 60,
      stage: 'seedling',
      sowDate: '2026-03-01',
      expectedReadyDate: '2026-10-01',
      destinationZoneId: null,
      seedSaving: false,
      notes: 'Riparian buffer infill along central tributary.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ts-nursery-003',
      projectId,
      species: 'Serviceberry (Amelanchier canadensis)',
      method: 'seed',
      quantity: 120,
      stage: 'germinating',
      sowDate: '2026-02-15',
      expectedReadyDate: '2027-04-15',
      destinationZoneId: null,
      seedSaving: false,
      notes: 'Hedgerow + windbreak diversity. Cold-stratified Dec 2025.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ts-nursery-004',
      projectId,
      species: 'Winter rye (Secale cereale)',
      method: 'seed',
      quantity: 4000,
      stage: 'seed',
      sowDate: '2026-09-01',
      expectedReadyDate: '2026-09-15',
      destinationZoneId: null,
      seedSaving: true,
      notes: 'Cover-crop seed stock for 2026 fall sow on east + west fields.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ts-nursery-005',
      projectId,
      species: 'Crimson clover (Trifolium incarnatum)',
      method: 'seed',
      quantity: 2500,
      stage: 'seed',
      sowDate: '2026-09-01',
      expectedReadyDate: '2026-09-15',
      destinationZoneId: null,
      seedSaving: false,
      notes: 'N-fixing cover-crop companion to winter rye.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ts-nursery-006',
      projectId,
      species: 'Kitchen-garden transplants (mixed brassicas + alliums)',
      method: 'seed',
      quantity: 220,
      stage: 'seedling',
      sowDate: '2026-03-15',
      expectedReadyDate: '2026-05-25',
      destinationZoneId: null,
      seedSaving: false,
      notes: 'Spring transplant batch for the Y2 kitchen-garden expansion.',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// Resolve the local project row for Three Streams. Matches either local
// id or serverId because the project lands via the builtins API.
// ─────────────────────────────────────────────────────────────────────────

function findTarget() {
  return useProjectStore
    .getState()
    .projects.find(
      (p) =>
        p.id === THREE_STREAMS_PROJECT_ID ||
        p.serverId === THREE_STREAMS_PROJECT_ID,
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Customise the 4 default phases in-place with canon-specific
// names/descriptions. `ensureDefaults` is a no-op if phases already
// exist for this project; `updatePhase` mutates by id.
// ─────────────────────────────────────────────────────────────────────────

function customisePhases(projectId: string): number {
  const phaseStore = usePhaseStore.getState();
  phaseStore.ensureDefaults(projectId);

  const phases = usePhaseStore
    .getState()
    .phases.filter((p) => p.projectId === projectId)
    .sort((a, b) => a.order - b.order);

  let customised = 0;
  for (let i = 0; i < CANON_PHASE_NAMES.length && i < phases.length; i++) {
    const canon = CANON_PHASE_NAMES[i];
    const ph = phases[i];
    if (!ph || !canon) continue;
    if (ph.name === canon.name && ph.description === canon.description) continue;
    phaseStore.updatePhase(ph.id, {
      name: canon.name,
      description: canon.description,
    });
    customised++;
  }
  return customised;
}

// ─────────────────────────────────────────────────────────────────────────
// Set Site Profile facets to canon values so the sequencing engine
// generates a Three-Streams-shaped plan rather than a generic one.
// ─────────────────────────────────────────────────────────────────────────

function setSiteProfileToCanon(projectId: string): void {
  const sp = useSiteProfileStore.getState();
  sp.ensureDefault(projectId);
  sp.setFacet(projectId, 'acres', 180, 'manual');
  sp.setFacet(projectId, 'climateZone', '5b', 'manual');
  sp.setFacet(projectId, 'primaryLandform', 'rolling', 'manual');
  sp.setFacet(projectId, 'avgSlopePct', 5.8, 'manual');
  sp.setFacet(projectId, 'currentLandCover', 'cropland', 'manual');
  sp.setFacet(projectId, 'soilCompaction', 'high', 'manual');
  sp.setFacet(projectId, 'waterPosture', 'rainfed', 'manual');
  sp.setFacet(projectId, 'lastFrostDate', '05-15', 'manual');
  sp.setFacet(projectId, 'firstFrostDate', '10-05', 'manual');
  sp.setFacet(projectId, 'household', { adults: 2, children: 2 }, 'manual');
}

// ─────────────────────────────────────────────────────────────────────────
// Append nursery batches if they aren't already on the store. Per-batch
// id-equality check so a partial re-seed (e.g. after a manual clear) is
// non-destructive of any user-authored rows alongside.
// ─────────────────────────────────────────────────────────────────────────

function seedNursery(projectId: string): number {
  const nursery = useNurseryStore.getState();
  const existingIds = new Set(nursery.batches.map((b) => b.id));
  const batches = buildNurseryBatches(projectId);
  let added = 0;
  for (const b of batches) {
    if (existingIds.has(b.id)) continue;
    nursery.addBatch(b);
    added++;
  }
  return added;
}

// ─────────────────────────────────────────────────────────────────────────
// Public entry point.
// ─────────────────────────────────────────────────────────────────────────

export function seedThreeStreamsFarm(opts: { force?: boolean } = {}): SeedResult {
  if (!opts.force && typeof localStorage !== 'undefined') {
    try {
      if (localStorage.getItem(SENTINEL_KEY)) {
        return { ok: false, reason: 'three-streams-seeded@v1 sentinel already set; pass { force: true } to replay' };
      }
    } catch {
      // localStorage unavailable (privacy mode, etc.) — fall through and rely
      // on each store's own idempotency check.
    }
  }

  const target = findTarget();
  if (!target) {
    return {
      ok: false,
      reason: `Three Streams Farm project not yet hydrated into the local store (id ${THREE_STREAMS_PROJECT_ID}). Wait for the builtins fetch or load the project.`,
    };
  }

  const pid = target.id;

  const phasesCustomised = customisePhases(pid);
  setSiteProfileToCanon(pid);

  const goalCompass = seedGoalCompassPlan(pid);
  const workItemCount = useWorkItemStore
    .getState()
    .items.filter((it) => it.projectId === pid && it.source === 'goal-compass')
    .length;

  const nurseryBatches = seedNursery(pid);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SENTINEL_KEY, new Date().toISOString());
    } catch {
      // swallow — sentinel is best-effort.
    }
  }

  const result: SeedResult = {
    ok: true,
    inserted: {
      phasesCustomised,
      workItems: workItemCount,
      nurseryBatches,
    },
  };

  if (!goalCompass.ok) {
    // The engine refused (already-populated spine, or a missing goal-tree
    // edge). Still report success on the parts we did seed, but include
    // the engine's reason so the operator can react.
    return {
      ...result,
      reason: `goal-compass engine: ${goalCompass.reason ?? 'unknown'}`,
    };
  }

  console.info(
    `[seedThreeStreamsFarm] customised ${phasesCustomised} phases, ${workItemCount} goal-compass WorkItems on spine, ${nurseryBatches} nursery batches added on "${target.name}" (${pid}).`,
  );

  return result;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenSeedThreeStreamsFarm =
    seedThreeStreamsFarm;
}

// ─────────────────────────────────────────────────────────────────────────
// Auto-run hook. Subscribes to projectStore once at module-init and
// fires the seeder the first time the Three Streams project appears in
// the local store (typically after `/api/v1/projects/builtins` hydrates).
// The localStorage sentinel and per-store idempotency guards prevent
// re-runs on subsequent reloads. Subscription unsubscribes itself after
// firing so it has zero ongoing cost.
// ─────────────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  try {
    const unsubscribe = useProjectStore.subscribe((state) => {
      const hit = state.projects.find(
        (p) =>
          p.id === THREE_STREAMS_PROJECT_ID ||
          p.serverId === THREE_STREAMS_PROJECT_ID,
      );
      if (!hit) return;
      unsubscribe();
      // Defer to next tick so other builtin-row hydration (observe data,
      // layer summaries) settles first.
      queueMicrotask(() => {
        seedThreeStreamsFarm();
      });
    });
    // Fire immediately if the project was already in the store at
    // module-init (hot-reload, persisted store rehydration).
    const already = useProjectStore
      .getState()
      .projects.find(
        (p) =>
          p.id === THREE_STREAMS_PROJECT_ID ||
          p.serverId === THREE_STREAMS_PROJECT_ID,
      );
    if (already) {
      unsubscribe();
      queueMicrotask(() => {
        seedThreeStreamsFarm();
      });
    }
  } catch (err) {
    console.warn('[seedThreeStreamsFarm] auto-run hook failed to attach', err);
  }
}
