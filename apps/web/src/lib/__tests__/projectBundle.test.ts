// @vitest-environment happy-dom
/**
 * projectBundle — the multi-device escape hatch. A bundle is a portable
 * snapshot of the entire `ogden-` localStorage persistence namespace minus a
 * minimal denylist (auth token, global view prefs, device state). These specs
 * pin the property that actually matters for tester data safety: an
 * export → wipe → import round-trip restores the persistence layer exactly,
 * and the security-sensitive keys never travel.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BUNDLE_SCHEMA,
  BUNDLE_VERSION,
  buildBundle,
  serializeBundle,
  parseBundle,
  applyBundle,
  bundleFilename,
  markBundleExported,
  hasExportedBundle,
} from '../projectBundle.js';

function seedProjectState(): void {
  localStorage.setItem(
    'ogden-projects',
    JSON.stringify({ state: { projects: [{ id: 'p1', name: 'Test' }] }, version: 3 }),
  );
  localStorage.setItem(
    'ogden-atlas-design-elements',
    JSON.stringify({ state: { elements: [{ id: 'e1' }] }, version: 1 }),
  );
  localStorage.setItem(
    'ogden-regen-plans',
    JSON.stringify({ state: { plans: [{ id: 'r1' }] }, version: 1 }),
  );
  localStorage.setItem('ogden-versions', JSON.stringify({ state: { versions: [] } }));
  // Non-portable keys that must NOT travel in a bundle.
  localStorage.setItem('ogden-auth-token', 'secret-bearer-token');
  localStorage.setItem('ogden-atlas-matrix-toggles', JSON.stringify({ state: { zones: true } }));
  localStorage.setItem('ogden-connectivity', JSON.stringify({ state: { online: false } }));
  // Unrelated namespace — must be ignored entirely.
  localStorage.setItem('atlas.v3.mapOverlaysLegend.collapsed', '1');
}

describe('projectBundle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds a schema-tagged bundle of only the portable ogden- keys', () => {
    seedProjectState();
    const bundle = buildBundle();

    expect(bundle.schema).toBe(BUNDLE_SCHEMA);
    expect(bundle.version).toBe(BUNDLE_VERSION);
    expect(typeof bundle.exportedAt).toBe('string');

    const keys = Object.keys(bundle.entries).sort();
    expect(keys).toEqual(
      ['ogden-atlas-design-elements', 'ogden-projects', 'ogden-regen-plans', 'ogden-versions'].sort(),
    );
  });

  it('never includes the auth token or other non-portable keys', () => {
    seedProjectState();
    const bundle = buildBundle();
    expect(bundle.entries).not.toHaveProperty('ogden-auth-token');
    expect(bundle.entries).not.toHaveProperty('ogden-atlas-matrix-toggles');
    expect(bundle.entries).not.toHaveProperty('ogden-connectivity');
    expect(bundle.entries).not.toHaveProperty('atlas.v3.mapOverlaysLegend.collapsed');

    const serialized = serializeBundle(bundle);
    expect(serialized).not.toContain('secret-bearer-token');
  });

  it('round-trips: export → wipe → import restores the persistence layer exactly', () => {
    seedProjectState();
    const bundle = buildBundle();
    const snapshot: Record<string, string> = {};
    for (const k of Object.keys(bundle.entries)) {
      snapshot[k] = localStorage.getItem(k) as string;
    }

    // Simulate a fresh second device: nothing in storage.
    localStorage.clear();
    expect(localStorage.getItem('ogden-projects')).toBeNull();

    const parsed = parseBundle(serializeBundle(bundle));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = applyBundle(parsed.bundle);

    expect(result.restoredKeys).toBe(Object.keys(snapshot).length);
    for (const [k, v] of Object.entries(snapshot)) {
      expect(localStorage.getItem(k)).toBe(v);
    }
  });

  it('applyBundle removes stale portable keys so the restore is exact', () => {
    // Importing device already has a *different* project in storage.
    localStorage.setItem(
      'ogden-projects',
      JSON.stringify({ state: { projects: [{ id: 'stale' }] }, version: 3 }),
    );
    localStorage.setItem('ogden-crops', JSON.stringify({ state: { crops: ['stale'] } }));

    const incoming = parseBundle(
      serializeBundle({
        schema: BUNDLE_SCHEMA,
        version: BUNDLE_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: null,
        entries: {
          'ogden-projects': JSON.stringify({ state: { projects: [{ id: 'p1' }] }, version: 3 }),
        },
      }),
    );
    expect(incoming.ok).toBe(true);
    if (!incoming.ok) return;
    applyBundle(incoming.bundle);

    expect(localStorage.getItem('ogden-projects')).toContain('p1');
    expect(localStorage.getItem('ogden-projects')).not.toContain('stale');
    // The stale crop slice from the importing device must be gone.
    expect(localStorage.getItem('ogden-crops')).toBeNull();
  });

  it('applyBundle never clobbers the auth token on the importing device', () => {
    localStorage.setItem('ogden-auth-token', 'device-b-session');
    const incoming = parseBundle(
      serializeBundle({
        schema: BUNDLE_SCHEMA,
        version: BUNDLE_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: null,
        entries: {
          'ogden-projects': JSON.stringify({ state: { projects: [] }, version: 3 }),
          // Even if a hand-edited bundle smuggles a token, it must be ignored.
          'ogden-auth-token': 'smuggled-token',
        },
      }),
    );
    expect(incoming.ok).toBe(true);
    if (!incoming.ok) return;
    applyBundle(incoming.bundle);

    expect(localStorage.getItem('ogden-auth-token')).toBe('device-b-session');
  });

  it('rejects non-bundle JSON and schema/version mismatches', () => {
    expect(parseBundle('not json').ok).toBe(false);
    expect(parseBundle(JSON.stringify({ hello: 'world' })).ok).toBe(false);
    expect(
      parseBundle(JSON.stringify({ schema: BUNDLE_SCHEMA, version: 999, entries: {} })).ok,
    ).toBe(false);

    const future = parseBundle(JSON.stringify({ schema: 'something-else', version: 1, entries: {} }));
    expect(future.ok).toBe(false);
  });

  it('tracks whether a bundle has ever been exported (drives the data-safety banner)', () => {
    expect(hasExportedBundle()).toBe(false);
    markBundleExported();
    expect(hasExportedBundle()).toBe(true);

    // The flag is device-local: it must not travel in a bundle nor be wiped on import.
    seedProjectState();
    const bundle = buildBundle();
    expect(bundle.entries).not.toHaveProperty('ogden-atlas-bundle-exported');

    const parsed = parseBundle(serializeBundle(bundle));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    applyBundle(parsed.bundle);
    expect(hasExportedBundle()).toBe(true);
  });

  it('produces a dated .json filename', () => {
    expect(bundleFilename()).toMatch(/^ogden-atlas-bundle-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
