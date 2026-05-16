/**
 * projectBundle — the multi-device escape hatch for the local-first design
 * surface.
 *
 * `syncService` only round-trips a few server-backed slices (projects, zones,
 * structures, comments). The rest of the v3 design surface — design elements,
 * vegetation, every Observe annotation namespace, regeneration plans,
 * succession/temporal state, project metadata, etc. — is localStorage-only
 * even when authenticated. A tester moving between devices would otherwise
 * silently lose all of it.
 *
 * A bundle sidesteps per-store enumeration entirely: it snapshots the whole
 * `ogden-` localStorage persistence namespace as opaque raw strings. That is
 * inherently complete — it cannot miss a store because it does not know about
 * stores at all — and each store still runs its own zustand `migrate` when the
 * page reloads after import. A minimal denylist keeps non-portable keys out:
 *
 *   - ogden-auth-token            — a bearer token must never travel.
 *   - ogden-atlas-matrix-toggles  — global view preference, not project data.
 *   - ogden-connectivity          — device online/offline state.
 *   - ogden-atlas-bundle-exported — the data-safety banner flag is device-local.
 *
 * The denylist is deliberately tight: wrongly excluding a real store causes
 * silent partial restore (high impact); a stray cache key riding along is
 * harmless (low impact).
 */

const PERSIST_PREFIX = 'ogden-';

const NON_PORTABLE_KEYS = new Set<string>([
  'ogden-auth-token',
  'ogden-atlas-matrix-toggles',
  'ogden-connectivity',
  'ogden-atlas-bundle-exported',
]);

/** Device-local flag: has the steward ever exported a bundle? */
const EXPORTED_FLAG_KEY = 'ogden-atlas-bundle-exported';

export const BUNDLE_SCHEMA = 'ogden-atlas-project-bundle' as const;
export const BUNDLE_VERSION = 1 as const;

export interface ProjectBundle {
  schema: typeof BUNDLE_SCHEMA;
  version: number;
  /** ISO timestamp of export. */
  exportedAt: string;
  /** App build version when exported, if exposed; informational only. */
  appVersion: string | null;
  /** localStorage key → raw stringified value (each store's own envelope). */
  entries: Record<string, string>;
}

export type BundleParseResult =
  | { ok: true; bundle: ProjectBundle }
  | { ok: false; error: string };

export interface ApplyResult {
  restoredKeys: number;
}

function isPortableKey(key: string): boolean {
  return key.startsWith(PERSIST_PREFIX) && !NON_PORTABLE_KEYS.has(key);
}

function getStorage(storage?: Storage): Storage {
  return storage ?? window.localStorage;
}

export function collectBundleEntries(
  storage?: Storage,
): Record<string, string> {
  const ls = getStorage(storage);
  const entries: Record<string, string> = {};
  for (let i = 0; i < ls.length; i++) {
    const key = ls.key(i);
    if (!key || !isPortableKey(key)) continue;
    const value = ls.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return entries;
}

export function buildBundle(storage?: Storage): ProjectBundle {
  let appVersion: string | null = null;
  try {
    const v = (import.meta as { env?: Record<string, unknown> }).env?.[
      'VITE_APP_VERSION'
    ];
    appVersion = typeof v === 'string' ? v : null;
  } catch {
    appVersion = null;
  }
  return {
    schema: BUNDLE_SCHEMA,
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    entries: collectBundleEntries(storage),
  };
}

export function serializeBundle(bundle: ProjectBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function parseBundle(text: string): BundleParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'This file is not an Atlas project bundle.' };
  }
  const b = raw as Partial<ProjectBundle>;
  if (b.schema !== BUNDLE_SCHEMA) {
    return {
      ok: false,
      error: 'Not an Atlas project bundle (schema does not match).',
    };
  }
  if (typeof b.version !== 'number' || b.version > BUNDLE_VERSION) {
    return {
      ok: false,
      error: `Unsupported bundle version: ${String(b.version)}. Update Atlas and try again.`,
    };
  }
  if (!b.entries || typeof b.entries !== 'object') {
    return { ok: false, error: 'This bundle has no project data.' };
  }
  // Defensively keep only portable string entries — a hand-edited bundle must
  // never be able to smuggle in the auth token or a non-string payload.
  const entries: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.entries as Record<string, unknown>)) {
    if (typeof v === 'string' && isPortableKey(k)) entries[k] = v;
  }
  return {
    ok: true,
    bundle: {
      schema: BUNDLE_SCHEMA,
      version: b.version,
      exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
      appVersion: typeof b.appVersion === 'string' ? b.appVersion : null,
      entries,
    },
  };
}

/**
 * Overwrites the portable persistence namespace with the bundle's entries.
 * Portable keys currently on the importing device that are absent from the
 * bundle are removed first, so the restore is exact (no stale slice from the
 * importing device leaks into the restored project). Non-portable keys (auth
 * token, device prefs) are never touched.
 *
 * Callers should reload the page afterward so every zustand persist store
 * re-hydrates from the new localStorage and runs its own `migrate`.
 */
export function applyBundle(
  bundle: ProjectBundle,
  storage?: Storage,
): ApplyResult {
  const ls = getStorage(storage);
  const toRemove: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const key = ls.key(i);
    if (key && isPortableKey(key)) toRemove.push(key);
  }
  toRemove.forEach((k) => ls.removeItem(k));

  let restored = 0;
  for (const [k, v] of Object.entries(bundle.entries)) {
    if (isPortableKey(k)) {
      ls.setItem(k, v);
      restored++;
    }
  }
  return { restoredKeys: restored };
}

export function bundleFilename(): string {
  const d = new Date().toISOString().slice(0, 10);
  return `ogden-atlas-bundle-${d}.json`;
}

export function markBundleExported(storage?: Storage): void {
  getStorage(storage).setItem(EXPORTED_FLAG_KEY, new Date().toISOString());
}

export function hasExportedBundle(storage?: Storage): boolean {
  return getStorage(storage).getItem(EXPORTED_FLAG_KEY) !== null;
}
