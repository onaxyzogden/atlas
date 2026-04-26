/**
 * §10 ServiceAccessContinuityCard — main/secondary/emergency/service access audit.
 *
 * Pairs the four vehicle-class path types (main_road, secondary_road,
 * emergency_access, service_road) with placed structures. Surfaces three
 * facets:
 *   1. Network composition (counts + total length per class).
 *   2. Main-road continuity (do main roads connect to any secondary or
 *      service road via a shared endpoint within 10 m? An isolated main
 *      road is a planning red flag).
 *   3. Emergency reach (each guest-facing structure must sit within
 *      50 m of an emergency_access OR main_road line — measured from
 *      structure center to nearest path coordinate).
 *
 * Pure presentation. Reads usePathStore + useStructureStore. No new
 * entity types, no shared math, no map overlay.
 *
 * Closes manifest item `main-secondary-emergency-service-access`
 * (P2 partial -> done).
 */

import { memo, useMemo } from 'react';
import * as turf from '@turf/turf';
import { usePathStore, type DesignPath, type PathType } from '../../store/pathStore.js';
import { useStructureStore, type Structure } from '../../store/structureStore.js';
import css from './ServiceAccessContinuityCard.module.css';

interface Props {
  projectId: string;
}

const VEHICLE_CLASSES: PathType[] = ['main_road', 'secondary_road', 'emergency_access', 'service_road'];
const ENDPOINT_JOIN_M = 10;
const EMERGENCY_REACH_M = 50;

const GUEST_FACING: Structure['type'][] = [
  'cabin', 'yurt', 'pavilion', 'prayer_space', 'classroom',
  'bathhouse', 'tent_glamping', 'fire_circle', 'lookout',
];

const CLASS_LABEL: Record<PathType, string> = {
  main_road: 'Main',
  secondary_road: 'Secondary',
  emergency_access: 'Emergency',
  service_road: 'Service',
  pedestrian_path: '',
  trail: '',
  farm_lane: '',
  animal_corridor: '',
  grazing_route: '',
  arrival_sequence: '',
  quiet_route: '',
};

interface ClassRow {
  type: PathType;
  count: number;
  totalLengthM: number;
}

interface ContinuityRow {
  pathId: string;
  pathName: string;
  connected: boolean;
  nearestNeighborM: number | null;
}

interface ReachRow {
  structureId: string;
  structureType: string;
  reached: boolean;
  nearestPathM: number | null;
}

function endpointDistM(a: [number, number], b: [number, number]): number {
  return turf.distance(turf.point(a), turf.point(b), { units: 'meters' });
}

function pathDistToPointM(path: DesignPath, pt: [number, number]): number {
  const line = turf.lineString(path.geometry.coordinates as number[][]);
  return turf.pointToLineDistance(turf.point(pt), line, { units: 'meters' });
}

