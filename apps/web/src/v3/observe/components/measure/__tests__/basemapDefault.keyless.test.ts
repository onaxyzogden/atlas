/**
 * @vitest-environment happy-dom
 *
 * Keyless (offline-demo) basemap behaviour for the basemap store.
 *
 * When no MapTiler key is configured, the only renderable basemap is the
 * keyless Esri satellite style, so:
 *   1. a fresh profile must default to 'satellite' (keeps the switcher
 *      selection coherent with what actually renders), and
 *   2. the switcher options offered must be satellite-only (the other
 *      `key=...` MapTiler styles would 403 keyless).
 *
 * `mapRenderable === true` in the demo build cannot be unit-tested here: the
 * `process.env.FEATURE_DEMO_OFFLINE` it reads is `define`-replaced to the
 * literal `false` during the vitest transform. That branch is covered by the
 * real `FEATURE_DEMO_OFFLINE=true` build + serve. This test pins the keyless
 * default + option-filtering, which depend only on `hasMapToken`.
 */
import { describe, it, expect, vi } from 'vitest';

// Force the keyless code path before the store module loads.
vi.mock('../../../../../lib/maplibre.js', () => ({
  hasMapToken: false,
}));

const { useBasemapStore, AVAILABLE_BASEMAP_OPTIONS } = await import('../useMapToolStore.js');

describe('basemap store — keyless (no MapTiler key)', () => {
  it('defaults a fresh profile to satellite', () => {
    expect(useBasemapStore.getState().basemap).toBe('satellite');
  });

  it('offers satellite as the only switcher option', () => {
    expect(AVAILABLE_BASEMAP_OPTIONS.map((o) => o.key)).toEqual(['satellite']);
  });
});
