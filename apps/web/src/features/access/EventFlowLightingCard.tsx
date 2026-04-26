/**
 * §10 EventFlowLightingCard — night-event readiness audit. Three
 * facets:
 *
 *   1. Lit-path coverage
 *      Sums the length of "event-grade" paths (arrival_sequence,
 *      main_road, secondary_road, pedestrian_path) and reports the
 *      number of bollard / step-light fixtures needed at one per 15 m.
 *
 *   2. Gathering-node lighting
 *      Each gathering structure (pavilion, prayer_space, fire_circle,
 *      classroom, bathhouse) needs its own perimeter ring of fixtures
 *      whose count scales with the structure's perimeter at one per
 *      8 m. Reports the rollup.
 *
 *   3. Parking-to-gathering continuity
 *      For each parking zone (category access / infrastructure), find
 *      the nearest event-grade path. If > 25 m, the walk from car to
 *      gathering goes through an unlit gap — flagged.
 *
 * Pure presentation; no shared-package math, no map overlays.
 *
 * Closes manifest §10 `event-flow-night-lighting-safety` (P3).
 */

import { useMemo } from 'react';
import { usePathStore, type DesignPath, type PathType } from '../../store/pathStore.js';
import { useStructureStore, type Structure, type StructureType } from '../../store/structureStore.js';
import { useZoneStore, type LandZone } from '../../store/zoneStore.js';
import css from './EventFlowLightingCard.module.css';

interface Props {
  projectId: string;
}

/* ── Tunables ──────────────────────────────────────────────────────────── */

const EVENT_PATH_TYPES: ReadonlySet<PathType> = new Set([
  'arrival_sequence',
  'main_road',
  'secondary_road',
  'pedestrian_path',
]);

const GATHERING_TYPES: ReadonlySet<StructureType> = new Set([
  'pavilion',
  'prayer_space',
  'fire_circle',
  'classroom',
  'bathhouse',
  'lookout',
]);

/** Path-fixture spacing (one bollard or step light per N metres). */
const PATH_FIXTURE_SPACING_M = 15;
/** Perimeter-fixture spacing around a gathering structure. */
const PERIMETER_FIXTURE_SPACING_M = 8;
/** Default safety perimeter around a fire circle / lookout when no footprint. */
const DEFAULT_PERIMETER_M = 25;
/** Parking zone whose nearest event-path point sits beyond this is in an unlit gap. */
const PARKING_GAP_THRESHOLD_M = 25;
/** Assumed evening event duration for fixture-hours rollup. */
const EVENT_HOURS = 4;

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

function lineLengthM(line: GeoJSON.LineString): number {
  const coords = line.coordinates as [number, number][];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += distMeters(coords[i - 1]!, coords[i]!);
  }
  return total;
}

function polygonPerimeterM(poly: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  const ring = poly.type === 'MultiPolygon' ? poly.coordinates[0]?.[0] : poly.coordinates[0];
  if (!ring || ring.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < ring.length; i++) {
    total += distMeters(ring[i - 1] as [number, number], ring[i] as [number, number]);
  }
  return total;
}

function polygonCentroid(poly: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number] | null {
  const ring = poly.type === 'MultiPolygon' ? poly.coordinates[0]?.[0] : poly.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const pt of ring) {
    sx += pt[0]!;
    sy += pt[1]!;
  }
  return [sx / ring.length, sy / ring.length];
}

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

interface UnlitGathering {
  id: string;
  name: string;
  type: StructureType;
  distToEventPathM: number;
}

interface ParkingGap {
  id: string;
  name: string;
  distToEventPathM: number;
}

interface NodeFixture {
  id: string;
  name: string;
  type: StructureType;
  perimeterM: number;
  fixtures: number;
}

interface Report {
  eventPathCount: number;
  totalEventPathM: number;
  pathFixtures: number;
  gatheringCount: number;
  nodeFixtures: NodeFixture[];
  totalNodeFixtures: number;
  unlitGatherings: UnlitGathering[];
  parkingZoneCount: number;
  parkingGaps: ParkingGap[];
}

