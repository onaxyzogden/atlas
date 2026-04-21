/**
 * GaezRasterService — Point-query service over self-hosted FAO GAEZ v4 COGs.
 *
 * Reads a manifest on boot, then serves single-pixel sample reads from each
 * per-crop COG via byte-range reads (geotiff.js `fromFile` or `fromUrl`).
 *
 * Source: FAO GAEZ v4 (self-hosted).
 * License: CC BY-NC-SA 3.0 IGO — attribution baked into responses.
 *
 * See `scripts/ingest-gaez.md` for how the COG set is populated.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fromFile, fromUrl, type GeoTIFF } from 'geotiff';

// ── Manifest types (mirror convert-gaez-to-cog.ts) ──────────────────────────

type Crop =
  | 'wheat' | 'maize' | 'rice' | 'soybean' | 'potato' | 'cassava'
  | 'sorghum' | 'millet' | 'barley' | 'oat' | 'rye' | 'sweet_potato';

type WaterSupply = 'rainfed' | 'irrigated';
type InputLevel = 'low' | 'high';

interface ManifestEntry {
  filename: string;
  crop: Crop;
  waterSupply: WaterSupply;
  inputLevel: InputLevel;
  suitabilityFile: string | null;
  yieldFile: string | null;
  units: { suitability: string; yield: string };
}

interface Manifest {
  generated_at: string;
  source: string;
  license: string;
  attribution: string;
  climate_scenario: string;
  entries: Record<string, ManifestEntry>;
}

// ── Public result types ─────────────────────────────────────────────────────

export type SuitabilityClass = 'S1' | 'S2' | 'S3' | 'N' | 'NS' | 'WATER' | 'UNKNOWN';

/**
 * GAEZ suitability class codes (per FAO v4 Theme 4 legend):
 *   1 = Very high (S1)
 *   2 = High (S1)
 *   3 = Good (S2)
 *   4 = Medium (S2)
 *   5 = Moderate (S3)
 *   6 = Marginal (S3)
 *   7 = Not suitable (N)
 *   8 = Not suitable (N)
 *   9 = Water
 *
 * Disambiguation note: FAO uses code 9 for both open water AND for pixels
 * outside the cropland extent (desert, ice, tundra). When the paired yield
 * raster returns NoData (null) or a negative sentinel (the -1 value leaks
 * through for off-cropland pixels whose COGs lack a proper GDAL NoData tag),
 * we treat the point as off-extent UNKNOWN rather than WATER. Only code 9
 * with a non-negative yield is classified as WATER.
 */
function mapSuitabilityCode(code: number | null, yieldVal: number | null): SuitabilityClass {
  if (code === null || !Number.isFinite(code)) return 'UNKNOWN';
  if (code <= 0) return 'UNKNOWN';
  if (code === 9) {
    if (yieldVal === null || !Number.isFinite(yieldVal) || yieldVal < 0) return 'UNKNOWN';
    return 'WATER';
  }
  if (code >= 1 && code <= 2) return 'S1';
  if (code >= 3 && code <= 4) return 'S2';
  if (code >= 5 && code <= 6) return 'S3';
  if (code >= 7 && code <= 8) return 'N';
  return 'NS';
}

export interface CropSuitabilityResult {
  crop: Crop;
  waterSupply: WaterSupply;
  inputLevel: InputLevel;
  suitability_class: SuitabilityClass;
  suitability_code: number | null;
  attainable_yield_kg_ha: number | null;
}

export interface GaezPointSummary {
  best_crop: Crop | null;
  best_management: `${WaterSupply}_${InputLevel}` | null;
  primary_suitability_class: SuitabilityClass;
  attainable_yield_kg_ha_best: number | null;
  top_3_crops: { crop: Crop; yield_kg_ha: number | null; suitability: SuitabilityClass }[];
  crop_suitabilities: CropSuitabilityResult[];
}

