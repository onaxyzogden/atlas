/**
 * §24 GPSFieldStatusCard — live GPS readout for on-site fieldwork.
 *
 * The toolbar `GPSTracker` button toggles a pulsing dot on the map and
 * surfaces a single accuracy chip. That answers "where am I?" but leaves
 * the surveyor blind to the questions that actually matter when they're
 * standing in a wet pasture in mediocre signal: *Am I inside the parcel?
 * How far am I from the boundary I drew? How precise is this fix? When
 * was the last update? How many existing field entries sit within walking
 * distance of where I'm standing right now?*
 *
 * This card answers all five with a live geolocation watch, lightweight
 * point-in-polygon and haversine helpers, and a query against the
 * fieldwork store filtered to entries within 50 m of the current fix.
 *
 * Pure presentation — no map mutation, no entity writes, no shared math.
 */
import { useEffect, useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useFieldworkStore } from '../../store/fieldworkStore.js';
import { useConnectivityStore } from '../../store/connectivityStore.js';
import css from './GPSFieldStatusCard.module.css';

interface GPSFieldStatusCardProps {
  project: LocalProject;
}

interface Fix {
  lat: number;
  lng: number;
  accuracyM: number;
  speedMs: number | null;
  altM: number | null;
  ts: number;
}

type Permission = 'unsupported' | 'idle' | 'requesting' | 'tracking' | 'denied' | 'error';

const NEAR_RADIUS_M = 50;

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function centerFromBoundary(geojson: unknown): { lat: number; lng: number } | null {
  if (!geojson || typeof geojson !== 'object') return null;
  try {
    const fc = geojson as GeoJSON.FeatureCollection;
    if (!fc.features?.length) return null;
    let sumLng = 0, sumLat = 0, count = 0;
    function visit(c: unknown): void {
      if (!Array.isArray(c)) return;
      if (typeof c[0] === 'number' && typeof c[1] === 'number') {
        sumLng += c[0] as number;
        sumLat += c[1] as number;
        count += 1;
        return;
      }
      for (const item of c) visit(item);
    }
    for (const f of fc.features) {
      visit((f.geometry as { coordinates: unknown } | null)?.coordinates);
    }
    return count === 0 ? null : { lng: sumLng / count, lat: sumLat / count };
  } catch {
    return null;
  }
}

function flattenRings(geojson: unknown): [number, number][][] {
  if (!geojson || typeof geojson !== 'object') return [];
  const rings: [number, number][][] = [];
  try {
    const fc = geojson as GeoJSON.FeatureCollection;
    for (const f of fc.features ?? []) {
      const g = f.geometry as GeoJSON.Geometry | null;
      if (!g) continue;
      if (g.type === 'Polygon') {
        for (const ring of g.coordinates) rings.push(ring as [number, number][]);
      } else if (g.type === 'MultiPolygon') {
        for (const poly of g.coordinates) {
          for (const ring of poly) rings.push(ring as [number, number][]);
        }
      }
    }
  } catch {
    return [];
  }
  return rings;
}

