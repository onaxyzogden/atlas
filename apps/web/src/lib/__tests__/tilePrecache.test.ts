import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  precacheProjectTiles,
  precacheMapTilerBasemap,
  precacheAllBasemaps,
} from '../tilePrecache.js';

const SMALL_BBOX: [number, number, number, number] = [-0.01, -0.01, 0.01, 0.01];

/** Minimal MapTiler style JSON: one vector source inlining a tiles[] template. */
function vectorStyleResponse(): Response {
  return new Response(
    JSON.stringify({
      sources: {
        openmaptiles: {
          type: 'vector',
          tiles: ['https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key=K'],
        },
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

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

describe('precacheMapTilerBasemap → style-JSON-driven tiles', () => {
  it('fetches the style JSON then warms its vector source tile URLs', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen.push(url);
        if (url.includes('/style.json')) return vectorStyleResponse();
        return new Response(null, { status: 200 });
      }),
    );

    const res = await precacheMapTilerBasemap('topographic', SMALL_BBOX, 'K');

    // First request is the style JSON (topo-v2 slug for 'topographic').
    expect(seen[0]).toBe(
      'https://api.maptiler.com/maps/topo-v2/style.json?key=K',
    );
    // The rest are tile fetches from the parsed source template.
    const tileUrls = seen.filter((u) => u.endsWith('.pbf?key=K'));
    expect(tileUrls.length).toBeGreaterThan(0);
    expect(res.cached).toBe(tileUrls.length);
    // Vector zoom ceiling is z14 — no z15+ tiles requested.
    for (const u of tileUrls) {
      const z = Number(u.match(/tiles\/v3\/(\d+)\//)?.[1]);
      expect(z).toBeLessThanOrEqual(14);
      expect(z).toBeGreaterThanOrEqual(10);
    }
  });

  it('resolves a TileJSON `url` source via one extra fetch', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen.push(url);
        if (url.includes('/style.json')) {
          return new Response(
            JSON.stringify({
              sources: {
                omt: {
                  type: 'vector',
                  url: 'https://api.maptiler.com/tiles/v3/tiles.json?key=K',
                },
              },
            }),
            { status: 200 },
          );
        }
        if (url.includes('tiles.json')) {
          return new Response(
            JSON.stringify({
              tiles: ['https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key=K'],
            }),
            { status: 200 },
          );
        }
        return new Response(null, { status: 200 });
      }),
    );

    const res = await precacheMapTilerBasemap('street', SMALL_BBOX, 'K');
    expect(seen.some((u) => u.includes('tiles.json'))).toBe(true);
    expect(res.cached).toBeGreaterThan(0);
  });

  it('returns zero when the style JSON is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    const res = await precacheMapTilerBasemap('hybrid', SMALL_BBOX, 'K');
    expect(res.cached).toBe(0);
  });
});

describe('precacheAllBasemaps → orchestrator', () => {
  it('warms Esri satellite + all four MapTiler basemaps when a key is present', async () => {
    const styleSlugs: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/style.json')) {
          styleSlugs.push(url);
          return vectorStyleResponse();
        }
        return new Response(null, { status: 200 });
      }),
    );

    const results = await precacheAllBasemaps(SMALL_BBOX, 'K');
    const basemaps = results.map((r) => r.basemap).sort();
    expect(basemaps).toEqual(
      ['hybrid', 'satellite', 'street', 'terrain', 'topographic'].sort(),
    );
    // Four MapTiler style.json fetches (satellite is Esri, no style fetch).
    expect(styleSlugs.length).toBe(4);
  });

  it('warms only Esri satellite when no MapTiler key is present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    const results = await precacheAllBasemaps(SMALL_BBOX, undefined);
    expect(results.map((r) => r.basemap)).toEqual(['satellite']);
  });
});
