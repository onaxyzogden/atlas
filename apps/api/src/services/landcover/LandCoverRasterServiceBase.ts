/**
 * LandCoverRasterServiceBase — shared raster-sample plumbing for the three
 * land-cover services (NLCD / ACI / WorldCover).
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline (D2):
 *   - Manifest on boot (no COGs opened until first request).
 *   - Byte-range reads via geotiff.js fromFile (local) / fromUrl (S3).
 *   - LRU tiff handle cache (cap 128).
 *   - Reprojection at sample time via proj4; rasters stay in native CRS on disk.
 *
 * Per ADR D1 the adapter layer is raster-sample only (no polygonisation);
 * `sampleHistogram(parcel)` returns a per-native-class pixel count for the
 * parcel bbox. The adapter then converts native codes to canonical Atlas
 * classes via `landCoverClasses.ts`.
 *
 * Subclasses lock:
 *   - `sourceCRS`            — EPSG code of the on-disk rasters
 *   - `manifestFilename`     — the per-source manifest JSON
 *   - `serviceName`          — for log scope
 *
 * Mirrors GaezRasterService / SoilGridsRasterService precedent rather than
 * inventing a third pattern. See those files for the original design.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fromFile, fromUrl, type GeoTIFF } from 'geotiff';
import proj4 from 'proj4';
import pino from 'pino';
import type { LandCoverSourceId, RasterClip } from '@ogden/shared';

// ── Manifest types ─────────────────────────────────────────────────────────

export interface LandCoverManifestEntry {
  /** Filename relative to dataDir / s3Prefix root. */
  filename: string;
  /** Native CRS bbox of this tile [minX, minY, maxX, maxY]. */
  bbox: [number, number, number, number];
  /** Optional vintage override; falls back to top-level `vintage`. */
  vintage?: number;
}

export interface LandCoverManifest {
  generated_at: string;
  source: 'NLCD' | 'ACI' | 'WorldCover';
  /** Top-level vintage year (e.g. 2021). Per-tile override on entry.vintage. */
  vintage: number;
  /** EPSG code of all on-disk rasters (informational; service hardcodes its own). */
  source_crs: number;
  attribution: string;
  licence: string;
  entries: LandCoverManifestEntry[];
}

// ── Public sample types ────────────────────────────────────────────────────

export interface ParcelBbox4326 {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface ClassHistogram {
  /** Per-native-class pixel count. Keys are stringified native class codes. */
  counts: Record<string, number>;
  /** Total pixels sampled (== sum(counts) + nodataCount). */
  totalPixels: number;
  /** Pixels classified as NoData / out-of-extent. */
  nodataCount: number;
  /** Vintage of the tile(s) that satisfied this query. */
  vintage: number;
  /** Native pixel size in source CRS units (informational). */
  pixelSize: { x: number; y: number };
}

// ── Service base ───────────────────────────────────────────────────────────

const WGS84 = 'EPSG:4326';

export abstract class LandCoverRasterServiceBase {
  protected manifest: LandCoverManifest | null = null;
  protected tiffCache = new Map<string, GeoTIFF>();
  private _log: pino.Logger | null = null;
  protected get log(): pino.Logger {
    if (!this._log) this._log = pino({ name: this.serviceName });
    return this._log;
  }

  /** EPSG code (e.g. 5070 for NLCD). Subclass concrete. */
  protected abstract readonly sourceCRS: number;

  /** Manifest filename in dataDir (e.g. 'nlcd-manifest.json'). */
  protected abstract readonly manifestFilename: string;

  /** Log scope name (e.g. 'NlcdRasterService'). */
  protected abstract readonly serviceName: string;

  /** Canonical source enum id for the polygon-path RasterClip output. */
  protected abstract readonly sourceId: LandCoverSourceId;

  /**
   * proj4 definition for the source CRS. Subclass returns the proj4 string.
   * Most common CRSes ship with proj4 by default; NLCD's EPSG:5070 and ACI's
   * EPSG:3347 do not, so subclasses must register them.
   */
  protected abstract get sourceCRSProj4(): string;

