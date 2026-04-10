/**
 * File Processor — classifies files, parses geospatial data, extracts EXIF,
 * and parses soil test CSVs. All functions return null on unrecoverable errors.
 */

import type { ConfidenceLevel, FileType } from '@ogden/shared';
import { DOMParser } from '@xmldom/xmldom';
import { kml } from '@tmcw/togeojson';
import JSZip from 'jszip';

// ─── File Classification ────────────────────────────────────────────────────

export function classifyFileType(filename: string): FileType {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.kml')) return 'kml';
  if (lower.endsWith('.kmz')) return 'kmz';
  if (lower.endsWith('.geojson') || lower.endsWith('.json')) return 'geojson';
  if (lower.endsWith('.shp') || (lower.endsWith('.zip') && !lower.includes('soil'))) return 'shapefile';
  if (lower.endsWith('.tif') || lower.endsWith('.tiff') || lower.endsWith('.geotiff')) return 'geotiff';
  if (/\.(jpe?g|png|gif|webp|heic|tiff?)$/i.test(lower)) return 'photo';
  if (lower.endsWith('.csv') && /soil|test|lab/i.test(lower)) return 'soil_test';
  if (lower.endsWith('.csv')) return 'soil_test'; // CSVs are likely soil tests in this context
  return 'document';
}

// ─── Geospatial File Types ──────────────────────────────────────────────────

const GEO_FILE_TYPES = new Set<FileType>(['kml', 'kmz', 'geojson', 'shapefile']);

export function isGeoFile(fileType: FileType): boolean {
  return GEO_FILE_TYPES.has(fileType);
}

// ─── GeoJSON Parsing ────────────────────────────────────────────────────────

export interface GeoParseResult {
  geojson: GeoJSON.FeatureCollection;
  featureCount: number;
  geometryTypes: string[];
  bbox: [number, number, number, number] | null;
  confidence: ConfidenceLevel;
}

export async function parseGeoFile(buffer: Buffer, filename: string): Promise<GeoParseResult> {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.geojson') || lower.endsWith('.json')) {
    return parseGeoJSON(buffer);
  }
  if (lower.endsWith('.kml')) {
    return parseKML(buffer);
  }
  if (lower.endsWith('.kmz')) {
    return parseKMZ(buffer);
  }
  if (lower.endsWith('.shp') || lower.endsWith('.zip')) {
    return parseShapefile(buffer, filename);
  }

  throw new Error(`Unsupported geo file type: ${filename}`);
}

function parseGeoJSON(buffer: Buffer): GeoParseResult {
  const text = buffer.toString('utf-8');
  const parsed = JSON.parse(text);

  let fc: GeoJSON.FeatureCollection;
  if (parsed.type === 'FeatureCollection') {
    fc = parsed;
  } else if (parsed.type === 'Feature') {
    fc = { type: 'FeatureCollection', features: [parsed] };
  } else if (['Polygon', 'MultiPolygon', 'Point', 'LineString', 'MultiLineString', 'MultiPoint'].includes(parsed.type)) {
    fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: parsed }] };
  } else {
    throw new Error('Unrecognized GeoJSON structure');
  }

  return buildGeoResult(fc, 'high');
}

function parseKML(buffer: Buffer): GeoParseResult {
  const text = buffer.toString('utf-8');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const fc = kml(doc) as GeoJSON.FeatureCollection;

  if (!fc.features || fc.features.length === 0) {
    throw new Error('No valid geometries found in KML file');
  }

  return buildGeoResult(fc, 'medium');
}

async function parseKMZ(buffer: Buffer): Promise<GeoParseResult> {
  const zip = await JSZip.loadAsync(buffer);

  // Find the .kml file in the archive
  let kmlContent: string | null = null;
  for (const [name, file] of Object.entries(zip.files)) {
    if (name.toLowerCase().endsWith('.kml') && !file.dir) {
      kmlContent = await file.async('string');
      break;
    }
  }

  if (!kmlContent) {
    throw new Error('No .kml file found in KMZ archive');
  }

  const doc = new DOMParser().parseFromString(kmlContent, 'application/xml');
  const fc = kml(doc) as GeoJSON.FeatureCollection;

  if (!fc.features || fc.features.length === 0) {
    throw new Error('No valid geometries found in KMZ file');
  }

  return buildGeoResult(fc, 'medium');
}

