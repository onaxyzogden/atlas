/**
 * seedMtcRotationFixture — seeds a multi-species, summer-spanning
 * rotational-grazing fixture on the Moontrance Creek demo project
 * (`mtc`) so the B3-fidelity sequencer surfaces are actually visible.
 *
 * Background: the three B3 sequencer-fidelity slices (multi-species AU
 * rollup, season-aware rest, polyface follower sequencing) shipped with
 * unit coverage, but their two *visible* surfaces in `RotationSequenceCard`
 * never had data to render against on `mtc` — the demo project had no
 * paddocks and no rotation plan. This fixture closes that gap:
 *
 *   1. "summer rest +Nd" note — renders when a move's graze-out date lands
 *      in the hemisphere's protein slump and `seasonAdjustedRestDays >
 *      restDaysUntilNextGraze`. `mtc`'s boundary centroid sits at ~44.5°N
 *      (northern hemisphere) so the slump is Jul/Aug; anchoring the plan
 *      `startDateISO` to 2026-07-01 lands the first move-outs in July.
 *   2. Follower sub-rows — render when a paddock's `species[]` spans ≥2
 *      grazing-niche tiers. Each fixture paddock lists cattle (grazer) +
 *      sheep (mixed) + poultry (mobile) = 3 tiers ⇒ a lead cattle move plus
 *      two follower rows (sheep +3d, poultry +6d). The 3-species blend also
 *      exercises the multi-species mean-AU rollup.
 *
 * Geometry is hand-authored inside the MTC mock boundary
 * [-78.211, 44.4965] → [-78.189, 44.5035] (projectStore MTC_SEED): three
 * ~9 ha longitude strips in the south band, beside the existing Observe
 * pastures (additive — `seedMtcObserveBaseline` data is untouched).
 *
 * Idempotent: a `mtc-rotation-fixture-seeded@v1` localStorage sentinel plus
 * a "skip if mtc already has paddocks" guard prevent re-seeding on reload.
 *
 * Auto-runs from a one-shot `useProjectStore.subscribe` registration below
 * that fires the first time the `mtc` project row is present in the local
 * store (it is seeded on projectStore hydrate, so this typically fires
 * immediately). Also exposed as `window.__ogdenSeedMtcRotationFixture()`
 * for manual replay (`{ force: true }` to overwrite).
 *
 * Pure fixture data — no schema/store-action/migration changes. "Capacity"
 * here is animal-unit grazing load only (non-covenant, B-series).
 */

import {
  useLivestockStore,
  type Paddock,
  type LivestockSpecies,
} from '../store/livestockStore.js';
import { useRotationPlanStore } from '../store/rotationPlanStore.js';
import type { RotationCell } from '../features/livestock/rotationSequenceMath.js';
import { pushRotationSequenceToSpine } from '../features/livestock/rotationSequenceSpineSync.js';
import { useWorkItemStore } from '../store/workItemStore.js';
import { useProjectStore } from '../store/projectStore.js';

const MTC_PROJECT_ID = 'mtc';
const SENTINEL_KEY = 'mtc-rotation-fixture-seeded@v1';
const CELL_GROUP = 'mtc-polyface-Y2';
const START_DATE_ISO = '2026-07-01'; // NH summer slump anchor — first move-outs land in July
const HORIZON_CYCLES = 2;

/** cattle (grazer) + sheep (mixed) + poultry (mobile) = 3 follower tiers. */
const POLYFACE_SPECIES: LivestockSpecies[] = ['cattle', 'sheep', 'poultry'];

// Three ~9 ha longitude strips in the MTC south band (lat 44.4972–44.4988),
// beside the existing Observe pastures. lon bounds yield 3 equal strips.
const PADDOCK_LON_BOUNDS = [-78.208, -78.2014, -78.1948, -78.1882];
const PADDOCK_LAT_SOUTH = 44.4972;
const PADDOCK_LAT_NORTH = 44.4988;
const PADDOCK_AREA_M2 = 92700; // ~524 m × ~177 m at 44.5°N

interface SeedResult {
  ok: boolean;
  reason?: string;
  inserted?: { paddocks: number; rotationCells: number; rotationSpineItems: number };
}

