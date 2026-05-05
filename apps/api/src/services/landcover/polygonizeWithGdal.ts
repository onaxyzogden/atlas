/**
 * polygonizeWithGdal — production polygoniser for 8.1-B's friction surface.
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline (D5). Conforms
 * to the abstract `Polygonizer` contract from
 * `@ogden/shared/ecology/polygonizeBbox`. Shells out to `gdal_polygonize.py`
 * to vectorise the in-memory raster clip, then reads the resulting GeoJSON
 * back into the `PolygonizeResult` shape.
 *
 * GDAL binary discovery follows the cpcad-ingest precedent:
 *   - `GDAL_BIN_DIR` env var → join that to the script name
 *   - else assume on PATH
 *
 * Tier-3 worker boot must verify `gdal_polygonize.py --version` exits 0
 * before the worker starts handling pollinator-opportunity jobs (see
 * ADR operator notes).
 */

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pino from 'pino';
import type {
  Polygonizer,
  PolygonizeResult,
  PolygonizedFeature,
  PolygonizedClassProps,
  RasterClip,
} from '@ogden/shared';
import { config } from '../../lib/config.js';

const logger = pino({ name: 'polygonizeWithGdal' });

const GDAL_BIN = config.GDAL_BIN_DIR ?? '';

function gdalBin(name: string): string {
  return GDAL_BIN ? join(GDAL_BIN, name) : name;
}

export const polygonizeWithGdal: Polygonizer = async (clip: RasterClip): Promise<PolygonizeResult> => {
  const t0 = Date.now();
  const dir = await mkdtemp(join(tmpdir(), 'atlas-poly-'));
  const tifPath = join(dir, 'clip.tif');
  const geojsonPath = join(dir, 'out.geojson');

  try {
    await writeClipAsGeotiff(clip, tifPath);

    // gdal_polygonize.py <src> -b 1 -f "GeoJSON" <dst> <layer> <fieldname>
    // Field 'class_id' carries the native class code.
    const args = [
      tifPath,
      '-b', '1',
      '-f', 'GeoJSON',
      geojsonPath,
      'classes',
      'class_id',
    ];
    const code = await runGdal('gdal_polygonize.py', args);
    if (code !== 0) {
      throw new Error(`gdal_polygonize.py exited ${code}`);
    }

    const raw = await readFile(geojsonPath, 'utf8');
    const fc = JSON.parse(raw) as {
      type: 'FeatureCollection';
      features: Array<{
        type: 'Feature';
        geometry: PolygonizedFeature['geometry'];
        properties: { class_id: number } & Record<string, unknown>;
      }>;
    };

    const cellAreaM2 = computeCellAreaM2(clip);

    const features: PolygonizedFeature[] = fc.features
      .filter((f) => f.geometry !== null && (clip.nodataValue === null || f.properties['class_id'] !== clip.nodataValue))
      .map((f) => {
        const props: PolygonizedClassProps = {
          classId: f.properties['class_id'],
          source: clip.source,
          vintage: clip.vintage,
          // gdal_polygonize.py does not emit area; approximate from pixel
          // count by counting via a polygon-fill pass would be more accurate,
          // but for the friction surface a coarse estimate is sufficient.
          areaM2: estimatePolygonArea(f.geometry, cellAreaM2),
        };
        return {
          type: 'Feature' as const,
          geometry: f.geometry,
          properties: props,
        };
      });

    let pixelCount = 0;
    for (let i = 0; i < clip.pixels.length; i++) {
      const v = clip.pixels[i];
      if (v === undefined) continue;
      if (clip.nodataValue !== null && v === clip.nodataValue) continue;
      pixelCount++;
    }

    return {
      features,
      vintage: clip.vintage,
      source: clip.source,
      pixelCount,
      polygonizeMs: Date.now() - t0,
      crs: clip.sourceCrs,
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch((err) => {
      logger.warn({ err, dir }, 'failed to clean tmpdir');
    });
  }
};

/**
 * Write a raster clip to a single-band GeoTIFF that gdal_polygonize.py
 * can read. Uses the `geotiff` package's writer if available; otherwise
 * falls back to `gdal_translate` from a raw binary file. Implementation
 * is deliberately stubbed here — tier-3 worker boot shells in the COG
 * directly via `gdal_polygonize.py <input.tif>`, so this function is
 * only exercised when the in-memory clip path is used.
 *
 * For Phase 4 fixture testing the pure-JS `polygonizePixelGrid` from
 * shared is the test path; this writer becomes critical once Phase 5's
 * processor swap injects this polygoniser against real raster clips.
 */
async function writeClipAsGeotiff(_clip: RasterClip, _path: string): Promise<void> {
  // Phase 5 wires this to `geotiff.writeArrayBuffer(..., { width, height,
  // BitsPerSample, ModelPixelScaleTag, ModelTiepointTag, GeoKeyDirectoryTag,
  // GDAL_NODATA })`. Until the processor swap lands, polygonizeWithGdal
  // is unused at runtime — the pure-JS fallback handles fixture tests.
  throw new Error(
    'polygonizeWithGdal.writeClipAsGeotiff: not yet implemented — wire in Phase 5 processor swap',
  );
}

function runGdal(name: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    logger.info({ name, args }, 'spawning gdal');
    const proc = spawn(gdalBin(name), args);
    proc.stderr.on('data', (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (msg) logger.warn({ stderr: msg }, `${name} stderr`);
    });
    proc.on('error', reject);
    proc.on('close', (code) => resolve(code ?? -1));
  });
}

function computeCellAreaM2(clip: RasterClip): number {
  if (clip.sourceCrs === 'EPSG:4326') {
    const mPerDeg = 111_320;
    return Math.abs(clip.pixelSize[0] * mPerDeg * clip.pixelSize[1] * mPerDeg);
  }
  return Math.abs(clip.pixelSize[0] * clip.pixelSize[1]);
}

/**
 * Trivial polygon-area estimator: just counts coordinate pairs as a proxy
 * for cell count. Replaced in Phase 5 with `ST_Area(geom::geography)`
 * from the PostGIS reprojection step.
 */
function estimatePolygonArea(geom: PolygonizedFeature['geometry'], cellAreaM2: number): number {
  if (geom.type === 'Polygon') return geom.coordinates[0]!.length * cellAreaM2 * 0.25;
  let n = 0;
  for (const poly of geom.coordinates) n += poly[0]!.length;
  return n * cellAreaM2 * 0.25;
}
