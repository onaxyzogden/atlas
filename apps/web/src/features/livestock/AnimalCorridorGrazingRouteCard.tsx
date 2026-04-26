/**
 * §11 AnimalCorridorGrazingRouteCard — animal-corridor / grazing-route audit.
 *
 * Pairs pathStore entries of type `animal_corridor` and `grazing_route` with
 * drawn paddocks (livestockStore). For each route, counts how many paddocks
 * sit within 30 m of the line (via turf.pointToLineDistance from each
 * paddock centroid). A grazing route serving < 2 paddocks is flagged as
 * "single-end" (no rotation chain); paddocks served by zero routes are
 * counted as "isolated".
 *
 * Pure presentation. Reads usePathStore + useLivestockStore. No new entity
 * types, no shared math, no map overlay.
 *
 * Closes manifest item `animal-corridor-grazing-route` (P2 partial -> done).
 */

import { memo, useMemo } from 'react';
import * as turf from '@turf/turf';
import { usePathStore, type DesignPath } from '../../store/pathStore.js';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import css from './AnimalCorridorGrazingRouteCard.module.css';

interface Props {
  projectId: string;
}

const PROXIMITY_M = 30;

interface RouteRow {
  id: string;
  name: string;
  type: 'animal_corridor' | 'grazing_route';
  lengthM: number;
  servedPaddocks: { id: string; name: string; distM: number }[];
  flag: 'ok' | 'single_end' | 'isolated';
}

function paddockCentroid(p: Paddock): [number, number] | null {
  try {
    const f = turf.polygon(p.geometry.coordinates as number[][][]);
    const c = turf.centroid(f);
    const [lng, lat] = c.geometry.coordinates as [number, number];
    return [lng, lat];
  } catch {
    return null;
  }
}

function rowFor(path: DesignPath, paddocks: Paddock[]): RouteRow {
  const line = turf.lineString(path.geometry.coordinates as number[][]);
  const served: RouteRow['servedPaddocks'] = [];
  for (const p of paddocks) {
    const c = paddockCentroid(p);
    if (!c) continue;
    const distM = turf.pointToLineDistance(turf.point(c), line, { units: 'meters' });
    if (distM <= PROXIMITY_M) {
      served.push({ id: p.id, name: p.name, distM: Math.round(distM) });
    }
  }
  served.sort((a, b) => a.distM - b.distM);

  const isGrazing = path.type === 'grazing_route';
  let flag: RouteRow['flag'] = 'ok';
  if (served.length === 0) flag = 'isolated';
  else if (isGrazing && served.length < 2) flag = 'single_end';

  return {
    id: path.id,
    name: path.name || (isGrazing ? 'Grazing Route' : 'Animal Corridor'),
    type: path.type as RouteRow['type'],
    lengthM: path.lengthM,
    servedPaddocks: served,
    flag,
  };
}

