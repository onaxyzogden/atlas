/**
 * planSnapshot — capture/restore engine for Plan Versions (Plan-Operation
 * Phase 5b).
 *
 * A snapshot captures the COMPLETE per-project plan state so a version is a
 * true point-in-time record that can be restored (overwritten back onto the
 * live stores). Two sources are combined:
 *
 *   1. Manifest-driven (≈63 stores): every `SYNCED_STORES` descriptor of
 *      `classification === 'versioned-blob'` already carries a live `store`
 *      handle + `selectForProject` / `applyForProject`. We reuse that engine —
 *      EXCEPT we skip `ogden-plan-versions` itself (snapshotting the version
 *      store into a version would recurse and bloat).
 *   2. Typed-design adapter (4 stores): `ogden-zones`, `ogden-paths`,
 *      `ogden-utilities`, `ogden-built-environment-v2` are classified
 *      `typed-design-feature` and carry NO blob selectors in the manifest, yet
 *      they hold the most important geometry. Each is a flat array whose rows
 *      carry `projectId`, so a small local adapter selects/replaces this
 *      project's rows directly via the store's get/setState.
 *
 * The two `typed-table` stores (`ogden-vegetation`, `ogden-act-succession`)
 * are intentionally NOT snapshotted here — they are server-queried typed
 * tables, not part of the geometry-bearing plan-design surface this version
 * restores. Documented limitation (see the Phase 5b ADR).
 *
 * Strictly operational — no riba/gharar/CSRA/salam/financing semantics; a
 * snapshot is opaque per-store JSON.
 *
 * Size caveat: a full snapshot serialises all plan geometry into the
 * `ogden-plan-versions` blob in localStorage. Snapshots are explicit steward
 * actions (bounded volume), but the version store should keep only a small N.
 */

import { SYNCED_STORES } from '../../../lib/syncManifest.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useUtilityStore } from '../../../store/utilityStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { selectProjectRows, mergeProjectRows } from './planSnapshotMerge.js';

/** Monotonic snapshot shape version — bump only on a breaking blob change. */
export const PLAN_SNAPSHOT_SCHEMA_VERSION = 1 as const;

/**
 * The version store's own persist key. Skipped during capture so a snapshot
 * never contains the version history (no recursion, no bloat).
 */
const VERSION_STORE_KEY = 'ogden-plan-versions';

export interface PlanSnapshot {
  schemaVersion: number;
  capturedAt: string;
  /** Per-store project slice, keyed by the store's `ogden-*` persist key. */
  blobs: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────
// Typed-design-feature adapter — flat `projectId`-tagged arrays the manifest
// omits. Each store exposes a single array field on its state.
// ─────────────────────────────────────────────────────────────────────────

interface TypedDesignAdapter {
  storeKey: string;
  /** This project's rows. */
  select: (projectId: string) => unknown[];
  /** Replace this project's rows; leave every OTHER project untouched. */
  apply: (projectId: string, rows: unknown[]) => void;
}

/** Minimal Zustand store surface the adapter needs. */
interface ArrayStore {
  getState: () => Record<string, unknown>;
  setState: (
    updater: (s: Record<string, unknown>) => Record<string, unknown>,
  ) => void;
}

/**
 * Build an adapter for a store whose state holds one `projectId`-tagged array.
 * The select/replace logic lives in the pure, store-free `planSnapshotMerge`
 * helpers so the restore-safety invariant is unit-testable without importing
 * the live geometry stores.
 */
function arrayAdapter(
  storeKey: string,
  store: ArrayStore,
  field: string,
): TypedDesignAdapter {
  return {
    storeKey,
    select: (projectId) => selectProjectRows(store.getState()[field], projectId),
    apply: (projectId, rows) =>
      store.setState((s) => ({
        [field]: mergeProjectRows(s[field], projectId, rows),
      })),
  };
}

const TYPED_DESIGN_ADAPTERS: TypedDesignAdapter[] = [
  arrayAdapter('ogden-zones', useZoneStore as unknown as ArrayStore, 'zones'),
  arrayAdapter('ogden-paths', usePathStore as unknown as ArrayStore, 'paths'),
  arrayAdapter(
    'ogden-utilities',
    useUtilityStore as unknown as ArrayStore,
    'utilities',
  ),
  arrayAdapter(
    'ogden-built-environment-v2',
    useBuiltEnvironmentStoreV2 as unknown as ArrayStore,
    'entities',
  ),
];

/** The 4 geometry store keys covered by the typed-design adapter. */
const TYPED_DESIGN_KEYS: ReadonlySet<string> = new Set(
  TYPED_DESIGN_ADAPTERS.map((a) => a.storeKey),
);

// ─────────────────────────────────────────────────────────────────────────
// Capture / restore
// ─────────────────────────────────────────────────────────────────────────

type ApplyStore = { getState: () => unknown; setState: (p: unknown) => void };

/** Capture the complete plan state for one project into a `PlanSnapshot`. */
export function capturePlanSnapshot(projectId: string): PlanSnapshot {
  const blobs: Record<string, unknown> = {};

  // 1. Manifest-driven versioned-blob stores (skip the version store itself).
  for (const d of SYNCED_STORES) {
    if (d.classification !== 'versioned-blob') continue;
    if (d.storeKey === VERSION_STORE_KEY) continue;
    if (!d.store || !d.selectForProject) continue;
    blobs[d.storeKey] = d.selectForProject(d.store.getState(), projectId);
  }

  // 2. Typed-design-feature stores (no manifest selectors).
  for (const a of TYPED_DESIGN_ADAPTERS) {
    blobs[a.storeKey] = a.select(projectId);
  }

  return {
    schemaVersion: PLAN_SNAPSHOT_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    blobs,
  };
}

/**
 * Restore a snapshot onto the live stores for one project, OVERWRITING that
 * project's current plan state while leaving every other project untouched.
 * Destructive by design — callers must gate behind an explicit confirm.
 */
export function restorePlanSnapshot(
  projectId: string,
  snapshot: PlanSnapshot,
): void {
  const blobs = snapshot?.blobs ?? {};

  // 1. Manifest-driven versioned-blob stores.
  for (const d of SYNCED_STORES) {
    if (d.classification !== 'versioned-blob') continue;
    if (d.storeKey === VERSION_STORE_KEY) continue;
    if (!d.store || !d.applyForProject) continue;
    if (!(d.storeKey in blobs)) continue;
    d.applyForProject(
      d.store as unknown as ApplyStore,
      projectId,
      blobs[d.storeKey],
    );
  }

  // 2. Typed-design-feature stores.
  for (const a of TYPED_DESIGN_ADAPTERS) {
    if (!(a.storeKey in blobs)) continue;
    a.apply(projectId, blobs[a.storeKey] as unknown[]);
  }
}

/**
 * A small confidence summary for the UI: how many stores were captured and
 * how many geometry features (the 4 typed-design stores) the snapshot holds.
 */
export function summarizeSnapshot(snapshot: PlanSnapshot): {
  stores: number;
  features: number;
} {
  const blobs = snapshot?.blobs ?? {};
  let features = 0;
  for (const key of TYPED_DESIGN_KEYS) {
    const arr = blobs[key];
    if (Array.isArray(arr)) features += arr.length;
  }
  return { stores: Object.keys(blobs).length, features };
}
