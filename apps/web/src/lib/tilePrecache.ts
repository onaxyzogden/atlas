/**
 * tilePrecache — pre-fetches Esri World Imagery map tiles for a project's
 * bounding box so the satellite basemap works when the user goes offline.
 *
 * The service worker's StaleWhileRevalidate handler automatically caches
 * tile responses in the 'ogden-map-tiles' Cache Storage bucket — the same
 * bucket the live Esri raster source writes to, so offline tiles match what
 * renders online. This module simply issues the fetch requests to warm it.
 */

// ─── Slippy-map tile math ───────────────────────────────────────────────────

/** Convert longitude to tile X coordinate at a given zoom level */
function lng2tile(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
}

/** Convert latitude to tile Y coordinate at a given zoom level */
function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );
}

// ─── Tile URL builder ───────────────────────────────────────────────────────

// ArcGIS tile/{z}/{row}/{col} uses the same Web-Mercator XYZ scheme as the
// slippy math above, i.e. tile/{z}/{y}/{x}. Native 256px, no @2x, no key —
// matches ESRI_WORLD_IMAGERY_STYLE in maplibre.ts (tileSize: 256).
const ESRI_TILE_BASE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';

function buildTileUrl(x: number, y: number, z: number): string {
  return `${ESRI_TILE_BASE}/${z}/${y}/${x}`;
}

// ─── Concurrency limiter ────────────────────────────────────────────────────

async function fetchWithConcurrency(
  urls: string[],
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<{ cached: number; skipped: number }> {
  let done = 0;
  let skipped = 0;
  const total = urls.length;
  let index = 0;

  async function worker() {
    while (index < urls.length) {
      const url = urls[index++]!;
      try {
        await fetch(url, { mode: 'cors', credentials: 'omit' });
        done++;
      } catch {
        skipped++;
      }
      onProgress?.(done + skipped, total);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);

  return { cached: done, skipped };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface PrecacheOptions {
  minZoom?: number;
  maxZoom?: number;
  onProgress?: (done: number, total: number) => void;
}

const MAX_TILES = 1500;
const DEFAULT_MIN_ZOOM = 10;
const DEFAULT_MAX_ZOOM = 16;
const CONCURRENCY = 6;

/**
 * Pre-fetch Esri World Imagery tiles covering a bounding box at useful zoom levels.
 * The service worker's cache handler stores the responses automatically.
 *
 * @param bbox [west, south, east, north] in decimal degrees
 * @param options Zoom range and progress callback
 * @returns Count of cached and skipped tiles
 */
export async function precacheProjectTiles(
  bbox: [number, number, number, number],
  options?: PrecacheOptions,
): Promise<{ cached: number; skipped: number }> {
  const [west, south, east, north] = bbox;
  let minZoom = options?.minZoom ?? DEFAULT_MIN_ZOOM;
  let maxZoom = options?.maxZoom ?? DEFAULT_MAX_ZOOM;

  // Compute all tile coordinates
  const urls: string[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = lng2tile(west, z);
    const xMax = lng2tile(east, z);
    const yMin = lat2tile(north, z); // note: lat2tile is inverted (north = smaller y)
    const yMax = lat2tile(south, z);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        urls.push(buildTileUrl(x, y, z));
      }
    }

    // Guard: if we exceed the tile limit, cap maxZoom
    if (urls.length > MAX_TILES) {
      console.warn(
        `[TILE-PRECACHE] ${urls.length} tiles exceeds limit of ${MAX_TILES}. ` +
        `Capping at zoom ${z - 1}.`,
      );
      // Remove tiles from this zoom level
      const prevCount = urls.length;
      const tilesAtThisZoom = (xMax - xMin + 1) * (yMax - yMin + 1);
      urls.length = prevCount - tilesAtThisZoom;
      maxZoom = z - 1;
      break;
    }
  }

  if (urls.length === 0) return { cached: 0, skipped: 0 };

  const result = await fetchWithConcurrency(urls, CONCURRENCY, options?.onProgress);

  return result;
}

// ─── MapTiler basemap precache ───────────────────────────────────────────────

/**
 * Basemap keys handled by the offline precache. `satellite` is the Esri raster
 * basemap (handled by precacheProjectTiles); the other four are MapTiler styles
 * whose tile URLs live INSIDE the style JSON, so they need the two-step fetch
 * below. Keys + slugs mirror MAP_STYLES in lib/maplibre.ts.
 */
export type PrecacheBasemapKey =
  | 'satellite'
  | 'terrain'
  | 'topographic'
  | 'street'
  | 'hybrid';

/** MapTiler style slug per basemap key (matches MAP_STYLES in maplibre.ts). */
const MAPTILER_STYLE_SLUGS: Record<Exclude<PrecacheBasemapKey, 'satellite'>, string> = {
  terrain: 'topo',
  topographic: 'topo-v2',
  street: 'streets',
  hybrid: 'hybrid',
};

/** Vector tiles carry all zooms in one pyramid; z14 is plenty for field use. */
const VECTOR_MAX_ZOOM = 14;
/** Raster (satellite-in-hybrid, terrain-RGB) needs deeper zoom for detail. */
const RASTER_MAX_ZOOM = 16;

interface MapLibreSourceLike {
  type?: string;
  tiles?: string[];
  url?: string;
}

interface MapLibreStyleLike {
  sources?: Record<string, MapLibreSourceLike>;
}

interface TileJsonLike {
  tiles?: string[];
}

/** Expand a `{z}/{x}/{y}` template into concrete tile URLs covering a bbox. */
function tileUrlsFromTemplate(
  template: string,
  bbox: [number, number, number, number],
  minZoom: number,
  maxZoom: number,
  remainingBudget: number,
): string[] {
  const [west, south, east, north] = bbox;
  const urls: string[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = lng2tile(west, z);
    const xMax = lng2tile(east, z);
    const yMin = lat2tile(north, z); // north = smaller y
    const yMax = lat2tile(south, z);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        if (urls.length >= remainingBudget) return urls;
        urls.push(
          template
            .replace('{z}', String(z))
            .replace('{x}', String(x))
            .replace('{y}', String(y)),
        );
      }
    }
  }

  return urls;
}