function formatLength(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

const FLAG_LABEL: Record<RouteRow['flag'], string> = {
  ok: 'OK',
  single_end: 'SINGLE-END',
  isolated: 'ISOLATED',
};

export const AnimalCorridorGrazingRouteCard = memo(function AnimalCorridorGrazingRouteCard({ projectId }: Props) {
  const allPaths = usePathStore((s) => s.paths);
  const allPaddocks = useLivestockStore((s) => s.paddocks);

  const data = useMemo(() => {
    const paths = allPaths.filter(
      (p) => p.projectId === projectId && (p.type === 'animal_corridor' || p.type === 'grazing_route'),
    );
    const paddocks = allPaddocks.filter((p) => p.projectId === projectId);
    const rows = paths.map((p) => rowFor(p, paddocks));

    const corridors = rows.filter((r) => r.type === 'animal_corridor');
    const grazings = rows.filter((r) => r.type === 'grazing_route');
    const totalLengthM = rows.reduce((sum, r) => sum + r.lengthM, 0);

    const servedSet = new Set<string>();
    rows.forEach((r) => r.servedPaddocks.forEach((s) => servedSet.add(s.id)));
    const isolatedPaddocks = paddocks.filter((p) => !servedSet.has(p.id));

    const flaggedCount = rows.filter((r) => r.flag !== 'ok').length;

    return {
      rows,
      corridors,
      grazings,
      paddockCount: paddocks.length,
      totalLengthM,
      servedCount: servedSet.size,
      isolatedPaddocks,
      flaggedCount,
    };
  }, [allPaths, allPaddocks, projectId]);

  const isEmpty = data.rows.length === 0;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Animal Corridor &amp; Grazing Route Audit</h3>
          <p className={css.cardHint}>
            Pairs <em>animal corridor</em> and <em>grazing route</em> path
            types with drawn paddocks. A paddock counts as <em>served</em> when
            its centroid sits within {PROXIMITY_M} m of the route line. Grazing
            routes serving fewer than 2 paddocks are flagged as{' '}
            <em>single-end</em> (no rotation chain).
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </div>

      <div className={css.stats}>
        <div className={css.stat}>
          <span className={css.statLabel}>Corridors</span>
          <span className={css.statVal}>{data.corridors.length}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Grazing routes</span>
          <span className={css.statVal}>{data.grazings.length}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Total length</span>
          <span className={css.statVal}>{formatLength(data.totalLengthM)}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Paddocks served</span>
          <span className={css.statVal}>
            {data.servedCount}/{data.paddockCount || 0}
          </span>
        </div>
      </div>

      {isEmpty && (
        <div className={css.empty}>
          No <em>animal corridor</em> or <em>grazing route</em> paths drawn yet.
          Use the <strong>Path</strong> tool on the Map and select{' '}
          <em>Animal Corridor</em> or <em>Grazing Route</em> as the path type
          to plan livestock movement between paddocks, water, and shelter.
        </div>
      )}

      {!isEmpty && (
        <ul className={css.routeList}>
          {data.rows.map((r) => (
            <li
              key={r.id}
              className={`${css.routeRow} ${r.flag === 'ok' ? css.flagOk : r.flag === 'single_end' ? css.flagSingle : css.flagIsolated}`}
            >
              <div className={css.routeHead}>
                <div className={css.routeIdent}>
                  <span className={css.routeName}>{r.name}</span>
                  <span className={css.routeType}>
                    {r.type === 'animal_corridor' ? 'Corridor' : 'Grazing'}
                  </span>
                </div>
                <span
                  className={`${css.flagChip} ${r.flag === 'ok' ? css.flagChipOk : r.flag === 'single_end' ? css.flagChipSingle : css.flagChipIsolated}`}
                >
                  {FLAG_LABEL[r.flag]}
                </span>
              </div>
              <div className={css.routeMeta}>
                <span className={css.metaItem}>{formatLength(r.lengthM)}</span>
                <span className={css.metaSep}>{'\u00b7'}</span>
                <span className={css.metaItem}>
                  {r.servedPaddocks.length} paddock
                  {r.servedPaddocks.length === 1 ? '' : 's'} within{' '}
                  {PROXIMITY_M} m
                </span>
              </div>
              {r.servedPaddocks.length > 0 && (
                <div className={css.paddockChips}>
                  {r.servedPaddocks.slice(0, 6).map((p) => (
                    <span key={p.id} className={css.paddockChip}>
                      {p.name} <span className={css.chipDist}>{p.distM} m</span>
                    </span>
                  ))}
                  {r.servedPaddocks.length > 6 && (
                    <span className={css.paddockMore}>
                      +{r.servedPaddocks.length - 6} more
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isEmpty && data.isolatedPaddocks.length > 0 && (
        <div className={css.warningBox}>
          <strong>{data.isolatedPaddocks.length} paddock
          {data.isolatedPaddocks.length === 1 ? '' : 's'}</strong>{' '}
          {data.isolatedPaddocks.length === 1 ? 'is' : 'are'} not within{' '}
          {PROXIMITY_M} m of any animal corridor or grazing route. Stewards
          will need to drive or hand-walk livestock to reach{' '}
          {data.isolatedPaddocks.slice(0, 4).map((p) => p.name).join(', ')}
          {data.isolatedPaddocks.length > 4 ? ` and ${data.isolatedPaddocks.length - 4} more` : ''}.
        </div>
      )}

      <p className={css.footnote}>
        <em>Heuristic:</em> {PROXIMITY_M} m proximity is a planning-grade
        rule of thumb {'\u2014'} actual livestock-driving practice depends on
        terrain, fencing, and species temperament. <strong>Animal corridor</strong>{' '}
        paths are typically wildlife or cross-property movement; <strong>grazing
        routes</strong> are intended to chain paddocks for rotational moves.
        Refine paddock or path geometry on the Map if the served-count looks
        wrong.
      </p>
    </div>
  );
});

export default AnimalCorridorGrazingRouteCard;