function analyze(paths: DesignPath[], structures: Structure[], zones: LandZone[]): Report {
  const eventPaths = paths.filter((p) => EVENT_PATH_TYPES.has(p.type));
  const totalEventPathM = eventPaths.reduce((sum, p) => sum + lineLengthM(p.geometry), 0);
  const pathFixtures = Math.ceil(totalEventPathM / PATH_FIXTURE_SPACING_M);

  const gatherings = structures.filter((s) => GATHERING_TYPES.has(s.type));
  const nodeFixtures: NodeFixture[] = gatherings.map((s) => {
    const perimeterM =
      s.geometry && s.geometry.coordinates.length > 0
        ? polygonPerimeterM(s.geometry)
        : DEFAULT_PERIMETER_M;
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      perimeterM,
      fixtures: Math.ceil(perimeterM / PERIMETER_FIXTURE_SPACING_M),
    };
  });
  const totalNodeFixtures = nodeFixtures.reduce((sum, n) => sum + n.fixtures, 0);

  const unlitGatherings: UnlitGathering[] = [];
  for (const s of gatherings) {
    let best = Infinity;
    for (const p of eventPaths) {
      const d = distPointToLine(s.center, p.geometry);
      if (d < best) best = d;
    }
    if (best > 30) {
      unlitGatherings.push({
        id: s.id,
        name: s.name,
        type: s.type,
        distToEventPathM: best,
      });
    }
  }
  unlitGatherings.sort((a, b) => b.distToEventPathM - a.distToEventPathM);

  const parkingZones = zones.filter(
    (z) => z.category === 'access' || z.category === 'infrastructure',
  );
  const parkingGaps: ParkingGap[] = [];
  for (const z of parkingZones) {
    const c = polygonCentroid(z.geometry);
    if (!c) continue;
    let best = Infinity;
    for (const p of eventPaths) {
      const d = distPointToLine(c, p.geometry);
      if (d < best) best = d;
    }
    if (best > PARKING_GAP_THRESHOLD_M) {
      parkingGaps.push({ id: z.id, name: z.name, distToEventPathM: best });
    }
  }
  parkingGaps.sort((a, b) => b.distToEventPathM - a.distToEventPathM);

  return {
    eventPathCount: eventPaths.length,
    totalEventPathM,
    pathFixtures,
    gatheringCount: gatherings.length,
    nodeFixtures,
    totalNodeFixtures,
    unlitGatherings,
    parkingZoneCount: parkingZones.length,
    parkingGaps,
  };
}

type Tone = 'good' | 'fair' | 'poor';

function pathVerdict(report: Report): { tone: Tone; word: string; sub: string } {
  if (report.eventPathCount === 0) {
    return { tone: 'fair', word: 'No paths', sub: 'Draw arrival / main / pedestrian paths to populate.' };
  }
  return {
    tone: 'good',
    word: 'Estimated',
    sub: `${report.pathFixtures} fixture${report.pathFixtures === 1 ? '' : 's'} along ${Math.round(report.totalEventPathM)} m of event-grade path (1 per ${PATH_FIXTURE_SPACING_M} m).`,
  };
}

function nodeVerdict(report: Report): { tone: Tone; word: string; sub: string } {
  if (report.gatheringCount === 0) {
    return { tone: 'good', word: 'No nodes', sub: 'No gathering structures placed yet.' };
  }
  if (report.unlitGatherings.length === 0) {
    return {
      tone: 'good',
      word: 'All on-network',
      sub: `${report.gatheringCount} gathering node${report.gatheringCount === 1 ? '' : 's'} all within 30 m of an event path.`,
    };
  }
  return {
    tone: report.unlitGatherings.length >= report.gatheringCount / 2 ? 'poor' : 'fair',
    word: `${report.unlitGatherings.length} off-network`,
    sub: `${report.unlitGatherings.length} of ${report.gatheringCount} gathering node${report.gatheringCount === 1 ? '' : 's'} sit > 30 m from any event path — needs standalone lighting.`,
  };
}

