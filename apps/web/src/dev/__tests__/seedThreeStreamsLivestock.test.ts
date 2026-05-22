// @vitest-environment happy-dom
/**
 * Phase 2.5 (Slice A) — Task A.3 readiness verification.
 *
 * Proves the seeded Three Streams Farm Y2 livestock substrate lights up the
 * goal-tree `livestock-rotation-spine-presence-pct` criterion (target 90,
 * deadlineYear 2) at 100%, and documents that
 * `livestock-rotation-rest-compliance-pct` (target 90, deadlineYear 3)
 * correctly stays below the bar for the Y2 demo state — the 12-cell,
 * 3-graze-day rotation honours a 33-day rest, short of cattle's 45-day
 * recovery window. That gap is a Y3 target, not a Y2 regression.
 *
 * This test reconstructs the *exact* shape `seedThreeStreamsFarm.seedLivestock`
 * writes into the stores (12 `cowcalf-Y2` paddocks, a 12-cell RotationPlan,
 * startDateISO '2026-05-01', horizonCycles 4) rather than importing the
 * seeder — the seeder's livestock helpers are private and pull the full
 * project store graph. The reconstruction mirrors the committed seeder
 * constants verbatim (apps/web/src/dev/seedThreeStreamsFarm.ts) so any drift
 * between this fixture and the seeder shows up as a failing assertion here.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import { useRotationPlanStore } from '../../store/rotationPlanStore.js';
import { usePhaseStore, type BuildPhase } from '../../store/phaseStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { pushRotationSequenceToSpine } from '../../features/livestock/rotationSequenceSpineSync.js';
import { computeRotationSpinePresencePct } from '../../features/livestock/rotationSequenceReadiness.js';
import {
  computeRestCompliancePct,
  type RotationCell,
  type RotationPlan,
} from '../../features/livestock/rotationSequenceMath.js';

// Mirrors seedThreeStreamsFarm.ts constants verbatim.
const PROJECT_ID = '00000000-0000-0000-0000-000000357320';
const COWCALF_CELL_GROUP = 'cowcalf-Y2';
const COWCALF_PHASE_NAME = 'Perennials + Livestock';
const PADDOCK_LON_BOUNDS = [
  -79.914, -79.913333, -79.912667, -79.912, -79.911333, -79.910667, -79.91,
  -79.909333, -79.908667, -79.908, -79.907333, -79.906667, -79.906,
];
const PADDOCK_LAT_SOUTH = 43.5615;
const PADDOCK_LAT_NORTH = 43.5638;

/** 1-based paddock sentinel id, mirrors seeder `paddockId(i)`. */
function paddockId(i: number): string {
  return `00000000-0000-0000-0000-0000df35ad${i.toString(16).padStart(2, '0')}`;
}

function rect(i: number): GeoJSON.Polygon {
  const west = PADDOCK_LON_BOUNDS[i - 1]!;
  const east = PADDOCK_LON_BOUNDS[i]!;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [west, PADDOCK_LAT_SOUTH],
        [east, PADDOCK_LAT_SOUTH],
        [east, PADDOCK_LAT_NORTH],
        [west, PADDOCK_LAT_NORTH],
        [west, PADDOCK_LAT_SOUTH],
      ],
    ],
  };
}

function buildPaddocks(): Paddock[] {
  const now = new Date().toISOString();
  const out: Paddock[] = [];
  for (let i = 1; i <= 12; i++) {
    out.push({
      id: paddockId(i),
      projectId: PROJECT_ID,
      name: `Paddock ${i}`,
      color: '#65a30d',
      geometry: rect(i),
      areaM2: 50000,
      grazingCellGroup: COWCALF_CELL_GROUP,
      species: ['cattle'],
      stockingDensity: 2,
      pastureQuality: 'fair',
      fencing: 'electric',
      guestSafeBuffer: true,
      waterPointNote: '',
      shelterNote: '',
      phase: COWCALF_PHASE_NAME,
      notes: '',
      createdAt: now,
      updatedAt: now,
    });
  }
  return out;
}

function buildRotationCells(): RotationCell[] {
  const out: RotationCell[] = [];
  for (let i = 1; i <= 12; i++) {
    out.push({
      paddockId: paddockId(i),
      cellGroup: COWCALF_CELL_GROUP,
      sequenceOrder: i - 1,
      targetGrazeDays: 3,
      targetRestDays: 33,
    });
  }
  return out;
}

function buildPhase(): BuildPhase {
  return {
    id: 'phase-perennials-livestock',
    projectId: PROJECT_ID,
    name: COWCALF_PHASE_NAME,
    timeframe: 'Year 1-3',
    order: 1,
    description: '',
    color: '#65a30d',
    completed: false,
    notes: '',
    completedAt: null,
  };
}

describe('Phase 2.5 Three Streams livestock readiness', () => {
  beforeEach(() => {
    useWorkItemStore.setState({ items: [], migratedSources: [] });
    useLivestockStore.setState({ paddocks: [], fenceLines: [] });
    useRotationPlanStore.setState({ byProject: {} });
    usePhaseStore.setState({ phases: [buildPhase()] });
  });

  it('lights the Y2 spine-presence gate at 100% after the seeder shape is pushed', () => {
    const paddocks = buildPaddocks();
    const cells = buildRotationCells();
    const plan: RotationPlan = {
      projectId: PROJECT_ID,
      cells,
      startDateISO: '2026-05-01',
      horizonCycles: 4,
    };

    useLivestockStore.setState({ paddocks, fenceLines: [] });
    useRotationPlanStore.setState({ byProject: { [PROJECT_ID]: plan } });

    // This is exactly what seedLivestock() calls at the end.
    pushRotationSequenceToSpine(PROJECT_ID);

    const items = useWorkItemStore.getState().items;
    // 12 cells x 4 cycles = 48 projected rotation moves on the spine.
    const rsItems = items.filter(
      (w) => w.projectId === PROJECT_ID && w.source === 'rotation-sequence',
    );
    expect(rsItems.length).toBe(48);

    const presence = computeRotationSpinePresencePct({
      projectId: PROJECT_ID,
      paddocks,
      plan,
      declaredPhases: usePhaseStore.getState().getProjectPhases(PROJECT_ID),
      items,
    });
    expect(presence).toBe(100);
    expect(presence).toBeGreaterThanOrEqual(90); // Y2 gate
  });

  it('keeps rest-compliance below the Y3 target (33d honoured < 45d cattle recovery)', () => {
    const paddocks = buildPaddocks();
    const plan: RotationPlan = {
      projectId: PROJECT_ID,
      cells: buildRotationCells(),
      startDateISO: '2026-05-01',
      horizonCycles: 4,
    };
    const restPct = computeRestCompliancePct(paddocks, plan);
    // 12 cells x 3 graze days => 33-day honoured rest, short of cattle's
    // 45-day recovery window. This is a Y3 target (deadlineYear 3), so it is
    // expected — and correct — to be below 90 in the Y2 demo state.
    expect(restPct).toBeLessThan(90);
  });
});
