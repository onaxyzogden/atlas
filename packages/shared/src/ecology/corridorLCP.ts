/**
 * Biodiversity corridor — least-cost-path across the `soil_regeneration`
 * zone grid. Pure algorithm, no map / DOM / network deps.
 *
 * Substrate assumption: zones were laid out by
 * `SoilRegenerationProcessor.zoneIndexToCentroid` as an even grid with
 * `cols = ceil(sqrt(totalZones))` and `rows = ceil(totalZones / cols)`.
 * A client can reconstruct that grid from `zoneId` + `totalZones` + `bbox`.
 *
 * Friction model (as of 2026-04-24, second revision): per-cell friction
 * combines the land-cover class with the recommended intervention. The
 * cover impedance table is grounded in wildlife-connectivity literature
 * (McRae et al. Circuitscape defaults + Theobald 2013 resistance layers):
 * forest & wetland are reference-permeable (low friction), cropland and
 * developed land are matrix barriers. Intervention (silvopasture,
 * food-forest) provides a modest multiplicative discount on permeable
 * cells but cannot override a hostile matrix — a mulched parking lot is
 * still a parking lot. `disturbanceLevel` scales cover friction upward to
 * reflect human modification. When per-cell cover is unavailable, we fall
 * back to the older intervention-only proxy via `frictionForIntervention`.
 * This is a zone-polygonized cost surface, NOT a true pixel raster —
 * quantised at the `soil_regeneration` zone resolution.
 */

export type InterventionType =
  | 'mulching_priority'
  | 'compost_application'
  | 'cover_crop_candidate'
  | 'silvopasture_candidate'
  | 'food_forest_candidate';

/** Normalised canonical cover classes. The underlying NLCD / AAFC /
 *  WorldCover adapters emit a wider vocabulary; `normalizeCoverClass`
 *  collapses synonyms to this enum. */
export type CoverClass =
  | 'forest'
  | 'wetland'
  | 'shrubland'
  | 'grassland'
  | 'pasture'
  | 'cropland'
  | 'barren'
  | 'water'
  | 'urban'
  | 'unknown';

export interface ZoneInput {
  zoneId: number;
  primaryIntervention: InterventionType | string | null | undefined;
  /** Raw cover class string from `SoilRegenerationProcessor` (land_cover
   *  layer intersection). Optional — older zones predate this field. */
  coverClass?: string | null | undefined;
  /** 0-1 disturbance index emitted alongside `coverClass`. Optional. */
  disturbanceLevel?: number | null | undefined;
}

export interface CorridorInput {
  totalZones: number;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  zones: ZoneInput[];
}

export interface CorridorResult {
  sourceZoneId: number;
  sinkZoneId: number;
  pathZoneIds: number[];
  pathCoordinates: [number, number][]; // [lon, lat] per path cell centroid
  totalCost: number;
  bufferMeters: number;
}

const DIAG = Math.SQRT2;
const DEFAULT_BUFFER_METERS = 50;
const DEFAULT_MISSING_FRICTION = 8;
const FRICTION_CLAMP_MIN = 1;
const FRICTION_CLAMP_MAX = 20;

/**
 * Cover-class → impedance table (lower = more permeable to pollinators
 * and small terrestrial wildlife). Values anchored to Circuitscape /
 * Omniscape connectivity defaults (McRae 2006, Theobald 2013): forest
 * and wetland are reference matrix; cropland is a moderate barrier;
 * water and developed land are near-barriers.
 */
export const COVER_IMPEDANCE: Record<CoverClass, number> = {
  forest: 1,
  wetland: 1,
  shrubland: 2,
  grassland: 3,
  pasture: 4,
  cropland: 7,
  barren: 8,
  water: 12,
  urban: 15,
  unknown: 5,
};

/**
 * Collapse adapter-specific cover strings to the canonical {@link CoverClass}.
 * Mirrors `landCoverToDisturbance` in `apps/api/.../soilRegeneration.ts`
 * so class vocabularies stay in lockstep.
 */