function paddockId(i: number): string {
  return `mtc-paddock-${i}`;
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

function buildPaddocks(projectId: string): Paddock[] {
  const now = new Date('2026-05-25T12:00:00Z').toISOString();
  const out: Paddock[] = [];
  for (let i = 1; i <= 3; i++) {
    out.push({
      id: paddockId(i),
      projectId,
      name: `Polyface paddock ${i}`,
      color: '#65a30d',
      geometry: rect(i),
      areaM2: PADDOCK_AREA_M2,
      grazingCellGroup: CELL_GROUP,
      species: [...POLYFACE_SPECIES],
      stockingDensity: 2,
      pastureQuality: 'fair',
      fencing: 'electric',
      guestSafeBuffer: true,
      waterPointNote: 'Mobile trough on the rotation lane.',
      shelterNote: 'Hedgerow windbreak on the south boundary.',
      phase: 'Perennials + Livestock',
      notes:
        'Salatin-style polyface cell — cattle lead, sheep + mobile poultry follow. ' +
        '5-day graze / 40-day target rest (stretched in the Jul–Aug protein slump).',
      createdAt: now,
      updatedAt: now,
    });
  }
  return out;
}

function buildRotationCells(): RotationCell[] {
  const out: RotationCell[] = [];
  for (let i = 1; i <= 3; i++) {
    out.push({
      paddockId: paddockId(i),
      cellGroup: CELL_GROUP,
      sequenceOrder: i - 1,
      targetGrazeDays: 5,
      targetRestDays: 40,
    });
  }
  return out;
}

export function seedMtcRotationFixture(opts: { force?: boolean } = {}): SeedResult {
  if (!opts.force && typeof localStorage !== 'undefined') {
    try {
      if (localStorage.getItem(SENTINEL_KEY)) {
        return {
          ok: false,
          reason: 'mtc-rotation-fixture-seeded@v1 sentinel already set; pass { force: true } to replay',
        };
      }
    } catch {
      // localStorage unavailable (privacy mode, etc.) — fall through and rely
      // on the per-store idempotency check below.
    }
  }

  const livestock = useLivestockStore.getState();
  const existing = livestock.paddocks.filter((p) => p.projectId === MTC_PROJECT_ID);

  if (!opts.force && existing.length > 0) {
    const reason = `mtc already has ${existing.length} paddocks; pass { force: true } to overwrite`;
    console.warn('[seedMtcRotationFixture]', reason);
    return { ok: false, reason };
  }

  if (opts.force) {
    existing.forEach((p) => livestock.deletePaddock(p.id));
  }

  // 1) Paddocks (id-equality guard so a partial re-seed is non-destructive).
  const existingIds = new Set(
    useLivestockStore
      .getState()
      .paddocks.filter((p) => p.projectId === MTC_PROJECT_ID)
      .map((p) => p.id),
  );
  let paddocksAdded = 0;
  for (const p of buildPaddocks(MTC_PROJECT_ID)) {
    if (existingIds.has(p.id)) continue;
    useLivestockStore.getState().addPaddock(p);
    paddocksAdded++;
  }

  // 2) Rotation plan (per-project store). setPlan first, then options.
  const rotationCells = buildRotationCells();
  const rotation = useRotationPlanStore.getState();
  rotation.setPlan(MTC_PROJECT_ID, rotationCells);
  rotation.setPlanOptions(MTC_PROJECT_ID, {
    startDateISO: START_DATE_ISO,
    horizonCycles: HORIZON_CYCLES,
  });

  // 3) Project the plan onto the canonical spine (reads paddocks + plan, so
  //    must run after the writes above).
  pushRotationSequenceToSpine(MTC_PROJECT_ID);
  const rotationSpineItems = useWorkItemStore
    .getState()
    .items.filter(
      (it) => it.projectId === MTC_PROJECT_ID && it.source === 'rotation-sequence',
    ).length;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SENTINEL_KEY, new Date().toISOString());
    } catch {
      // swallow — sentinel is best-effort.
    }
  }

  console.info(
    `[seedMtcRotationFixture] seeded ${paddocksAdded} polyface paddocks + ${rotationCells.length}-cell rotation plan (start ${START_DATE_ISO}, ${HORIZON_CYCLES} cycles) on project "mtc".`,
  );

  return {
    ok: true,
    inserted: {
      paddocks: paddocksAdded,
      rotationCells: rotationCells.length,
      rotationSpineItems,
    },
  };
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenSeedMtcRotationFixture =
    seedMtcRotationFixture;
}

// ─────────────────────────────────────────────────────────────────────────
// Auto-run hook. Subscribes to projectStore once at module-init and fires the
// seeder the first time the `mtc` project row appears (it is seeded on
// projectStore hydrate, so the immediate-fire branch typically wins). The
// localStorage sentinel + per-store idempotency guard prevent re-runs on
// subsequent reloads. The subscription unsubscribes itself after firing.
// ─────────────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  try {
    const unsubscribe = useProjectStore.subscribe((state) => {
      const hit = state.projects.find((p) => p.id === MTC_PROJECT_ID);
      if (!hit) return;
      unsubscribe();
      // Defer to next tick so other hydration settles first.
      queueMicrotask(() => {
        seedMtcRotationFixture();
      });
    });
    // Fire immediately if `mtc` was already in the store at module-init
    // (persisted-store rehydration / hot reload).
    const already = useProjectStore
      .getState()
      .projects.find((p) => p.id === MTC_PROJECT_ID);
    if (already) {
      unsubscribe();
      queueMicrotask(() => {
        seedMtcRotationFixture();
      });
    }
  } catch (err) {
    console.warn('[seedMtcRotationFixture] auto-run hook failed to attach', err);
  }
}
