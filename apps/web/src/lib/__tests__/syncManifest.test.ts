// @vitest-environment happy-dom
/**
 * syncManifest coverage guard.
 *
 * The single failure mode this closes: a project-scoped store is added but
 * silently NOT synced, so a multi-device tester loses it without warning
 * (the original P0-1). The fix is a registry that is the single source of
 * truth for which `ogden-` persisted store is synced and how — and a CI
 * guard that fails the build the moment a persisted store is not classified
 * in either `SYNCED_STORES` or `DEVICE_GLOBAL`.
 *
 * The enumeration here scans store source for the persist `name:` (resolving
 * a `const`-referenced key, e.g. builtEnvironmentStoreV2's `V2_STORAGE_KEY`,
 * which a naive literal regex would miss — and that store IS one of the four
 * already synced, so missing it would be the exact bug we are guarding).
 * Keys outside the `ogden-` namespace are out of contract (mirrors
 * projectBundle's prefix scope).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SYNCED_STORES,
  DEVICE_GLOBAL,
  type SyncClassification,
} from '../syncManifest.js';

const here = dirname(fileURLToPath(import.meta.url));
const storeDir = join(here, '..', '..', 'store');

/** Extra persist-using files outside `src/store/`. */
const EXTRA_PERSIST_FILES = [
  join(here, '..', '..', 'v3', 'observe', 'components', 'measure', 'useMapToolStore.ts'),
];

/**
 * Extract every persisted `ogden-` key declared in a source file. Handles
 * both `name: 'ogden-x'` and `name: CONST` where `const CONST = 'ogden-x'`
 * in the same file. Non-`ogden-` persist names are returned as-is so the
 * caller can decide they are out of namespace.
 */
function extractPersistKeys(source: string): string[] {
  if (!/\bpersist\s*[(<]/.test(source)) return [];
  const keys: string[] = [];
  const nameRe = /name:\s*(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))/g;
  let m: RegExpExecArray | null;
  while ((m = nameRe.exec(source)) !== null) {
    if (m[1]) {
      keys.push(m[1]);
      continue;
    }
    const ident = m[2];
    if (!ident) continue;
    const constRe = new RegExp(
      `(?:const|let|var)\\s+${ident}\\s*(?::[^=]+)?=\\s*['"]([^'"]+)['"]`,
    );
    const cm = constRe.exec(source);
    if (cm?.[1]) keys.push(cm[1]);
  }
  return keys;
}

function allPersistedOgdenKeys(): Set<string> {
  const files = readdirSync(storeDir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => join(storeDir, f))
    .concat(EXTRA_PERSIST_FILES);

  const keys = new Set<string>();
  for (const file of files) {
    let src: string;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const k of extractPersistKeys(src)) {
      if (k.startsWith('ogden-')) keys.add(k);
    }
  }
  return keys;
}

const classifiedKeys = new Set<string>([
  ...SYNCED_STORES.map((d) => d.storeKey),
  ...DEVICE_GLOBAL,
]);

