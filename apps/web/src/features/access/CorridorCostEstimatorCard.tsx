/**
 * §13 CorridorCostEstimatorCard — heuristic per-meter cost rollup for paths
 * (roads, lanes, trails) and utility trench co-routing.
 *
 * Sums:
 *   1. Path length × per-meter template cost, grouped by PathType
 *   2. Estimated utility trench length (each placed utility → nearest path),
 *      multiplied by per-meter trench cost (electrical or water depending on
 *      utility category)
 *   3. Boundary crossings (each path whose endpoints sit beyond the parcel
 *      boundary) × per-crossing template (culvert, cattle grid)
 *
 * Surfaces a low/mid/high range (×0.7 / ×1.0 / ×1.5) for the grand total
 * to communicate uncertainty in the heuristic.
 *
 * Heuristic only — no contractor bid integration, no terrain-grading uplift,
 * no permit fees. Intended as an order-of-magnitude steward checklist before
 * commissioning a real estimate.
 */
import { useMemo } from 'react';
import { usePathStore, PATH_TYPE_CONFIG, type DesignPath, type PathType } from '../../store/pathStore.js';
import { useUtilityStore, UTILITY_TYPE_CONFIG, type Utility, type UtilityType } from '../../store/utilityStore.js';
import css from './CorridorCostEstimatorCard.module.css';

// Per-meter cost templates (USD). Reflects rural North American rough averages.
const PATH_COST_PER_M: Record<PathType, number> = {
  main_road: 80,
  secondary_road: 50,
  emergency_access: 60,
  service_road: 45,
  pedestrian_path: 25,
  trail: 8,
  farm_lane: 35,
  animal_corridor: 15,
  grazing_route: 12,
  arrival_sequence: 40,
  quiet_route: 20,
};

// Utility category drives trench cost — water-class ($40/m wet trench),
// energy-class ($30/m conduit), other ($20/m bury or surface mount).
const TRENCH_COST_PER_M: Record<'water' | 'energy' | 'other', number> = {
  water: 40,
  energy: 30,
  other: 20,
};

const WATER_UTILITIES: ReadonlySet<UtilityType> = new Set(['water_tank', 'well_pump', 'greywater', 'septic', 'rain_catchment']);
const ENERGY_UTILITIES: ReadonlySet<UtilityType> = new Set(['solar_panel', 'battery_room', 'generator']);

function trenchCategoryFor(t: UtilityType): 'water' | 'energy' | 'other' {
  if (WATER_UTILITIES.has(t)) return 'water';
  if (ENERGY_UTILITIES.has(t)) return 'energy';
  return 'other';
}

const CROSSING_COST = 1500; // per culvert / cattle grid

function flatEarthMeters(a: [number, number], b: [number, number]): number {
  const meanLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * 111320 * Math.cos(meanLat);
  const dy = (b[1] - a[1]) * 110540;
  return Math.hypot(dx, dy);
}

