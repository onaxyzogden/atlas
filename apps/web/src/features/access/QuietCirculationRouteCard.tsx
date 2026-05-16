/**
 * §10 QuietCirculationRouteCard — acoustic-separation audit for quiet_route paths.
 *
 * Quiet circulation routes (Moontrance retreat-mode path type) should be
 * physically separated from vehicle noise. For each quiet_route this card
 * samples ~12 points along the line and measures the min distance from
 * each sample to any vehicle-class line (main_road, secondary_road,
 * emergency_access, service_road). The "compromised" and "quiet" walk
 * bands are pulled per-render from project.zoneThresholds — Zone-1
 * (closeM, default 25 m) is the threshold below which a sample counts
 * as audibly compromised; Zone-2 (mediumM, default 75 m) is the
 * threshold above which a sample counts as quiet. The innermost
 * NOISY_NEAR_M band (10 m, acoustic propagation) stays a fixed module
 * constant — it's about engine presence at close range, not a
 * steward-walk band, so the steward shouldn't tune it. Per-route tier:
 *   excellent   - all samples >= mediumM (default 75 m)
 *   good        - all samples >= closeM  (default 25 m)
 *   compromised - any sample NOISY_NEAR_M..closeM
 *   noisy       - any sample <  NOISY_NEAR_M (10 m)
 *
 * Pure presentation. Reads usePathStore. No new entity types, no shared
 * math, no map overlay.
 *
 * Closes manifest item `quiet-circulation-routes` (MT partial -> done).
 */

import { memo, useMemo } from 'react';
import * as turf from '@turf/turf';
import { usePathStore, type DesignPath, type PathType } from '../../store/pathStore.js';
import {
  useProjectStore,
  getZoneThresholds,
  DEFAULT_ZONE_THRESHOLDS,
} from '../../store/projectStore.js';
import css from './QuietCirculationRouteCard.module.css';

interface Props {
  projectId: string;
}

const NOISY_TYPES: PathType[] = ['main_road', 'secondary_road', 'emergency_access', 'service_road'];
const SAMPLE_COUNT = 12;
/**
 * Acoustic-presence threshold — a sample within NOISY_NEAR_M of a
 * vehicle line is effectively *next to* engine noise. This is a
 * propagation/perception constant, not a steward-walk band, so it
 * stays literal (same treatment as LOUD_BUFFER_M / LIVESTOCK_BUFFER_M
 * elsewhere in the zoneThresholds family).
 */
const NOISY_NEAR_M = 10;
// COMPROMISED_M (Zone-1 / closeM) and QUIET_M (Zone-2 / mediumM) are
// derived per-render from project.zoneThresholds — see the component
// body below. Tune via FertilityColocationCard's "Tune zones (advanced)"
// disclosure; this card honours the same values.

type Tier = 'excellent' | 'good' | 'compromised' | 'noisy' | 'no_neighbors';

interface RouteRow {
  id: string;
  name: string;
  lengthM: number;
  tier: Tier;
  minSeparationM: number | null;
  meanSeparationM: number | null;
  compromisedPct: number;
  noisyPct: number;
}

const TIER_LABEL: Record<Tier, string> = {
  excellent: 'EXCELLENT',
  good: 'GOOD',
  compromised: 'COMPROMISED',
  noisy: 'NOISY',
  no_neighbors: 'NO ROADS',
};

function sampleAlong(path: DesignPath, count: number): [number, number][] {
  const line = turf.lineString(path.geometry.coordinates as number[][]);
  const lengthKm = turf.length(line, { units: 'kilometers' });
  if (lengthKm <= 0) return [];
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const frac = (i + 0.5) / count;
    const pt = turf.along(line, frac * lengthKm, { units: 'kilometers' });
    out.push(pt.geometry.coordinates as [number, number]);
  }
  return out;
}