export interface GaezQueryResult {
  fetch_status: 'complete' | 'unavailable' | 'failed';
  confidence: 'medium' | 'low';
  source_api: string;
  attribution: string;
  summary: GaezPointSummary | null;
  message?: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

/**
 * Loads manifest at construction. Resolves COG access via either:
 *   - local filesystem (`dataDir` set, `s3Prefix` null)
 *   - HTTPS byte-range reads (`s3Prefix` set, e.g. public S3 bucket)
 */
export class GaezRasterService {
  private manifest: Manifest | null = null;
  private tiffCache = new Map<string, GeoTIFF>();

  constructor(
    private readonly dataDir: string,
    private readonly s3Prefix: string | null = null,
  ) {}

  /**
   * Load manifest from disk. Safe to call from onReady — does not open any COGs yet.
   * Returns `true` if the manifest loads successfully, `false` if absent
   * (treat as "GAEZ layer disabled").
   */
  loadManifest(): boolean {
    const manifestPath = join(this.dataDir, 'gaez-manifest.json');
    if (!existsSync(manifestPath)) {
      this.manifest = null;
      return false;
    }
    try {
      const raw = readFileSync(manifestPath, 'utf-8');
      this.manifest = JSON.parse(raw) as Manifest;
      return true;
    } catch {
      this.manifest = null;
      return false;
    }
  }

  isEnabled(): boolean {
    return this.manifest !== null && Object.keys(this.manifest.entries).length > 0;
  }

  getAttribution(): string {
    return this.manifest?.attribution ?? 'FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO';
  }

  /**
   * Sprint CB — public read accessor for the manifest, used by the
   * `/api/v1/gaez/catalog` route to populate the map-side crop picker.
   *
   * Returns one entry per (crop, waterSupply, inputLevel) tuple with the set
   * of variables ("suitability" and/or "yield") that have rasters on disk.
   */
  getManifestEntries(): Array<{
    crop: string;
    waterSupply: string;
    inputLevel: string;
    variables: ('suitability' | 'yield')[];
  }> {
    if (!this.manifest) return [];
    return Object.values(this.manifest.entries).map((entry) => {
      const variables: ('suitability' | 'yield')[] = [];
      if (entry.suitabilityFile) variables.push('suitability');
      if (entry.yieldFile) variables.push('yield');
      return {
        crop: entry.crop,
        waterSupply: entry.waterSupply,
        inputLevel: entry.inputLevel,
        variables,
      };
    });
  }

  /**
   * Sprint CB — resolve a (crop, waterSupply, inputLevel, variable) tuple to
   * an absolute on-disk COG path for the raster-serving route. Returns null
   * for any unknown tuple, which callers MUST propagate as 404. The manifest
   * is the only trust boundary — user-provided path components are never
   * concatenated into a path, so this is also the path-traversal guard.
   *
   * Only returns a path when `s3Prefix` is null (local mode). In S3 mode the
   * route layer should 404 or redirect; we don't proxy S3 bytes.
   */
  resolveLocalFilePath(
    crop: string,
    waterSupply: string,
    inputLevel: string,
    variable: 'suitability' | 'yield',
  ): string | null {
    if (this.s3Prefix) return null;
    if (!this.manifest) return null;
    const match = Object.values(this.manifest.entries).find(
      (e) => e.crop === crop && e.waterSupply === waterSupply && e.inputLevel === inputLevel,
    );
    if (!match) return null;
    const filename = variable === 'suitability' ? match.suitabilityFile : match.yieldFile;
    if (!filename) return null;
    return join(this.dataDir, filename);
  }

