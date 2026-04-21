/**
 * SoilGridsRasterService — serves ISRIC SoilGrids v2.0 COGs for map overlay
 * and per-property point queries. Mirrors GaezRasterService: manifest on boot,
 * byte-range reads via geotiff.js (`fromFile` for local, `fromUrl` for S3).
 *
 * Source: ISRIC SoilGrids v2.0 (https://soilgrids.org).
 * License: CC BY 4.0 — attribution surfaced in responses.
 *
 * Properties exposed (v1 manifest):
 *   - bedrock_depth      (BDRICM, cm)
 *   - ph                 (phh2o, pH × 10, 0–30 cm mean)
 *   - organic_carbon     (soc,  g/kg, 0–30 cm mean)
 *   - clay               (clay, % × 10, 0–30 cm mean)
 *   - sand               (sand, % × 10, 0–30 cm mean)
 *
 * Unlike GAEZ, the manifest is keyed on a single `property` string, so path
 * resolution is a one-field lookup (not crop × water × input × variable).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fromFile, fromUrl, type GeoTIFF } from 'geotiff';

export type SoilProperty =
  | 'bedrock_depth'
  | 'ph'
  | 'organic_carbon'
  | 'clay'
  | 'sand';

export interface SoilManifestEntry {
  property: SoilProperty;
  label: string;
  unit: string;
  /** Per-property display range used by the legend — [min, max]. */
  range: [number, number];
  /** Color ramp key — the frontend picks a ramp function by this id. */
  rampId:
    | 'sequential_earth'
    | 'diverging_ph'
    | 'sequential_carbon'
    | 'sequential_clay'
    | 'sequential_sand';
  filename: string;
  /** Optional — scale factor applied on the frontend when interpreting raw values. */
  scale?: number;
  /** Depth slice notation (e.g. "0-30cm"). Purely informational. */
  depthSlice?: string;
}

interface Manifest {
  generated_at: string;
  source: string;
  license: string;
  attribution: string;
  entries: Record<SoilProperty, SoilManifestEntry>;
}

export interface SoilPointReading {
  property: SoilProperty;
  value: number | null;
  unit: string;
}

export interface SoilQueryResult {
  fetch_status: 'complete' | 'unavailable' | 'failed';
  confidence: 'medium' | 'low';
  source_api: string;
  attribution: string;
  summary: { readings: SoilPointReading[] } | null;
  message?: string;
}

const DEFAULT_ATTRIBUTION = 'ISRIC SoilGrids v2.0 — CC BY 4.0';

export class SoilGridsRasterService {
  private manifest: Manifest | null = null;
  private tiffCache = new Map<string, GeoTIFF>();

  constructor(
    private readonly dataDir: string,
    private readonly s3Prefix: string | null = null,
  ) {}

  loadManifest(): boolean {
    const manifestPath = join(this.dataDir, 'soilgrids-manifest.json');
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
    return this.manifest?.attribution ?? DEFAULT_ATTRIBUTION;
  }

  /** Catalog accessor for `/api/v1/soilgrids/catalog` — one entry per property. */
  getManifestEntries(): SoilManifestEntry[] {
    if (!this.manifest) return [];
    return Object.values(this.manifest.entries);
  }

  /**
   * Manifest lookup is the trust boundary: user-supplied `property` never gets
   * concatenated into a path. Returns null for unknown property or S3 mode.
   */
  resolveLocalFilePath(property: string): string | null {
    if (this.s3Prefix) return null;
    if (!this.manifest) return null;
    const entry = this.manifest.entries[property as SoilProperty];
    if (!entry) return null;
    return join(this.dataDir, entry.filename);
  }

  /** Sample all properties at (lat, lng); returns one reading per manifest entry. */
  async query(lat: number, lng: number): Promise<SoilQueryResult> {
    if (!this.manifest || !this.isEnabled()) {
      return {
        fetch_status: 'unavailable',
        confidence: 'low',
        source_api: 'ISRIC SoilGrids v2.0 (self-hosted)',
        attribution: this.getAttribution(),
        summary: null,
        message: 'SoilGrids manifest not loaded — see apps/api/data/soilgrids/README.md',
      };
    }

    const entries = Object.values(this.manifest.entries);
    const readings: SoilPointReading[] = [];

    await Promise.all(
      entries.map(async (entry) => {
        try {
          const raw = await this.samplePoint(entry.filename, lat, lng);
          const scaled = raw !== null && entry.scale ? raw / entry.scale : raw;
          readings.push({
            property: entry.property,
            value: scaled !== null && Number.isFinite(scaled) ? scaled : null,
            unit: entry.unit,
          });
        } catch {
          readings.push({ property: entry.property, value: null, unit: entry.unit });
        }
      }),
    );

    const anyValue = readings.some((r) => r.value !== null);
    return {
      fetch_status: anyValue ? 'complete' : 'failed',
      confidence: anyValue ? 'medium' : 'low',
      source_api: 'ISRIC SoilGrids v2.0 (self-hosted)',
      attribution: this.getAttribution(),
      summary: { readings },
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async samplePoint(filename: string, lat: number, lng: number): Promise<number | null> {
    const tiff = await this.openTiff(filename);
    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();
    const origin = image.getOrigin();
    const resolution = image.getResolution();

    const originX = origin[0];
    const originY = origin[1];
    const xRes = resolution[0];
    const yRes = resolution[1];
    if (originX === undefined || originY === undefined || xRes === undefined || yRes === undefined) {
      return null;
    }

    const px = Math.floor((lng - originX) / xRes);
    const py = Math.floor((lat - originY) / yRes);
    if (px < 0 || py < 0 || px >= width || py >= height) return null;

    const rasters = await image.readRasters({
      window: [px, py, px + 1, py + 1],
      interleave: false,
    });

    const band0 = (rasters as unknown as ArrayLike<ArrayLike<number>>)[0];
    if (!band0) return null;
    const v = band0[0];
    if (v === undefined || v === null) return null;

    const gdalNoData = (image as unknown as { getGDALNoData: () => number | null }).getGDALNoData?.();
    if (gdalNoData !== null && gdalNoData !== undefined && v === gdalNoData) return null;

    return typeof v === 'number' ? v : Number(v);
  }

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

    if (this.tiffCache.size >= 128) {
      const firstKey = this.tiffCache.keys().next().value;
      if (firstKey) this.tiffCache.delete(firstKey);
    }
    this.tiffCache.set(filename, tiff);
    return tiff;
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

let _instance: SoilGridsRasterService | null = null;

export function initSoilGridsService(dataDir: string, s3Prefix: string | null): SoilGridsRasterService {
  _instance = new SoilGridsRasterService(dataDir, s3Prefix);
  _instance.loadManifest();
  return _instance;
}

export function getSoilGridsService(): SoilGridsRasterService | null {
  return _instance;
}
