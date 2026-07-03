/**
 * seedAuthoredSample — client-side replay of the user-authored replacement
 * sample (the counterpart to `captureSampleSeed.ts`).
 *
 * Capture walks `SYNCED_STORES` and reads each project slice with the exact
 * getter the multi-device sync uses (`selectForProject` /
 * `selectRecordsForProject`), plus the 6 typed-design/table stores read
 * directly. This module is the symmetric INVERSE: it walks the captured
 * snapshot and writes each slice back with that store's own **existing**
 * applier — `applyForProject` (versioned-blob) / `applyRecordForProject`
 * (typed-record) — and re-injects the 6 typed stores via a `setState` that
 * replaces only this project's rows. Because both directions ride the same
 * build-guaranteed `select`↔`apply` round-trip, the seed is complete by
 * construction: whatever sync round-trips, this round-trips.
 *
 * ── Dormancy ────────────────────────────────────────────────────────────────
 * The seed content lives in `content/authoredSampleSeed.ts`, which ships as
 * `null` until the user authors + captures the sample. While it is null this
 * seeder no-ops, so the clean slate (FLAGS.SEED_SAMPLES off + migration 056)
 * holds. The auto-run trigger is `projectStore`'s `onFinishHydration` block,
 * gated behind `FLAGS.SEED_AUTHORED_SAMPLE` (default off) via a lazy
 * `import()` so this module — and its heavy `syncManifest` dependency — never
 * enters the projectStore chunk when the flag is off.
 *
 * ── Idempotency ─────────────────────────────────────────────────────────────
 * A `authored-sample-seeded@v1:<pid>` localStorage sentinel guards against
 * re-seeding on reload; the project-row insert is additionally id-guarded, and
 * the appliers are all upserts/replaces, so a forced replay is non-destructive
 * of any other project's rows.
 *
 *   window.__ogdenSeedAuthoredSample()               // replay (honours sentinel)
 *   window.__ogdenSeedAuthoredSample({ force: true }) // replay ignoring sentinel
 */

import { SAMPLE_SEED_PROJECT_ID } from '@ogden/shared';
import { SYNCED_STORES } from '../lib/syncManifest.js';
import { useProjectStore, type LocalProject } from '../store/projectStore.js';
import type { CapturedStore, SampleSeedSnapshot } from './captureSampleSeed.js';
import { AUTHORED_SAMPLE_SEED } from './content/authoredSampleSeed.js';

// The 6 typed-design / typed-table stores that carry no generic manifest
// applier — written directly (mirror of captureSampleSeed's TYPED_STORE_READERS).
import { useZoneStore } from '../store/zoneStore.js';
import { useBuiltEnvironmentStoreV2 } from '../store/builtEnvironmentStoreV2.js';
import { usePathStore } from '../store/pathStore.js';
import { useUtilityStore } from '../store/utilityStore.js';
import { useVegetationStore } from '../store/vegetationStore.js';
import { useSuccessionStore } from '../store/successionStore.js';

/** localStorage idempotency sentinel prefix (see resetCleanSlate's sweep list). */
const SENTINEL_PREFIX = 'authored-sample-seeded@v1:';

/** The applier signature every manifest descriptor exposes at runtime — the
 *  descriptor's `store` handle is a Zustand hook, which carries `setState`
 *  even though the manifest types it as read-only. Same cast the sync path uses. */
type StoreApi = { getState: () => unknown; setState: (p: unknown) => void };

// ── Direct writers for the 6 typed stores (no manifest applier) ─────────────

interface TypedWriter {
  storeKey: string;
  /** Replace THIS project's rows in the flat array; keep every other project's. */
  write: (pid: string, records: unknown[]) => void;
}

const TYPED_STORE_WRITERS: TypedWriter[] = [
  {
    storeKey: 'ogden-zones',
    write: (pid, recs) =>
      useZoneStore.setState((s) => ({
        zones: [...s.zones.filter((z) => z.projectId !== pid), ...(recs as typeof s.zones)],
      })),
  },
  {
    storeKey: 'ogden-built-environment-v2',
    write: (pid, recs) =>
      useBuiltEnvironmentStoreV2.setState((s) => ({
        entities: [
          ...s.entities.filter((e) => e.projectId !== pid),
          ...(recs as typeof s.entities),
        ],
      })),
  },
  {
    storeKey: 'ogden-paths',
    write: (pid, recs) =>
      usePathStore.setState((s) => ({
        paths: [...s.paths.filter((p) => p.projectId !== pid), ...(recs as typeof s.paths)],
      })),
  },
  {
    storeKey: 'ogden-utilities',
    write: (pid, recs) =>
      useUtilityStore.setState((s) => ({
        utilities: [
          ...s.utilities.filter((u) => u.projectId !== pid),
          ...(recs as typeof s.utilities),
        ],
      })),
  },
  {
    storeKey: 'ogden-vegetation',
    write: (pid, recs) =>
      useVegetationStore.setState((s) => ({
        patches: [
          ...s.patches.filter((p) => p.projectId !== pid),
          ...(recs as typeof s.patches),
        ],
      })),
  },
  {
    storeKey: 'ogden-act-succession',
    write: (pid, recs) =>
      useSuccessionStore.setState((s) => ({
        milestones: [
          ...s.milestones.filter((m) => m.projectId !== pid),
          ...(recs as typeof s.milestones),
        ],
      })),
  },
];

