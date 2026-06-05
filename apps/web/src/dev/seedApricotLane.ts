/**
 * seedApricotLane — Phase-E.1 client-side seeder for the
 * Apricot Lane Showcase (degraded-citrus → polyculture) fixture.
 *
 * The server side ships parcel boundary, observe layers, terrain, site
 * assessment, designed features, spiritual zones, and project
 * relationships through migration 032_builtin_apricot_lane_citrus.sql.
 * Everything else — Goal-Compass phases, WorkItems on the canonical
 * spine, current Y2 nursery batches, Site-Profile facets — lives in
 * client Zustand stores that have no migration substrate. This seeder
 * fills that gap so a fresh logged-in user can traverse Observe → Plan
 * → Goal Compass → Act → Monitor with every surface populated to canon.
 *
 * Idempotent: an `apricot-lane-seeded@v1` localStorage sentinel guards
 * against re-seeding on every reload. The inner `seedGoalCompassPlan`
 * call also refuses if any goal-compass WorkItems already exist on
 * the spine — defence in depth.
 *
 * Auto-runs from a one-shot `useProjectStore.subscribe` registration
 * below that fires the first time the Apricot Lane project lands in
 * the local store (typically after `/api/v1/projects/builtins`
 * hydrates). Also exposed as `window.__ogdenSeedApricotLane()` for
 * manual replay.
 *
 * Backs the Validation Protocol assumption A2 fixture (Phase E.1).
 */

import { APRICOT_LANE_PROJECT_ID } from '@ogden/shared';
import { useProjectStore } from '../store/projectStore.js';
import { usePhaseStore } from '../store/phaseStore.js';
import { useSiteProfileStore } from '../store/siteProfileStore.js';
import { useWorkItemStore } from '../store/workItemStore.js';
import { useNurseryStore, type PropagationBatch } from '../store/nurseryStore.js';
import { seedGoalCompassPlan } from './seedGoalCompassPlan.js';

const SENTINEL_KEY = 'apricot-lane-seeded@v1';

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
// Canon — 4-phase scaffold for the Apricot-Lane-class rehabilitation arc.
// Mediterranean / dry-summer hydrology drives the cap sequence: water +
// cover first, then silvopasture + livestock as soil + canopy build.
// ─────────────────────────────────────────────────────────────────────────

