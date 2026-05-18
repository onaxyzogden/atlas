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
      'ogden-atlas-design-elements',
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

    // projectId-tagged shape
    const pa = SYNCED_STORES.find((d) => d.storeKey === 'ogden-paths')!;
    let paStore: any = { paths: [{ id: 'p1', projectId: 'A' }, { id: 'p2', projectId: 'B' }] };
    const paHandle = {
      getState: () => paStore,
      setState: (p: any) => {
        paStore = { ...paStore, ...(typeof p === 'function' ? p(paStore) : p) };
      },
    };
    expect(pa.selectForProject!(paStore, 'A')).toEqual({ paths: [{ id: 'p1', projectId: 'A' }] });
    pa.applyForProject!(paHandle as never, 'A', { paths: [{ id: 'p1b', projectId: 'A' }] });
    expect(paStore.paths).toEqual([
      { id: 'p2', projectId: 'B' },
      { id: 'p1b', projectId: 'A' },
    ]);
  });

  it('only uses known classification values', () => {
    const allowed: SyncClassification[] = [
      'typed-design-feature',
      'typed-table',
      'versioned-blob',
    ];
    for (const d of SYNCED_STORES) {
      expect(allowed, `${d.storeKey} has an unknown classification`).toContain(
        d.classification,
      );
    }
  });
});
