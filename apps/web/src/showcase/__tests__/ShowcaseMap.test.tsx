// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ShowcaseMap } from '../components/ShowcaseMap';

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      addControl: vi.fn(),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
    })),
  },
  Map: vi.fn(() => ({
    on: vi.fn(),
    addControl: vi.fn(),
    remove: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
  })),
}));

// CSS is a no-op in vitest's node-style transform, but be explicit so a future
// CSS-handling change doesn't silently break the test.
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

// MAP_STYLES is module-frozen at import time (it reads VITE_MAPTILER_KEY and
// localStorage during evaluation). The component imports it; stubbing here
// keeps the test deterministic regardless of env config.
vi.mock('../../lib/maplibre', () => ({
  MAP_STYLES: { satellite: { version: 8, sources: {}, layers: [] } },
}));

describe('ShowcaseMap', () => {
  it('mounts with boundary + empty layers without throwing', () => {
    const { container } = render(
      <ShowcaseMap
        boundary={{ type: 'MultiPolygon', coordinates: [] } as any}
        layers={[]}
        features={[]}
        activeLayerIds={[]}
        interactive={false}
      />,
    );
    expect(container.querySelector('[data-testid="showcase-map"]')).toBeTruthy();
  });
});
