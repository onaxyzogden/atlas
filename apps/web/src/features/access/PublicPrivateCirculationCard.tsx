/**
 * §10 PublicPrivateCirculationCard — circulation-segregation audit.
 *
 * Three facets:
 *
 *   1. Network split
 *      Buckets every drawn path into Public (visitor-facing),
 *      Private (operator / animal), or Shared (dual-use), and reports
 *      the length share of each. A retreat or farm-tour operation
 *      typically wants > 50 % of accessible network to be visitor-safe.
 *
 *   2. Guest-node connectivity
 *      Each guest-facing structure (pavilion, prayer_space, classroom,
 *      bathhouse, lookout, fire_circle) needs a Public or Shared path
 *      within 30 m. Anything beyond that puts visitors onto a private
 *      service / animal route to reach it — flagged.
 *
 *   3. Public/private crossings
 *      Every place a Public path comes within JUNCTION_RADIUS_M of a
 *      Private path is a friction point: visitor + operator / animal
 *      traffic meet. Each crossing needs signage, a visual cue, or a
 *      grade separation. Reports the count + worst few examples.
 *
 * Pure presentation; no shared-package math, no map overlays. Reads
 * pathStore + structureStore.
 *
 * Closes manifest §10 `public-private-circulation-layers` (P2).
 */

import { useMemo } from 'react';
import {
  usePathStore,
  PATH_TYPE_CONFIG,
  type DesignPath,
  type PathType,
} from '../../store/pathStore.js';
import { useStructureStore, type Structure, type StructureType } from '../../store/structureStore.js';
import css from './PublicPrivateCirculationCard.module.css';

interface Props {
  projectId: string;
}

type Visibility = 'public' | 'private' | 'shared';

const VISIBILITY_BY_TYPE: Record<PathType, Visibility> = {
  arrival_sequence: 'public',
  main_road: 'public',
  pedestrian_path: 'public',
  trail: 'public',
  quiet_route: 'public',
  secondary_road: 'shared',
  service_road: 'private',
  farm_lane: 'private',
  animal_corridor: 'private',
  grazing_route: 'private',
  emergency_access: 'private',
};

const GUEST_STRUCTURE_TYPES: ReadonlySet<StructureType> = new Set([
  'pavilion',
  'prayer_space',
  'classroom',
  'bathhouse',
  'lookout',
  'fire_circle',
  'cabin',
  'yurt',
  'tent_glamping',
]);

/** Two path sample-points within this distance count as a crossing. */
const JUNCTION_RADIUS_M = 15;
/** Guest structure beyond this from any Public/Shared path is "off-network". */
const GUEST_OFFNET_THRESHOLD_M = 30;
/** Sample density along each path for crossing detection. */
const SAMPLES_PER_PATH = 24;
/** Minimum path length to count as a meaningful network member. */
const MIN_PATH_LENGTH_M = 5;

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

function distPointToLine(p: [number, number], line: GeoJSON.LineString): number {
  const coords = line.coordinates as [number, number][];
  if (coords.length === 0) return Infinity;
  let best = Infinity;
  for (const c of coords) {
    const d = distMeters(p, c);
    if (d < best) best = d;
  }
  return best;
}