export function normalizeCoverClass(input: string | null | undefined): CoverClass {
  if (!input) return 'unknown';
  const s = input.toLowerCase();
  if (s.includes('developed') || s.includes('urban') || s.includes('impervious')) return 'urban';
  if (s.includes('water') || s.includes('open water')) return 'water';
  if (s.includes('wetland') || s.includes('marsh') || s.includes('bog') || s.includes('fen')) {
    return 'wetland';
  }
  if (
    s.includes('forest') ||
    s.includes('deciduous') ||
    s.includes('evergreen') ||
    s.includes('conifer') ||
    s.includes('mixed wood') ||
    s.includes('woodland')
  ) {
    return 'forest';
  }
  if (s.includes('shrub') || s.includes('scrub')) return 'shrubland';
  if (s.includes('pasture') || s.includes('hay') || s.includes('forage')) return 'pasture';
  if (
    s.includes('cultivated') ||
    s.includes('crops') ||
    s.includes('crop') ||
    s.includes('annual') ||
    s.includes('cereal') ||
    s.includes('cropland')
  ) {
    return 'cropland';
  }
  if (s.includes('grassland') || s.includes('herbaceous') || s.includes('grass')) return 'grassland';
  if (s.includes('barren') || s.includes('ice') || s.includes('snow') || s.includes('rock')) {
    return 'barren';
  }
  return 'unknown';
}

/**
 * Legacy single-axis friction. Retained for back-compat and as the
 * fallback path inside `frictionForCell` when no cover data is present.
 */
export function frictionForIntervention(intervention: string | null | undefined): number {
  switch (intervention) {
    case 'food_forest_candidate':
    case 'silvopasture_candidate':
      return 1;
    case 'cover_crop_candidate':
      return 3;
    case 'mulching_priority':
    case 'compost_application':
      return 5;
    default:
      return DEFAULT_MISSING_FRICTION;
  }
}

/**
 * Per-cell friction combining land cover impedance, disturbance, and the
 * recommended intervention. Cover is the dominant axis: intervention
 * provides a modest multiplicative discount on permeable cells but cannot
 * override a hostile matrix. `disturbanceLevel` (0..1) scales cover
 * friction up to +40% to reflect human modification within the class.
 *
 * Fall back to {@link frictionForIntervention} when `coverClass` is null /
 * undefined / empty — lets this function be used uniformly across zones
 * that predate the server-side property addition.
 */
export function frictionForCell(args: {
  intervention: string | null | undefined;
  coverClass: string | null | undefined;
  disturbanceLevel?: number | null | undefined;
}): number {
  const { intervention, coverClass, disturbanceLevel } = args;
  if (!coverClass) return frictionForIntervention(intervention);

  const cover = normalizeCoverClass(coverClass);
  const base = COVER_IMPEDANCE[cover];

  // Disturbance 0..1 → +0% to +40% friction. Clamp defensively.
  const d = Math.max(0, Math.min(1, typeof disturbanceLevel === 'number' ? disturbanceLevel : 0));
  const disturbanceMultiplier = 1 + 0.4 * d;

  // Intervention discount only matters on cells that are already permeable;
  // the clamp to [min,max] prevents the discount from taking the cost below
  // a reasonable floor on forest/wetland.
  let interventionFactor = 1;
  switch (intervention) {
    case 'food_forest_candidate':
    case 'silvopasture_candidate':
      interventionFactor = 0.7; // −30% on permeable cells
      break;
    case 'cover_crop_candidate':
      interventionFactor = 0.9; // −10%
      break;
    default:
      interventionFactor = 1;
  }

  const raw = base * disturbanceMultiplier * interventionFactor;
  return Math.max(FRICTION_CLAMP_MIN, Math.min(FRICTION_CLAMP_MAX, raw));
}