async function parseShapefile(buffer: Buffer, filename: string): Promise<GeoParseResult> {
  // Shapefile comes as .zip containing .shp, .dbf, .prj, .shx
  // Use the `shapefile` package which reads .shp + .dbf streams
  const shapefile = await import('shapefile');

  if (filename.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(buffer);

    let shpBuffer: ArrayBuffer | null = null;
    let dbfBuffer: ArrayBuffer | null = null;
    let hasPrj = false;

    for (const [name, file] of Object.entries(zip.files)) {
      const lower = name.toLowerCase();
      if (lower.endsWith('.shp') && !file.dir) {
        shpBuffer = await file.async('arraybuffer');
      } else if (lower.endsWith('.dbf') && !file.dir) {
        dbfBuffer = await file.async('arraybuffer');
      } else if (lower.endsWith('.prj') && !file.dir) {
        hasPrj = true;
      }
    }

    if (!shpBuffer) {
      throw new Error('No .shp file found in ZIP archive');
    }

    const source = await shapefile.open(shpBuffer, dbfBuffer ?? undefined);
    const features: GeoJSON.Feature[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await source.read();
      if (result.done) break;
      features.push(result.value as GeoJSON.Feature);
    }

    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
    // Lower confidence if no .prj (projection might be wrong)
    return buildGeoResult(fc, hasPrj ? 'medium' : 'low');
  }

  // Raw .shp file (no ZIP) — very limited without .dbf
  const source = await shapefile.open(buffer.buffer as ArrayBuffer);
  const features: GeoJSON.Feature[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await source.read();
    if (result.done) break;
    features.push(result.value as GeoJSON.Feature);
  }

  return buildGeoResult({ type: 'FeatureCollection', features }, 'low');
}

function buildGeoResult(fc: GeoJSON.FeatureCollection, confidence: ConfidenceLevel): GeoParseResult {
  const geometryTypes = [...new Set(
    fc.features
      .map((f) => f.geometry?.type)
      .filter(Boolean) as string[],
  )];

  let bbox: [number, number, number, number] | null = null;
  if (fc.features.length > 0) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const feature of fc.features) {
      visitCoords(feature.geometry, (coord) => {
        if (coord[0]! < minLng) minLng = coord[0]!;
        if (coord[1]! < minLat) minLat = coord[1]!;
        if (coord[0]! > maxLng) maxLng = coord[0]!;
        if (coord[1]! > maxLat) maxLat = coord[1]!;
      });
    }
    if (isFinite(minLng)) {
      bbox = [
        Math.round(minLng * 1e6) / 1e6,
        Math.round(minLat * 1e6) / 1e6,
        Math.round(maxLng * 1e6) / 1e6,
        Math.round(maxLat * 1e6) / 1e6,
      ];
    }
  }

  return {
    geojson: fc,
    featureCount: fc.features.length,
    geometryTypes,
    bbox,
    confidence,
  };
}

function visitCoords(geom: GeoJSON.Geometry | null, fn: (coord: number[]) => void): void {
  if (!geom) return;
  switch (geom.type) {
    case 'Point':
      fn(geom.coordinates);
      break;
    case 'MultiPoint':
    case 'LineString':
      for (const c of geom.coordinates) fn(c);
      break;
    case 'MultiLineString':
    case 'Polygon':
      for (const ring of geom.coordinates) for (const c of ring) fn(c);
      break;
    case 'MultiPolygon':
      for (const poly of geom.coordinates) for (const ring of poly) for (const c of ring) fn(c);
      break;
    case 'GeometryCollection':
      for (const g of geom.geometries) visitCoords(g, fn);
      break;
  }
}

// ─── EXIF Geotag Extraction ────────────────────────────────────────────────

export interface ExifResult {
  lat: number;
  lng: number;
  altitude?: number;
  timestamp?: string;
  camera?: string;
}

export async function extractExifGeotag(buffer: Buffer): Promise<ExifResult | null> {
  try {
    const exifReader = await import('exif-reader');
    // exif-reader expects the raw EXIF data segment.
    // JPEG files store EXIF starting at byte offset after the APP1 marker.
    // Look for the EXIF segment in the JPEG.
    const exifOffset = findExifSegment(buffer);
    if (exifOffset < 0) return null;

    const exifData = exifReader.default(buffer.subarray(exifOffset)) as Record<string, unknown>;
    if (!exifData) return null;

    const gps = exifData.gps as Record<string, unknown> | undefined
      ?? exifData.GPS as Record<string, unknown> | undefined;
    if (!gps?.GPSLatitude || !gps?.GPSLongitude) return null;

    const lat = dmsToDecimal(gps.GPSLatitude as number[], gps.GPSLatitudeRef as string | undefined);
    const lng = dmsToDecimal(gps.GPSLongitude as number[], gps.GPSLongitudeRef as string | undefined);

    if (!isFinite(lat) || !isFinite(lng)) return null;

    const result: ExifResult = { lat, lng };

    if (gps.GPSAltitude != null) {
      result.altitude = typeof gps.GPSAltitude === 'number'
        ? gps.GPSAltitude
        : parseFloat(String(gps.GPSAltitude));
    }

    // Camera info
    const image = exifData.Image as Record<string, unknown> | undefined
      ?? exifData.image as Record<string, unknown> | undefined;
    if (image?.Make || image?.Model) {
      result.camera = [image.Make, image.Model].filter(Boolean).join(' ');
    }

    // Timestamp
    const exifMeta = exifData.Photo as Record<string, unknown> | undefined
      ?? exifData.exif as Record<string, unknown> | undefined;
    if (exifMeta?.DateTimeOriginal) {
      result.timestamp = String(exifMeta.DateTimeOriginal);
    }

    return result;
  } catch {
    return null;
  }
}