function rowFor(
  quietPath: DesignPath,
  noisyPaths: DesignPath[],
  compromisedM: number,
  quietM: number,
): RouteRow {
  // Locals named to match the rest of the function body / tier table.
  const COMPROMISED_M = compromisedM;
  const QUIET_M = quietM;
  const samples = sampleAlong(quietPath, SAMPLE_COUNT);
  const noisyLines = noisyPaths.map((p) => turf.lineString(p.geometry.coordinates as number[][]));

  if (noisyLines.length === 0 || samples.length === 0) {
    return {
      id: quietPath.id,
      name: quietPath.name || 'Quiet Route',
      lengthM: quietPath.lengthM,
      tier: noisyLines.length === 0 ? 'no_neighbors' : 'excellent',
      minSeparationM: null,
      meanSeparationM: null,
      compromisedPct: 0,
      noisyPct: 0,
    };
  }

  const distances: number[] = samples.map((pt) => {
    let best = Infinity;
    for (const ln of noisyLines) {
      const d = turf.pointToLineDistance(turf.point(pt), ln, { units: 'meters' });
      if (d < best) best = d;
    }
    return best;
  });

  const minD = Math.min(...distances);
  const meanD = distances.reduce((a, b) => a + b, 0) / distances.length;
  const compromisedCount = distances.filter((d) => d < COMPROMISED_M).length;
  const noisyCount = distances.filter((d) => d < NOISY_NEAR_M).length;
  const compromisedPct = (compromisedCount / distances.length) * 100;
  const noisyPct = (noisyCount / distances.length) * 100;

  let tier: Tier;
  if (minD >= QUIET_M) tier = 'excellent';
  else if (minD >= COMPROMISED_M) tier = 'good';
  else if (minD >= NOISY_NEAR_M) tier = 'compromised';
  else tier = 'noisy';

  return {
    id: quietPath.id,
    name: quietPath.name || 'Quiet Route',
    lengthM: quietPath.lengthM,
    tier,
    minSeparationM: minD,
    meanSeparationM: meanD,
    compromisedPct,
    noisyPct,
  };
}

