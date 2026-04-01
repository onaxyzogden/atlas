/**
 * Geo file parsers — KML, GeoJSON, and Shapefile to GeoJSON.
 * These run entirely client-side with no server dependency.
 */

// ─── GeoJSON ───────────────────────────────────────────────────────────────

export function parseGeoJSON(text: string): GeoJSON.FeatureCollection {
  const parsed = JSON.parse(text);

  // Normalize to FeatureCollection
  if (parsed.type === 'FeatureCollection') return parsed;
  if (parsed.type === 'Feature') {
    return { type: 'FeatureCollection', features: [parsed] };
  }
  // Bare geometry
  if (['Polygon', 'MultiPolygon', 'Point', 'LineString', 'MultiLineString', 'MultiPoint'].includes(parsed.type)) {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: parsed }],
    };
  }
  throw new Error('Unrecognized GeoJSON structure');
}

// ─── KML ───────────────────────────────────────────────────────────────────

export function parseKML(text: string): GeoJSON.FeatureCollection {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');

  const features: GeoJSON.Feature[] = [];

  // Extract all Placemarks
  const placemarks = doc.getElementsByTagName('Placemark');
  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i]!;
    const name = pm.getElementsByTagName('name')[0]?.textContent ?? '';
    const description = pm.getElementsByTagName('description')[0]?.textContent ?? '';

    // Try Polygon
    const polygons = pm.getElementsByTagName('Polygon');
    for (let j = 0; j < polygons.length; j++) {
      const coords = extractKMLCoords(polygons[j]!);
      if (coords.length > 0) {
        features.push({
          type: 'Feature',
          properties: { name, description },
          geometry: { type: 'Polygon', coordinates: [coords] },
        });
      }
    }

    // Try LineString
    const lines = pm.getElementsByTagName('LineString');
    for (let j = 0; j < lines.length; j++) {
      const coords = extractKMLCoords(lines[j]!);
      if (coords.length > 0) {
        features.push({
          type: 'Feature',
          properties: { name, description },
          geometry: { type: 'LineString', coordinates: coords },
        });
      }
    }

    // Try Point
    const points = pm.getElementsByTagName('Point');
    for (let j = 0; j < points.length; j++) {
      const coords = extractKMLCoords(points[j]!);
      if (coords.length > 0) {
        features.push({
          type: 'Feature',
          properties: { name, description },
          geometry: { type: 'Point', coordinates: coords[0]! },
        });
      }
    }
  }

  if (features.length === 0) {
    throw new Error('No valid geometries found in KML file');
  }

  return { type: 'FeatureCollection', features };
}

function extractKMLCoords(element: Element): number[][] {
  const coordEl = element.getElementsByTagName('coordinates')[0];
  if (!coordEl?.textContent) return [];

  return coordEl.textContent
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [lng, lat, alt] = pair.split(',').map(Number);
      if (lng === undefined || lat === undefined || isNaN(lng) || isNaN(lat)) return null;
      return alt !== undefined && !isNaN(alt) ? [lng, lat, alt] : [lng, lat];
    })
    .filter((c): c is number[] => c !== null);
}

// ─── KMZ (zipped KML) ─────────────────────────────────────────────────────

export async function parseKMZ(buffer: ArrayBuffer): Promise<GeoJSON.FeatureCollection> {
  // KMZ is a ZIP containing doc.kml (or similar .kml file)
  // Use the browser's built-in decompression if available, else fall back
  try {
    const blob = new Blob([buffer]);
    // Try using the CompressionStream API (modern browsers)
    // For KMZ, we need to handle ZIP format — simplest approach:
    // KMZ stores the KML as the first file in a ZIP archive.
    // Use a minimal ZIP reader.
    const kmlText = await extractKMLFromZip(buffer);
    return parseKML(kmlText);
  } catch {
    throw new Error('Unable to parse KMZ file. Try converting to KML or GeoJSON first.');
  }
}

async function extractKMLFromZip(buffer: ArrayBuffer): Promise<string> {
  const view = new DataView(buffer);

  // Find local file headers (PK\x03\x04)
  let offset = 0;
  while (offset < view.byteLength - 4) {
    if (view.getUint32(offset, true) === 0x04034b50) {
      // Local file header
      const compMethod = view.getUint16(offset + 8, true);
      const compSize = view.getUint32(offset + 18, true);
      const uncompSize = view.getUint32(offset + 22, true);
      const nameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);
      const nameBytes = new Uint8Array(buffer, offset + 30, nameLen);
      const fileName = new TextDecoder().decode(nameBytes).toLowerCase();

      const dataOffset = offset + 30 + nameLen + extraLen;

      if (fileName.endsWith('.kml')) {
        if (compMethod === 0) {
          // Stored (no compression)
          return new TextDecoder().decode(new Uint8Array(buffer, dataOffset, uncompSize));
        } else if (compMethod === 8) {
          // Deflate — use DecompressionStream
          const compressed = new Uint8Array(buffer, dataOffset, compSize);
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          const reader = ds.readable.getReader();
          writer.write(compressed);
          writer.close();

          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
          const result = new Uint8Array(totalLen);
          let pos = 0;
          for (const chunk of chunks) {
            result.set(chunk, pos);
            pos += chunk.length;
          }
          return new TextDecoder().decode(result);
        }
      }
      offset = dataOffset + compSize;
    } else {
      break;
    }
  }
  throw new Error('No .kml file found in KMZ archive');
}

// ─── Auto-detect and parse ─────────────────────────────────────────────────

export interface ParseResult {
  geojson: GeoJSON.FeatureCollection;
  format: 'geojson' | 'kml' | 'kmz';
  featureCount: number;
}

export async function parseGeoFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.geojson') || name.endsWith('.json')) {
    const text = await file.text();
    const geojson = parseGeoJSON(text);
    return { geojson, format: 'geojson', featureCount: geojson.features.length };
  }

  if (name.endsWith('.kml')) {
    const text = await file.text();
    const geojson = parseKML(text);
    return { geojson, format: 'kml', featureCount: geojson.features.length };
  }

  if (name.endsWith('.kmz')) {
    const buffer = await file.arrayBuffer();
    const geojson = await parseKMZ(buffer);
    return { geojson, format: 'kmz', featureCount: geojson.features.length };
  }

  throw new Error(`Unsupported file type: ${name}. Supported formats: .geojson, .json, .kml, .kmz`);
}
