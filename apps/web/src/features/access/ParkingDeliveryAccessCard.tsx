/**
 * §10 ParkingDeliveryAccessCard — three-facet check on the placed
 * design's vehicle/delivery readiness:
 *
 *   1. Parking capacity (demand vs supply)
 *      Demand inferred from structure types using a stall table; supply
 *      inferred from the area of zones tagged `access` or `infrastructure`,
 *      divided by 25 m\u00b2/stall (typical car footprint with circulation).
 *
 *   2. Turning radius
 *      Sharp bends on delivery-grade paths (main / secondary / service /
 *      farm / emergency) where two adjacent short segments meet at >60\u00b0
 *      imply a turning radius too tight for a single-unit truck (~7 m
 *      minimum). Flagged per offending vertex.
 *
 *   3. Delivery reachability
 *      Each delivery-receiving structure (barn, workshop, storage,
 *      greenhouse, classroom) is measured to the nearest delivery-capable
 *      path. If > 30 m, flagged as poor truck access.
 *
 * Pure presentation \u2014 reads pathStore + structureStore + zoneStore.
 * No shared-package math, no map overlays.
 *
 * Closes manifest \u00a710 `parking-turning-delivery-checks` (P3).
 */

import { useMemo } from 'react';
import { usePathStore, type DesignPath, type PathType } from '../../store/pathStore.js';
import { useStructureStore, type Structure, type StructureType } from '../../store/structureStore.js';
import { useZoneStore, type LandZone } from '../../store/zoneStore.js';
import css from './ParkingDeliveryAccessCard.module.css';

interface Props {
  projectId: string;
}

/* ── Tunables ──────────────────────────────────────────────────────────── */

const STALLS_PER_TYPE: Partial<Record<StructureType, number>> = {
  cabin: 2,
  yurt: 1,
  earthship: 2,
  tent_glamping: 1,
  pavilion: 4,
  prayer_space: 6,
  classroom: 4,
  barn: 2,
  workshop: 2,
  bathhouse: 0,
  greenhouse: 1,
  storage: 1,
  animal_shelter: 0,
  compost_station: 0,
  water_pump_house: 0,
  fire_circle: 0,
  lookout: 0,
  solar_array: 0,
  well: 0,
  water_tank: 0,
};

/** Square metres a parked car + circulation aisle occupies. */
const STALL_AREA_M2 = 25;

const DELIVERY_PATH_TYPES: ReadonlySet<PathType> = new Set([
  'main_road',
  'secondary_road',
  'service_road',
  'farm_lane',
  'emergency_access',
]);

const DELIVERY_RECEIVING_TYPES: ReadonlySet<StructureType> = new Set([
  'barn',
  'workshop',
  'storage',
  'greenhouse',
  'classroom',
  'water_tank',
]);

/** Bend angle (deg) above which a vertex is treated as a sharp turn. */
const SHARP_BEND_DEG = 60;
/** Adjacent-segment max length (m) for the sharp bend to imply tight radius. */
const SHARP_BEND_SEGMENT_LIMIT_M = 15;
/** Max distance (m) a delivery-receiving structure should sit from a delivery path. */
const DELIVERY_REACH_M = 30;

/* ── Geometry helpers ──────────────────────────────────────────────────── */

function metersPerDegree(latDeg: number): { mPerLat: number; mPerLng: number } {
  const cosLat = Math.cos((latDeg * Math.PI) / 180);
  return { mPerLat: 110_540, mPerLng: 111_320 * cosLat };
}

