/**
 * ElevationGridReader — unified raster acquisition for US (3DEP) and CA (NRCan HRDEM).
 *
 * Returns a normalised ElevationGrid (Float32Array + metadata) from either source.
 * Used by the terrain analysis BullMQ job and the NRCan elevation proxy route.
 */

import { fromUrl, fromArrayBuffer } from 'geotiff';
import type { Country } from '@ogden/shared';

// ── Public interface ────────────────────────────────────────────────────────

export interface ElevationGrid {
  data: Float32Array;
  width: number;
  height: number;
  cellSizeX: number;   // metres
  cellSizeY: number;   // metres
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  noDataValue: number;
  resolution_m: number;
  sourceApi: string;
  confidence: 'high' | 'medium' | 'low';
}

export async function readElevationGrid(
  bbox: [number, number, number, number],
  country: Country,
): Promise<ElevationGrid> {
  if (country === 'CA') {
    return readNrcanHrdem(bbox);
  }
  return read3dep(bbox);
}

// ── US: USGS 3DEP WCS ──────────────────────────────────────────────────────

const WCS_3DEP_BASE = 'https://elevation.nationalmap.gov/arcgis/services/3DEPElevation/ImageServer/WCSServer';
const MAX_RASTER_DIM = 512;

async function read3dep(bbox: [number, number, number, number]): Promise<ElevationGrid> {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const centerLat = (minLat + maxLat) / 2;

  const latSpanM = (maxLat - minLat) * 111320;
  const lngSpanM = (maxLon - minLon) * 111320 * Math.cos((centerLat * Math.PI) / 180);

  let width = Math.round(lngSpanM);
  let height = Math.round(latSpanM);
  if (width > MAX_RASTER_DIM || height > MAX_RASTER_DIM) {
    const scale = MAX_RASTER_DIM / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  width = Math.max(2, width);
  height = Math.max(2, height);

  const params = new URLSearchParams({
    SERVICE: 'WCS',
    VERSION: '1.0.0',
    REQUEST: 'GetCoverage',
    COVERAGE: 'DEP3Elevation_1',
    CRS: 'EPSG:4326',
    BBOX: `${minLon},${minLat},${maxLon},${maxLat}`,
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: 'GeoTIFF',
  });

  const resp = await fetch(`${WCS_3DEP_BASE}?${params}`, { signal: AbortSignal.timeout(30000) });

  const contentType = resp.headers.get('content-type') ?? '';
  if (contentType.includes('xml') || contentType.includes('text')) {
    throw new Error('WCS returned error/XML response instead of raster');
  }

  const arrayBuffer = await resp.arrayBuffer();
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const rasters = await image.readRasters();
  const rawData = rasters[0] as Float32Array | Float64Array;
  const rasterW = image.getWidth();
  const rasterH = image.getHeight();
  const noDataValue = image.getGDALNoData() ?? -9999;

  // Copy into Float32Array (WCS data is already NAVD88, no datum shift needed)
  const data = new Float32Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    const v = rawData[i]!;
    data[i] = (v === noDataValue || v < -1000 || v > 9000) ? noDataValue : v;
  }

  const cellSizeX = lngSpanM / rasterW;
  const cellSizeY = latSpanM / rasterH;
  const resolution_m = Math.max(cellSizeX, cellSizeY);

  return {
    data,
    width: rasterW,
    height: rasterH,
    cellSizeX,
    cellSizeY,
    bbox,
    noDataValue,
    resolution_m: +resolution_m.toFixed(2),
    sourceApi: 'usgs_3dep',
    confidence: 'high',
  };
}

// ── Canada: NRCan HRDEM via STAC + COG ──────────────────────────────────────

const NRCAN_STAC_API = 'https://datacube.services.geo.ca/stac/api';
const HRDEM_COLLECTION = 'hrdem-lidar';
const HRDEM_FALLBACK_COLLECTION = 'hrdem-cdem';

const CGVD2013_TO_NAVD88_OFFSETS: Record<string, number> = {
  '42': -0.32, '43': -0.36, '44': -0.39, '45': -0.41,
  '46': -0.43, '47': -0.44, '48': -0.45, '49': -0.44, '50': -0.42,
};

function getCgvd2013ToNavd88Offset(lat: number): number {
  return CGVD2013_TO_NAVD88_OFFSETS[String(Math.round(lat))] ?? -0.40;
}