  /**
   * Query all manifest entries at (lat, lng); returns per-crop suitability +
   * attainable yield plus a derived summary (best crop, top-3).
   *
   * Returns `{ summary: null, fetch_status: 'unavailable' }` if manifest is empty.
   */
  async query(lat: number, lng: number): Promise<GaezQueryResult> {
    if (!this.manifest || !this.isEnabled()) {
      return {
        fetch_status: 'unavailable',
        confidence: 'low',
        source_api: 'FAO GAEZ v4 (self-hosted)',
        attribution: this.getAttribution(),
        summary: null,
        message: 'GAEZ manifest not loaded — see apps/api/scripts/ingest-gaez.md',
      };
    }

    const entries = Object.values(this.manifest.entries);
    const results: CropSuitabilityResult[] = [];

    await Promise.all(
      entries.map(async (entry) => {
        try {
          const [suitCode, yieldVal] = await Promise.all([
            entry.suitabilityFile ? this.samplePoint(entry.suitabilityFile, lat, lng) : Promise.resolve(null),
            entry.yieldFile ? this.samplePoint(entry.yieldFile, lat, lng) : Promise.resolve(null),
          ]);

          results.push({
            crop: entry.crop,
            waterSupply: entry.waterSupply,
            inputLevel: entry.inputLevel,
            suitability_class: mapSuitabilityCode(suitCode, yieldVal),
            suitability_code: suitCode,
            // Negative yields are NoData sentinels leaking through when the
            // COG lacks a GDAL NoData tag — sanitize to null on output.
            attainable_yield_kg_ha:
              yieldVal !== null && Number.isFinite(yieldVal) && yieldVal >= 0
                ? Math.round(yieldVal)
                : null,
          });
        } catch {
          // Per-raster failure shouldn't kill the whole response — skip.
        }
      }),
    );

    if (results.length === 0) {
      return {
        fetch_status: 'failed',
        confidence: 'low',
        source_api: 'FAO GAEZ v4 (self-hosted)',
        attribution: this.getAttribution(),
        summary: null,
        message: 'All raster samples failed — check COG files and GAEZ_DATA_DIR',
      };
    }

    // If every result is WATER or UNKNOWN, point is outside cropland extent
    // (ocean, inland water, desert, ice, or NoData). Prefer WATER only when at
    // least one entry is genuinely WATER — otherwise UNKNOWN is more honest,
    // since we cannot distinguish ocean from desert from raster signal alone.
    const allOceanOrUnknown = results.every(
      (r) => r.suitability_class === 'WATER' || r.suitability_class === 'UNKNOWN',
    );

    if (allOceanOrUnknown) {
      const anyWater = results.some((r) => r.suitability_class === 'WATER');
      return {
        fetch_status: 'complete',
        confidence: 'low',
        source_api: 'FAO GAEZ v4 (self-hosted)',
        attribution: this.getAttribution(),
        summary: {
          best_crop: null,
          best_management: null,
          primary_suitability_class: anyWater ? 'WATER' : 'UNKNOWN',
          attainable_yield_kg_ha_best: null,
          top_3_crops: [],
          crop_suitabilities: results,
        },
        message: anyWater
          ? 'Point appears to be inland water or outside GAEZ terrestrial raster extent'
          : 'Point appears to be outside GAEZ terrestrial raster extent (ocean, desert, ice, or NoData)',
      };
    }

    const summary = computeSummary(results);

    return {
      fetch_status: 'complete',
      confidence: 'medium',
      source_api: 'FAO GAEZ v4 (self-hosted)',
      attribution: this.getAttribution(),
      summary,
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * Sample a single pixel at (lat, lng) from a named COG.
   * Returns numeric value, or null if NoData / out-of-bounds.
   */
  private async samplePoint(filename: string, lat: number, lng: number): Promise<number | null> {
    const tiff = await this.openTiff(filename);
    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();
    const origin = image.getOrigin();         // [x, y] top-left in CRS units
    const resolution = image.getResolution(); // [xRes, yRes] — yRes negative for north-up

    const originX = origin[0];
    const originY = origin[1];
    const xRes = resolution[0];
    const yRes = resolution[1];
    if (originX === undefined || originY === undefined || xRes === undefined || yRes === undefined) {
      return null;
    }

    // GAEZ v4 rasters are EPSG:4326 geographic (lat/lng degrees).
    const px = Math.floor((lng - originX) / xRes);
    const py = Math.floor((lat - originY) / yRes); // yRes is negative → py grows downward
    if (px < 0 || py < 0 || px >= width || py >= height) return null;

    const rasters = await image.readRasters({
      window: [px, py, px + 1, py + 1],
      interleave: false,
    });

    // readRasters with interleave:false → TypedArray[] (one per band)
    const band0 = (rasters as unknown as ArrayLike<ArrayLike<number>>)[0];
    if (!band0) return null;
    const v = band0[0];
    if (v === undefined || v === null) return null;

    // NoData detection — geotiff.js exposes this on the image file directory
    const gdalNoData = (image as unknown as { getGDALNoData: () => number | null }).getGDALNoData?.();
    if (gdalNoData !== null && gdalNoData !== undefined && v === gdalNoData) return null;

    return typeof v === 'number' ? v : Number(v);
  }

  /**
   * Open a COG (cached by filename). Uses HTTPS byte-range reads when
   * `s3Prefix` is set; otherwise local-filesystem reads.
   */
  private async openTiff(filename: string): Promise<GeoTIFF> {
    const cached = this.tiffCache.get(filename);
    if (cached) return cached;

    let tiff: GeoTIFF;
    if (this.s3Prefix) {
      const url = this.s3Prefix.endsWith('/')
        ? `${this.s3Prefix}${filename}`
        : `${this.s3Prefix}/${filename}`;
      tiff = await fromUrl(url);
    } else {
      const path = join(this.dataDir, filename);
      tiff = await fromFile(path);
    }

    // LRU bound: cap cache at 128 entries (each is a header handle, small memory).
    if (this.tiffCache.size >= 128) {
      const firstKey = this.tiffCache.keys().next().value;
      if (firstKey) this.tiffCache.delete(firstKey);
    }
    this.tiffCache.set(filename, tiff);
    return tiff;
  }
}

// ── Summary computation ─────────────────────────────────────────────────────

const SUITABILITY_RANK: Record<SuitabilityClass, number> = {
  S1: 5, S2: 4, S3: 3, N: 2, NS: 1, WATER: 0, UNKNOWN: 0,
};

function computeSummary(results: CropSuitabilityResult[]): GaezPointSummary {
  // Collapse per-crop across management variants → take the best-yielding
  // rainfed variant (rainfed is the default agronomic scenario; irrigated
  // yields surface separately as top_3 if relevant).
  const byCrop = new Map<Crop, CropSuitabilityResult>();
  for (const r of results) {
    if (r.attainable_yield_kg_ha === null) continue;
    const current = byCrop.get(r.crop);
    if (!current || (r.attainable_yield_kg_ha > (current.attainable_yield_kg_ha ?? 0))) {
      byCrop.set(r.crop, r);
    }
  }

  const ranked = Array.from(byCrop.values()).sort((a, b) => {
    const dy = (b.attainable_yield_kg_ha ?? 0) - (a.attainable_yield_kg_ha ?? 0);
    if (dy !== 0) return dy;
    return SUITABILITY_RANK[b.suitability_class] - SUITABILITY_RANK[a.suitability_class];
  });

  const best = ranked[0] ?? null;
  const top3 = ranked.slice(0, 3).map((r) => ({
    crop: r.crop,
    yield_kg_ha: r.attainable_yield_kg_ha,
    suitability: r.suitability_class,
  }));

  return {
    best_crop: best?.crop ?? null,
    best_management: best ? (`${best.waterSupply}_${best.inputLevel}` as `${WaterSupply}_${InputLevel}`) : null,
    primary_suitability_class: best?.suitability_class ?? 'UNKNOWN',
    attainable_yield_kg_ha_best: best?.attainable_yield_kg_ha ?? null,
    top_3_crops: top3,
    crop_suitabilities: results,
  };
}

// ── Singleton ───────────────────────────────────────────────────────────────

let _instance: GaezRasterService | null = null;

export function initGaezService(dataDir: string, s3Prefix: string | null): GaezRasterService {
  _instance = new GaezRasterService(dataDir, s3Prefix);
  _instance.loadManifest();
  return _instance;
}

export function getGaezService(): GaezRasterService | null {
  return _instance;
}