function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const xi = a[0], yi = a[1];
    const xj = b[0], yj = b[1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInBoundary(lng: number, lat: number, rings: [number, number][][]): boolean {
  return rings.some((r) => pointInRing(lng, lat, r));
}

function distanceToBoundaryM(lat: number, lng: number, rings: [number, number][][]): number | null {
  if (rings.length === 0) return null;
  let best = Infinity;
  for (const ring of rings) {
    for (const pt of ring) {
      if (!pt) continue;
      const d = haversineM(lat, lng, pt[1], pt[0]);
      if (d < best) best = d;
    }
  }
  return Number.isFinite(best) ? best : null;
}

function relativeAge(ms: number): string {
  if (ms < 1500) return 'just now';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function accuracyTone(m: number): 'good' | 'fair' | 'poor' {
  if (m <= 10) return 'good';
  if (m <= 30) return 'fair';
  return 'poor';
}

export default function GPSFieldStatusCard({ project }: GPSFieldStatusCardProps) {
  const [perm, setPerm] = useState<Permission>(() =>
    typeof navigator !== 'undefined' && navigator.geolocation ? 'idle' : 'unsupported',
  );
  const [fix, setFix] = useState<Fix | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const isOnline = useConnectivityStore((s) => s.isOnline);
  const allEntries = useFieldworkStore((s) => s.entries);
  const pendingUploads = useFieldworkStore((s) => s.pendingUploads);

  const projectEntries = useMemo(
    () => allEntries.filter((e) => e.projectId === project.id),
    [allEntries, project.id],
  );

  const center = useMemo(
    () => centerFromBoundary(project.parcelBoundaryGeojson ?? null),
    [project.parcelBoundaryGeojson],
  );

  const rings = useMemo(
    () => flattenRings(project.parcelBoundaryGeojson ?? null),
    [project.parcelBoundaryGeojson],
  );

  // Tick relative-time once every 5s while we have a fix.
  useEffect(() => {
    if (!fix) return;
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [fix]);

  useEffect(() => {
    if (perm !== 'tracking') return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          speedMs: pos.coords.speed,
          altM: pos.coords.altitude,
          ts: Date.now(),
        });
        setErrMsg(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPerm('denied');
          setErrMsg('Location permission denied. Enable in browser settings to track field position.');
        } else {
          setPerm('error');
          setErrMsg(err.message || 'GPS error');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [perm]);

  const distFromCenterM = useMemo(() => {
    if (!fix || !center) return null;
    return haversineM(fix.lat, fix.lng, center.lat, center.lng);
  }, [fix, center]);

  const insideParcel = useMemo(() => {
    if (!fix || rings.length === 0) return null;
    return pointInBoundary(fix.lng, fix.lat, rings);
  }, [fix, rings]);

  const distToBoundaryM = useMemo(() => {
    if (!fix) return null;
    return distanceToBoundaryM(fix.lat, fix.lng, rings);
  }, [fix, rings]);

  const nearbyEntries = useMemo(() => {
    if (!fix) return [];
    return projectEntries
      .map((e) => ({
        entry: e,
        distM: haversineM(fix.lat, fix.lng, e.location[1], e.location[0]),
      }))
      .filter((x) => x.distM <= NEAR_RADIUS_M)
      .sort((a, b) => a.distM - b.distM);
  }, [fix, projectEntries]);

  const fixAge = fix ? now - fix.ts : null;
  const accTone = fix ? accuracyTone(fix.accuracyM) : null;
  const accClass =
    accTone === 'good' ? css.statGood :
    accTone === 'poor' ? css.statBad :
    accTone === 'fair' ? css.statMid :
    '';

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>GPS Field Status</h3>
          <p className={css.hint}>
            Live position, parcel containment, signal quality, and nearby field entries
            for on-site work.
          </p>
        </div>
        <span className={css.badge}>FIELD MODE</span>
      </div>

      <div className={css.controls}>
        {perm === 'unsupported' && (
          <span className={css.controlMsg}>Geolocation API not available in this browser.</span>
        )}
        {perm === 'idle' && (
          <button
            type="button"
            className={css.startBtn}
            onClick={() => setPerm('tracking')}
          >
            {'\u25CF'} Start GPS tracking
          </button>
        )}
        {perm === 'tracking' && (
          <>
            <span className={css.tracking}>
              <span className={css.dot} /> Tracking
            </span>
            <button
              type="button"
              className={css.stopBtn}
              onClick={() => { setPerm('idle'); setFix(null); }}
            >
              Stop
            </button>
          </>
        )}
        {(perm === 'denied' || perm === 'error') && (
          <>
            <span className={css.controlMsg}>{errMsg}</span>
            <button
              type="button"
              className={css.startBtn}
              onClick={() => { setErrMsg(null); setPerm('tracking'); }}
            >
              Retry
            </button>
          </>
        )}
      </div>

      {fix && (
        <>
          <div className={css.statGrid}>
            <Stat label="Accuracy" value={`\u00B1${Math.round(fix.accuracyM)} m`} toneClass={accClass} />
            <Stat
              label="Last fix"
              value={fixAge != null ? relativeAge(fixAge) : '\u2014'}
              toneClass={fixAge != null && fixAge > 30_000 ? css.statMid : ''}
            />
            <Stat
              label="Inside parcel"
              value={
                rings.length === 0
                  ? 'no boundary'
                  : insideParcel
                    ? 'Yes'
                    : 'No'
              }
              toneClass={
                rings.length === 0
                  ? css.statMid
                  : insideParcel ? css.statGood : css.statBad
              }
            />
            <Stat
              label="From center"
              value={distFromCenterM != null ? fmtDistance(distFromCenterM) : '\u2014'}
            />
          </div>

          <div className={css.coordRow}>
            <span className={css.coord}>
              {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
            </span>
            {distToBoundaryM != null && (
              <span className={css.coordMeta}>
                {insideParcel ? 'inside' : 'outside'}, {fmtDistance(distToBoundaryM)} from boundary
              </span>
            )}
          </div>

          <div className={css.envRow}>
            <span className={`${css.envChip} ${isOnline ? css.envOnline : css.envOffline}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {pendingUploads.length > 0 && (
              <span className={css.envWarn}>{pendingUploads.length} pending uploads</span>
            )}
            {fix.altM != null && (
              <span className={css.envMeta}>alt {Math.round(fix.altM)} m</span>
            )}
            {fix.speedMs != null && fix.speedMs > 0.2 && (
              <span className={css.envMeta}>{(fix.speedMs * 3.6).toFixed(1)} km/h</span>
            )}
          </div>

          <div className={css.nearby}>
            <div className={css.nearbyHead}>
              <span className={css.nearbyTitle}>
                Within {NEAR_RADIUS_M} m
              </span>
              <span className={css.nearbyCount}>{nearbyEntries.length}</span>
            </div>
            {nearbyEntries.length === 0 ? (
              <p className={css.nearbyEmpty}>
                No prior field entries near this location. Drop a note, soil sample, or
                photo to start building site context here.
              </p>
            ) : (
              <ul className={css.nearbyList}>
                {nearbyEntries.slice(0, 5).map(({ entry, distM }) => (
                  <li key={entry.id} className={css.nearbyRow}>
                    <span className={css.nearbyType}>{entry.type}</span>
                    <span className={css.nearbyText}>
                      {entry.notes || '(no notes)'}
                    </span>
                    <span className={css.nearbyDist}>{Math.round(distM)} m</span>
                  </li>
                ))}
                {nearbyEntries.length > 5 && (
                  <li className={css.nearbyMore}>
                    +{nearbyEntries.length - 5} more within {NEAR_RADIUS_M} m
                  </li>
                )}
              </ul>
            )}
          </div>
        </>
      )}

      <p className={css.footnote}>
        <strong>Method.</strong> Browser geolocation watch with high-accuracy mode (5 s
        cache, 15 s timeout). Distance from boundary uses haversine to the nearest
        polygon vertex. Inside-parcel test uses ray-casting against all polygon rings
        in the saved boundary. Nearby entries are filtered to {NEAR_RADIUS_M} m great-circle
        distance from the current fix.
      </p>
    </div>
  );
}

function Stat({ label, value, toneClass }: { label: string; value: string; toneClass?: string }) {
  return (
    <div className={`${css.stat} ${toneClass ?? ''}`}>
      <span className={css.statLabel}>{label}</span>
      <span className={css.statVal}>{value}</span>
    </div>
  );
}
