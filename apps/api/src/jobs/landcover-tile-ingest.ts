/**
 * landcover-tile-ingest — Per-vintage ingest job for the three self-hosted
 * land-cover sources (NLCD / ACI / WorldCover).
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline (D2, D4). NLCD
 * and WorldCover ship as country/global mosaics; ACI ships as provincial
 * tiles. This job:
 *
 *   1. Reads the source raster(s) from a local download dir
 *      (operator-supplied; no built-in fetcher — sources have varying
 *      auth + redistribution rules).
 *   2. (Re)builds Cloud-Optimized GeoTIFFs via `gdal_translate -of COG`
 *      so the byte-range reads in `LandCoverRasterServiceBase` work
 *      efficiently.
 *   3. Writes each tile to `<DATA_DIR>/<vintage>/<tile>.tif`.
 *   4. Emits a per-source manifest (`<DATA_DIR>/<source>-manifest.json`)
 *      that the runtime services load on boot (`loadManifest()`).
 *
 * Usage (one source at a time):
 *
 *   LANDCOVER_SOURCE=nlcd \
 *   LANDCOVER_VINTAGE=2021 \
 *   LANDCOVER_INPUT_DIR=/data/raw/nlcd-2021 \
 *   LANDCOVER_OUTPUT_DIR=/data/landcover/nlcd \
 *   GDAL_BIN_DIR=/opt/osgeo4w/bin \
 *   tsx apps/api/src/jobs/landcover-tile-ingest.ts
 *
 * After ingest:
 *   1. Set `LANDCOVER_TILES_READY=true` in the API server env.
 *   2. Restart the worker — the corresponding `LandCoverRasterService`
 *      loads the manifest and the orchestrator's `resolveAdapter`
 *      starts dispatching to the raster-sample adapter for that source.
 *
 * This is the operator-runs-once-per-vintage precedent established by
 * `cpcad-ingest.ts`. No fleet-level cron; vintage updates are manual.
 */

import { spawn } from 'node:child_process';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { fromFile } from 'geotiff';
import pino from 'pino';

const logger = pino({ name: 'landcover-tile-ingest' });

const SOURCE = (process.env['LANDCOVER_SOURCE'] ?? '').toLowerCase();
const VINTAGE = process.env['LANDCOVER_VINTAGE'];
const INPUT_DIR = process.env['LANDCOVER_INPUT_DIR'];
const OUTPUT_DIR = process.env['LANDCOVER_OUTPUT_DIR'];
const GDAL_BIN = process.env['GDAL_BIN_DIR'] ?? '';

if (!['nlcd', 'aci', 'worldcover'].includes(SOURCE)) {
  logger.error('LANDCOVER_SOURCE must be one of: nlcd, aci, worldcover');
  process.exit(1);
}
if (!VINTAGE || !/^\d{4}$/.test(VINTAGE)) {
  logger.error('LANDCOVER_VINTAGE must be a 4-digit year');
  process.exit(1);
}
if (!INPUT_DIR) {
  logger.error('LANDCOVER_INPUT_DIR is required (operator-downloaded source rasters)');
  process.exit(1);
}
if (!OUTPUT_DIR) {
  logger.error('LANDCOVER_OUTPUT_DIR is required (e.g. ./data/landcover/nlcd)');
  process.exit(1);
}

function gdalBin(name: string): string {
  return GDAL_BIN ? join(GDAL_BIN, name) : name;
}

function runGdal(name: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(gdalBin(name), args);
    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} exit ${code}: ${stderr}`));
    });
  });
}

interface ManifestEntry {
  filename: string;
  vintage: number;
  bbox: [number, number, number, number];   // [minX, minY, maxX, maxY] in source CRS
  width: number;
  height: number;
  pixelSize: [number, number];
  nodataValue: number | null;
}

async function probeTile(path: string): Promise<Omit<ManifestEntry, 'filename' | 'vintage'>> {
  const tiff = await fromFile(path);
  const image = await tiff.getImage();
  const bbox = image.getBoundingBox() as [number, number, number, number];
  const width = image.getWidth();
  const height = image.getHeight();
  const resolution = image.getResolution();
  const fd = image.getFileDirectory() as { GDAL_NODATA?: string };
  const noDataStr = fd.GDAL_NODATA?.replace(/\0$/, '').trim();
  const nodataValue = noDataStr ? Number(noDataStr) : null;
  return {
    bbox,
    width,
    height,
    pixelSize: [Math.abs(resolution[0] ?? 0), Math.abs(resolution[1] ?? 0)],
    nodataValue: Number.isFinite(nodataValue) ? nodataValue : null,
  };
}

async function main(): Promise<void> {
  const vintage = Number(VINTAGE);
  const vintageDir = join(OUTPUT_DIR!, String(vintage));
  await mkdir(vintageDir, { recursive: true });

  // Discover input rasters: any .tif/.tiff under INPUT_DIR (non-recursive
  // for now — operator can drop multiple ACI provincial tiles into the
  // input dir before running the job).
  const entries = await readdir(INPUT_DIR!);
  const inputRasters = entries
    .filter((n) => /\.(tif|tiff)$/i.test(n));
  if (inputRasters.length === 0) {
    logger.error({ INPUT_DIR }, 'no .tif/.tiff files found in input dir');
    process.exit(1);
  }

  const manifest: ManifestEntry[] = [];
  for (const fname of inputRasters) {
    const inPath = join(INPUT_DIR!, fname);
    const stem = parse(fname).name;
    const outName = `${stem}.tif`;
    const outPath = join(vintageDir, outName);

    logger.info({ source: SOURCE, vintage, inPath, outPath }, 'cogifying tile');
    await runGdal('gdal_translate', [
      '-of', 'COG',
      '-co', 'COMPRESS=DEFLATE',
      '-co', 'PREDICTOR=2',
      '-co', 'NUM_THREADS=ALL_CPUS',
      inPath,
      outPath,
    ]);

    const probed = await probeTile(outPath);
    manifest.push({ filename: outName, vintage, ...probed });
  }

  const manifestPath = join(OUTPUT_DIR!, `${SOURCE}-manifest.json`);
  const payload = {
    source: SOURCE,
    builtAt: new Date().toISOString(),
    entries: manifest,
  };
  await writeFile(manifestPath, JSON.stringify(payload, null, 2));
  logger.info(
    { manifestPath, tileCount: manifest.length, vintage },
    'manifest written; flip LANDCOVER_TILES_READY=true and restart the worker',
  );

  // Sanity check
  const st = await stat(manifestPath);
  if (st.size === 0) {
    logger.error('manifest is empty — aborting');
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error({ err }, 'landcover-tile-ingest failed');
  process.exit(1);
});