  constructor(
    protected readonly dataDir: string,
    protected readonly s3Prefix: string | null = null,
  ) {}

  loadManifest(): boolean {
    const manifestPath = join(this.dataDir, this.manifestFilename);
    if (!existsSync(manifestPath)) {
      this.manifest = null;
      return false;
    }
    try {
      const raw = readFileSync(manifestPath, 'utf-8');
      this.manifest = JSON.parse(raw) as LandCoverManifest;
      // Register source CRS with proj4 if not already known
      const epsgKey = `EPSG:${this.sourceCRS}`;
      if (!proj4.defs(epsgKey)) {
        proj4.defs(epsgKey, this.sourceCRSProj4);
      }
      return true;
    } catch (err) {
      this.log.error({ err, manifestPath }, 'Failed to parse land-cover manifest');
      this.manifest = null;
      return false;
    }
  }

  isEnabled(): boolean {
    return this.manifest !== null && this.manifest.entries.length > 0;
  }

  getAttribution(): string {
    return this.manifest?.attribution ?? `Land cover (${this.serviceName})`;
  }

  getVintage(): number | null {
    return this.manifest?.vintage ?? null;
  }

  getLicence(): string {
    return this.manifest?.licence ?? 'unknown';
  }

  /**
   * Reproject a WGS84 bbox into source CRS. Returns the source-CRS bbox of
   * the rectangle that fully contains the reprojected lat/lng corners. For
   * the small parcel-scale bboxes we deal with (≤ a few km), corner-only
   * reprojection is sufficient; a fully accurate clip would densify edges.
   */
  protected reprojectBboxToSource(bbox: ParcelBbox4326): {
    minX: number; minY: number; maxX: number; maxY: number;
  } {
    if (this.sourceCRS === 4326) {
      return {
        minX: bbox.minLng,
        minY: bbox.minLat,
        maxX: bbox.maxLng,
        maxY: bbox.maxLat,
      };
    }
    const tgt = `EPSG:${this.sourceCRS}`;
    // Reproject all four corners; the source-CRS bbox is the corner-extents.
    const corners: Array<[number, number]> = [
      [bbox.minLng, bbox.minLat],
      [bbox.maxLng, bbox.minLat],
      [bbox.minLng, bbox.maxLat],
      [bbox.maxLng, bbox.maxLat],
    ];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [lng, lat] of corners) {
      const [x, y] = proj4(WGS84, tgt, [lng, lat]);
      if (x === undefined || y === undefined) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      throw new Error(`Reprojection failed for bbox ${JSON.stringify(bbox)}`);
    }
    return { minX, minY, maxX, maxY };
  }

  /**
   * Pick the manifest entries whose source-CRS bbox intersects the
   * reprojected parcel bbox. Most parcels hit one tile; a parcel straddling
   * a tile boundary can hit 2-4. Returns empty when manifest unloaded or
   * no tiles intersect (e.g. WorldCover queried for an Antarctic parcel).
   */
  protected pickIntersectingEntries(srcBbox: {
    minX: number; minY: number; maxX: number; maxY: number;
  }): LandCoverManifestEntry[] {
    if (!this.manifest) return [];
    return this.manifest.entries.filter((e) =>
      e.bbox[2] >= srcBbox.minX  // tile.maxX >= bbox.minX
      && e.bbox[0] <= srcBbox.maxX  // tile.minX <= bbox.maxX
      && e.bbox[3] >= srcBbox.minY  // tile.maxY >= bbox.minY
      && e.bbox[1] <= srcBbox.maxY,  // tile.minY <= bbox.maxY
    );
  }