async function readNrcanHrdem(bbox: [number, number, number, number]): Promise<ElevationGrid> {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const centerLat = (minLat + maxLat) / 2;

  let cogUrl = await findCogUrl(minLon, minLat, maxLon, maxLat, HRDEM_COLLECTION);
  let isLidar = true;

  if (!cogUrl) {
    cogUrl = await findCogUrl(minLon, minLat, maxLon, maxLat, HRDEM_FALLBACK_COLLECTION);
    isLidar = false;
  }

  if (!cogUrl) {
    throw new Error('No HRDEM coverage found for this bounding box');
  }

  const datumOffset = getCgvd2013ToNavd88Offset(centerLat);
  const latSpanDeg = maxLat - minLat;
  const lonSpanDeg = maxLon - minLon;
  const latSpanM = latSpanDeg * 111320;
  const lngSpanM = lonSpanDeg * 111320 * Math.cos((centerLat * Math.PI) / 180);

  let tileW = Math.round(lngSpanM);
  let tileH = Math.round(latSpanM);
  if (tileW > MAX_RASTER_DIM || tileH > MAX_RASTER_DIM) {
    const scale = MAX_RASTER_DIM / Math.max(tileW, tileH);
    tileW = Math.round(tileW * scale);
    tileH = Math.round(tileH * scale);
  }
  tileW = Math.max(2, tileW);
  tileH = Math.max(2, tileH);

  const tiff = await fromUrl(cogUrl);
  const image = await tiff.getImage();

  // Convert geographic bbox to pixel coordinates
  const origin = image.getOrigin?.()
    ?? (() => { const b = image.getBoundingBox(); return [b[0], b[3]]; })();
  const originX = origin[0]!;
  const originY = origin[1]!;

  const [resX, resY] = image.getResolution();
  const imgWidth = image.getWidth();
  const imgHeight = image.getHeight();

  let px0 = Math.floor((minLon - originX) / resX!);
  let py0 = Math.floor((originY - maxLat) / Math.abs(resY!));
  let px1 = Math.ceil((maxLon - originX) / resX!);
  let py1 = Math.ceil((originY - minLat) / Math.abs(resY!));

  px0 = Math.max(0, Math.min(imgWidth - 1, px0));
  py0 = Math.max(0, Math.min(imgHeight - 1, py0));
  px1 = Math.max(px0 + 1, Math.min(imgWidth, px1));
  py1 = Math.max(py0 + 1, Math.min(imgHeight, py1));

  const rasters = await image.readRasters({
    window: [px0, py0, px1, py1],
    width: tileW,
    height: tileH,
  });

  const rawData = rasters[0] as Float32Array | Float64Array;
  const noDataValue = image.getGDALNoData() ?? -9999;

  // Apply CGVD2013 -> NAVD88 datum shift
  const data = new Float32Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    const v = rawData[i]!;
    if (v === noDataValue || v < -1000 || v > 9000) {
      data[i] = noDataValue;
    } else {
      data[i] = v + datumOffset;
    }
  }

  const cellSizeX = lngSpanM / tileW;
  const cellSizeY = latSpanM / tileH;
  const resolution_m = Math.max(cellSizeX, cellSizeY);

  return {
    data,
    width: tileW,
    height: tileH,
    cellSizeX,
    cellSizeY,
    bbox,
    noDataValue,
    resolution_m: +resolution_m.toFixed(2),
    sourceApi: 'nrcan_hrdem',
    confidence: isLidar ? 'high' : 'medium',
  };
}

// ── STAC helper ─────────────────────────────────────────────────────────────

export async function findCogUrl(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
  collection: string,
): Promise<string | null> {
  const body = {
    collections: [collection],
    bbox: [minLon, minLat, maxLon, maxLat],
    limit: 5,
    sortby: [{ field: 'properties.datetime', direction: 'desc' }],
  };

  const resp = await fetch(`${NRCAN_STAC_API}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) throw new Error(`STAC search failed: HTTP ${resp.status}`);

  const result = await resp.json() as {
    features?: Array<{
      assets?: Record<string, { href?: string; type?: string }>;
    }>;
  };

  if (!result.features || result.features.length === 0) return null;

  for (const feature of result.features) {
    if (!feature.assets) continue;
    const dtmAsset = feature.assets['dtm'] ?? feature.assets['data'] ?? feature.assets['dsm'];
    if (dtmAsset?.href && (dtmAsset.type?.includes('tiff') || dtmAsset.href.endsWith('.tif') || dtmAsset.href.endsWith('.tiff'))) {
      return dtmAsset.href;
    }
    for (const asset of Object.values(feature.assets)) {
      if (asset.href && (asset.type?.includes('tiff') || asset.href.endsWith('.tif'))) {
        return asset.href;
      }
    }
  }

  return null;
}
