/**
 * Dependency-free geometry primitives for the Design Map generator.
 *
 * Coordinates follow GeoJSON convention: [lon, lat] in decimal degrees.
 * Area / distance functions use a local equirectangular projection anchored
 * on the input's centroid latitude — accurate to <1% for sub-kilometre
 * parcels (the target scale for Atlas).
 */

export type LonLat = readonly [number, number];
export type Ring = readonly LonLat[];
export type LineString = readonly LonLat[];

const EARTH_RADIUS_M = 6371008.8;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export function metresPerDegLat(): number {
  return (Math.PI * EARTH_RADIUS_M) / 180;
}

export function metresPerDegLon(atLatDeg: number): number {
  return (Math.PI * EARTH_RADIUS_M * Math.cos(toRad(atLatDeg))) / 180;
}

export function haversineDistanceM(a: LonLat, b: LonLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function bearingDeg(a: LonLat, b: LonLat): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLon = toRad(b[0] - a[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function lineLengthM(line: LineString): number {
  let s = 0;
  for (let i = 1; i < line.length; i++) {
    s += haversineDistanceM(line[i - 1]!, line[i]!);
  }
  return s;
}

export function interpolateAlongLine(
  line: LineString,
  fraction: number,
): LonLat {
  if (line.length === 0) throw new Error('interpolateAlongLine: empty line');
  if (line.length === 1) return [line[0]![0], line[0]![1]];
  const f = Math.max(0, Math.min(1, fraction));
  const total = lineLengthM(line);
  if (total === 0) return [line[0]![0], line[0]![1]];
  const targetD = f * total;
  let acc = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const seg = haversineDistanceM(a, b);
    if (acc + seg >= targetD) {
      const t = seg === 0 ? 0 : (targetD - acc) / seg;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    acc += seg;
  }
  const last = line[line.length - 1]!;
  return [last[0], last[1]];
}

/** Strip a duplicated closing vertex from a ring, if present. */
function openRing(ring: Ring): Ring {
  if (ring.length < 2) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring.slice(0, ring.length - 1);
  }
  return ring;
}

function arithmeticCentroid(ring: Ring): LonLat {
  const open = openRing(ring);
  let sx = 0;
  let sy = 0;
  for (const p of open) {
    sx += p[0];
    sy += p[1];
  }
  const n = open.length || 1;
  return [sx / n, sy / n];
}

/** Project a ring to local metres anchored at `anchor`. */
function projectToMetres(
  ring: Ring,
  anchor: LonLat,
): Array<[number, number]> {
  const mLat = metresPerDegLat();
  const mLon = metresPerDegLon(anchor[1]);
  return ring.map(
    ([lon, lat]) =>
      [(lon - anchor[0]) * mLon, (lat - anchor[1]) * mLat] as [number, number],
  );
}

export function polygonAreaM2(ring: Ring): number {
  if (ring.length < 3) return 0;
  const anchor = arithmeticCentroid(ring);
  const pts = projectToMetres(openRing(ring), anchor);
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function polygonCentroid(ring: Ring): LonLat {
  if (ring.length === 0) throw new Error('polygonCentroid: empty ring');
  if (ring.length < 3) return arithmeticCentroid(ring);
  const anchor = arithmeticCentroid(ring);
  const pts = projectToMetres(openRing(ring), anchor);
  let twiceA = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    const cross = x1 * y2 - x2 * y1;
    twiceA += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(twiceA) < 1e-9) return anchor;
  const a6 = 3 * twiceA;
  const mLat = metresPerDegLat();
  const mLon = metresPerDegLon(anchor[1]);
  return [anchor[0] + cx / a6 / mLon, anchor[1] + cy / a6 / mLat];
}

export function pointInPolygon(point: LonLat, ring: Ring): boolean {
  const open = openRing(ring);
  if (open.length < 3) return false;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = open.length - 1; i < open.length; j = i++) {
    const [xi, yi] = open[i]!;
    const [xj, yj] = open[j]!;
    if (yi === yj) continue;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Offset a polyline by `distanceM` metres. Positive distance offsets to the
 * left of the line's direction of travel; negative to the right. Uses an
 * averaged per-vertex normal anchored on the polyline's middle latitude.
 */
export function offsetPolyline(
  line: LineString,
  distanceM: number,
): LineString {
  if (line.length < 2) return line.map((p) => [p[0], p[1]] as LonLat);
  const mid = line[Math.floor(line.length / 2)]!;
  const anchorLat = mid[1];
  const mLat = metresPerDegLat();
  const mLon = metresPerDegLon(anchorLat);

  const proj = line.map(
    ([lon, lat]) =>
      [(lon - mid[0]) * mLon, (lat - mid[1]) * mLat] as [number, number],
  );

  const offset: Array<[number, number]> = [];
  for (let i = 0; i < proj.length; i++) {
    let nx = 0;
    let ny = 0;
    let count = 0;
    if (i > 0) {
      const [x1, y1] = proj[i - 1]!;
      const [x2, y2] = proj[i]!;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        nx += -dy / len;
        ny += dx / len;
        count++;
      }
    }
    if (i < proj.length - 1) {
      const [x1, y1] = proj[i]!;
      const [x2, y2] = proj[i + 1]!;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        nx += -dy / len;
        ny += dx / len;
        count++;
      }
    }
    if (count > 0) {
      nx /= count;
      ny /= count;
    }
    const [px, py] = proj[i]!;
    offset.push([px + nx * distanceM, py + ny * distanceM]);
  }

  return offset.map(
    ([x, y]) => [mid[0] + x / mLon, mid[1] + y / mLat] as LonLat,
  );
}

/**
 * Inward buffer of a ring by `distanceM` metres. Uses per-vertex normals
 * pointing toward the polygon interior (determined by signed area). Returns
 * a ring with the same number of vertices; for severe collapses the caller
 * is responsible for detecting self-intersection.
 */
export function bufferRingInwardM(ring: Ring, distanceM: number): Ring {
  if (ring.length < 4) return ring.map((p) => [p[0], p[1]] as LonLat);
  const open = openRing(ring);
  const anchor = arithmeticCentroid(ring);
  const mLat = metresPerDegLat();
  const mLon = metresPerDegLon(anchor[1]);
  const proj = open.map(
    ([lon, lat]) =>
      [(lon - anchor[0]) * mLon, (lat - anchor[1]) * mLat] as [number, number],
  );

  // Signed area determines orientation: positive = CCW (interior on left).
  let twiceA = 0;
  for (let i = 0; i < proj.length; i++) {
    const [x1, y1] = proj[i]!;
    const [x2, y2] = proj[(i + 1) % proj.length]!;
    twiceA += x1 * y2 - x2 * y1;
  }
  const ccw = twiceA > 0;
  const inwardSign = ccw ? 1 : -1;

  const result: Array<[number, number]> = [];
  for (let i = 0; i < proj.length; i++) {
    const prev = proj[(i - 1 + proj.length) % proj.length]!;
    const here = proj[i]!;
    const next = proj[(i + 1) % proj.length]!;
    const d1x = here[0] - prev[0];
    const d1y = here[1] - prev[1];
    const d2x = next[0] - here[0];
    const d2y = next[1] - here[1];
    const l1 = Math.hypot(d1x, d1y);
    const l2 = Math.hypot(d2x, d2y);
    // Unit inward normals for incoming + outgoing edges.
    let u1x = 0;
    let u1y = 0;
    let u2x = 0;
    let u2y = 0;
    if (l1 > 0) {
      u1x = (-d1y / l1) * inwardSign;
      u1y = (d1x / l1) * inwardSign;
    }
    if (l2 > 0) {
      u2x = (-d2y / l2) * inwardSign;
      u2y = (d2x / l2) * inwardSign;
    }
    // Move the vertex along the bisector so each edge offsets by exactly
    // `distanceM`. The required scale is `d × (u1+u2) / (1 + u1·u2)`
    // (degenerates to the unit normal when both edges share direction).
    const sumx = u1x + u2x;
    const sumy = u1y + u2y;
    const denom = 1 + (u1x * u2x + u1y * u2y);
    let mx = 0;
    let my = 0;
    if (Math.abs(denom) > 1e-9) {
      mx = (distanceM * sumx) / denom;
      my = (distanceM * sumy) / denom;
    } else if (l1 > 0) {
      // 180° hairpin — fall back to a unit-normal offset.
      mx = distanceM * u1x;
      my = distanceM * u1y;
    }
    result.push([here[0] + mx, here[1] + my]);
  }

  const out: LonLat[] = result.map(
    ([x, y]) => [anchor[0] + x / mLon, anchor[1] + y / mLat] as LonLat,
  );
  // Close the ring to match GeoJSON convention.
  if (out.length > 0) {
    const first = out[0]!;
    out.push([first[0], first[1]]);
  }
  return out;
}

/**
 * Axis-aligned bounding box of a ring or polyline, in degrees.
 * Returns `[minLon, minLat, maxLon, maxLat]`.
 */
export function bbox(ring: Ring | LineString): [number, number, number, number] {
  if (ring.length === 0) return [0, 0, 0, 0];
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLon, minLat, maxLon, maxLat];
}