function pointToSegmentMeters(p: [number, number], a: [number, number], b: [number, number]): number {
  const meanLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const mPerLng = 111320 * Math.cos(meanLat);
  const mPerLat = 110540;
  const ax = a[0] * mPerLng, ay = a[1] * mPerLat;
  const bx = b[0] * mPerLng, by = b[1] * mPerLat;
  const px = p[0] * mPerLng, py = p[1] * mPerLat;
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function nearestPathDistanceM(point: [number, number], paths: DesignPath[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (const p of paths) {
    const coords = p.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i];
      const b = coords[i + 1];
      if (!a || !b || a.length < 2 || b.length < 2) continue;
      const d = pointToSegmentMeters(point, [a[0]!, a[1]!], [b[0]!, b[1]!]);
      if (d < min) min = d;
    }
  }
  return Number.isFinite(min) ? min : 0;
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtMeters(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

interface PathRow {
  type: PathType;
  label: string;
  totalM: number;
  costPerM: number;
  subtotal: number;
  count: number;
}

interface UtilityRow {
  utility: Utility;
  trenchM: number;
  category: 'water' | 'energy' | 'other';
  costPerM: number;
  subtotal: number;
}

interface Props {
  projectId: string;
  parcelBoundaryGeojson?: GeoJSON.FeatureCollection | null;
}

export default function CorridorCostEstimatorCard({ projectId, parcelBoundaryGeojson }: Props) {
  const allPaths = usePathStore((s) => s.paths);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const paths = useMemo(() => allPaths.filter((p) => p.projectId === projectId), [allPaths, projectId]);
  const utilities = useMemo(() => allUtilities.filter((u) => u.projectId === projectId), [allUtilities, projectId]);

  const pathRows = useMemo<PathRow[]>(() => {
    const buckets = new Map<PathType, { totalM: number; count: number }>();
    for (const p of paths) {
      const cur = buckets.get(p.type) ?? { totalM: 0, count: 0 };
      cur.totalM += p.lengthM;
      cur.count += 1;
      buckets.set(p.type, cur);
    }
    return Array.from(buckets.entries()).map(([type, b]) => ({
      type,
      label: PATH_TYPE_CONFIG[type].label,
      totalM: b.totalM,
      costPerM: PATH_COST_PER_M[type],
      subtotal: b.totalM * PATH_COST_PER_M[type],
      count: b.count,
    })).sort((a, b) => b.subtotal - a.subtotal);
  }, [paths]);

  const utilityRows = useMemo<UtilityRow[]>(() => {
    if (paths.length === 0) {
      // No paths to bury alongside — assume each utility needs a stub trench.
      return utilities.map((u) => {
        const cat = trenchCategoryFor(u.type);
        const trenchM = 25;
        return { utility: u, trenchM, category: cat, costPerM: TRENCH_COST_PER_M[cat], subtotal: trenchM * TRENCH_COST_PER_M[cat] };
      });
    }
    return utilities.map((u) => {
      const trenchM = nearestPathDistanceM(u.center, paths);
      const cat = trenchCategoryFor(u.type);
      return { utility: u, trenchM, category: cat, costPerM: TRENCH_COST_PER_M[cat], subtotal: trenchM * TRENCH_COST_PER_M[cat] };
    }).sort((a, b) => b.subtotal - a.subtotal);
  }, [utilities, paths]);

  const crossings = useMemo(() => {
    if (!parcelBoundaryGeojson || paths.length === 0) return 0;
    // Count paths whose either endpoint lies > 5 m outside the parcel boundary
    // (rough proxy — without polygon-line intersection we just check endpoint
    // distance to boundary; if endpoint is "outside" the polygon we treat as
    // a crossing).
    let count = 0;
    for (const p of paths) {
      const coords = p.geometry.coordinates;
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (!first || !last) continue;
      if (endpointCrossesBoundary([first[0]!, first[1]!], parcelBoundaryGeojson) ||
          endpointCrossesBoundary([last[0]!, last[1]!], parcelBoundaryGeojson)) {
        count += 1;
      }
    }
    return count;
  }, [paths, parcelBoundaryGeojson]);

  const pathTotal = pathRows.reduce((s, r) => s + r.subtotal, 0);
  const utilityTotal = utilityRows.reduce((s, r) => s + r.subtotal, 0);
  const crossingTotal = crossings * CROSSING_COST;
  const grand = pathTotal + utilityTotal + crossingTotal;
  const low = grand * 0.7;
  const high = grand * 1.5;

  const totalLinearM = pathRows.reduce((s, r) => s + r.totalM, 0);
  const totalTrenchM = utilityRows.reduce((s, r) => s + r.trenchM, 0);

  if (paths.length === 0 && utilities.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Corridor & Trench Cost Estimator</h3>
            <p className={css.cardHint}>
              Place at least one path or utility to surface a per-meter corridor budget.
            </p>
          </div>
          <span className={css.heuristicBadge}>AI DRAFT</span>
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Corridor & Trench Cost Estimator</h3>
          <p className={css.cardHint}>
            Per-meter rollup of {fmtMeters(totalLinearM)} of paths + {fmtMeters(totalTrenchM)} of utility trench
            (each utility routed to its nearest path). Templates reflect rural North American rough averages —
            not a contractor estimate.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </div>

      <div className={css.totalBlock}>
        <div className={css.totalLabel}>Total estimated corridor budget</div>
        <div className={css.totalRange}>
          <div className={css.totalRangeMid}>{fmtCurrency(grand)}</div>
          <div className={css.totalRangeBounds}>
            <span className={css.bound}>low {fmtCurrency(low)}</span>
            <span className={css.boundDivider}>·</span>
            <span className={css.bound}>high {fmtCurrency(high)}</span>
          </div>
        </div>
        <div className={css.totalSplit}>
          <SplitChip label="Paths" value={fmtCurrency(pathTotal)} pct={grand > 0 ? (pathTotal / grand) * 100 : 0} tone="path" />
          <SplitChip label="Trench" value={fmtCurrency(utilityTotal)} pct={grand > 0 ? (utilityTotal / grand) * 100 : 0} tone="trench" />
          <SplitChip label={`Crossings × ${crossings}`} value={fmtCurrency(crossingTotal)} pct={grand > 0 ? (crossingTotal / grand) * 100 : 0} tone="crossing" />
        </div>
      </div>

      {pathRows.length > 0 && (
        <div className={css.section}>
          <div className={css.sectionTitle}>Paths by type</div>
          <table className={css.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Count</th>
                <th>Length</th>
                <th>$/m</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {pathRows.map((r) => (
                <tr key={r.type}>
                  <td>{r.label}</td>
                  <td className={css.num}>{r.count}</td>
                  <td className={css.num}>{fmtMeters(r.totalM)}</td>
                  <td className={css.num}>${r.costPerM}</td>
                  <td className={`${css.num} ${css.numStrong}`}>{fmtCurrency(r.subtotal)}</td>
                </tr>
              ))}
              <tr className={css.tableSubtotal}>
                <td colSpan={4}>Path subtotal</td>
                <td className={css.num}>{fmtCurrency(pathTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {utilityRows.length > 0 && (
        <div className={css.section}>
          <div className={css.sectionTitle}>Utility trench (per utility, routed to nearest path)</div>
          <ul className={css.utilList}>
            {utilityRows.map((r) => (
              <li key={r.utility.id} className={`${css.utilRow} ${css[`cat_${r.category}`] ?? ''}`}>
                <div>
                  <div className={css.utilName}>{r.utility.name}</div>
                  <div className={css.utilMeta}>{UTILITY_TYPE_CONFIG[r.utility.type].label} · {r.category} trench</div>
                </div>
                <div className={css.utilMetrics}>
                  <span className={css.utilM}>{fmtMeters(r.trenchM)}</span>
                  <span className={css.utilDivider}>×</span>
                  <span className={css.utilRate}>${r.costPerM}/m</span>
                  <span className={css.utilEq}>=</span>
                  <span className={css.utilSubtotal}>{fmtCurrency(r.subtotal)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {crossings > 0 && (
        <div className={css.crossingNote}>
          <strong>{crossings}</strong> path endpoint{crossings === 1 ? '' : 's'} extend{crossings === 1 ? 's' : ''} beyond
          the parcel boundary — counted as boundary crossing{crossings === 1 ? '' : 's'} at{' '}
          {fmtCurrency(CROSSING_COST)} each (culvert / cattle grid template).
        </div>
      )}

      <p className={css.footnote}>
        Per-meter templates: gravel main road $80/m · secondary $50/m · pedestrian $25/m · trail $8/m.
        Trench templates: water trench $40/m · energy conduit $30/m · other $20/m. Range ±30% / ×1.5 reflects
        unmodelled grading, rock, drainage, and permits. <em>Cross-check with a local contractor before any
        capital decision.</em>
      </p>
    </div>
  );
}

function SplitChip({ label, value, pct, tone }: { label: string; value: string; pct: number; tone: 'path' | 'trench' | 'crossing' }) {
  return (
    <div className={`${css.splitChip} ${css[`tone_${tone}`] ?? ''}`}>
      <div className={css.splitLabel}>{label}</div>
      <div className={css.splitValue}>{value}</div>
      <div className={css.splitPct}>{pct.toFixed(0)}%</div>
    </div>
  );
}

function endpointCrossesBoundary(endpoint: [number, number], boundary: GeoJSON.FeatureCollection): boolean {
  // Point-in-polygon ray-cast across all polygon rings in the FeatureCollection.
  // Returns true if the point is OUTSIDE every polygon → counted as crossing.
  for (const feat of boundary.features) {
    const geom = feat.geometry;
    if (!geom) continue;
    const polys: GeoJSON.Position[][][] = [];
    if (geom.type === 'Polygon') polys.push(geom.coordinates);
    else if (geom.type === 'MultiPolygon') polys.push(...geom.coordinates);
    else continue;
    for (const poly of polys) {
      if (poly.length === 0) continue;
      const outer = poly[0]!;
      if (pointInRing(endpoint, outer)) return false;
    }
  }
  return true;
}

function pointInRing(p: [number, number], ring: GeoJSON.Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ri = ring[i]!;
    const rj = ring[j]!;
    if (ri.length < 2 || rj.length < 2) continue;
    const xi = ri[0]!, yi = ri[1]!;
    const xj = rj[0]!, yj = rj[1]!;
    const intersect = ((yi > p[1]) !== (yj > p[1])) && (p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