  /**
   * Sample the raster(s) covering `parcelBbox` and return a per-native-class
   * pixel histogram. For multi-tile parcels, the histograms from each tile
   * are summed; this is correct because the raster is a discrete classified
   * grid (a single physical pixel never spans tile boundaries; it's owned by
   * one tile or the other).
   *
   * Bbox-only sampling is the v1 cut: pixels inside the parcel bbox but
   * outside the parcel polygon are counted. For square-ish parcels the
   * error is small (≤ 5%); a polygon-mask refinement is a follow-up.
   * Documented in the ADR as a known limitation.
   */
  async sampleHistogram(parcelBbox: ParcelBbox4326): Promise<ClassHistogram | null> {
    if (!this.manifest || !this.isEnabled()) return null;

    const srcBbox = this.reprojectBboxToSource(parcelBbox);
    const entries = this.pickIntersectingEntries(srcBbox);
    if (entries.length === 0) {
      this.log.info({ srcBbox }, 'No tiles intersect parcel bbox');
      return null;
    }

    const counts: Record<string, number> = {};
    let totalPixels = 0;
    let nodataCount = 0;
    let pixelSizeX = 0;
    let pixelSizeY = 0;

    for (const entry of entries) {
      const tileResult = await this.sampleTile(entry, srcBbox);
      if (!tileResult) continue;
      for (const [code, n] of Object.entries(tileResult.counts)) {
        counts[code] = (counts[code] ?? 0) + n;
      }
      totalPixels += tileResult.totalPixels;
      nodataCount += tileResult.nodataCount;
      pixelSizeX = tileResult.pixelSizeX;
      pixelSizeY = tileResult.pixelSizeY;
    }

    if (totalPixels === 0) return null;

    return {
      counts,
      totalPixels,
      nodataCount,
      vintage: this.manifest.vintage,
      pixelSize: { x: pixelSizeX, y: pixelSizeY },
    };
  }

  /**
   * Sample a single tile's window-restricted to the source-CRS bbox.
   * Returns null on tile open failure; nodata pixels are tracked separately.
   */
  private async sampleTile(
    entry: LandCoverManifestEntry,
    srcBbox: { minX: number; minY: number; maxX: number; maxY: number },
  ): Promise<{
    counts: Record<string, number>;
    totalPixels: number;
    nodataCount: number;
    pixelSizeX: number;
    pixelSizeY: number;
  } | null> {
    let tiff: GeoTIFF;
    try {
      tiff = await this.openTiff(entry.filename);
    } catch (err) {
      this.log.warn({ err, filename: entry.filename }, 'Failed to open tile');
      return null;
    }
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

    // Compute pixel window inside this tile that covers the bbox intersection
    // of (parcel ∩ tile). yRes is negative for north-up rasters.
    const tileBbox = entry.bbox;
    const ix0 = Math.max(srcBbox.minX, tileBbox[0]);
    const iy0 = Math.max(srcBbox.minY, tileBbox[1]);
    const ix1 = Math.min(srcBbox.maxX, tileBbox[2]);
    const iy1 = Math.min(srcBbox.maxY, tileBbox[3]);
    if (ix0 >= ix1 || iy0 >= iy1) return null;  // no overlap

    const px0 = Math.max(0, Math.floor((ix0 - originX) / xRes));
    const px1 = Math.min(width, Math.ceil((ix1 - originX) / xRes));
    // Y axis is flipped (yRes < 0): top of bbox maps to lower py.
    const py0 = Math.max(0, Math.floor((iy1 - originY) / yRes));
    const py1 = Math.min(height, Math.ceil((iy0 - originY) / yRes));
    if (px0 >= px1 || py0 >= py1) return null;

    const rasters = await image.readRasters({
      window: [px0, py0, px1, py1],
      interleave: false,
    });
    const band0 = (rasters as unknown as ArrayLike<ArrayLike<number>>)[0];
    if (!band0) return null;

    const gdalNoData = (image as unknown as {
      getGDALNoData: () => number | null;
    }).getGDALNoData?.();

    const counts: Record<string, number> = {};
    let totalPixels = 0;
    let nodataCount = 0;
    const len = (band0 as unknown as { length: number }).length;
    for (let i = 0; i < len; i++) {
      const v = band0[i];
      totalPixels++;
      if (v === undefined || v === null) {
        nodataCount++;
        continue;
      }
      const numV = typeof v === 'number' ? v : Number(v);
      if (gdalNoData !== null && gdalNoData !== undefined && numV === gdalNoData) {
        nodataCount++;
        continue;
      }
      const key = String(numV);
      counts[key] = (counts[key] ?? 0) + 1;
    }

    return {
      counts,
      totalPixels,
      nodataCount,
      pixelSizeX: Math.abs(xRes),
      pixelSizeY: Math.abs(yRes),
    };
  }