function parkingVerdict(report: Report): { tone: Tone; word: string; sub: string } {
  if (report.parkingZoneCount === 0) {
    return { tone: 'fair', word: 'No parking', sub: 'Tag a zone as Access / Infrastructure to populate.' };
  }
  if (report.eventPathCount === 0) {
    return { tone: 'poor', word: 'No event paths', sub: `${report.parkingZoneCount} parking zone${report.parkingZoneCount === 1 ? '' : 's'} but no event-grade path to connect them.` };
  }
  if (report.parkingGaps.length === 0) {
    return {
      tone: 'good',
      word: 'Continuous',
      sub: `All ${report.parkingZoneCount} parking zone${report.parkingZoneCount === 1 ? '' : 's'} within ${PARKING_GAP_THRESHOLD_M} m of an event path.`,
    };
  }
  return {
    tone: 'fair',
    word: `${report.parkingGaps.length} unlit gap`,
    sub: `${report.parkingGaps.length} of ${report.parkingZoneCount} parking zone${report.parkingZoneCount === 1 ? '' : 's'} sit > ${PARKING_GAP_THRESHOLD_M} m from any event path.`,
  };
}

const TYPE_LABEL: Record<StructureType, string> = {
  cabin: 'Cabin', yurt: 'Yurt', pavilion: 'Pavilion', greenhouse: 'Greenhouse',
  barn: 'Barn', workshop: 'Workshop', prayer_space: 'Prayer space',
  bathhouse: 'Bathhouse', classroom: 'Classroom', storage: 'Storage',
  animal_shelter: 'Animal shelter', compost_station: 'Compost station',
  water_pump_house: 'Pump house', tent_glamping: 'Tent / glamping',
  fire_circle: 'Fire circle', lookout: 'Lookout', earthship: 'Earthship',
  solar_array: 'Solar array', well: 'Well', water_tank: 'Water tank',
};

/* ── Component ─────────────────────────────────────────────────────────── */