function distMeters(a: [number, number], b: [number, number]): number {
  const { mPerLat, mPerLng } = metersPerDegree((a[1] + b[1]) / 2);
  const dx = (a[0] - b[0]) * mPerLng;
  const dy = (a[1] - b[1]) * mPerLat;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Angle in degrees of segment from a to b, atan2. */
function segAngle(a: [number, number], b: [number, number]): number {
  const { mPerLat, mPerLng } = metersPerDegree((a[1] + b[1]) / 2);
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * mPerLat;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function bendDeg(a: [number, number], b: [number, number], c: [number, number]): number {
  const ang1 = segAngle(a, b);
  const ang2 = segAngle(b, c);
  let diff = Math.abs(ang2 - ang1);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/** Polygon area (m\u00b2) via planar projection at polygon centroid latitude. */
function polygonAreaM2(poly: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  const ring = poly.type === 'MultiPolygon' ? poly.coordinates[0]?.[0] : poly.coordinates[0];
  if (!ring || ring.length < 4) return 0;
  let latSum = 0;
  for (const pt of ring) latSum += pt[1]!;
  const meanLat = latSum / ring.length;
  const { mPerLat, mPerLng } = metersPerDegree(meanLat);
  let acc = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    acc += (a[0]! * mPerLng) * (b[1]! * mPerLat) - (b[0]! * mPerLng) * (a[1]! * mPerLat);
  }
  return Math.abs(acc) / 2;
}

/** Distance (m) from point to nearest segment of a LineString. */
function distPointToLine(pt: [number, number], line: GeoJSON.LineString): number {
  const coords = line.coordinates as [number, number][];
  if (coords.length === 0) return Infinity;
  if (coords.length === 1) return distMeters(pt, coords[0]!);
  let best = Infinity;
  const { mPerLat, mPerLng } = metersPerDegree(pt[1]);
  const px = pt[0] * mPerLng;
  const py = pt[1] * mPerLat;
  for (let i = 0; i < coords.length - 1; i++) {
    const ax = coords[i]![0] * mPerLng;
    const ay = coords[i]![1] * mPerLat;
    const bx = coords[i + 1]![0] * mPerLng;
    const by = coords[i + 1]![1] * mPerLat;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    if (d < best) best = d;
  }
  return best;
}

/* ── Analysis ──────────────────────────────────────────────────────────── */

interface SharpBend {
  pathId: string;
  pathName: string;
  bendDeg: number;
}

interface DeliveryGap {
  structureId: string;
  structureName: string;
  structureType: StructureType;
  distM: number;
}

interface ParkingReport {
  demandStalls: number;
  supplyStalls: number;
  supplyAreaM2: number;
  parkingZoneCount: number;
  demandByType: Array<{ type: StructureType; count: number; stalls: number }>;
  sharpBends: SharpBend[];
  deliveryGaps: DeliveryGap[];
  deliveryReceivingCount: number;
  deliveryPathCount: number;
}

function analyze(
  paths: DesignPath[],
  structures: Structure[],
  zones: LandZone[],
): ParkingReport {
  /* 1. Parking demand. */
  const countByType = new Map<StructureType, number>();
  for (const s of structures) {
    countByType.set(s.type, (countByType.get(s.type) ?? 0) + 1);
  }
  const demandByType: ParkingReport['demandByType'] = [];
  let demandStalls = 0;
  for (const [type, count] of countByType) {
    const stallsEach = STALLS_PER_TYPE[type] ?? 0;
    if (stallsEach > 0) {
      const stalls = stallsEach * count;
      demandStalls += stalls;
      demandByType.push({ type, count, stalls });
    }
  }
  demandByType.sort((a, b) => b.stalls - a.stalls);

  /* 2. Parking supply. */
  const parkingZones = zones.filter(
    (z) => z.category === 'access' || z.category === 'infrastructure',
  );
  let supplyAreaM2 = 0;
  for (const z of parkingZones) {
    supplyAreaM2 += polygonAreaM2(z.geometry);
  }
  const supplyStalls = Math.floor(supplyAreaM2 / STALL_AREA_M2);

  /* 3. Sharp bends on delivery paths. */
  const deliveryPaths = paths.filter((p) => DELIVERY_PATH_TYPES.has(p.type));
  const sharpBends: SharpBend[] = [];
  for (const p of deliveryPaths) {
    const coords = p.geometry.coordinates as [number, number][];
    if (coords.length < 3) continue;
    let worst = 0;
    for (let i = 1; i < coords.length - 1; i++) {
      const a = coords[i - 1]!;
      const b = coords[i]!;
      const c = coords[i + 1]!;
      const len1 = distMeters(a, b);
      const len2 = distMeters(b, c);
      if (len1 > SHARP_BEND_SEGMENT_LIMIT_M && len2 > SHARP_BEND_SEGMENT_LIMIT_M) continue;
      const bend = bendDeg(a, b, c);
      if (bend >= SHARP_BEND_DEG && bend > worst) worst = bend;
    }
    if (worst > 0) {
      sharpBends.push({ pathId: p.id, pathName: p.name, bendDeg: worst });
    }
  }
  sharpBends.sort((a, b) => b.bendDeg - a.bendDeg);

  /* 4. Delivery reachability. */
  const deliveryReceiving = structures.filter((s) => DELIVERY_RECEIVING_TYPES.has(s.type));
  const deliveryGaps: DeliveryGap[] = [];
  for (const s of deliveryReceiving) {
    let best = Infinity;
    for (const p of deliveryPaths) {
      const d = distPointToLine(s.center, p.geometry);
      if (d < best) best = d;
    }
    if (best > DELIVERY_REACH_M) {
      deliveryGaps.push({
        structureId: s.id,
        structureName: s.name,
        structureType: s.type,
        distM: best,
      });
    }
  }
  deliveryGaps.sort((a, b) => b.distM - a.distM);

  return {
    demandStalls,
    supplyStalls,
    supplyAreaM2,
    parkingZoneCount: parkingZones.length,
    demandByType,
    sharpBends,
    deliveryGaps,
    deliveryReceivingCount: deliveryReceiving.length,
    deliveryPathCount: deliveryPaths.length,
  };
}

/* ── Verdict helpers ───────────────────────────────────────────────────── */

type Tone = 'good' | 'fair' | 'poor';

function parkingVerdict(demand: number, supply: number): { tone: Tone; word: string; sub: string } {
  if (demand === 0) return { tone: 'good', word: 'No demand', sub: 'No vehicle-bearing structures placed yet.' };
  if (supply === 0) return { tone: 'poor', word: 'No supply', sub: `${demand} stalls needed; tag a zone as Access / Infrastructure.` };
  const ratio = supply / demand;
  if (ratio >= 1) return { tone: 'good', word: 'Adequate', sub: `${supply} of ${demand} stalls covered (${Math.round(ratio * 100)}%).` };
  if (ratio >= 0.6) return { tone: 'fair', word: 'Tight', sub: `${supply} of ${demand} stalls covered (${Math.round(ratio * 100)}%) \u2014 add ~${demand - supply} stalls.` };
  return { tone: 'poor', word: 'Insufficient', sub: `${supply} of ${demand} stalls covered (${Math.round(ratio * 100)}%) \u2014 short ${demand - supply} stalls.` };
}

function turningVerdict(bends: SharpBend[], pathCount: number): { tone: Tone; word: string; sub: string } {
  if (pathCount === 0) return { tone: 'fair', word: 'No paths', sub: 'No delivery-grade paths drawn yet.' };
  if (bends.length === 0) return { tone: 'good', word: 'Truck-passable', sub: `All ${pathCount} delivery paths clear of tight bends.` };
  const worst = bends[0]!.bendDeg;
  if (worst >= 90) return { tone: 'poor', word: 'Tight bends', sub: `${bends.length} path${bends.length === 1 ? '' : 's'} with bends \u2265${Math.round(worst)}\u00b0 \u2014 will not pass a single-unit truck.` };
  return { tone: 'fair', word: 'Marginal', sub: `${bends.length} bend${bends.length === 1 ? '' : 's'} \u226560\u00b0 on short segments \u2014 review for delivery vehicles.` };
}

function deliveryVerdict(
  gaps: DeliveryGap[],
  receivingCount: number,
  pathCount: number,
): { tone: Tone; word: string; sub: string } {
  if (receivingCount === 0) return { tone: 'good', word: 'No targets', sub: 'No delivery-receiving structures placed.' };
  if (pathCount === 0) return { tone: 'poor', word: 'No path access', sub: `${receivingCount} structure${receivingCount === 1 ? '' : 's'} need delivery; no delivery-grade paths drawn.` };
  if (gaps.length === 0) return { tone: 'good', word: 'All reachable', sub: `${receivingCount} delivery target${receivingCount === 1 ? '' : 's'} all within ${DELIVERY_REACH_M} m of a path.` };
  return { tone: gaps.length >= receivingCount / 2 ? 'poor' : 'fair', word: `${gaps.length} unreached`, sub: `${gaps.length} of ${receivingCount} target${receivingCount === 1 ? '' : 's'} sit > ${DELIVERY_REACH_M} m from any delivery path.` };
}

const TYPE_LABEL: Record<StructureType, string> = {
  cabin: 'Cabin',
  yurt: 'Yurt',
  pavilion: 'Pavilion',
  greenhouse: 'Greenhouse',
  barn: 'Barn',
  workshop: 'Workshop',
  prayer_space: 'Prayer space',
  bathhouse: 'Bathhouse',
  classroom: 'Classroom',
  storage: 'Storage',
  animal_shelter: 'Animal shelter',
  compost_station: 'Compost station',
  water_pump_house: 'Pump house',
  tent_glamping: 'Tent / glamping',
  fire_circle: 'Fire circle',
  lookout: 'Lookout',
  earthship: 'Earthship',
  solar_array: 'Solar array',
  well: 'Well',
  water_tank: 'Water tank',
};

/* ── Component ─────────────────────────────────────────────────────────── */

export default function ParkingDeliveryAccessCard({ projectId }: Props) {
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);

  const paths = useMemo(() => allPaths.filter((p) => p.projectId === projectId), [allPaths, projectId]);
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );
  const zones = useMemo(() => allZones.filter((z) => z.projectId === projectId), [allZones, projectId]);

  const report = useMemo(() => analyze(paths, structures, zones), [paths, structures, zones]);

  const totalFeatures = paths.length + structures.length + zones.length;
  if (totalFeatures === 0) {
    return (
      <section className={css.card} aria-label="Parking, turning, delivery checks">
        <header className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Parking, turning &amp; delivery</h3>
            <p className={css.cardHint}>
              Vehicle-readiness audit. Place structures, draw delivery
              paths, and tag a zone as Access to populate this card.
            </p>
          </div>
          <span className={css.heuristicBadge}>HEURISTIC</span>
        </header>
        <div className={css.empty}>Nothing to evaluate yet.</div>
      </section>
    );
  }

  const parking = parkingVerdict(report.demandStalls, report.supplyStalls);
  const turning = turningVerdict(report.sharpBends, report.deliveryPathCount);
  const delivery = deliveryVerdict(
    report.deliveryGaps,
    report.deliveryReceivingCount,
    report.deliveryPathCount,
  );

  return (
    <section className={css.card} aria-label="Parking, turning, delivery checks">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Parking, turning &amp; delivery</h3>
          <p className={css.cardHint}>
            Three-facet vehicle-readiness check: stall demand vs supply,
            sharp bends on delivery routes, and truck reachability of
            delivery-receiving buildings.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </header>

      {/* ── Facet 1: Parking ─────────────────────────────────────────── */}
      <div className={`${css.facet} ${css[`tone_${parking.tone}`] ?? ''}`}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Parking</span>
          <span className={css.verdictWord}>{parking.word}</span>
        </div>
        <p className={css.facetSub}>{parking.sub}</p>
        <div className={css.stats}>
          <div className={css.stat}>
            <span className={css.statLabel}>Demand</span>
            <span className={css.statVal}>{report.demandStalls}</span>
            <span className={css.statNote}>stalls</span>
          </div>
          <div className={css.stat}>
            <span className={css.statLabel}>Supply</span>
            <span className={css.statVal}>{report.supplyStalls}</span>
            <span className={css.statNote}>
              {report.parkingZoneCount} access/infra zone{report.parkingZoneCount === 1 ? '' : 's'},{' '}
              {Math.round(report.supplyAreaM2)} m{'\u00b2'}
            </span>
          </div>
        </div>
        {report.demandByType.length > 0 && (
          <div className={css.demandList}>
            <p className={css.demandLabel}>Stall demand by structure</p>
            <ul className={css.demandRows}>
              {report.demandByType.slice(0, 6).map((d) => (
                <li key={d.type} className={css.demandRow}>
                  <span className={css.demandType}>{TYPE_LABEL[d.type]}</span>
                  <span className={css.demandCount}>
                    {d.count} {'\u00d7'} {STALLS_PER_TYPE[d.type] ?? 0}
                  </span>
                  <span className={css.demandStalls}>{d.stalls}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Facet 2: Turning ─────────────────────────────────────────── */}
      <div className={`${css.facet} ${css[`tone_${turning.tone}`] ?? ''}`}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Turning radius</span>
          <span className={css.verdictWord}>{turning.word}</span>
        </div>
        <p className={css.facetSub}>{turning.sub}</p>
        {report.sharpBends.length > 0 && (
          <ul className={css.flagList}>
            {report.sharpBends.slice(0, 5).map((b) => (
              <li key={b.pathId} className={css.flagRow}>
                <span className={css.flagDot} />
                <div className={css.flagBody}>
                  <span className={css.flagTitle}>{b.pathName}</span>
                  <span className={css.flagSub}>
                    Bend {'\u2248'}{Math.round(b.bendDeg)}{'\u00b0'} on a short segment
                    {' \u2014 '}likely under truck minimum ({'\u2248'} 7 m).
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Facet 3: Delivery reach ──────────────────────────────────── */}
      <div className={`${css.facet} ${css[`tone_${delivery.tone}`] ?? ''}`}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Delivery reachability</span>
          <span className={css.verdictWord}>{delivery.word}</span>
        </div>
        <p className={css.facetSub}>{delivery.sub}</p>
        {report.deliveryGaps.length > 0 && (
          <ul className={css.flagList}>
            {report.deliveryGaps.slice(0, 5).map((g) => (
              <li key={g.structureId} className={css.flagRow}>
                <span className={css.flagDot} />
                <div className={css.flagBody}>
                  <span className={css.flagTitle}>
                    {g.structureName}{' '}
                    <span className={css.flagType}>({TYPE_LABEL[g.structureType]})</span>
                  </span>
                  <span className={css.flagSub}>
                    {Math.round(g.distM)} m from nearest delivery path {'\u2014'}
                    extend a service road or move the structure closer.
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className={css.footnote}>
        <em>How this is computed:</em> stall demand uses a per-type table
        (cabin/earthship 2, yurt 1, pavilion/classroom 4, prayer 6, barn /
        workshop / greenhouse / storage 1{'\u2013'}2). Supply is the area
        of zones tagged <em>Access</em> or <em>Infrastructure</em> divided
        by 25 m{'\u00b2'}/stall. Sharp bends flag vertices where two
        segments {'\u2264'}15 m meet at {'\u2265'}60{'\u00b0'}. Delivery
        reach measures delivery-receiving structures to the nearest main /
        secondary / service / farm / emergency-access path; &gt; 30 m flags
        as poor truck access. Heuristic guardrail {'\u2014'} not a
        substitute for civil
        engineering review.
      </p>
    </section>
  );
}