  /**
   * Maximum number of intersecting tiles supported by `clipToBbox`. Bounded to
   * keep memory usage predictable and the stitch-loop trivially correct. Real
   * parcels-near-tile-corners worst case is 4 (a 2D corner straddle); five or
   * more means either a pathological manifest or an AOI larger than any
   * realistic parcel.
   */
  private static readonly CLIP_MAX_TILES = 4;

  /**
   * Clip the raster covering `parcelBbox` and return a `RasterClip` suitable
   * for `polygonizeBbox`. Per ADR D5/D8 — feeds the polygon-friction path
   * in PollinatorOpportunityProcessor.
   *
   * Stitches across up to {@link CLIP_MAX_TILES} aligned-grid tiles when the
   * parcel straddles tile boundaries (common for WorldCover's 3°×3° tiles
   * at any non-trivial AOI extent). All intersecting tiles must share the
   * same pixel grid (xRes/yRes + origin modulo), the same NoData sentinel,
   * and the same vintage; on any mismatch the method falls back to `null`
   * and the orchestrator drops to the synthesized-grid path.
   */
  async clipToBbox(parcelBbox: ParcelBbox4326): Promise<RasterClip | null> {
    if (!this.manifest || !this.isEnabled()) return null;

    const srcBbox = this.reprojectBboxToSource(parcelBbox);
    const entries = this.pickIntersectingEntries(srcBbox);
    if (entries.length === 0) {
      this.log.info({ srcBbox }, 'clipToBbox: no tiles intersect');
      return null;
    }
    if (entries.length > LandCoverRasterServiceBase.CLIP_MAX_TILES) {
      this.log.warn(
        { tileCount: entries.length, max: LandCoverRasterServiceBase.CLIP_MAX_TILES, srcBbox },
        'clipToBbox: too-many-tiles — falling back',
      );
      return null;
    }

    // ── Open every intersecting tile and capture grid metadata ─────────────
    interface TileMeta {
      entry: LandCoverManifestEntry;
      width: number;
      height: number;
      originX: number;
      originY: number;
      xRes: number;
      yRes: number;
      gdalNoData: number | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      image: any;
    }
    const tiles: TileMeta[] = [];
    for (const entry of entries) {
      let tiff: GeoTIFF;
      try {
        tiff = await this.openTiff(entry.filename);
      } catch (err) {
        this.log.warn({ err, filename: entry.filename }, 'clipToBbox: open failed');
        return null;
      }
      const image = await tiff.getImage();
      const origin = image.getOrigin();
      const resolution = image.getResolution();
      const originX = origin[0];
      const originY = origin[1];
      const xRes = resolution[0];
      const yRes = resolution[1];
      if (originX === undefined || originY === undefined || xRes === undefined || yRes === undefined) {
        return null;
      }
      const gdalNoData = (image as unknown as {
        getGDALNoData: () => number | null;
      }).getGDALNoData?.() ?? null;
      tiles.push({
        entry,
        width: image.getWidth(),
        height: image.getHeight(),
        originX, originY, xRes, yRes, gdalNoData,
        image,
      });
    }

    // ── Single-tile fast path ─────────────────────────────────────────────
    if (tiles.length === 1) {
      return this.clipSingleTile(tiles[0]!, srcBbox);
    }

    // ── Multi-tile: validate grid alignment, NoData, vintage ──────────────
    const ref = tiles[0]!;
    const refVintage = ref.entry.vintage ?? this.manifest.vintage;
    const EPS = 1e-9;
    for (let t = 1; t < tiles.length; t++) {
      const tile = tiles[t]!;
      if (Math.abs(tile.xRes - ref.xRes) > EPS || Math.abs(tile.yRes - ref.yRes) > EPS) {
        this.log.warn(
          { tileCount: tiles.length },
          'clipToBbox: multi-tile parcel — grid misalignment (resolution), falling back',
        );
        return null;
      }
      const colShift = (tile.originX - ref.originX) / ref.xRes;
      const rowShift = (tile.originY - ref.originY) / ref.yRes;
      if (Math.abs(colShift - Math.round(colShift)) > 1e-6
          || Math.abs(rowShift - Math.round(rowShift)) > 1e-6) {
        this.log.warn(
          { tileCount: tiles.length },
          'clipToBbox: multi-tile parcel — grid misalignment (origin offset), falling back',
        );
        return null;
      }
      if (tile.gdalNoData !== ref.gdalNoData) {
        this.log.warn(
          { tileCount: tiles.length, refNoData: ref.gdalNoData, tileNoData: tile.gdalNoData },
          'clipToBbox: multi-tile parcel — mixed NoData, falling back',
        );
        return null;
      }
      const tileVintage = tile.entry.vintage ?? this.manifest.vintage;
      if (tileVintage !== refVintage) {
        this.log.warn(
          { tileCount: tiles.length, refVintage, tileVintage },
          'clipToBbox: multi-tile parcel — mixed vintage, falling back',
        );
        return null;
      }
    }

    // ── Compute each tile's intersect-window in absolute (ref-grid) pixels ─
    interface TileWindow {
      tile: TileMeta;
      // tile-local pixel window
      px0: number; py0: number; px1: number; py1: number;
      // absolute (ref-grid) pixel coordinates of (px0,py0)
      absCol0: number; absRow0: number;
    }
    const windows: TileWindow[] = [];
    for (const tile of tiles) {
      const tb = tile.entry.bbox;
      const ix0 = Math.max(srcBbox.minX, tb[0]);
      const iy0 = Math.max(srcBbox.minY, tb[1]);
      const ix1 = Math.min(srcBbox.maxX, tb[2]);
      const iy1 = Math.min(srcBbox.maxY, tb[3]);
      if (ix0 >= ix1 || iy0 >= iy1) continue;

      const px0 = Math.max(0, Math.floor((ix0 - tile.originX) / tile.xRes));
      const px1 = Math.min(tile.width, Math.ceil((ix1 - tile.originX) / tile.xRes));
      const py0 = Math.max(0, Math.floor((iy1 - tile.originY) / tile.yRes));
      const py1 = Math.min(tile.height, Math.ceil((iy0 - tile.originY) / tile.yRes));
      if (px0 >= px1 || py0 >= py1) continue;

      const colOffset = Math.round((tile.originX - ref.originX) / ref.xRes);
      const rowOffset = Math.round((tile.originY - ref.originY) / ref.yRes);
      windows.push({
        tile,
        px0, py0, px1, py1,
        absCol0: colOffset + px0,
        absRow0: rowOffset + py0,
      });
    }
    if (windows.length === 0) return null;

    // ── Union absolute window → stitched buffer ───────────────────────────
    let absMinCol = Infinity, absMinRow = Infinity;
    let absMaxCol = -Infinity, absMaxRow = -Infinity;
    for (const w of windows) {
      const cols = w.px1 - w.px0;
      const rows = w.py1 - w.py0;
      if (w.absCol0 < absMinCol) absMinCol = w.absCol0;
      if (w.absRow0 < absMinRow) absMinRow = w.absRow0;
      if (w.absCol0 + cols > absMaxCol) absMaxCol = w.absCol0 + cols;
      if (w.absRow0 + rows > absMaxRow) absMaxRow = w.absRow0 + rows;
    }
    const W = absMaxCol - absMinCol;
    const H = absMaxRow - absMinRow;
    if (W <= 0 || H <= 0) return null;

    const fill = ref.gdalNoData ?? 0;
    const pixels = new Int32Array(W * H);
    if (fill !== 0) pixels.fill(fill);

    for (const w of windows) {
      const tileW = w.px1 - w.px0;
      const tileH = w.py1 - w.py0;
      const rasters = await w.tile.image.readRasters({
        window: [w.px0, w.py0, w.px1, w.py1],
        interleave: false,
      });
      const band0 = (rasters as unknown as ArrayLike<ArrayLike<number>>)[0];
      if (!band0) continue;
      const dstCol0 = w.absCol0 - absMinCol;
      const dstRow0 = w.absRow0 - absMinRow;
      for (let r = 0; r < tileH; r++) {
        const dstRow = dstRow0 + r;
        const dstBase = dstRow * W + dstCol0;
        const srcBase = r * tileW;
        for (let c = 0; c < tileW; c++) {
          const v = band0[srcBase + c];
          pixels[dstBase + c] = typeof v === 'number' ? v : Number(v);
        }
      }
    }

    const stitchedBbox: [number, number, number, number] = [
      ref.originX + absMinCol * ref.xRes,
      ref.originY + absMaxRow * ref.yRes,  // yRes<0: largest row index → smallest Y
      ref.originX + absMaxCol * ref.xRes,
      ref.originY + absMinRow * ref.yRes,
    ];

    return {
      pixels,
      width: W,
      height: H,
      bboxSourceCrs: stitchedBbox,
      sourceCrs: `EPSG:${this.sourceCRS}`,
      pixelSize: [Math.abs(ref.xRes), Math.abs(ref.yRes)],
      nodataValue: ref.gdalNoData ?? null,
      vintage: refVintage,
      source: this.sourceId,
    };
  }