describe('syncManifest coverage guard', () => {
  it('classifies every persisted ogden- store (no silently-missed store)', () => {
    const discovered = allPersistedOgdenKeys();
    const unclassified = [...discovered].filter((k) => !classifiedKeys.has(k)).sort();
    expect(
      unclassified,
      `Unclassified persisted ogden- stores. Add each to SYNCED_STORES ` +
        `(project-scoped) or DEVICE_GLOBAL (device-local) in syncManifest.ts:\n` +
        unclassified.map((k) => `  - ${k}`).join('\n'),
    ).toEqual([]);
  });

  it('finds a non-trivial number of persisted stores (scanner sanity)', () => {
    // Guards against the scanner silently matching nothing and the guard
    // above passing vacuously.
    expect(allPersistedOgdenKeys().size).toBeGreaterThan(50);
  });

  it('keeps the design_features-mapped stores on the typed-design-feature path (no blob double-write)', () => {
    const designFeatureKeys = [
      'ogden-built-environment-v2',
      'ogden-zones',
    ];
    for (const key of designFeatureKeys) {
      const entry = SYNCED_STORES.find((d) => d.storeKey === key);
      expect(entry, `${key} must be in SYNCED_STORES`).toBeDefined();
      expect(
        entry?.classification,
        `${key} must be classified 'typed-design-feature' so the blob path ` +
          `cannot double-write the design_features surface`,
      ).toBe<SyncClassification>('typed-design-feature');
    }
  });

  it('keeps vegetation + succession on the typed-table path (P3-c5, no blob double-write)', () => {
    // These two have real queryable Postgres tables + routes (P3-c2) and
    // a dedicated client write-through/hydrate path (P3-c3/c4). If either
    // drifts to versioned-blob it would ALSO be picked up by the generic
    // blob loop → double-write + temporal-undo pollution. Pin typed-table.
    const typedTableKeys = ['ogden-vegetation', 'ogden-act-succession'];
    for (const key of typedTableKeys) {
      const entry = SYNCED_STORES.find((d) => d.storeKey === key);
      expect(entry, `${key} must be in SYNCED_STORES`).toBeDefined();
      expect(
        entry?.classification,
        `${key} must be 'typed-table' so the versioned-blob loop cannot ` +
          `double-write it`,
      ).toBe<SyncClassification>('typed-table');
    }
    // Belt-and-braces: no typed-table key leaks into the blob loop's filter.
    const blobKeys = SYNCED_STORES.filter(
      (d) => d.classification === 'versioned-blob',
    ).map((d) => d.storeKey);
    for (const key of typedTableKeys) {
      expect(blobKeys, `${key} must not be in the versioned-blob set`).not.toContain(key);
    }
  });

  it('has no key in both SYNCED_STORES and DEVICE_GLOBAL, and no duplicate storeKeys', () => {
    const syncedKeys = SYNCED_STORES.map((d) => d.storeKey);
    expect(new Set(syncedKeys).size, 'duplicate storeKey in SYNCED_STORES').toBe(
      syncedKeys.length,
    );
    const overlap = syncedKeys.filter((k) => DEVICE_GLOBAL.has(k));
    expect(overlap, 'a store cannot be both synced and device-global').toEqual([]);
  });

  it('gives every versioned-blob store live transport metadata (P2.5b)', () => {
    // The generic subscription/queue loop needs, for each versioned-blob
    // store: a live store handle to subscribe to + read, a project-slice
    // selector, a scope, and the schemaVersion for the version-skew guard.
    // Missing any of these for a blob store = that store silently never
    // syncs once the loop is generic — the exact P0-1 failure, reborn.
    const blobs = SYNCED_STORES.filter((d) => d.classification === 'versioned-blob');
    expect(blobs.length).toBeGreaterThan(50);
    const incomplete = blobs
      .filter(
        (d) =>
          !d.store ||
          typeof d.store.getState !== 'function' ||
          typeof d.store.subscribe !== 'function' ||
          typeof d.selectForProject !== 'function' ||
          !d.scope ||
          typeof d.schemaVersion !== 'number',
      )
      .map((d) => d.storeKey);
    expect(
      incomplete,
      `versioned-blob stores missing transport metadata ` +
        `(store/selectForProject/scope/schemaVersion):\n` +
        incomplete.map((k) => `  - ${k}`).join('\n'),
    ).toEqual([]);
  });

  it('selectForProject returns a defined slice for the active-project shape', () => {
    // Smoke: a selector must not throw on an empty store state and must
    // return something serialisable (not undefined) for the blob payload.
    for (const d of SYNCED_STORES.filter((x) => x.classification === 'versioned-blob')) {
      const state = d.store!.getState();
      const slice = d.selectForProject!(state, '__no-such-project__');
      expect(slice, `${d.storeKey} selector returned undefined`).not.toBeUndefined();
    }
  });

  it('every versioned-blob store can apply a hydrated slice back (P4)', () => {
    // Hydration on device B writes the server slice back into the store via
    // applyForProject. Missing it = the store never restores = P0-1 reborn
    // on the read side. It must be a function for every blob store.
    const missing = SYNCED_STORES.filter(
      (d) => d.classification === 'versioned-blob' && typeof d.applyForProject !== 'function',
    ).map((d) => d.storeKey);
    expect(missing, `versioned-blob stores missing applyForProject:\n` + missing.join('\n')).toEqual([]);
  });

  it('select→apply round-trips a project slice and isolates other projects', () => {
    // byProject shape
    const hz = SYNCED_STORES.find((d) => d.storeKey === 'ogden-hazards')!;
    const hzState: any = {
      byProject: { A: { hazards: [{ id: 'a1' }] }, B: { hazards: [{ id: 'b1' }] } },
    };
    let hzStore: any = { ...hzState };
    const hzHandle = {
      getState: () => hzStore,
      setState: (p: any) => {
        hzStore = { ...hzStore, ...(typeof p === 'function' ? p(hzStore) : p) };
      },
    };
    const sliceA = hz.selectForProject!(hzState, 'A');
    expect(sliceA).toEqual([{ id: 'a1' }]);
    hz.applyForProject!(hzHandle as never, 'A', [{ id: 'a1' }, { id: 'a2' }]);
    expect(hzStore.byProject.A.hazards).toEqual([{ id: 'a1' }, { id: 'a2' }]);
    expect(hzStore.byProject.B.hazards).toEqual([{ id: 'b1' }]); // untouched

    // projectId-tagged shape (ogden-utility-runs stays a versioned-blob per
    // the 2026-05-22 typed-promotion ADR, so it is a stable example here)
    const ur = SYNCED_STORES.find((d) => d.storeKey === 'ogden-utility-runs')!;
    let urStore: any = { runs: [{ id: 'r1', projectId: 'A' }, { id: 'r2', projectId: 'B' }] };
    const urHandle = {
      getState: () => urStore,
      setState: (p: any) => {
        urStore = { ...urStore, ...(typeof p === 'function' ? p(urStore) : p) };
      },
    };
    expect(ur.selectForProject!(urStore, 'A')).toEqual({ runs: [{ id: 'r1', projectId: 'A' }] });
    ur.applyForProject!(urHandle as never, 'A', { runs: [{ id: 'r1b', projectId: 'A' }] });
    expect(urStore.runs).toEqual([
      { id: 'r2', projectId: 'B' },
      { id: 'r1b', projectId: 'A' },
    ]);
  });

  it('keeps the 4 Act stores on the typed-record path (ADR 7 P1, no blob double-write)', () => {
    // The Act stores moved from versioned-blob to typed-record so each record
    // syncs with its own rev/tier. If any drifts back to versioned-blob it
    // would ALSO be carried by the generic blob loop → double-write + the
    // opaque-payload tier-erasure this rework exists to fix. Pin typed-record.
    const actKeys = [
      'ogden-field-actions',
      'ogden-observe-feed',
      'ogden-observe-data-points',
      'ogden-observe-cycles',
    ];
    for (const key of actKeys) {
      const entry = SYNCED_STORES.find((d) => d.storeKey === key);
      expect(entry, `${key} must be in SYNCED_STORES`).toBeDefined();
      expect(
        entry?.classification,
        `${key} must be 'typed-record' so the versioned-blob loop cannot ` +
          `double-write it`,
      ).toBe<SyncClassification>('typed-record');
    }
    const blobKeys = SYNCED_STORES.filter(
      (d) => d.classification === 'versioned-blob',
    ).map((d) => d.storeKey);
    for (const key of actKeys) {
      expect(blobKeys, `${key} must not be in the versioned-blob set`).not.toContain(key);
    }
  });

  it('keeps the work spine on the typed-record path with its blob hydrate fallback (2026-06-12 promotion)', () => {
    // ogden-work-items promoted versioned-blob → typed-record (ADR
    // 2026-06-12-atlas-work-items-typed-record-transport): per-row LWW with
    // steward-escalated conflicts instead of silent whole-blob loss. Drifting
    // back to versioned-blob would reintroduce double-write + blob LWW.
    const wi = SYNCED_STORES.find((d) => d.storeKey === 'ogden-work-items');
    expect(wi, 'ogden-work-items must be in SYNCED_STORES').toBeDefined();
    expect(wi?.classification).toBe<SyncClassification>('typed-record');
    expect(wi?.scope).toBe('projectId-tagged');
    expect(wi?.schemaVersion).toBe(4);
    // The one-time hydrate fallback for pre-promotion server blobs is OPT-IN
    // and only the promoted store carries it — the 7 born-typed stores keep
    // the abandon-silently precedent (ogden-paths).
    expect(typeof wi?.applyBlobFallbackForProject).toBe('function');
    const withFallback = SYNCED_STORES.filter(
      (d) =>
        d.classification === 'typed-record' &&
        typeof d.applyBlobFallbackForProject === 'function',
    ).map((d) => d.storeKey);
    expect(withFallback).toEqual(['ogden-work-items']);
  });

  it('work-items recordTaggedArray shape: per-project enumeration, WorkItem meta, single-row upsert', () => {
    const wi = SYNCED_STORES.find((d) => d.storeKey === 'ogden-work-items')!;
    const state: any = {
      items: [
        {
          id: 'lvw__r1__2026-07-01',
          projectId: 'A',
          source: 'livestock-plan',
          category: 'animal-care',
          updatedAt: '2026-06-12T08:00:00.000Z',
        },
        { id: 'w2', projectId: 'A' },
        { id: 'w3', projectId: 'B', source: 'manual' },
        { projectId: 'A' }, // no id → no stable sync key, skipped
      ],
      migratedSources: ['legacy'],
    };
    const recs = wi.selectRecordsForProject!(state, 'A');
    expect(recs.map((r) => r.recordId)).toEqual(['lvw__r1__2026-07-01', 'w2']);
    // WorkItem meta: observed_at ← updatedAt (every mutation bumps it),
    // source_type ← source, task_type ← category; absent fields send null.
    expect(recs[0]!.meta).toEqual({
      observedAt: '2026-06-12T08:00:00.000Z',
      sourceType: 'livestock-plan',
      cycleId: null,
      taskType: 'animal-care',
    });
    expect(recs[1]!.meta).toEqual({
      observedAt: null,
      sourceType: null,
      cycleId: null,
      taskType: null,
    });
    // apply upserts ONE row by id; project B's row and the unrelated
    // device-local field stay untouched.
    let live = { ...state };
    const handle = {
      getState: () => live,
      setState: (p: any) => {
        live = { ...live, ...(typeof p === 'function' ? p(live) : p) };
      },
    };
    wi.applyRecordForProject!(handle as never, 'A', 'w2', {
      id: 'w2',
      projectId: 'A',
      source: 'manual',
    });
    expect(live.items.find((r: any) => r.id === 'w2')).toEqual({
      id: 'w2',
      projectId: 'A',
      source: 'manual',
    });
    expect(live.items.filter((r: any) => r.projectId === 'B')).toEqual([
      { id: 'w3', projectId: 'B', source: 'manual' },
    ]);
    expect(live.migratedSources).toEqual(['legacy']);
    // unseen recordId → insert (server row this device has never held)
    wi.applyRecordForProject!(handle as never, 'A', 'w9', { id: 'w9', projectId: 'A' });
    expect(live.items.some((r: any) => r.id === 'w9')).toBe(true);
    // blob fallback applier replaces ONLY this project's rows (tagged shape)
    wi.applyBlobFallbackForProject!(handle as never, 'A', {
      items: [{ id: 'blob1', projectId: 'A' }],
    });
    expect(live.items.filter((r: any) => r.projectId === 'A').map((r: any) => r.id)).toEqual([
      'blob1',
    ]);
    expect(live.items.filter((r: any) => r.projectId === 'B')).toHaveLength(1);
  });

  it('gives every typed-record store live transport metadata (ADR 7 P1)', () => {
    // Per-record analogue of the versioned-blob transport-metadata guard: the
    // typed-record subscribe/enqueue/hydrate loop needs a live store handle, a
    // per-record selector + applier, a scope, and the schemaVersion for the
    // version-skew guard. Missing any = that Act store silently never syncs.
    const records = SYNCED_STORES.filter((d) => d.classification === 'typed-record');
    // 4 Act stores (ADR 7 P1) + 3 olos record stores (Phase 3B): observations,
    // proofs, verifications + the work spine (ogden-work-items, promoted from
    // versioned-blob 2026-06-12) — all on the same per-record transport.
    expect(records.length).toBe(8);
    const incomplete = records
      .filter(
        (d) =>
          !d.store ||
          typeof d.store.getState !== 'function' ||
          typeof d.store.subscribe !== 'function' ||
          typeof d.selectRecordsForProject !== 'function' ||
          typeof d.applyRecordForProject !== 'function' ||
          !d.scope ||
          typeof d.schemaVersion !== 'number',
      )
      .map((d) => d.storeKey);
    expect(
      incomplete,
      `typed-record stores missing transport metadata ` +
        `(store/selectRecordsForProject/applyRecordForProject/scope/schemaVersion):\n` +
        incomplete.map((k) => `  - ${k}`).join('\n'),
    ).toEqual([]);
  });

  it('typed-record selectRecordsForProject is total on empty state (no throw, returns [])', () => {
    for (const d of SYNCED_STORES.filter((x) => x.classification === 'typed-record')) {
      const state = d.store!.getState();
      const recs = d.selectRecordsForProject!(state, '__no-such-project__');
      expect(Array.isArray(recs), `${d.storeKey} selector did not return an array`).toBe(true);
      expect(recs, `${d.storeKey} selector returned records for an unknown project`).toEqual([]);
    }
  });

  it('typed-record array shape: select enumerates records + apply upserts one, isolating others', () => {
    // field-actions is the byProject ARRAY shape (recordId = record.id).
    const fa = SYNCED_STORES.find((d) => d.storeKey === 'ogden-field-actions')!;
    const faState: any = {
      byProject: {
        A: [
          { id: 'a1', cycleId: 'baseline', sourceType: 'plan', taskType: 'field_survey' },
          { id: 'a2', cycleId: 3 },
        ],
        B: [{ id: 'b1' }],
      },
    };
    const recsA = fa.selectRecordsForProject!(faState, 'A');
    expect(recsA.map((r) => r.recordId)).toEqual(['a1', 'a2']);
    // meta denormalises the tier hints; cycleId is coerced to string.
    expect(recsA[0]!.meta).toMatchObject({
      cycleId: 'baseline',
      sourceType: 'plan',
      taskType: 'field_survey',
    });
    expect(recsA[1]!.meta).toMatchObject({ cycleId: '3' });

    let faStore: any = {
      byProject: { A: [...faState.byProject.A], B: [...faState.byProject.B] },
    };
    const faHandle = {
      getState: () => faStore,
      setState: (p: any) => {
        faStore = { ...faStore, ...(typeof p === 'function' ? p(faStore) : p) };
      },
    };
    // update existing a1 (no duplicate)
    fa.applyRecordForProject!(faHandle as never, 'A', 'a1', { id: 'a1', cycleId: 5 });
    expect(faStore.byProject.A.find((r: any) => r.id === 'a1')).toEqual({ id: 'a1', cycleId: 5 });
    expect(faStore.byProject.A).toHaveLength(2);
    // insert new a3
    fa.applyRecordForProject!(faHandle as never, 'A', 'a3', { id: 'a3' });
    expect(faStore.byProject.A.map((r: any) => r.id)).toEqual(['a1', 'a2', 'a3']);
    // project B untouched throughout
    expect(faStore.byProject.B).toEqual([{ id: 'b1' }]);
  });

  it('typed-record keyed-map shape: select keys by domainId + apply upserts one domain, isolating others', () => {
    // observe-cycles is the byProject KEYED-MAP shape (recordId = domainId).
    const oc = SYNCED_STORES.find((d) => d.storeKey === 'ogden-observe-cycles')!;
    const ocState: any = {
      byProject: {
        A: { water: { currentCycleId: 2 }, soil: { currentCycleId: 0 } },
        B: { water: { currentCycleId: 9 } },
      },
    };
    const recsA = oc.selectRecordsForProject!(ocState, 'A');
    expect(recsA.map((r) => r.recordId).sort()).toEqual(['soil', 'water']);
    const water = recsA.find((r) => r.recordId === 'water')!;
    expect(water.meta).toMatchObject({ cycleId: '2' }); // currentCycleId → cycle_id, stringified

    let ocStore: any = {
      byProject: { A: { ...ocState.byProject.A }, B: { ...ocState.byProject.B } },
    };
    const ocHandle = {
      getState: () => ocStore,
      setState: (p: any) => {
        ocStore = { ...ocStore, ...(typeof p === 'function' ? p(ocStore) : p) };
      },
    };
    oc.applyRecordForProject!(ocHandle as never, 'A', 'water', { currentCycleId: 3 });
    expect(ocStore.byProject.A.water).toEqual({ currentCycleId: 3 });
    expect(ocStore.byProject.A.soil).toEqual({ currentCycleId: 0 }); // sibling domain untouched
    expect(ocStore.byProject.B).toEqual({ water: { currentCycleId: 9 } }); // project B untouched
  });

  it('only uses known classification values', () => {
    const allowed: SyncClassification[] = [
      'typed-design-feature',
      'typed-table',
      'typed-record',
      'versioned-blob',
    ];
    for (const d of SYNCED_STORES) {
      expect(allowed, `${d.storeKey} has an unknown classification`).toContain(
        d.classification,
      );
    }
  });
});
