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
 * Idempotent: an `ecosystem-farm-seeded@v2` localStorage sentinel
 * guards against re-seeding on every reload. Each store's own
 * id-equality guard provides defence in depth (so a v1→v2 re-seed
 * adds only the new livestock slice without duplicating phases /
 * nursery / goal-compass rows).
 *
 * Phase 2.5 added the livestock substrate: 12 cow-calf paddock cells,
 * the 12-cell rotation plan, a Y2 move log, and the rotation-sequence
 * WorkItems pushed onto the canonical spine for the Y2 goal-tree gate.
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
import { useEcologyStore } from '../store/ecologyStore.js';
import { useLivestockStore, type Paddock } from '../store/livestockStore.js';
import { useRotationPlanStore } from '../store/rotationPlanStore.js';
import {
  useLivestockMoveLogStore,
  buildRotatePair,
} from '../store/livestockMoveLogStore.js';
import type { RotationCell } from '../features/livestock/rotationSequenceMath.js';
import { pushRotationSequenceToSpine } from '../features/livestock/rotationSequenceSpineSync.js';
import { seedGoalCompassPlan } from './seedGoalCompassPlan.js';

// Phase 4 (2026-05-21): keyed by projectId so a cold visitor who
// instantiates the Ecosystem Farm template gets the same client-side
// substrate as the canonical Three Streams builtin. Legacy
// `three-streams-seeded@v1` flag is still honoured for the canonical
// project (backward-compat with existing browsers).
//
// Phase 2.5 (2026-05-21): bumped v1 → v2 to claim the new livestock
// substrate (paddocks + rotation plan + move log + rotation-sequence
// spine WorkItems). Browsers that seeded under v1 re-run once on next
// load to gain the livestock slice; the per-store id-equality guards
// keep that re-run non-destructive of the already-seeded phases /
// nursery / goal-compass rows.
const SENTINEL_PREFIX = 'ecosystem-farm-seeded@v2:';
const LEGACY_SENTINEL_KEY = 'three-streams-seeded@v2';