const CANON_PHASE_NAMES: Array<{
  timeframe: string;
  name: string;
  description: string;
}> = [
  {
    timeframe: 'Year 0-1',
    name: 'Site Prep + Cover',
    description:
      'Stabilise the cleared-citrus baseline. Subsoil along contour, ' +
      'keyline swales on the two south-flowing arroyos, winter bell-bean + ' +
      'oats + phacelia cover crop (Mediterranean rainy season Nov–Mar). ' +
      'Yeomans cap: water.',
  },
  {
    timeframe: 'Year 1-3',
    name: 'Keyline + Perennials',
    description:
      'Land the polyculture orchard block (stone fruit + Mediterranean + ' +
      'nut), first cow-calf cohort + mobile poultry follow, farm pond + ' +
      'pole barn + compost yard. Yeomans cap: buildings.',
  },
  {
    timeframe: 'Year 3-5',
    name: 'Silvopasture Maturation',
    description:
      'Silvopasture savanna with shade trees for May–Oct dry season, ' +
      'second orchard block (low-water mandarin + avocado polyculture), ' +
      'paddock densification. Yeomans cap: subdivision.',
  },
  {
    timeframe: 'Year 5+',
    name: 'Closed-Loop Polyculture',
    description:
      'Stable polyculture, adaptive stewardship, monitoring instrument ' +
      'set tuned to MDPI Y5/Y9 cadence + Fox Canyon GMA groundwater ' +
      'reporting. Yeomans cap: soil.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Y2 nursery propagation batches (current state, May 2026). Species drawn
// from the design-feature roster — native chaparral hedgerow + cover-crop
// seed increase + Mediterranean tree starts.
// ─────────────────────────────────────────────────────────────────────────

function buildNurseryBatches(projectId: string): PropagationBatch[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'al-nursery-001',
      projectId,
      species: 'Toyon (Heteromeles arbutifolia)',
      method: 'cutting',
      quantity: 100,
      stage: 'juvenile',
      sowDate: '2025-10-10',
      expectedReadyDate: '2026-10-10',
      destinationZoneId: null,
      seedSaving: false,
      notes: 'Native chaparral hedgerow whip propagation for north boundary gap-fill.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'al-nursery-002',
      projectId,
      species: 'Coast live oak (Quercus agrifolia)',
      method: 'seed',
      quantity: 80,
      stage: 'germinating',
      sowDate: '2026-01-20',
      expectedReadyDate: '2027-03-20',
      destinationZoneId: null,
      seedSaving: false,
      notes: 'Acorns collected Y1 from on-site mature specimen. For riparian buffer + meditation grove infill.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'al-nursery-003',
      projectId,
      species: 'Bell bean (Vicia faba) cover-crop seed',
      method: 'seed',
      quantity: 6000,
      stage: 'seed',
      sowDate: '2026-11-01',
      expectedReadyDate: '2026-11-12',
      destinationZoneId: null,
      seedSaving: true,
      notes: 'Cover-crop seed stock for 2026 winter sow on west + east citrus blocks. Locally adapted N-fixer.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'al-nursery-004',
      projectId,
      species: 'Mediterranean tree starts (olive + carob + pomegranate)',
      method: 'cutting',
      quantity: 36,
      stage: 'seedling',
      sowDate: '2026-02-15',
      expectedReadyDate: '2026-11-01',
      destinationZoneId: null,
      seedSaving: false,
      notes: 'Drought-tolerant Mediterranean starts for orchard block 1 + silvopasture pilots.',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// Resolve the local project row for Apricot Lane. Matches either local id
// or serverId because the project lands via the builtins API.
// ─────────────────────────────────────────────────────────────────────────

function findTarget() {
  return useProjectStore
    .getState()
    .projects.find(
      (p) =>
        p.id === APRICOT_LANE_PROJECT_ID ||
        p.serverId === APRICOT_LANE_PROJECT_ID,
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Customise the 4 default phases in-place with canon-specific
// names/descriptions. `ensureDefaults` is a no-op if phases already exist
// for this project; `updatePhase` mutates by id.
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
// generates an Apricot-Lane-shaped plan rather than a generic one.
// ─────────────────────────────────────────────────────────────────────────

function setSiteProfileToCanon(projectId: string): void {
  const sp = useSiteProfileStore.getState();
  sp.ensureDefault(projectId);
  sp.setFacet(projectId, 'acres', 200, 'manual');
  sp.setFacet(projectId, 'climateZone', '10a', 'manual');
  sp.setFacet(projectId, 'primaryLandform', 'rolling', 'manual');
  sp.setFacet(projectId, 'avgSlopePct', 7.1, 'manual');
  sp.setFacet(projectId, 'currentLandCover', 'cropland', 'manual');
  sp.setFacet(projectId, 'soilCompaction', 'high', 'manual');
  // Irrigated heritage transitioning to rainfed-resilient — closest fit in
  // the existing facet vocabulary is 'rainfed' since the multi-year
  // trajectory targets infiltration + soil-water storage over groundwater
  // dependence.
  sp.setFacet(projectId, 'waterPosture', 'rainfed', 'manual');
  sp.setFacet(projectId, 'lastFrostDate', '02-20', 'manual');
  sp.setFacet(projectId, 'firstFrostDate', '12-15', 'manual');
  sp.setFacet(projectId, 'household', { adults: 2, children: 0 }, 'manual');
}

// ─────────────────────────────────────────────────────────────────────────
// Append nursery batches if they aren't already on the store. Per-batch
// id-equality check so a partial re-seed is non-destructive of any
// user-authored rows alongside.
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

export function seedApricotLane(opts: { force?: boolean } = {}): SeedResult {
  if (!opts.force && typeof localStorage !== 'undefined') {
    try {
      if (localStorage.getItem(SENTINEL_KEY)) {
        return { ok: false, reason: 'apricot-lane-seeded@v1 sentinel already set; pass { force: true } to replay' };
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
      reason: `Apricot Lane Showcase project not yet hydrated into the local store (id ${APRICOT_LANE_PROJECT_ID}). Wait for the builtins fetch or load the project.`,
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
    return {
      ...result,
      reason: `goal-compass engine: ${goalCompass.reason ?? 'unknown'}`,
    };
  }

  console.info(
    `[seedApricotLane] customised ${phasesCustomised} phases, ${workItemCount} goal-compass WorkItems on spine, ${nurseryBatches} nursery batches added on "${target.name}" (${pid}).`,
  );

  return result;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenSeedApricotLane =
    seedApricotLane;
}

// ─────────────────────────────────────────────────────────────────────────
// Auto-run hook. Subscribes to projectStore once at module-init and fires
// the seeder the first time the Apricot Lane project appears in the local
// store (typically after `/api/v1/projects/builtins` hydrates). The
// localStorage sentinel and per-store idempotency guards prevent re-runs
// on subsequent reloads. Subscription unsubscribes itself after firing so
// it has zero ongoing cost.
// ─────────────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  try {
    const unsubscribe = useProjectStore.subscribe((state) => {
      const hit = state.projects.find(
        (p) =>
          p.id === APRICOT_LANE_PROJECT_ID ||
          p.serverId === APRICOT_LANE_PROJECT_ID,
      );
      if (!hit) return;
      unsubscribe();
      // Defer to next tick so other builtin-row hydration (observe data,
      // layer summaries) settles first.
      queueMicrotask(() => {
        seedApricotLane();
      });
    });
    // Fire immediately if the project was already in the store at
    // module-init (hot-reload, persisted store rehydration).
    const already = useProjectStore
      .getState()
      .projects.find(
        (p) =>
          p.id === APRICOT_LANE_PROJECT_ID ||
          p.serverId === APRICOT_LANE_PROJECT_ID,
      );
    if (already) {
      unsubscribe();
      queueMicrotask(() => {
        seedApricotLane();
      });
    }
  } catch (err) {
    console.warn('[seedApricotLane] auto-run hook failed to attach', err);
  }
}