export function gridDims(totalZones: number): { cols: number; rows: number } {
  if (totalZones <= 1) return { cols: 1, rows: 1 };
  const cols = Math.ceil(Math.sqrt(totalZones));
  const rows = Math.ceil(totalZones / cols);
  return { cols, rows };
}

function zoneToRowCol(zoneId: number, cols: number): { row: number; col: number } {
  return { row: Math.floor(zoneId / cols), col: zoneId % cols };
}

function rowColToZone(row: number, col: number, cols: number): number {
  return row * cols + col;
}

/**
 * Mirror of `SoilRegenerationProcessor.zoneIndexToCentroid` (apps/api).
 * Kept in lockstep so client corridors land on the same centroids the
 * server writes to `project_layers.soil_regeneration`.
 */
export function zoneCentroid(
  zoneId: number,
  totalZones: number,
  bbox: [number, number, number, number],
): [number, number] {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  if (totalZones <= 1) return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
  const { cols, rows } = gridDims(totalZones);
  const { row, col } = zoneToRowCol(zoneId, cols);
  return [
    minLon + ((col + 0.5) / cols) * (maxLon - minLon),
    maxLat - ((row + 0.5) / rows) * (maxLat - minLat),
  ];
}

/**
 * Auto-pick corridor endpoints: the two high-band cells furthest apart on
 * the grid. `minCellDistance` enforces "worth routing" — if no two anchors
 * are far enough apart we return null and the overlay stays dark.
 */
export function pickCorridorAnchors(
  zones: ZoneInput[],
  totalZones: number,
  minCellDistance: number,
): { source: ZoneInput; sink: ZoneInput } | null {
  const highs = zones.filter(
    (z) =>
      z.primaryIntervention === 'food_forest_candidate' ||
      z.primaryIntervention === 'silvopasture_candidate',
  );
  if (highs.length < 2) return null;

  const { cols } = gridDims(totalZones);

  let bestDist = 0;
  let best: { source: ZoneInput; sink: ZoneInput } | null = null;
  for (let i = 0; i < highs.length; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      const aZone = highs[i];
      const bZone = highs[j];
      if (!aZone || !bZone) continue;
      const a = zoneToRowCol(aZone.zoneId, cols);
      const b = zoneToRowCol(bZone.zoneId, cols);
      const d = Math.hypot(a.row - b.row, a.col - b.col);
      if (d > bestDist) {
        bestDist = d;
        best = { source: aZone, sink: bZone };
      }
    }
  }
  if (!best || bestDist < minCellDistance) return null;
  return best;
}

// Binary min-heap keyed on priority. Small + allocation-light; Dijkstra's
// worst case here is still bounded by zone count, which rarely exceeds a
// few hundred for a realistic parcel.
class MinHeap<T> {
  private data: Array<{ priority: number; value: T }> = [];
  push(priority: number, value: T): void {
    this.data.push({ priority, value });
    this.bubbleUp(this.data.length - 1);
  }
  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop();
    if (!top) return undefined;
    if (this.data.length > 0 && last) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top.value;
  }
  get size(): number {
    return this.data.length;
  }
  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const a = this.data[i];
      const b = this.data[parent];
      if (!a || !b || a.priority >= b.priority) break;
      this.data[i] = b;
      this.data[parent] = a;
      i = parent;
    }
  }
  private sinkDown(i: number): void {
    const n = this.data.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      const sNode = this.data[smallest];
      const lNode = l < n ? this.data[l] : undefined;
      const rNode = r < n ? this.data[r] : undefined;
      if (sNode && lNode && lNode.priority < sNode.priority) smallest = l;
      const sNode2 = this.data[smallest];
      if (sNode2 && rNode && rNode.priority < sNode2.priority) smallest = r;
      if (smallest === i) break;
      const cur = this.data[i];
      const swap = this.data[smallest];
      if (!cur || !swap) break;
      this.data[i] = swap;
      this.data[smallest] = cur;
      i = smallest;
    }
  }
}

/**
 * Dijkstra over an 8-connected grid. Edge cost = neighbour friction × step
 * length (1 for cardinal, √2 for diagonal). Source cell's own friction is
 * ignored — we pay to enter each subsequent cell.
 */