function sampleLine(line: GeoJSON.LineString, samples: number): [number, number][] {
  const coords = line.coordinates as [number, number][];
  if (coords.length === 0) return [];
  if (coords.length === 1) return [coords[0]!];
  const out: [number, number][] = [];
  const step = (coords.length - 1) / Math.max(samples - 1, 1);
  for (let i = 0; i < samples; i++) {
    const t = i * step;
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, coords.length - 1);
    const f = t - lo;
    const a = coords[lo]!;
    const b = coords[hi]!;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

function structureCentroid(s: Structure): [number, number] | null {
  if (s.center && Number.isFinite(s.center[0]) && Number.isFinite(s.center[1])) {
    return [s.center[0], s.center[1]];
  }
  return null;
}

/* ── Analysis ──────────────────────────────────────────────────────────── */

interface BucketStats {
  count: number;
  lengthM: number;
}

interface OffNetGuest {
  id: string;
  name: string;
  type: StructureType;
  distM: number;
}

interface Crossing {
  publicId: string;
  publicName: string;
  publicType: PathType;
  privateId: string;
  privateName: string;
  privateType: PathType;
  distM: number;
}

interface Report {
  buckets: Record<Visibility, BucketStats>;
  totalLengthM: number;
  totalPathCount: number;
  publicReachablePathCount: number;
  offNetGuests: OffNetGuest[];
  guestCount: number;
  crossings: Crossing[];
}

function analyze(paths: DesignPath[], structures: Structure[]): Report {
  const valid = paths.filter((p) => p.geometry.coordinates.length >= 2 && p.lengthM >= MIN_PATH_LENGTH_M);

  const buckets: Record<Visibility, BucketStats> = {
    public: { count: 0, lengthM: 0 },
    private: { count: 0, lengthM: 0 },
    shared: { count: 0, lengthM: 0 },
  };
  for (const p of valid) {
    const v = VISIBILITY_BY_TYPE[p.type];
    buckets[v].count += 1;
    buckets[v].lengthM += p.lengthM;
  }

  const publicReachable = valid.filter((p) => VISIBILITY_BY_TYPE[p.type] !== 'private');

  const guests = structures.filter((s) => GUEST_STRUCTURE_TYPES.has(s.type));
  const offNetGuests: OffNetGuest[] = [];
  for (const g of guests) {
    const c = structureCentroid(g);
    if (!c) continue;
    let best = Infinity;
    for (const p of publicReachable) {
      const d = distPointToLine(c, p.geometry);
      if (d < best) best = d;
    }
    if (best > GUEST_OFFNET_THRESHOLD_M) {
      offNetGuests.push({ id: g.id, name: g.name, type: g.type, distM: best });
    }
  }
  offNetGuests.sort((a, b) => b.distM - a.distM);

  const publicPaths = valid.filter((p) => VISIBILITY_BY_TYPE[p.type] === 'public');
  const privatePaths = valid.filter((p) => VISIBILITY_BY_TYPE[p.type] === 'private');
  const crossings: Crossing[] = [];
  const seenPairs = new Set<string>();
  for (const pub of publicPaths) {
    const pubSamples = sampleLine(pub.geometry, SAMPLES_PER_PATH);
    for (const priv of privatePaths) {
      const key = `${pub.id}::${priv.id}`;
      if (seenPairs.has(key)) continue;
      let nearest = Infinity;
      for (const sp of pubSamples) {
        const d = distPointToLine(sp, priv.geometry);
        if (d < nearest) nearest = d;
        if (nearest < 1) break;
      }
      if (nearest <= JUNCTION_RADIUS_M) {
        seenPairs.add(key);
        crossings.push({
          publicId: pub.id,
          publicName: pub.name,
          publicType: pub.type,
          privateId: priv.id,
          privateName: priv.name,
          privateType: priv.type,
          distM: nearest,
        });
      }
    }
  }
  crossings.sort((a, b) => a.distM - b.distM);

  return {
    buckets,
    totalLengthM: buckets.public.lengthM + buckets.private.lengthM + buckets.shared.lengthM,
    totalPathCount: valid.length,
    publicReachablePathCount: publicReachable.length,
    offNetGuests,
    guestCount: guests.length,
    crossings,
  };
}

/* ── Verdicts ──────────────────────────────────────────────────────────── */

type Tone = 'good' | 'fair' | 'poor';

function splitVerdict(report: Report): { tone: Tone; word: string; sub: string } {
  if (report.totalLengthM === 0) {
    return { tone: 'fair', word: 'No network', sub: 'Draw paths to populate the public/private split.' };
  }
  const publicShare = (report.buckets.public.lengthM + report.buckets.shared.lengthM) / report.totalLengthM;
  if (publicShare >= 0.5) {
    return {
      tone: 'good',
      word: `${Math.round(publicShare * 100)}% guest-safe`,
      sub: `Public + shared make up the majority of the network — visitors can move without crossing into private routes.`,
    };
  }
  if (publicShare >= 0.25) {
    return {
      tone: 'fair',
      word: `${Math.round(publicShare * 100)}% guest-safe`,
      sub: `Most network length is private. Acceptable for working-farm projects; review if this site hosts guests or events.`,
    };
  }
  return {
    tone: 'poor',
    word: `${Math.round(publicShare * 100)}% guest-safe`,
    sub: `Network is overwhelmingly private. Add an arrival / pedestrian / trail route if visitors are expected.`,
  };
}

function guestVerdict(report: Report): { tone: Tone; word: string; sub: string } {
  if (report.guestCount === 0) {
    return { tone: 'good', word: 'No guest nodes', sub: 'No guest-facing structures placed yet.' };
  }
  if (report.publicReachablePathCount === 0) {
    return {
      tone: 'poor',
      word: 'No public paths',
      sub: `${report.guestCount} guest structure${report.guestCount === 1 ? '' : 's'} placed but no public/shared route to reach any of them.`,
    };
  }
  if (report.offNetGuests.length === 0) {
    return {
      tone: 'good',
      word: 'All on-network',
      sub: `${report.guestCount} guest structure${report.guestCount === 1 ? '' : 's'} all within ${GUEST_OFFNET_THRESHOLD_M} m of a public/shared path.`,
    };
  }
  return {
    tone: report.offNetGuests.length >= report.guestCount / 2 ? 'poor' : 'fair',
    word: `${report.offNetGuests.length} off-network`,
    sub: `${report.offNetGuests.length} of ${report.guestCount} guest structure${report.guestCount === 1 ? '' : 's'} sit > ${GUEST_OFFNET_THRESHOLD_M} m from any public path — visitors must use a service / animal route.`,
  };
}

function crossingVerdict(report: Report): { tone: Tone; word: string; sub: string } {
  if (report.buckets.public.count === 0 || report.buckets.private.count === 0) {
    return {
      tone: 'good',
      word: 'None to check',
      sub: 'No public/private overlap to evaluate (need at least one of each path type).',
    };
  }
  if (report.crossings.length === 0) {
    return {
      tone: 'good',
      word: 'Cleanly separated',
      sub: `Public and private networks stay > ${JUNCTION_RADIUS_M} m apart — no friction points.`,
    };
  }
  if (report.crossings.length <= 2) {
    return {
      tone: 'fair',
      word: `${report.crossings.length} crossing${report.crossings.length === 1 ? '' : 's'}`,
      sub: `Public and private routes meet at ${report.crossings.length} location${report.crossings.length === 1 ? '' : 's'} — flag for signage or visual cue.`,
    };
  }
  return {
    tone: 'poor',
    word: `${report.crossings.length} crossings`,
    sub: `${report.crossings.length} public/private friction points — review the layout; visitors may end up on operator or animal routes.`,
  };
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function PublicPrivateCirculationCard({ projectId }: Props) {
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);

  const paths = useMemo(() => allPaths.filter((p) => p.projectId === projectId), [allPaths, projectId]);
  const structures = useMemo(() => allStructures.filter((s) => s.projectId === projectId), [allStructures, projectId]);

  const report = useMemo(() => analyze(paths, structures), [paths, structures]);

  if (paths.length === 0 && structures.length === 0) {
    return (
      <section className={css.card} aria-label="Public vs private circulation">
        <header className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Public vs private circulation</h3>
            <p className={css.cardHint}>
              Classifies the path network as visitor-safe vs operator-only
              and flags places they meet. Draw paths to populate.
            </p>
          </div>
          <span className={css.heuristicBadge}>HEURISTIC</span>
        </header>
        <div className={css.empty}>Nothing to evaluate yet.</div>
      </section>
    );
  }

  const split = splitVerdict(report);
  const guest = guestVerdict(report);
  const crossing = crossingVerdict(report);

  const pubM = report.buckets.public.lengthM;
  const privM = report.buckets.private.lengthM;
  const shrM = report.buckets.shared.lengthM;
  const totalM = report.totalLengthM || 1;
  const pubPct = (pubM / totalM) * 100;
  const privPct = (privM / totalM) * 100;
  const shrPct = (shrM / totalM) * 100;

  return (
    <section className={css.card} aria-label="Public vs private circulation">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Public vs private circulation</h3>
          <p className={css.cardHint}>
            Three-facet circulation-segregation audit: public/private
            length split, guest-node reachability, and public/private
            crossings.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </header>

      {/* ── Top stat strip ──────────────────────────────────────────── */}
      <div className={css.stats}>
        <div className={css.stat}>
          <span className={css.statLabel}>Public</span>
          <span className={css.statVal}>{Math.round(pubM)} m</span>
          <span className={css.statNote}>
            {report.buckets.public.count} path{report.buckets.public.count === 1 ? '' : 's'}
          </span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Shared</span>
          <span className={css.statVal}>{Math.round(shrM)} m</span>
          <span className={css.statNote}>
            {report.buckets.shared.count} path{report.buckets.shared.count === 1 ? '' : 's'}
          </span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Private</span>
          <span className={css.statVal}>{Math.round(privM)} m</span>
          <span className={css.statNote}>
            {report.buckets.private.count} path{report.buckets.private.count === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* ── Network split bar ───────────────────────────────────────── */}
      {report.totalLengthM > 0 && (
        <div className={css.splitBar} aria-hidden="true">
          <div className={css.splitPub} style={{ width: `${pubPct}%` }} />
          <div className={css.splitShr} style={{ width: `${shrPct}%` }} />
          <div className={css.splitPriv} style={{ width: `${privPct}%` }} />
        </div>
      )}

      {/* ── Facet 1: Network split ──────────────────────────────────── */}
      <div className={`${css.facet} ${css[`tone_${split.tone}`] ?? ''}`}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Network split</span>
          <span className={css.verdictWord}>{split.word}</span>
        </div>
        <p className={css.facetSub}>{split.sub}</p>
      </div>

      {/* ── Facet 2: Guest connectivity ─────────────────────────────── */}
      <div className={`${css.facet} ${css[`tone_${guest.tone}`] ?? ''}`}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Guest-node connectivity</span>
          <span className={css.verdictWord}>{guest.word}</span>
        </div>
        <p className={css.facetSub}>{guest.sub}</p>
        {report.offNetGuests.length > 0 && (
          <ul className={css.flagList}>
            {report.offNetGuests.slice(0, 4).map((g) => (
              <li key={g.id} className={css.flagRow}>
                <span className={css.flagDot} />
                <div className={css.flagBody}>
                  <span className={css.flagTitle}>{g.name}</span>
                  <span className={css.flagSub}>
                    {Math.round(g.distM)} m from nearest public/shared path —
                    visitors must traverse private route.
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Facet 3: Crossings ──────────────────────────────────────── */}
      <div className={`${css.facet} ${css[`tone_${crossing.tone}`] ?? ''}`}>
        <div className={css.facetHead}>
          <span className={css.facetLabel}>Public/private crossings</span>
          <span className={css.verdictWord}>{crossing.word}</span>
        </div>
        <p className={css.facetSub}>{crossing.sub}</p>
        {report.crossings.length > 0 && (
          <ul className={css.flagList}>
            {report.crossings.slice(0, 5).map((c) => (
              <li key={`${c.publicId}::${c.privateId}`} className={css.flagRow}>
                <span className={css.flagDot} />
                <div className={css.flagBody}>
                  <span className={css.flagTitle}>
                    {c.publicName} {'\u2194'} {c.privateName}
                  </span>
                  <span className={css.flagSub}>
                    {PATH_TYPE_CONFIG[c.publicType].label} meets{' '}
                    {PATH_TYPE_CONFIG[c.privateType].label} within {Math.round(c.distM)} m —
                    needs signage or visual cue.
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className={css.footnote}>
        <em>How this is computed:</em> each path type is mapped to{' '}
        <strong>public</strong> (arrival, main, pedestrian, trail, quiet),{' '}
        <strong>shared</strong> (secondary road), or <strong>private</strong>{' '}
        (service, farm lane, animal corridor, grazing route, emergency).
        Guest-node check measures the distance from each guest structure
        centroid to the nearest public/shared path. Crossings are detected by
        sampling each public path at {SAMPLES_PER_PATH} points and flagging
        any private path within {JUNCTION_RADIUS_M} m. Heuristic — does not
        check for grade separation, signage, or visual barriers already in
        place.
      </p>
    </section>
  );
}