function formatLength(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export const ServiceAccessContinuityCard = memo(function ServiceAccessContinuityCard({ projectId }: Props) {
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);

  const data = useMemo(() => {
    const vehiclePaths = allPaths.filter(
      (p) => p.projectId === projectId && (VEHICLE_CLASSES as PathType[]).includes(p.type),
    );
    const mainRoads = vehiclePaths.filter((p) => p.type === 'main_road');
    const emergencyOrMain = vehiclePaths.filter(
      (p) => p.type === 'emergency_access' || p.type === 'main_road',
    );

    /* Facet 1: composition */
    const classRows: ClassRow[] = VEHICLE_CLASSES.map((t) => {
      const paths = vehiclePaths.filter((p) => p.type === t);
      return {
        type: t,
        count: paths.length,
        totalLengthM: paths.reduce((sum, p) => sum + p.lengthM, 0),
      };
    });
    const totalLengthM = classRows.reduce((s, r) => s + r.totalLengthM, 0);

    /* Facet 2: main-road continuity (each main road must share an
       endpoint within ENDPOINT_JOIN_M of another vehicle-class path). */
    const continuityRows: ContinuityRow[] = mainRoads.map((mp) => {
      const coords = mp.geometry.coordinates as [number, number][];
      const endpoints: [number, number][] = coords.length >= 2
        ? [coords[0]!, coords[coords.length - 1]!]
        : [];
      let nearest: number | null = null;
      let connected = false;
      for (const other of vehiclePaths) {
        if (other.id === mp.id) continue;
        const otherCoords = other.geometry.coordinates as [number, number][];
        if (otherCoords.length === 0) continue;
        const otherEndpoints: [number, number][] = otherCoords.length >= 2
          ? [otherCoords[0]!, otherCoords[otherCoords.length - 1]!]
          : [otherCoords[0]!];
        for (const e1 of endpoints) {
          for (const e2 of otherEndpoints) {
            const d = endpointDistM(e1, e2);
            if (nearest === null || d < nearest) nearest = d;
            if (d <= ENDPOINT_JOIN_M) connected = true;
          }
        }
      }
      return {
        pathId: mp.id,
        pathName: mp.name || 'Main road',
        connected,
        nearestNeighborM: nearest,
      };
    });

    /* Facet 3: emergency reach for guest-facing structures */
    const guestStructures = allStructures.filter(
      (s) => s.projectId === projectId && (GUEST_FACING as string[]).includes(s.type),
    );
    const reachRows: ReachRow[] = guestStructures.map((s) => {
      let nearest: number | null = null;
      for (const p of emergencyOrMain) {
        const d = pathDistToPointM(p, s.center);
        if (nearest === null || d < nearest) nearest = d;
      }
      return {
        structureId: s.id,
        structureType: s.type,
        reached: nearest !== null && nearest <= EMERGENCY_REACH_M,
        nearestPathM: nearest,
      };
    });

    const reachedCount = reachRows.filter((r) => r.reached).length;
    const isolatedMain = continuityRows.filter((r) => !r.connected).length;

    return {
      classRows,
      totalLengthM,
      continuityRows,
      reachRows,
      reachedCount,
      isolatedMain,
      hasNetwork: vehiclePaths.length > 0,
      hasEmergencySource: emergencyOrMain.length > 0,
    };
  }, [allPaths, allStructures, projectId]);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Service Access Continuity</h3>
          <p className={css.cardHint}>
            Audits the four vehicle-class path types ({'\u2018'}main road{'\u2019'},{' '}
            {'\u2018'}secondary{'\u2019'}, {'\u2018'}emergency access{'\u2019'},{' '}
            {'\u2018'}service road{'\u2019'}) for network composition,{' '}
            <em>main-road continuity</em> ({ENDPOINT_JOIN_M} m endpoint join), and{' '}
            <em>emergency reach</em> for guest-facing structures (within{' '}
            {EMERGENCY_REACH_M} m of an emergency or main road).
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </div>

      {/* ── Facet 1: composition ───────────────────────────────────── */}
      <div className={css.facetLabel}>Network composition</div>
      <div className={css.classGrid}>
        {data.classRows.map((row) => (
          <div key={row.type} className={css.classBlock}>
            <span className={css.classLabel}>{CLASS_LABEL[row.type]}</span>
            <span className={css.classCount}>{row.count}</span>
            <span className={css.classLength}>{formatLength(row.totalLengthM)}</span>
          </div>
        ))}
      </div>
      <div className={css.totalLine}>
        <span className={css.totalLabel}>Total vehicle-class length</span>
        <span className={css.totalVal}>{formatLength(data.totalLengthM)}</span>
      </div>

      {!data.hasNetwork && (
        <div className={css.empty}>
          No vehicle-class paths drawn yet. Use the <strong>Path</strong> tool
          and select <em>Main Road</em>, <em>Secondary Road</em>,{' '}
          <em>Emergency Access</em>, or <em>Service Road</em> to plan the
          drivable network.
        </div>
      )}

      {/* ── Facet 2: main-road continuity ──────────────────────────── */}
      {data.continuityRows.length > 0 && (
        <>
          <div className={css.facetLabel}>Main-road continuity</div>
          <ul className={css.rowList}>
            {data.continuityRows.map((r) => (
              <li
                key={r.pathId}
                className={`${css.row} ${r.connected ? css.rowOk : css.rowWarn}`}
              >
                <span className={css.rowName}>{r.pathName}</span>
                <span className={css.rowMeta}>
                  {r.connected
                    ? <>Joined to network ({r.nearestNeighborM != null ? `${Math.round(r.nearestNeighborM)} m gap` : 'shared endpoint'})</>
                    : <>Isolated {r.nearestNeighborM != null ? `(nearest neighbor ${Math.round(r.nearestNeighborM)} m away)` : ''}</>}
                </span>
                <span className={`${css.statusChip} ${r.connected ? css.chipOk : css.chipWarn}`}>
                  {r.connected ? 'JOINED' : 'ISOLATED'}
                </span>
              </li>
            ))}
          </ul>
          {data.isolatedMain > 0 && (
            <div className={css.warnLine}>
              {data.isolatedMain} main road{data.isolatedMain === 1 ? '' : 's'}{' '}
              isolated {'\u2014'} draw a connector to the secondary or service
              network.
            </div>
          )}
        </>
      )}

      {/* ── Facet 3: emergency reach ──────────────────────────────── */}
      {data.reachRows.length > 0 && (
        <>
          <div className={css.facetLabel}>
            Emergency reach{' '}
            <span className={css.facetMeta}>
              ({data.reachedCount}/{data.reachRows.length} guest-facing reached)
            </span>
          </div>
          {!data.hasEmergencySource ? (
            <div className={css.warnLine}>
              No <em>emergency access</em> or <em>main road</em> drawn {'\u2014'}{' '}
              all {data.reachRows.length} guest-facing structure
              {data.reachRows.length === 1 ? '' : 's'} unreached.
            </div>
          ) : (
            <ul className={css.rowList}>
              {data.reachRows.slice(0, 8).map((r) => (
                <li
                  key={r.structureId}
                  className={`${css.row} ${r.reached ? css.rowOk : css.rowWarn}`}
                >
                  <span className={css.rowName}>{r.structureType.replace(/_/g, ' ')}</span>
                  <span className={css.rowMeta}>
                    {r.nearestPathM != null
                      ? `${Math.round(r.nearestPathM)} m to nearest emergency/main`
                      : 'no path'}
                  </span>
                  <span className={`${css.statusChip} ${r.reached ? css.chipOk : css.chipWarn}`}>
                    {r.reached ? 'REACHED' : 'OUT OF REACH'}
                  </span>
                </li>
              ))}
              {data.reachRows.length > 8 && (
                <li className={css.moreNote}>
                  +{data.reachRows.length - 8} more structure
                  {data.reachRows.length - 8 === 1 ? '' : 's'}
                </li>
              )}
            </ul>
          )}
        </>
      )}

      <p className={css.footnote}>
        <em>Heuristic:</em> {ENDPOINT_JOIN_M} m endpoint join treats nearby
        line ends as connected (compensates for hand-drawn snap drift).{' '}
        {EMERGENCY_REACH_M} m emergency reach is a planning-grade rule for fire
        apparatus / first-responder hose lay {'\u2014'} actual code in your
        county may demand 25-30 m. <strong>Main</strong> and{' '}
        <strong>secondary</strong> are general circulation;{' '}
        <strong>emergency access</strong> is fire/EMS only;{' '}
        <strong>service road</strong> is staff/maintenance.
      </p>
    </div>
  );
});

export default ServiceAccessContinuityCard;
