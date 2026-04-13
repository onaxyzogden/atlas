/**
 * tilePrecache — pre-fetches MapTiler map tiles for a project's bounding box
 * so the map works when the user goes offline.
 *
 * The service worker's StaleWhileRevalidate handler automatically caches
 * tile responses in the 'ogden-map-tiles' Cache Storage bucket. This module
 * simply issues the fetch requests to warm the cache.
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

const MAPTILER_TILE_BASE = 'https://api.maptiler.com/tiles/satellite';

function buildTileUrl(x: number, y: number, z: number, key: string): string {
  return `${MAPTILER_TILE_BASE}/${z}/${x}/${y}@2x.jpg?key=${key}`;
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
 * Pre-fetch MapTiler tiles covering a bounding box at useful zoom levels.
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
  const key = (import.meta as any).env?.VITE_MAPTILER_KEY;
  if (!key) {
    console.warn('[TILE-PRECACHE] No VITE_MAPTILER_KEY — skipping tile precache');
    return { cached: 0, skipped: 0 };
  }

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
        urls.push(buildTileUrl(x, y, z, key));
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

  console.info(`[TILE-PRECACHE] Pre-caching ${urls.length} tiles (zoom ${minZoom}-${maxZoom})...`);

  const result = await fetchWithConcurrency(urls, CONCURRENCY, options?.onProgress);

  console.info(
    `[TILE-PRECACHE] Done: ${result.cached} cached, ${result.skipped} skipped.`,
  );

  return result;
}
