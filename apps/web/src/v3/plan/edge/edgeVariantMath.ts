/**
 * edgeVariantMath — pure helpers for Rec #4 v2 (Edge & Connectivity evaluator).
 *
 * Scholar framing (2026-04-28): "Homogenized layers lack the edge necessary to
 * create niches for diverse species and predator/prey relationships that keep
 * pests in check." (Mollison; Holmgren P11 — Use edges and value the marginal.)
 *
 * **v1** (in EdgeConnectivityCard) was a textual audit: per-zone Polsby-Popper
 * compactness with a "carve out edges" prompt. The shape-variant generators
 * were flagged as the "biggest unknown" and deferred. **v2** lands them here as
 * pure geometry so they are unit-testable and the card can apply a chosen
 * variant via `landDesignStore.update(projectId, id, { geometry })`.
 *
 * The compactness helpers (`polygonAreaM2`, `polygonPerimeterM`,
 * `polsbyPopper`) are lifted verbatim from the v1 card so both surfaces share a
 * single source of truth — the card now imports them from here. Geometry is
 * planar in lat/lng→metres via the same 111320·cos(lat) conversion used across
 * the permaculture cards (waterRouterMath, socialNodesMath, useDesignMetrics).
 *
 * **Variants.** Each perturbs the polygon's longest edge with an *outward*
 * displacement (away from the centroid), guaranteeing more perimeter without
 * self-intersection on the convex-ish planting polygons this targets:
 *   - `peninsula` — one narrow triangular spike at the edge midpoint.
 *   - `scalloped` — a run of small triangular bumps along the edge.
 *   - `keyhole`   — one rounded semicircular lobe at the edge midpoint.
 * Every variant increases edge length (lowers Polsby-Popper → more edge-rich),
 * which is exactly the "carve out edges" remedy the v1 prompt described.
 */

/** Polygon area (m²) via the shoelace formula in planar lat/lng→metres. */
export function polygonAreaM2(geom: GeoJSON.Polygon): number {
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 3) return 0;
  const lat0 = ring[0]?.[1] ?? 0;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const ax = a[0]! * mPerDegLng;
    const ay = a[1]! * mPerDegLat;
    const bx = b[0]! * mPerDegLng;
    const by = b[1]! * mPerDegLat;
    area += ax * by - bx * ay;
  }
  return Math.abs(area) / 2;
}

/** Polygon perimeter (m) of the outer ring in planar lat/lng→metres. */
export function polygonPerimeterM(geom: GeoJSON.Polygon): number {
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 2) return 0;
  const lat0 = ring[0]?.[1] ?? 0;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  let perim = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const dx = (b[0]! - a[0]!) * mPerDegLng;
    const dy = (b[1]! - a[1]!) * mPerDegLat;
    perim += Math.sqrt(dx * dx + dy * dy);
  }
  return perim;
}

/** Polsby-Popper compactness. 1.0 = circle, 0 = infinitely indented. */
export function polsbyPopper(areaM2: number, perimeterM: number): number {
  if (perimeterM <= 0) return 0;
  return (4 * Math.PI * areaM2) / (perimeterM * perimeterM);
}

export type EdgeVariantId = 'peninsula' | 'scalloped' | 'keyhole';

export interface EdgeVariant {
  id: EdgeVariantId;
  label: string;
  /** Short rationale shown under the suggestion. */
  note: string;
  geometry: GeoJSON.Polygon;
  areaM2: number;
  perimeterM: number;
  pp: number;
  /** Perimeter increase vs the source polygon, as a fraction (0.12 = +12%). */
  edgeDeltaPct: number;
  /** pp(variant) − pp(source); negative means more edge-rich. */
  ppDelta: number;
}

const VARIANT_LABEL: Record<EdgeVariantId, string> = {
  peninsula: 'Peninsula spike',
  scalloped: 'Scalloped border',
  keyhole: 'Keyhole lobe',
};

const VARIANT_NOTE: Record<EdgeVariantId, string> = {
  peninsula:
    'A single narrow finger reaching into the zone — maximal edge gain for a small footprint.',
  scalloped:
    'A run of shallow bumps along the longest run — broad, even edge for companion strips.',
  keyhole:
    'A rounded lobe off the longest run — a sheltered pocket niche with gentle edge.',
};

interface MeterFrame {
  mPerLng: number;
  mPerLat: number;
}

function meterFrame(ring: number[][]): MeterFrame {
  const lat0 = ring[0]?.[1] ?? 0;
  return {
    mPerLat: 111320,
    mPerLng: 111320 * Math.cos((lat0 * Math.PI) / 180),
  };
}

/** Index `i` of the longest segment ring[i]→ring[i+1] in metres. */
function longestSegmentIndex(ring: number[][], f: MeterFrame): number {
  let best = -1;
  let bestLen = -1;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const dx = (b[0]! - a[0]!) * f.mPerLng;
    const dy = (b[1]! - a[1]!) * f.mPerLat;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > bestLen) {
      bestLen = len;
      best = i;
    }
  }
  return best;
}

/** Centroid (lng,lat average of distinct vertices) of the outer ring. */
function ringCentroid(ring: number[][]): [number, number] {
  let sx = 0;
  let sy = 0;
  let n = 0;
  // Skip the closing duplicate vertex.
  for (let i = 0; i < ring.length - 1; i++) {
    const p = ring[i];
    if (!p) continue;
    sx += p[0]!;
    sy += p[1]!;
    n++;
  }
  if (n === 0) return [0, 0];
  return [sx / n, sy / n];
}

