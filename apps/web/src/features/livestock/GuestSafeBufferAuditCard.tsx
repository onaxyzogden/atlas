/**
 * §11 GuestSafeBufferAuditCard — heuristic paddock → guest-zone setback audit.
 *
 * Spec mapping: §11 Livestock · `guest-safe-livestock-buffer` (MT, partial).
 *
 * Complements BiosecurityBufferCard (which audits structure-level setbacks)
 * by surfacing the *zone-level* relationship: how far each paddock sits from
 * the nearest guest-adjacent land zone (retreat / education / spiritual /
 * commons). Guest comfort buffers are larger than biosecurity setbacks because
 * the concern is odor, sound, insect pressure, and retreat tranquillity — not
 * disease vectors.
 *
 * Thresholds (rural-extension planning-grade defaults):
 *   - Standard paddock      ready ≥ 50 m, partial 25–50 m, thin < 25 m
 *   - Guest-safe-flagged    ready ≥ 75 m, partial 50–75 m, thin < 50 m
 *
 * Distance is paddock centroid → nearest guest-zone polygon edge using
 * equirectangular projection — accurate to <0.5% at planning distances.
 * Heuristic only; ignores prevailing wind, visual screening, and acoustic
 * masking. Cross-check on-site before final siting.
 */
import { useMemo } from 'react';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import { useZoneStore, type LandZone, type ZoneCategory, ZONE_CATEGORY_CONFIG } from '../../store/zoneStore.js';
import css from './GuestSafeBufferAuditCard.module.css';

const GUEST_CATEGORIES: ReadonlySet<ZoneCategory> = new Set([
  'retreat',
  'education',
  'spiritual',
  'commons',
]);

const STANDARD_READY_M = 50;
const STANDARD_PARTIAL_M = 25;
const FLAGGED_READY_M = 75;
const FLAGGED_PARTIAL_M = 50;

type Status = 'ready' | 'partial' | 'thin';

interface PaddockRow {
  paddock: Paddock;
  nearestZone: LandZone | null;
  distanceM: number | null;
  status: Status | 'no-zone';
  thresholdReady: number;
}

interface Props {
  projectId: string;
}

function polygonCentroid(geom: GeoJSON.Polygon): [number, number] | null {
  const ring = geom.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const pt = ring[i];
    if (!pt || pt.length < 2) continue;
    sx += pt[0]!;
    sy += pt[1]!;
    n++;
  }
  if (n === 0) return null;
  return [sx / n, sy / n];
}

function pointToSegmentMeters(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const meanLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const mPerDegLng = 111320 * Math.cos(meanLat);
  const mPerDegLat = 110540;
  const ax = a[0] * mPerDegLng;
  const ay = a[1] * mPerDegLat;
  const bx = b[0] * mPerDegLng;
  const by = b[1] * mPerDegLat;
  const px = p[0] * mPerDegLng;
  const py = p[1] * mPerDegLat;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanceToZoneEdgeM(
  point: [number, number],
  zone: LandZone,
): number {
  const polys: GeoJSON.Position[][][] =
    zone.geometry.type === 'Polygon'
      ? [zone.geometry.coordinates]
      : zone.geometry.coordinates;
  let min = Number.POSITIVE_INFINITY;
  for (const poly of polys) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length - 1; i++) {
        const p1 = ring[i];
        const p2 = ring[i + 1];
        if (!p1 || !p2 || p1.length < 2 || p2.length < 2) continue;
        const d = pointToSegmentMeters(point, [p1[0]!, p1[1]!], [p2[0]!, p2[1]!]);
        if (d < min) min = d;
      }
    }
  }
  return Number.isFinite(min) ? min : Number.POSITIVE_INFINITY;
}

function classify(distanceM: number, flagged: boolean): Status {
  const ready = flagged ? FLAGGED_READY_M : STANDARD_READY_M;
  const partial = flagged ? FLAGGED_PARTIAL_M : STANDARD_PARTIAL_M;
  if (distanceM >= ready) return 'ready';
  if (distanceM >= partial) return 'partial';
  return 'thin';
}