  /** Single-tile clip (fast path inlined from the pre-stitch implementation). */
  private async clipSingleTile(
    tile: {
      entry: LandCoverManifestEntry;
      width: number; height: number;
      originX: number; originY: number;
      xRes: number; yRes: number;
      gdalNoData: number | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      image: any;
    },
    srcBbox: { minX: number; minY: number; maxX: number; maxY: number },
  ): Promise<RasterClip | null> {
    const tb = tile.entry.bbox;
    const ix0 = Math.max(srcBbox.minX, tb[0]);
    const iy0 = Math.max(srcBbox.minY, tb[1]);
    const ix1 = Math.min(srcBbox.maxX, tb[2]);
    const iy1 = Math.min(srcBbox.maxY, tb[3]);
    if (ix0 >= ix1 || iy0 >= iy1) return null;

    const px0 = Math.max(0, Math.floor((ix0 - tile.originX) / tile.xRes));
    const px1 = Math.min(tile.width, Math.ceil((ix1 - tile.originX) / tile.xRes));
    const py0 = Math.max(0, Math.floor((iy1 - tile.originY) / tile.yRes));
    const py1 = Math.min(tile.height, Math.ceil((iy0 - tile.originY) / tile.yRes));
    if (px0 >= px1 || py0 >= py1) return null;

    const rasters = await tile.image.readRasters({
      window: [px0, py0, px1, py1],
      interleave: false,
    });
    const band0 = (rasters as unknown as ArrayLike<ArrayLike<number>>)[0];
    if (!band0) return null;

    const w = px1 - px0;
    const h = py1 - py0;
    const len = (band0 as unknown as { length: number }).length;
    const pixels = new Int32Array(len);
    for (let i = 0; i < len; i++) {
      const v = band0[i];
      pixels[i] = typeof v === 'number' ? v : Number(v);
    }

    const clipBboxSourceCrs: [number, number, number, number] = [
      tile.originX + px0 * tile.xRes,
      tile.originY + py1 * tile.yRes,
      tile.originX + px1 * tile.xRes,
      tile.originY + py0 * tile.yRes,
    ];

    return {
      pixels,
      width: w,
      height: h,
      bboxSourceCrs: clipBboxSourceCrs,
      sourceCrs: `EPSG:${this.sourceCRS}`,
      pixelSize: [Math.abs(tile.xRes), Math.abs(tile.yRes)],
      nodataValue: tile.gdalNoData,
      vintage: tile.entry.vintage ?? this.manifest!.vintage,
      source: this.sourceId,
    };
  }

  protected async openTiff(filename: string): Promise<GeoTIFF> {
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