function findExifSegment(buffer: Buffer): number {
  // JPEG starts with FF D8. EXIF is in APP1 segment (FF E1).
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) return -1;

  let offset = 2;
  while (offset < buffer.length - 4) {
    if (buffer[offset] !== 0xFF) return -1;
    const marker = buffer[offset + 1]!;

    if (marker === 0xE1) {
      // APP1 — check for "Exif\0\0"
      const segLen = buffer.readUInt16BE(offset + 2);
      const exifHeader = buffer.subarray(offset + 4, offset + 10).toString('ascii');
      if (exifHeader === 'Exif\0\0') {
        return offset + 10; // Start of TIFF header
      }
      offset += 2 + segLen;
    } else if (marker >= 0xE0 && marker <= 0xEF) {
      // Other APP segments — skip
      const segLen = buffer.readUInt16BE(offset + 2);
      offset += 2 + segLen;
    } else {
      // Non-APP marker — stop looking
      return -1;
    }
  }
  return -1;
}

function dmsToDecimal(dms: number[], ref?: string): number {
  if (!dms || dms.length < 3) return NaN;
  const [deg, min, sec] = dms;
  let decimal = deg! + min! / 60 + sec! / 3600;
  if (ref === 'S' || ref === 'W') decimal = -decimal;
  return decimal;
}

// ─── Soil Test CSV Parsing ──────────────────────────────────────────────────

export interface SoilTestResult {
  ph?: number;
  organicMatter?: number;
  texture?: string;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  confidence: ConfidenceLevel;
}

export function parseSoilCSV(text: string): SoilTestResult | null {
  try {
    const lines = text.trim().split('\n').map((l) => l.trim());
    if (lines.length < 2) return null;

    // Parse header
    const separator = lines[0]!.includes('\t') ? '\t' : ',';
    const headers = lines[0]!.split(separator).map((h) => h.trim().toLowerCase().replace(/["']/g, ''));

    // Find column indices by pattern matching
    const phIdx = headers.findIndex((h) => /^(soil_?)?ph$/i.test(h));
    const omIdx = headers.findIndex((h) => /organic[_\s]?matter|^om[_%]?$/i.test(h));
    const textureIdx = headers.findIndex((h) => /texture|soil[_\s]?class/i.test(h));
    const nIdx = headers.findIndex((h) => /nitrogen|^n[_%]?$|^no3/i.test(h));
    const pIdx = headers.findIndex((h) => /phosphorus|^p[_%]?$|^p2o5/i.test(h));
    const kIdx = headers.findIndex((h) => /potassium|^k[_%]?$|^k2o/i.test(h));

    if (phIdx < 0 && omIdx < 0 && textureIdx < 0) {
      return null; // Not recognizable as a soil test
    }

    // Parse first data row (or average if multiple)
    const result: SoilTestResult = { confidence: 'medium' };
    const dataRows = lines.slice(1).filter((l) => l.length > 0);
    if (dataRows.length === 0) return null;

    // Use first row for extraction
    const firstRow = dataRows[0]!.split(separator).map((v) => v.trim().replace(/["']/g, ''));

    if (phIdx >= 0 && firstRow[phIdx]) {
      const val = parseFloat(firstRow[phIdx]!);
      if (val >= 0 && val <= 14) result.ph = Math.round(val * 10) / 10;
    }
    if (omIdx >= 0 && firstRow[omIdx]) {
      const val = parseFloat(firstRow[omIdx]!);
      if (val >= 0 && val <= 100) result.organicMatter = Math.round(val * 10) / 10;
    }
    if (textureIdx >= 0 && firstRow[textureIdx]) {
      result.texture = firstRow[textureIdx]!;
    }
    if (nIdx >= 0 && firstRow[nIdx]) {
      const val = parseFloat(firstRow[nIdx]!);
      if (!isNaN(val)) result.nitrogen = Math.round(val * 10) / 10;
    }
    if (pIdx >= 0 && firstRow[pIdx]) {
      const val = parseFloat(firstRow[pIdx]!);
      if (!isNaN(val)) result.phosphorus = Math.round(val * 10) / 10;
    }
    if (kIdx >= 0 && firstRow[kIdx]) {
      const val = parseFloat(firstRow[kIdx]!);
      if (!isNaN(val)) result.potassium = Math.round(val * 10) / 10;
    }

    // Confidence: high if pH + OM + texture all found, medium if 2, low if 1
    const found = [result.ph, result.organicMatter, result.texture].filter((v) => v != null).length;
    result.confidence = found >= 3 ? 'high' : found >= 2 ? 'medium' : 'low';

    return result;
  } catch {
    return null;
  }
}