/** Insertion spec along the longest edge: parametric `t` in [0,1] + outward
 *  offset `d` in metres (0 = on the original edge line). */
interface Insert {
  t: number;
  d: number;
}

const VARIANT_INSERTS: Record<EdgeVariantId, (L: number) => Insert[]> = {
  // One narrow triangular spike at the midpoint. Base points (d=0) keep it
  // narrow; the apex reaches 0.30·L outward.
  peninsula: (L) => [
    { t: 0.42, d: 0 },
    { t: 0.5, d: 0.3 * L },
    { t: 0.58, d: 0 },
  ],
  // Four shallow triangular bumps spread across the edge.
  scalloped: (L) => {
    const amp = 0.06 * L;
    const w = 0.07;
    const inserts: Insert[] = [];
    for (const c of [0.2, 0.4, 0.6, 0.8]) {
      inserts.push({ t: c - w, d: 0 });
      inserts.push({ t: c, d: amp });
      inserts.push({ t: c + w, d: 0 });
    }
    return inserts;
  },
  // A rounded semicircular lobe at the midpoint (7-point arc).
  keyhole: (L) => {
    const amp = 0.2 * L;
    const rt = 0.12; // half-width in t-space
    const inserts: Insert[] = [];
    const steps = 6;
    for (let k = 0; k <= steps; k++) {
      const theta = (Math.PI * k) / steps; // 0..π
      inserts.push({
        t: 0.5 - rt * Math.cos(theta),
        d: amp * Math.sin(theta),
      });
    }
    return inserts;
  },
};

function buildVariant(
  source: GeoJSON.Polygon,
  ring: number[][],
  segIdx: number,
  id: EdgeVariantId,
  srcPerimeter: number,
  srcPp: number,
): EdgeVariant | null {
  const f = meterFrame(ring);
  const a = ring[segIdx];
  const b = ring[segIdx + 1];
  if (!a || !b) return null;

  // Edge endpoints in metres.
  const ax = a[0]! * f.mPerLng;
  const ay = a[1]! * f.mPerLat;
  const bx = b[0]! * f.mPerLng;
  const by = b[1]! * f.mPerLat;
  const ex = bx - ax;
  const ey = by - ay;
  const L = Math.sqrt(ex * ex + ey * ey);
  if (L <= 0) return null;

  // Unit perpendicular; pick the sign pointing away from the centroid.
  let nx = ey / L;
  let ny = -ex / L;
  const [cLng, cLat] = ringCentroid(ring);
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const outX = mx - cLng * f.mPerLng;
  const outY = my - cLat * f.mPerLat;
  if (nx * outX + ny * outY < 0) {
    nx = -nx;
    ny = -ny;
  }

  const inserts = VARIANT_INSERTS[id](L);
  const newPts: number[][] = inserts.map(({ t, d }) => {
    const px = ax + t * ex + d * nx;
    const py = ay + t * ey + d * ny;
    return [px / f.mPerLng, py / f.mPerLat];
  });

  // Reassemble the ring: vertices up to & including A, the new outward points,
  // then B and the remainder (including the closing duplicate).
  const head = ring.slice(0, segIdx + 1);
  const tail = ring.slice(segIdx + 1);
  const nextRing = [...head, ...newPts, ...tail].map(
    (p) => [p[0]!, p[1]!] as [number, number],
  );

  const geometry: GeoJSON.Polygon = {
    type: 'Polygon',
    coordinates: [nextRing],
  };
  const areaM2 = polygonAreaM2(geometry);
  const perimeterM = polygonPerimeterM(geometry);
  const pp = polsbyPopper(areaM2, perimeterM);

  return {
    id,
    label: VARIANT_LABEL[id],
    note: VARIANT_NOTE[id],
    geometry,
    areaM2,
    perimeterM,
    pp,
    edgeDeltaPct:
      srcPerimeter > 0 ? (perimeterM - srcPerimeter) / srcPerimeter : 0,
    ppDelta: pp - srcPp,
  };
}

/**
 * Generate edge-enriching variants of a planting polygon. Returns peninsula,
 * scalloped and keyhole variants (in that order), each guaranteed to add edge
 * length. Returns `[]` for non-polygon or degenerate geometry.
 */
export function generateVariants(geom: GeoJSON.Polygon): EdgeVariant[] {
  if (geom.type !== 'Polygon') return [];
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 4) return [];

  const f = meterFrame(ring);
  const segIdx = longestSegmentIndex(ring, f);
  if (segIdx < 0) return [];

  const srcArea = polygonAreaM2(geom);
  const srcPerimeter = polygonPerimeterM(geom);
  const srcPp = polsbyPopper(srcArea, srcPerimeter);

  const ids: EdgeVariantId[] = ['peninsula', 'scalloped', 'keyhole'];
  const out: EdgeVariant[] = [];
  for (const id of ids) {
    const v = buildVariant(geom, ring, segIdx, id, srcPerimeter, srcPp);
    // Defensive: only surface variants that actually add edge.
    if (v && v.perimeterM > srcPerimeter) out.push(v);
  }
  return out;
}