function formatLength(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

const TIER_CLASS: Record<Tier, string> = {
  excellent: css.tierExcellent!,
  good: css.tierGood!,
  compromised: css.tierCompromised!,
  noisy: css.tierNoisy!,
  no_neighbors: css.tierNeutral!,
};

export const QuietCirculationRouteCard = memo(function QuietCirculationRouteCard({ projectId }: Props) {
  const allPaths = usePathStore((s) => s.paths);

  // Walk thresholds pulled from per-project zoneThresholds. closeM →
  // COMPROMISED_M (Zone-1 audible band), mediumM → QUIET_M (Zone-2
  // quiet-enough-for-retreat band). Falls back to defaults for
  // detached-preview edge cases where the project record isn't found.
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const { closeM, mediumM } = project
    ? getZoneThresholds(project)
    : DEFAULT_ZONE_THRESHOLDS;
  const COMPROMISED_M = closeM;
  const QUIET_M = mediumM;

  const data = useMemo(() => {
    const quiet = allPaths.filter(
      (p) => p.projectId === projectId && p.type === 'quiet_route',
    );
    const noisy = allPaths.filter(
      (p) => p.projectId === projectId && (NOISY_TYPES as PathType[]).includes(p.type),
    );

    const rows = quiet.map((p) => rowFor(p, noisy, COMPROMISED_M, QUIET_M));
    const totalLengthM = rows.reduce((s, r) => s + r.lengthM, 0);
    const tierCounts: Record<Tier, number> = {
      excellent: 0, good: 0, compromised: 0, noisy: 0, no_neighbors: 0,
    };
    rows.forEach((r) => { tierCounts[r.tier]++; });

    return {
      rows,
      totalLengthM,
      noisyLineCount: noisy.length,
      tierCounts,
    };
  }, [allPaths, projectId, COMPROMISED_M, QUIET_M]);

  const isEmpty = data.rows.length === 0;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Quiet Circulation Audit</h3>
          <p className={css.cardHint}>
            Samples each <em>quiet route</em> at {SAMPLE_COUNT} points along its
            length and measures min distance to any vehicle-class line (main /
            secondary / emergency / service). Tiers: <strong>excellent</strong>{' '}
            ≥ {QUIET_M} m everywhere, <strong>good</strong> ≥ {COMPROMISED_M} m,{' '}
            <strong>compromised</strong> {NOISY_NEAR_M}-{COMPROMISED_M} m,{' '}
            <strong>noisy</strong> &lt; {NOISY_NEAR_M} m.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </div>

      <div className={css.stats}>
        <div className={css.stat}>
          <span className={css.statLabel}>Quiet routes</span>
          <span className={css.statVal}>{data.rows.length}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Total length</span>
          <span className={css.statVal}>{formatLength(data.totalLengthM)}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Vehicle lines</span>
          <span className={css.statVal}>{data.noisyLineCount}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Excellent / Good</span>
          <span className={css.statVal}>
            {data.tierCounts.excellent + data.tierCounts.good}/
            {data.rows.length || 0}
          </span>
        </div>
      </div>

      {isEmpty && (
        <div className={css.empty}>
          No <em>quiet route</em> paths drawn yet. Use the <strong>Path</strong>{' '}
          tool and select <em>Quiet Route</em> to plan retreat circulation
          {' \u2014 '}contemplative loops, prayer-walk corridors, or guest
          arrival paths that should stay clear of vehicle noise.
        </div>
      )}

      {!isEmpty && data.noisyLineCount === 0 && (
        <div className={css.infoLine}>
          No vehicle-class roads drawn yet, so quiet routes have no noise
          source to separate from. Audit will activate once main / secondary /
          emergency / service paths are drawn.
        </div>
      )}

      {!isEmpty && data.noisyLineCount > 0 && (
        <ul className={css.routeList}>
          {data.rows.map((r) => (
            <li key={r.id} className={`${css.routeRow} ${TIER_CLASS[r.tier]}`}>
              <div className={css.routeHead}>
                <span className={css.routeName}>{r.name}</span>
                <span className={`${css.tierChip} ${TIER_CLASS[r.tier]}`}>
                  {TIER_LABEL[r.tier]}
                </span>
              </div>
              <div className={css.routeMeta}>
                <span>{formatLength(r.lengthM)}</span>
                {r.minSeparationM != null && (
                  <>
                    <span className={css.metaSep}>{'\u00b7'}</span>
                    <span>min {Math.round(r.minSeparationM)} m</span>
                    <span className={css.metaSep}>{'\u00b7'}</span>
                    <span>mean {Math.round(r.meanSeparationM ?? 0)} m</span>
                  </>
                )}
              </div>
              {r.compromisedPct > 0 && (
                <div className={css.exposureBar}>
                  <div className={css.exposureLabel}>
                    {Math.round(r.compromisedPct)}% within {COMPROMISED_M} m
                    {r.noisyPct > 0 && (
                      <> {'\u00b7'} {Math.round(r.noisyPct)}% within {NOISY_NEAR_M} m</>
                    )}
                  </div>
                  <div className={css.exposureTrack}>
                    <div
                      className={css.exposureFill}
                      style={{ width: `${Math.min(100, r.compromisedPct)}%` }}
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className={css.footnote}>
        <em>Heuristic:</em> Distance bands ({NOISY_NEAR_M} / {COMPROMISED_M} /{' '}
        {QUIET_M} m) are planning-grade {'\u2014'} actual perceived noise depends
        on terrain barriers, vegetation buffers, vehicle volume, and time of
        day. A <strong>compromised</strong> tier means a guest walking the
        route would intermittently hear road noise; <strong>noisy</strong>{' '}
        means it sits effectively next to traffic. Consider rerouting,
        adding earth berms, or planting a windbreak hedge along compromised
        segments.
      </p>
    </div>
  );
});

export default QuietCirculationRouteCard;
