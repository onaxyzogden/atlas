import { describe, it, expect, vi, afterEach } from 'vitest';
import { precacheProjectTiles } from '../tilePrecache.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('precacheProjectTiles → Esri World Imagery', () => {
  it('warms Esri tile/{z}/{y}/{x} URLs (no @2x, no .jpg, no key)', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen.push(url);
        return new Response(null, { status: 200 });
      }),
    );

    const res = await precacheProjectTiles([-0.01, -0.01, 0.01, 0.01], {
      minZoom: 10,
      maxZoom: 10,
    });

    expect(res.cached).toBeGreaterThan(0);
    expect(seen.length).toBeGreaterThan(0);
    for (const url of seen) {
      expect(url).toMatch(
        /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\/10\/\d+\/\d+$/,
      );
    }
  });

  it('does not early-return when no MapTiler key is present', async () => {
    vi.stubEnv('VITE_MAPTILER_KEY', '');
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await precacheProjectTiles([-0.01, -0.01, 0.01, 0.01], {
      minZoom: 10,
      maxZoom: 10,
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(res.cached).toBeGreaterThan(0);
  });
});