export default function EventFlowLightingCard({ projectId }: Props) {
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);

  const paths = useMemo(() => allPaths.filter((p) => p.projectId === projectId), [allPaths, projectId]);
  const structures = useMemo(() => allStructures.filter((s) => s.projectId === projectId), [allStructures, projectId]);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === projectId), [allZones, projectId]);

  const report = useMemo(() => analyze(paths, structures, zones), [paths, structures, zones]);

  const totalFeatures = paths.length + structures.length + zones.length;
  if (totalFeatures === 0) {
    return (
      <section className={css.card} aria-label="Event flow & night lighting">
        <header className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Event flow &amp; night lighting</h3>
            <p className={css.cardHint}>
              Night-event readiness audit. Place gathering structures,
              draw arrival / pedestrian paths, and tag parking zones.
            </p>
          </div>
          <span className={css.heuristicBadge}>HEURISTIC</span>
        </header>
        <div className={css.empty}>Nothing to evaluate yet.</div>
      </section>
    );
  }

  const path = pathVerdict(report);
  const node = nodeVerdict(report);
  const parking = parkingVerdict(report);
  const totalFixtures = report.pathFixtures + report.totalNodeFixtures;
  const fixtureHours = totalFixtures * EVENT_HOURS;

  return (
    <section className={css.card} aria-label="Event flow & night lighting">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Event flow &amp; night lighting</h3>
          <p className={css.cardHint}>
            Three-facet night-event audit: lit-path fixture rollup,
            gathering-node perimeter lighting, and parking-to-gathering
            continuity.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </header>

      {/* ── Top stat strip ──────────────────────────────────────────── */}
      <div className={css.stats}>
        <div className={css.stat}>
          <span className={css.statLabel}>Path fixtures</span>
          <span className={css.statVal}>{report.pathFixtures}</span>
          <span className={css.statNote}>{Math.round(report.totalEventPathM)} m total</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Node fixtures</span>
          <span className={css.statVal}>{report.totalNodeFixtures}</span>
          <span className={css.statNote}>{report.gatheringCount} gathering node{report.gatheringCount === 1 ? '' : 's'}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Total fixtures</span>
          <span className={css.statVal}>{totalFixtures}</span>
          <span className={css.statNote}>{fixtureHours} fixture-hr / {EVENT_HOURS}-hr event</span>
        </div>
      </div>

      {/* ── Facet 1: Path lighting ───────────────────────────────────── */}
      <div className={`${css.facet} ${css[`tone_${path.tone}`] ?? ''}`}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Lit-path coverage</span>
          <span className={css.verdictWord}>{path.word}</span>
        </div>
        <p className={css.facetSub}>{path.sub}</p>
      </div>

      {/* ── Facet 2: Gathering nodes ─────────────────────────────────── */}
      <div className={`${css.facet} ${css[`tone_${node.tone}`] ?? ''}`}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Gathering-node lighting</span>
          <span className={css.verdictWord}>{node.word}</span>
        </div>
        <p className={css.facetSub}>{node.sub}</p>
        {report.nodeFixtures.length > 0 && (
          <ul className={css.nodeList}>
            {report.nodeFixtures.slice(0, 6).map((n) => (
              <li key={n.id} className={css.nodeRow}>
                <span className={css.nodeName}>{n.name}</span>
                <span className={css.nodeType}>{TYPE_LABEL[n.type]}</span>
                <span className={css.nodePerim}>{Math.round(n.perimeterM)} m</span>
                <span className={css.nodeFixtures}>{n.fixtures}</span>
              </li>
            ))}
          </ul>
        )}
        {report.unlitGatherings.length > 0 && (
          <ul className={css.flagList}>
            {report.unlitGatherings.slice(0, 4).map((u) => (
              <li key={u.id} className={css.flagRow}>
                <span className={css.flagDot} />
                <div className={css.flagBody}>
                  <span className={css.flagTitle}>
                    {u.name} <span className={css.flagType}>({TYPE_LABEL[u.type]})</span>
                  </span>
                  <span className={css.flagSub}>
                    {Math.round(u.distToEventPathM)} m from nearest event path —
                    needs its own approach lighting.
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Facet 3: Parking continuity ──────────────────────────────── */}
      <div className={`${css.facet} ${css[`tone_${parking.tone}`] ?? ''}`}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Parking continuity</span>
          <span className={css.verdictWord}>{parking.word}</span>
        </div>
        <p className={css.facetSub}>{parking.sub}</p>
        {report.parkingGaps.length > 0 && (
          <ul className={css.flagList}>
            {report.parkingGaps.slice(0, 4).map((g) => (
              <li key={g.id} className={css.flagRow}>
                <span className={css.flagDot} />
                <div className={css.flagBody}>
                  <span className={css.flagTitle}>{g.name}</span>
                  <span className={css.flagSub}>
                    {Math.round(g.distToEventPathM)} m unlit gap from parking
                    centroid to nearest event path.
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className={css.footnote}>
        <em>How this is computed:</em> path fixtures = total length of
        arrival / main / secondary / pedestrian paths {'\u00f7'} {PATH_FIXTURE_SPACING_M} m.
        Node fixtures = each gathering structure&rsquo;s footprint perimeter
        {' \u00f7 '}{PERIMETER_FIXTURE_SPACING_M} m (fire circle / lookout
        default to a {DEFAULT_PERIMETER_M} m safety perimeter when no
        polygon is set). Off-network gathering nodes (&gt; 30 m from any
        event path) and parking zones (&gt; {PARKING_GAP_THRESHOLD_M} m)
        are flagged. Fixture-hours assumes a {EVENT_HOURS}-hour evening
        event. Heuristic guardrail {'\u2014'} not a photometric design.
      </p>
    </section>
  );
}