export function dijkstraLCP(
  totalZones: number,
  sourceZoneId: number,
  sinkZoneId: number,
  frictionByZone: Map<number, number>,
): { pathZoneIds: number[]; totalCost: number } | null {
  if (sourceZoneId === sinkZoneId) {
    return { pathZoneIds: [sourceZoneId], totalCost: 0 };
  }
  const { cols, rows } = gridDims(totalZones);
  const n = rows * cols;
  const dist: number[] = new Array(n).fill(Infinity);
  const prev: number[] = new Array(n).fill(-1);
  const visited: boolean[] = new Array(n).fill(false);

  dist[sourceZoneId] = 0;
  const heap = new MinHeap<number>();
  heap.push(0, sourceZoneId);

  while (heap.size > 0) {
    const u = heap.pop();
    if (u === undefined) break;
    if (visited[u]) continue;
    visited[u] = true;
    if (u === sinkZoneId) break;

    const { row, col } = zoneToRowCol(u, cols);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const v = rowColToZone(nr, nc, cols);
        if (v >= totalZones) continue; // tail of a partial last row
        if (visited[v]) continue;

        const frictionV = frictionByZone.get(v) ?? DEFAULT_MISSING_FRICTION;
        const step = dr !== 0 && dc !== 0 ? DIAG : 1;
        const distU = dist[u] ?? Infinity;
        const alt = distU + frictionV * step;
        const distV = dist[v] ?? Infinity;
        if (alt < distV) {
          dist[v] = alt;
          prev[v] = u;
          heap.push(alt, v);
        }
      }
    }
  }

  const sinkDist = dist[sinkZoneId];
  if (sinkDist === undefined || !Number.isFinite(sinkDist)) return null;

  const pathZoneIds: number[] = [];
  let curr: number = sinkZoneId;
  // Walk prev[] back to source. Guard against cycles via visited cap.
  for (let safety = 0; safety <= n; safety++) {
    pathZoneIds.push(curr);
    if (curr === sourceZoneId) {
      pathZoneIds.reverse();
      return { pathZoneIds, totalCost: sinkDist };
    }
    const p = prev[curr];
    if (p === undefined || p < 0) return null;
    curr = p;
  }
  return null;
}

/**
 * End-to-end corridor computation: anchor pick → Dijkstra → centroid
 * coordinates. Returns `null` when no viable corridor exists on the
 * substrate (too few zones, no high-band anchors, anchors too close, or
 * grid disconnected by high-friction cells).
 */
export function computeCorridor(input: CorridorInput): CorridorResult | null {
  const { totalZones, bbox, zones } = input;
  if (totalZones < 4) return null;

  const { cols, rows } = gridDims(totalZones);
  const diag = Math.hypot(rows, cols);
  const minCellDistance = Math.max(2, diag * 0.35);

  const anchors = pickCorridorAnchors(zones, totalZones, minCellDistance);
  if (!anchors) return null;

  const frictionByZone = new Map<number, number>();
  for (const z of zones) {
    frictionByZone.set(
      z.zoneId,
      frictionForCell({
        intervention: z.primaryIntervention,
        coverClass: z.coverClass,
        disturbanceLevel: z.disturbanceLevel,
      }),
    );
  }

  const lcp = dijkstraLCP(totalZones, anchors.source.zoneId, anchors.sink.zoneId, frictionByZone);
  if (!lcp) return null;

  const pathCoordinates: [number, number][] = lcp.pathZoneIds.map((zid) =>
    zoneCentroid(zid, totalZones, bbox),
  );

  return {
    sourceZoneId: anchors.source.zoneId,
    sinkZoneId: anchors.sink.zoneId,
    pathZoneIds: lcp.pathZoneIds,
    pathCoordinates,
    totalCost: lcp.totalCost,
    bufferMeters: DEFAULT_BUFFER_METERS,
  };
}