function fmtM(m: number): string {
  if (!Number.isFinite(m)) return '—';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${m.toFixed(0)} m`;
}

export default function GuestSafeBufferAuditCard({ projectId }: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allZones = useZoneStore((s) => s.zones);

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const guestZones = useMemo(
    () => allZones.filter((z) => z.projectId === projectId && GUEST_CATEGORIES.has(z.category)),
    [allZones, projectId],
  );

  const rows = useMemo<PaddockRow[]>(() => {
    if (paddocks.length === 0) return [];
    return paddocks.map((paddock) => {
      const flagged = paddock.guestSafeBuffer === true;
      const thresholdReady = flagged ? FLAGGED_READY_M : STANDARD_READY_M;
      const center = polygonCentroid(paddock.geometry);
      if (!center || guestZones.length === 0) {
        return { paddock, nearestZone: null, distanceM: null, status: 'no-zone', thresholdReady };
      }
      let nearest: LandZone | null = null;
      let nearestD = Number.POSITIVE_INFINITY;
      for (const zone of guestZones) {
        const d = distanceToZoneEdgeM(center, zone);
        if (d < nearestD) {
          nearestD = d;
          nearest = zone;
        }
      }
      if (!nearest) {
        return { paddock, nearestZone: null, distanceM: null, status: 'no-zone', thresholdReady };
      }
      return {
        paddock,
        nearestZone: nearest,
        distanceM: nearestD,
        status: classify(nearestD, flagged),
        thresholdReady,
      };
    });
  }, [paddocks, guestZones]);

  const counts = useMemo(() => {
    let ready = 0;
    let partial = 0;
    let thin = 0;
    for (const r of rows) {
      if (r.status === 'ready') ready++;
      else if (r.status === 'partial') partial++;
      else if (r.status === 'thin') thin++;
    }
    return { ready, partial, thin };
  }, [rows]);

  const verdict = useMemo<{ tone: Status | 'empty'; title: string; note: string }>(() => {
    if (paddocks.length === 0) {
      return {
        tone: 'empty',
        title: 'No paddocks drawn',
        note: 'Draw at least one paddock on the map to surface a guest-safe buffer audit.',
      };
    }
    if (guestZones.length === 0) {
      return {
        tone: 'empty',
        title: 'No guest-adjacent zones drawn',
        note: 'Draw retreat, education, spiritual, or commons zones to evaluate buffer distance from each paddock.',
      };
    }
    if (counts.thin > 0) {
      return {
        tone: 'thin',
        title: `${counts.thin} paddock${counts.thin === 1 ? '' : 's'} below comfort buffer`,
        note: 'Tighten paddock geometry or relocate guest zones — manure odor, sound, and insect pressure are likely to reach the guest experience.',
      };
    }
    if (counts.partial > 0) {
      return {
        tone: 'partial',
        title: `${counts.partial} paddock${counts.partial === 1 ? '' : 's'} marginal`,
        note: 'Review prevailing wind direction and visual screening — buffers are tolerable but tight.',
      };
    }
    return {
      tone: 'ready',
      title: 'All paddocks meet guest-safe buffers',
      note: 'Each paddock sits beyond its applicable comfort threshold from the nearest guest-adjacent zone.',
    };
  }, [paddocks.length, guestZones.length, counts]);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Guest-safe livestock buffer audit</h3>
          <p className={css.cardHint}>
            Distance from each paddock to the nearest retreat / education / spiritual / commons zone.
            Guest-safe-flagged paddocks use stricter thresholds. Centroid → polygon-edge heuristic;
            cross-check prevailing wind on site.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </div>

      <div className={`${css.verdictBanner} ${css[`tone_${verdict.tone}`]}`}>
        <div className={css.verdictTitle}>{verdict.title}</div>
        <div className={css.verdictNote}>{verdict.note}</div>
      </div>

      {rows.length > 0 && guestZones.length > 0 && (
        <div className={css.rowList}>
          {rows.map((r) => {
            const zoneCfg = r.nearestZone ? ZONE_CATEGORY_CONFIG[r.nearestZone.category] : null;
            const statusKey = r.status === 'no-zone' ? 'empty' : r.status;
            return (
              <div key={r.paddock.id} className={css.row}>
                <div className={css.rowHead}>
                  <span className={css.paddockName}>{r.paddock.name}</span>
                  {r.paddock.guestSafeBuffer && (
                    <span className={css.flagPill}>FLAGGED ≥{FLAGGED_READY_M}m</span>
                  )}
                  <span className={`${css.statusPill} ${css[`status_${statusKey}`]}`}>
                    {r.status === 'ready' && 'Ready'}
                    {r.status === 'partial' && 'Marginal'}
                    {r.status === 'thin' && 'Below buffer'}
                    {r.status === 'no-zone' && 'No zone'}
                  </span>
                </div>
                <div className={css.rowDetail}>
                  {r.nearestZone && r.distanceM != null ? (
                    <>
                      <span className={css.metric}>{fmtM(r.distanceM)}</span>
                      <span className={css.metricMuted}>
                        {' '}to{' '}
                      </span>
                      {zoneCfg && <span className={css.zoneIcon}>{zoneCfg.icon}</span>}
                      <span className={css.zoneName}>{r.nearestZone.name}</span>
                      <span className={css.metricMuted}>
                        {' '}({zoneCfg?.label ?? r.nearestZone.category})
                      </span>
                      <span className={css.thresholdNote}>
                        {' · target ≥ '}
                        {r.thresholdReady}m
                      </span>
                    </>
                  ) : (
                    <span className={css.metricMuted}>No guest zone reachable</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