/**
 * Resolve a style source down to its concrete tile-URL templates. A MapTiler
 * source either inlines `tiles: [...]` or points at a TileJSON via `url`; the
 * latter needs one extra fetch to read its `tiles[]`.
 */
async function resolveSourceTemplates(src: MapLibreSourceLike): Promise<string[]> {
  if (Array.isArray(src.tiles) && src.tiles.length > 0) return src.tiles;
  if (src.url) {
    try {
      const res = await fetch(src.url, { mode: 'cors', credentials: 'omit' });
      const json = (await res.json()) as TileJsonLike;
      if (Array.isArray(json.tiles) && json.tiles.length > 0) return json.tiles;
    } catch {
      /* TileJSON unreachable — skip this source */
    }
  }
  return [];
}

/**
 * Pre-fetch a MapTiler basemap's tiles for a bounding box so the style works
 * offline. Fetches the style JSON, walks its raster/vector sources (resolving
 * TileJSON `url` sources), and warms every tile URL via the shared concurrency
 * limiter. The service worker caches the responses automatically.
 *
 * @param basemap MapTiler basemap key (NOT 'satellite' — that's Esri)
 * @param bbox [west, south, east, north] in decimal degrees
 * @param maptilerKey MapTiler API key (embedded in the style/tile URLs)
 * @param onProgress Optional progress callback
 * @returns Count of cached and skipped tiles
 */
export async function precacheMapTilerBasemap(
  basemap: Exclude<PrecacheBasemapKey, 'satellite'>,
  bbox: [number, number, number, number],
  maptilerKey: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ cached: number; skipped: number }> {
  const slug = MAPTILER_STYLE_SLUGS[basemap];
  const styleUrl = `https://api.maptiler.com/maps/${slug}/style.json?key=${maptilerKey}`;

  let style: MapLibreStyleLike;
  try {
    const res = await fetch(styleUrl, { mode: 'cors', credentials: 'omit' });
    style = (await res.json()) as MapLibreStyleLike;
  } catch {
    return { cached: 0, skipped: 0 };
  }

  const sources = style.sources ?? {};
  const urls: string[] = [];

  for (const src of Object.values(sources)) {
    if (urls.length >= MAX_TILES) break;
    if (src.type !== 'raster' && src.type !== 'vector') continue;
    const maxZoom = src.type === 'vector' ? VECTOR_MAX_ZOOM : RASTER_MAX_ZOOM;
    const templates = await resolveSourceTemplates(src);
    for (const template of templates) {
      const remaining = MAX_TILES - urls.length;
      if (remaining <= 0) break;
      urls.push(
        ...tileUrlsFromTemplate(template, bbox, DEFAULT_MIN_ZOOM, maxZoom, remaining),
      );
    }
  }

  if (urls.length === 0) return { cached: 0, skipped: 0 };

  return fetchWithConcurrency(urls, CONCURRENCY, onProgress);
}

/** Per-basemap precache outcome from the orchestrator. */
export interface BasemapPrecacheResult {
  basemap: PrecacheBasemapKey;
  cached: number;
  skipped: number;
}

/** All basemaps the orchestrator warms, in cache order (satellite first). */
export const PRECACHE_BASEMAPS: PrecacheBasemapKey[] = [
  'satellite',
  'topographic',
  'terrain',
  'street',
  'hybrid',
];

/**
 * Warm every basemap (Esri satellite + all four MapTiler styles) for a project's
 * bounding box, in sequence. Each basemap reports its own progress through
 * `onProgress(basemap, done, total)` so callers can drive per-basemap UI.
 *
 * @param bbox [west, south, east, north] in decimal degrees
 * @param maptilerKey MapTiler API key; if falsy, only satellite (Esri) is warmed
 * @param onProgress Optional per-basemap progress callback
 * @returns One result per basemap attempted
 */
export async function precacheAllBasemaps(
  bbox: [number, number, number, number],
  maptilerKey: string | undefined,
  onProgress?: (basemap: PrecacheBasemapKey, done: number, total: number) => void,
): Promise<BasemapPrecacheResult[]> {
  const results: BasemapPrecacheResult[] = [];

  for (const basemap of PRECACHE_BASEMAPS) {
    if (basemap === 'satellite') {
      const r = await precacheProjectTiles(bbox, {
        onProgress: (d, t) => onProgress?.('satellite', d, t),
      });
      results.push({ basemap, cached: r.cached, skipped: r.skipped });
      continue;
    }
    if (!maptilerKey) continue; // no key → MapTiler basemaps unreachable
    const r = await precacheMapTilerBasemap(basemap, bbox, maptilerKey, (d, t) =>
      onProgress?.(basemap, d, t),
    );
    results.push({ basemap, cached: r.cached, skipped: r.skipped });
  }

  return results;
}
