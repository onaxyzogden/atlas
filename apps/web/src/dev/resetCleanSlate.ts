/**
 * resetCleanSlate — dev utility that wipes all OLOS client-side state so the
 * app boots to a genuine clean slate ("My Projects" empty).
 *
 * Deleting a project in the Portfolio does NOT give a clean slate: builtins
 * re-hydrate and demo clones re-clone on the next reload. The durable fix is
 * FLAGS.SEED_SAMPLES (default off — see projectStore.ts / flags.ts), which
 * stops every auto-seed path. This utility is the companion ONE-SHOT wipe for a
 * browser that already has seeded state on disk: it drops the persisted IndexedDB
 * databases and the localStorage device flags / seed sentinels, then reloads.
 *
 * Mirrors the proven demo-reset flow in components/DemoBanner.tsx, with two
 * differences: it spares the map-tile cache (ogden-geodata — project-agnostic
 * and expensive to rebuild) and it sweeps the full set of seed sentinels (not
 * just the three device keys) so a later authored-sample seed can replay.
 *
 * Exposed as window.__ogdenResetCleanSlate() (registered below) and importable
 * for tests. Call with { reload: false } to get a summary without navigating.
 */

// IndexedDB databases owned by the app (see lib/indexedDBStorage.ts,
// lib/syncQueue.ts, lib/proofPhotoStore.ts, store/customModelStore.ts,
// lib/geodataCache.ts). Used as the fallback list when the browser lacks
// indexedDB.databases() (older Safari); modern Chromium/Firefox enumerate live.
const KNOWN_APP_DATABASES = [
  'ogden-state', // every zustand persist store (projects + all domain state)
  'ogden-sync-queue', // queued offline sync ops — must not replay post-wipe
  'ogden-proof-photos', // Act evidence photos, keyed by project — orphaned once projects go
  'ogden-custom-models', // imported custom 3D models
  'ogden-geodata', // map-tile cache (spared by default)
] as const;

// Spared by default: the tile cache is project-agnostic and costly to
// re-download. Everything else is wiped.
const DEFAULT_SPARE_DATABASES = ['ogden-geodata'];

export interface ResetCleanSlateOptions {
  /** Navigate after the wipe (closes DB handles so a blocked delete completes). Default true. */
  reload?: boolean;
  /** Where to navigate when reload is true. Default '/'. */
  redirectTo?: string;
  /** IndexedDB database names to keep. Default ['ogden-geodata']. */
  spare?: string[];
}

export interface ResetCleanSlateResult {
  clearedStorageKeys: string[];
  deletedDatabases: string[];
  sparedDatabases: string[];
}

/**
 * True for any localStorage / sessionStorage key that holds app state we want
 * gone on a clean slate: the ogden-* device flags (auth token, onboarding,
 * bundle-export marker, any legacy zustand-localStorage fallback), the demo-*
 * session/clone flags, and every seed sentinel (all use the `-seeded@` idiom:
 * apricot-lane-seeded@v1, ecosystem-farm-seeded@v{1,2}:<pid>,
 * mtc-rotation-fixture-seeded@v1, three-streams-seeded@v{1,2},
 * homestead-sample-seeded@v1:<pid>, authored-sample-seeded@v1:<pid>).
 */
function shouldClearStorageKey(key: string): boolean {
  return (
    key.startsWith('ogden-') ||
    key.startsWith('demo-') ||
    key.includes('-seeded@') ||
    key.startsWith('three-streams-seeded')
  );
}

function sweepWebStorage(store: Storage | undefined, cleared: string[]): void {
  if (!store) return;
  const toRemove: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (key && shouldClearStorageKey(key)) toRemove.push(key);
  }
  for (const k of toRemove) {
    store.removeItem(k);
    cleared.push(k);
  }
}

function deleteDatabase(idb: IDBFactory, name: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req = idb.deleteDatabase(name);
    req.onsuccess = () => resolve(true);
    // Blocked (an open connection is held by the running app) or errored: the
    // reload that follows closes the handle so the queued delete completes on
    // next boot. Report false so the summary doesn't over-claim.
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
}

export async function resetCleanSlate(
  opts: ResetCleanSlateOptions = {},
): Promise<ResetCleanSlateResult> {
  const reload = opts.reload ?? true;
  const redirectTo = opts.redirectTo ?? '/';
  const spare = new Set(opts.spare ?? DEFAULT_SPARE_DATABASES);

  const clearedStorageKeys: string[] = [];
  const deletedDatabases: string[] = [];
  const sparedDatabases: string[] = [];

  try {
    // 1. localStorage + sessionStorage sweep (device flags + seed sentinels).
    if (typeof localStorage !== 'undefined') sweepWebStorage(localStorage, clearedStorageKeys);
    if (typeof sessionStorage !== 'undefined') sweepWebStorage(sessionStorage, clearedStorageKeys);

    // 2. IndexedDB wipe — every app database except the spared tile cache.
    const idb =
      typeof indexedDB !== 'undefined'
        ? (indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> })
        : undefined;
    if (idb) {
      let names: string[];
      if (typeof idb.databases === 'function') {
        const dbs = await idb.databases();
        names = dbs.map((d) => d.name).filter((n): n is string => Boolean(n));
      } else {
        // Older Safari: no enumeration — fall back to the known list.
        names = [...KNOWN_APP_DATABASES];
      }
      await Promise.all(
        names.map(async (name) => {
          if (spare.has(name)) {
            sparedDatabases.push(name);
            return;
          }
          const ok = await deleteDatabase(idb, name);
          if (ok) deletedDatabases.push(name);
        }),
      );
    }
  } catch (err) {
    // A partial wipe is fine — the reload below recovers into a fresh boot.
    console.warn('[resetCleanSlate] partial wipe:', err);
  }

  console.info('[resetCleanSlate] done', {
    clearedStorageKeys,
    deletedDatabases,
    sparedDatabases,
  });

  if (reload && typeof window !== 'undefined') {
    window.location.assign(redirectTo);
  }

  return { clearedStorageKeys, deletedDatabases, sparedDatabases };
}

// Dev hook — mirror the other dev seeders (window.__ogdenSeed*). Available in
// any browser build so a clean slate is one console call away:
//   await window.__ogdenResetCleanSlate()
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenResetCleanSlate = resetCleanSlate;
}