const TYPED_WRITER_BY_KEY = new Map(TYPED_STORE_WRITERS.map((w) => [w.storeKey, w]));

// ── Per-store apply ─────────────────────────────────────────────────────────

/**
 * Re-inject one captured store slice for `pid`, dispatching on how it was
 * captured. Throws (fail-loud, mirroring capture's guard) if a store lacks the
 * applier its `kind` needs — a snapshot can only carry a kind capture produced,
 * so this only fires on a genuine manifest/registry drift.
 */
function applyCapturedStore(storeKey: string, captured: CapturedStore, pid: string): void {
  if (captured.kind === 'typed') {
    const writer = TYPED_WRITER_BY_KEY.get(storeKey);
    if (!writer) {
      throw new Error(
        `[seedAuthoredSample] no typed writer for "${storeKey}" — add it to TYPED_STORE_WRITERS.`,
      );
    }
    writer.write(pid, captured.records);
    return;
  }

  const d = SYNCED_STORES.find((x) => x.storeKey === storeKey);
  if (!d) {
    throw new Error(`[seedAuthoredSample] store "${storeKey}" is not in SYNCED_STORES.`);
  }
  if (!d.store) {
    throw new Error(`[seedAuthoredSample] store "${storeKey}" has no live handle.`);
  }
  const handle = d.store as unknown as StoreApi;

  if (captured.kind === 'blob') {
    if (!d.applyForProject) {
      throw new Error(`[seedAuthoredSample] store "${storeKey}" has no applyForProject.`);
    }
    d.applyForProject(handle, pid, captured.slice);
    return;
  }

  // kind === 'records'
  if (!d.applyRecordForProject) {
    throw new Error(`[seedAuthoredSample] store "${storeKey}" has no applyRecordForProject.`);
  }
  for (const { recordId, record } of captured.records) {
    d.applyRecordForProject(handle, pid, recordId, record);
  }
}

// ── Public entry point ──────────────────────────────────────────────────────

export interface SeedAuthoredResult {
  ok: boolean;
  reason?: string;
  pid?: string;
  /** Count of captured store slices re-injected. */
  storesApplied?: number;
}

export interface SeedAuthoredOptions {
  /** Replay even if the localStorage sentinel is already set. */
  force?: boolean;
  /** Inject a snapshot directly (tests / manual promotion) instead of the
   *  transcribed `AUTHORED_SAMPLE_SEED`. */
  seed?: SampleSeedSnapshot | null;
}

/**
 * Seed the single user-authored sample (SAMPLE_SEED_PROJECT_ID) into the live
 * client stores. No-op (dormant) while `AUTHORED_SAMPLE_SEED` is null. Idempotent
 * via the `authored-sample-seeded@v1:<pid>` sentinel + an id-guarded row insert.
 */
export function seedAuthoredSampleProject(opts: SeedAuthoredOptions = {}): SeedAuthoredResult {
  const snapshot = opts.seed ?? AUTHORED_SAMPLE_SEED;
  if (!snapshot) {
    // Dormant scaffold: no authored sample transcribed yet. The clean slate holds.
    return {
      ok: false,
      reason:
        'no authored sample seed present (content/authoredSampleSeed.ts exports null) — dormant',
    };
  }

  const pid = SAMPLE_SEED_PROJECT_ID;
  const sentinelKey = SENTINEL_PREFIX + pid;

  if (!opts.force && typeof localStorage !== 'undefined') {
    try {
      if (localStorage.getItem(sentinelKey)) {
        return {
          ok: false,
          reason: `${sentinelKey} sentinel already set; pass { force: true } to replay`,
          pid,
        };
      }
    } catch {
      // localStorage unavailable (privacy mode) — fall through and rely on the
      // id-equality guard + upsert appliers for idempotency.
    }
  }

  // 1. Insert the project row (id-guarded, so a replay or a pre-existing row is
  //    non-destructive). `id` is re-pinned to the sentinel defensively even
  //    though capture already rewrote it.
  const existing = useProjectStore.getState().projects.find((p) => p.id === pid);
  if (!existing) {
    const row: LocalProject = { ...snapshot.projectRow, id: pid };
    useProjectStore.setState((state) => ({ projects: [...state.projects, row] }));
  }

  // 2. Re-inject every captured store slice via the SAME appliers sync uses —
  //    the symmetric inverse of captureSampleSeed's getters.
  let storesApplied = 0;
  for (const [storeKey, captured] of Object.entries(snapshot.stores)) {
    applyCapturedStore(storeKey, captured, pid);
    storesApplied += 1;
  }

  // 3. Sentinel (best-effort). Uses the snapshot's fixed epoch, not wall-clock.
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(sentinelKey, snapshot.seededAt);
    } catch {
      // swallow — sentinel is best-effort; the appliers are idempotent anyway.
    }
  }

  console.info(
    `[seedAuthoredSample] seeded authored sample "${snapshot.projectRow.name ?? pid}" (${pid}) — ` +
      `${storesApplied} store slice(s).`,
  );
  return { ok: true, pid, storesApplied };
}

// Dev hook — mirror the other window.__ogdenSeed* tools. Registered when this
// module loads (the flag-gated lazy import in projectStore, or a manual import).
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenSeedAuthoredSample =
    seedAuthoredSampleProject;
}