interface SeedResult {
  ok: boolean;
  reason?: string;
  inserted?: {
    phasesCustomised: number;
    workItems: number;
    nurseryBatches: number;
    paddocks: number;
    rotationCells: number;
    moveEvents: number;
    rotationSpineItems: number;
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

function findTarget(projectId?: string) {
  const projects = useProjectStore.getState().projects;
  if (projectId) {
    return projects.find((p) => p.id === projectId || p.serverId === projectId);
  }
  return projects.find(
    (p) =>
      p.id === THREE_STREAMS_PROJECT_ID ||
      p.serverId === THREE_STREAMS_PROJECT_ID,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 4 — set per-project succession stage to canon Y2 ("mid"). The
// store carries one stage per project (vegetation-patch-level succession
// lives in vegetationStore); canon Y2 polyculture maturation = "mid".
// ─────────────────────────────────────────────────────────────────────────

function setSuccessionToCanon(projectId: string): void {
  const ecology = useEcologyStore.getState();
  if (ecology.successionStageByProject[projectId]) return; // don't clobber
  ecology.setSuccessionStage(projectId, 'mid');
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
// Phase 2.5 — livestock substrate. Seeds the 12 Y2 cow-calf paddock
// cells (mirroring migration 038's design-feature grid), the 12-cell
// rotation plan, a representative Y2 move log (cattle + poultry follow),
// then pushes the rotation-sequence WorkItems onto the canonical spine
// so the Y2 goal-tree criterion
// `livestock-rotation-spine-presence-pct` (deadlineYear 2) can light up.
//
// Canon (wiki/entities/three-streams-farm.md): 80-head Black Angus /
// Devon-cross cow-calf on a 3-day rotational move through 12 cells with
// ~33-day rest; 200-bird mobile poultry flock following at a 3-day lag.
// Sheep arrive Y4 — out of scope for the Y2 seed.
// ─────────────────────────────────────────────────────────────────────────

// 13 longitude boundaries → 12 cells, mirroring migration 038 exactly.
const PADDOCK_LON_BOUNDS = [
  -79.914000, -79.913333, -79.912667, -79.912000, -79.911333, -79.910667,
  -79.910000, -79.909333, -79.908667, -79.908000, -79.907333, -79.906667,
  -79.906000,
];
const PADDOCK_LAT_SOUTH = 43.5615;
const PADDOCK_LAT_NORTH = 43.5638;
const COWCALF_CELL_GROUP = 'cowcalf-Y2';
const COWCALF_PHASE_NAME = 'Perennials + Livestock'; // resolves by name match
const COWCALF_HEAD = 80;
const POULTRY_HEAD = 200;

/** Sentinel UUID for paddock cell i (1-based), matching migration 038. */
function paddockId(i: number): string {
  return `00000000-0000-0000-0000-0000df35ad${i.toString(16).padStart(2, '0')}`;
}

/** Rough equirectangular area (m²) of a lon/lat-aligned rectangle. */
function rectAreaM2(
  lonWest: number,
  lonEast: number,
  latSouth: number,
  latNorth: number,
): number {
  const latMid = (latSouth + latNorth) / 2;
  const mPerDegLat = 111_320;
  const mPerDegLon = 111_320 * Math.cos((latMid * Math.PI) / 180);
  const widthM = Math.abs(lonEast - lonWest) * mPerDegLon;
  const heightM = Math.abs(latNorth - latSouth) * mPerDegLat;
  return Math.round(widthM * heightM);
}

/** Add `days` to a yyyy-mm-dd string in UTC, returning yyyy-mm-dd. */
function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildPaddocks(projectId: string): Paddock[] {
  const now = new Date().toISOString();
  // Total cow-calf footprint (all 12 cells) → uniform stocking density.
  let totalM2 = 0;
  for (let i = 1; i <= 12; i++) {
    totalM2 += rectAreaM2(
      PADDOCK_LON_BOUNDS[i - 1]!,
      PADDOCK_LON_BOUNDS[i]!,
      PADDOCK_LAT_SOUTH,
      PADDOCK_LAT_NORTH,
    );
  }
  const totalHa = totalM2 / 10_000;
  const stockingDensity = totalHa > 0 ? Math.round(COWCALF_HEAD / totalHa) : null;

  const paddocks: Paddock[] = [];
  for (let i = 1; i <= 12; i++) {
    const w = PADDOCK_LON_BOUNDS[i - 1]!;
    const e = PADDOCK_LON_BOUNDS[i]!;
    const s = PADDOCK_LAT_SOUTH;
    const n = PADDOCK_LAT_NORTH;
    paddocks.push({
      id: paddockId(i),
      projectId,
      name: `Paddock ${i}`,
      color: '#65a30d',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [w, s],
            [e, s],
            [e, n],
            [w, n],
            [w, s],
          ],
        ],
      },
      areaM2: rectAreaM2(w, e, s, n),
      grazingCellGroup: COWCALF_CELL_GROUP,
      species: ['cattle'],
      stockingDensity,
      pastureQuality: 'fair',
      fencing: 'electric',
      guestSafeBuffer: true,
      waterPointNote: 'Mobile trough on the rotation lane; gravity-fed from cistern.',
      shelterNote: 'Hedgerow windbreak on north + west boundary provides shade.',
      phase: COWCALF_PHASE_NAME,
      notes:
        'Y2 cow-calf cell — 3-day graze / ~33-day rest. Poultry follow at 3-day lag.',
      createdAt: now,
      updatedAt: now,
    });
  }
  return paddocks;
}

function buildRotationCells(): RotationCell[] {
  const cells: RotationCell[] = [];
  for (let i = 1; i <= 12; i++) {
    cells.push({
      paddockId: paddockId(i),
      cellGroup: COWCALF_CELL_GROUP,
      sequenceOrder: i - 1, // 0-based within cellGroup
      targetGrazeDays: 3,
      targetRestDays: 33,
    });
  }
  return cells;
}

function seedLivestock(projectId: string): {
  paddocks: number;
  rotationCells: number;
  moveEvents: number;
  rotationSpineItems: number;
} {
  // 1) Paddocks (global store, filtered by projectId; id-equality guard).
  const livestock = useLivestockStore.getState();
  const existingPaddockIds = new Set(
    livestock.paddocks.filter((p) => p.projectId === projectId).map((p) => p.id),
  );
  let paddocksAdded = 0;
  for (const p of buildPaddocks(projectId)) {
    if (existingPaddockIds.has(p.id)) continue;
    livestock.addPaddock(p);
    paddocksAdded++;
  }

  // 2) Rotation plan (per-project store). setPlan first, then options.
  const rotationCells = buildRotationCells();
  const rotation = useRotationPlanStore.getState();
  const existingPlan = rotation.byProject[projectId];
  if (!existingPlan || existingPlan.cells.length === 0) {
    rotation.setPlan(projectId, rotationCells);
    rotation.setPlanOptions(projectId, {
      startDateISO: '2026-05-01',
      horizonCycles: 4,
    });
  }

  // 3) Representative Y2 move log (cattle herd + poultry follow). Each
  //    event is id-guarded so a v1→v2 re-seed does not duplicate.
  const moveLog = useLivestockMoveLogStore.getState();
  const existingEventIds = new Set(
    moveLog.events.filter((e) => e.projectId === projectId).map((e) => e.id),
  );
  let moveEventsAdded = 0;
  const addEventIfNew = (e: Parameters<typeof moveLog.addEvent>[0]) => {
    if (existingEventIds.has(e.id)) return;
    moveLog.addEvent(e);
    existingEventIds.add(e.id);
    moveEventsAdded++;
  };

  const cattleStart = '2026-05-01';
  // Turn-out: herd enters Paddock 1 from the home pole-barn.
  addEventIfNew({
    id: 'ts-lvm-cattle-0',
    projectId,
    toPaddockId: paddockId(1),
    date: cattleStart,
    direction: 'move_in',
    species: 'cattle',
    headCount: COWCALF_HEAD,
    who: 'Rotation crew',
    notes: 'Spring turn-out — cow-calf herd onto the Y2 rotation spine.',
  });
  // 6 rotations: Paddock k → Paddock k+1 every 3 days.
  for (let k = 1; k <= 6; k++) {
    const date = addDaysISO(cattleStart, 3 * k);
    const [exitLeg, entryLeg] = buildRotatePair({
      projectId,
      entryDate: date,
      species: 'cattle',
      headCount: COWCALF_HEAD,
      from: { paddockId: paddockId(k) },
      to: { paddockId: paddockId(k + 1) },
      who: 'Rotation crew',
      notes: `3-day rotational move ${k}: Paddock ${k} → Paddock ${k + 1}.`,
      idSeed: `ts-cattle-${k}`,
    });
    addEventIfNew(exitLeg);
    addEventIfNew(entryLeg);
  }

  // Poultry follow enters Paddock 1 three days behind the herd, then
  // tracks the cattle rotation at the same 3-day lag.
  const poultryStart = addDaysISO(cattleStart, 3);
  addEventIfNew({
    id: 'ts-lvm-poultry-0',
    projectId,
    toPaddockId: paddockId(1),
    date: poultryStart,
    direction: 'move_in',
    species: 'poultry',
    headCount: POULTRY_HEAD,
    who: 'Rotation crew',
    notes: 'Mobile poultry follow — 3-day lag behind the cow-calf herd.',
  });
  for (let k = 1; k <= 5; k++) {
    const date = addDaysISO(poultryStart, 3 * k);
    const [exitLeg, entryLeg] = buildRotatePair({
      projectId,
      entryDate: date,
      species: 'poultry',
      headCount: POULTRY_HEAD,
      from: { paddockId: paddockId(k) },
      to: { paddockId: paddockId(k + 1) },
      who: 'Rotation crew',
      notes: `Poultry follow move ${k}: Paddock ${k} → Paddock ${k + 1}.`,
      idSeed: `ts-poultry-${k}`,
    });
    addEventIfNew(exitLeg);
    addEventIfNew(entryLeg);
  }

  // 4) Project the rotation plan onto the canonical spine. This writes
  //    the `source:'rotation-sequence'` WorkItems the Y2 spine-presence
  //    criterion measures against. Reads paddocks + plan + declaredPhases
  //    from their stores, so must run AFTER the writes above.
  pushRotationSequenceToSpine(projectId);
  const rotationSpineItems = useWorkItemStore
    .getState()
    .items.filter(
      (it) => it.projectId === projectId && it.source === 'rotation-sequence',
    ).length;

  return {
    paddocks: paddocksAdded,
    rotationCells: rotationCells.length,
    moveEvents: moveEventsAdded,
    rotationSpineItems,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Public entry point.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Phase 4 generalized seeder — call once per cloned project (or against
 * the canonical Three Streams sentinel). Idempotent via per-project
 * `ecosystem-farm-seeded@v1:<projectId>` localStorage key (plus the
 * legacy `three-streams-seeded@v1` flag for the canonical project).
 */
export function seedFromEcosystemFarmTemplate(
  projectId: string,
  opts: { force?: boolean } = {},
): SeedResult {
  const sentinelKey = SENTINEL_PREFIX + projectId;
  const isCanonical =
    projectId === THREE_STREAMS_PROJECT_ID;

  if (!opts.force && typeof localStorage !== 'undefined') {
    try {
      if (localStorage.getItem(sentinelKey)) {
        return {
          ok: false,
          reason: `${sentinelKey} sentinel already set; pass { force: true } to replay`,
        };
      }
      if (isCanonical && localStorage.getItem(LEGACY_SENTINEL_KEY)) {
        // Backward-compat: legacy sentinel honoured for the canonical
        // project so existing browsers don't double-seed.
        return {
          ok: false,
          reason: 'three-streams-seeded@v2 legacy sentinel set; pass { force: true } to replay',
        };
      }
    } catch {
      // localStorage unavailable (privacy mode, etc.) — fall through and rely
      // on each store's own idempotency check.
    }
  }

  const target = findTarget(projectId);
  if (!target) {
    return {
      ok: false,
      reason: `Project not yet hydrated into the local store (id ${projectId}). Wait for the project fetch or load the project.`,
    };
  }

  const pid = target.id;

  const phasesCustomised = customisePhases(pid);
  setSiteProfileToCanon(pid);
  setSuccessionToCanon(pid);

  const goalCompass = seedGoalCompassPlan(pid);
  const workItemCount = useWorkItemStore
    .getState()
    .items.filter((it) => it.projectId === pid && it.source === 'goal-compass')
    .length;

  const nurseryBatches = seedNursery(pid);
  const livestock = seedLivestock(pid);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(sentinelKey, new Date().toISOString());
      if (isCanonical) {
        // Also write the legacy sentinel so older code paths see consistency.
        localStorage.setItem(LEGACY_SENTINEL_KEY, new Date().toISOString());
      }
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
      paddocks: livestock.paddocks,
      rotationCells: livestock.rotationCells,
      moveEvents: livestock.moveEvents,
      rotationSpineItems: livestock.rotationSpineItems,
    },
  };

  if (!goalCompass.ok) {
    return {
      ...result,
      reason: `goal-compass engine: ${goalCompass.reason ?? 'unknown'}`,
    };
  }

  console.info(
    `[seedFromEcosystemFarmTemplate] customised ${phasesCustomised} phases, ${workItemCount} goal-compass WorkItems on spine, ${nurseryBatches} nursery batches, ${livestock.paddocks} paddocks, ${livestock.rotationCells}-cell rotation plan, ${livestock.moveEvents} move events, ${livestock.rotationSpineItems} rotation-sequence WorkItems, succession='mid' on "${target.name}" (${pid}).`,
  );

  return result;
}

/**
 * Legacy wrapper — preserves the public surface used by the auto-run
 * hook + window global. Targets the canonical Three Streams sentinel.
 */
export function seedThreeStreamsFarm(opts: { force?: boolean } = {}): SeedResult {
  const target = findTarget();
  const pid = target?.id ?? THREE_STREAMS_PROJECT_ID;
  return seedFromEcosystemFarmTemplate(pid, opts);
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenSeedThreeStreamsFarm =
    seedThreeStreamsFarm;
  (window as unknown as Record<string, unknown>).__ogdenSeedFromEcosystemFarmTemplate =
    seedFromEcosystemFarmTemplate;
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
    // Tracks projects we've already kicked off a seed for in this tab.
    // This subscription serves ONLY the canonical Three Streams sample's
    // arrival (a reserved builtin id). It deliberately does NOT match on
    // `metadata.instantiatedFromTemplate`: auto-seeding any project merely
    // for carrying the template flag is a silent-clobber vector (it can
    // fire on rehydration, sync, or reload, dropping fixed Three Streams
    // geometry onto user-drawn parcels). Template instantiation is instead
    // an explicit, one-shot call from the user's create action — see
    // StepNotes.tsx / NewProjectPage.tsx, which call
    // `seedFromEcosystemFarmTemplate` directly when the ecosystem-farm
    // template card / CTA is chosen (the offline-fallback seam; the authed
    // app instantiates server-side via api.templates.instantiatePublic).
    const fired = new Set<string>();

    const tryFireFor = (projectId: string) => {
      if (fired.has(projectId)) return;
      fired.add(projectId);
      queueMicrotask(() => {
        seedFromEcosystemFarmTemplate(projectId);
      });
    };

    const scan = (projects: ReturnType<typeof useProjectStore.getState>['projects']) => {
      for (const p of projects) {
        if (
          p.id === THREE_STREAMS_PROJECT_ID ||
          p.serverId === THREE_STREAMS_PROJECT_ID
        ) {
          tryFireFor(p.id);
        }
      }
    };

    useProjectStore.subscribe((state) => scan(state.projects));
    // Fire immediately if matching projects were already in the store at
    // module-init (hot-reload, persisted store rehydration).
    scan(useProjectStore.getState().projects);
  } catch (err) {
    console.warn('[seedThreeStreamsFarm] auto-run hook failed to attach', err);
  }
}
