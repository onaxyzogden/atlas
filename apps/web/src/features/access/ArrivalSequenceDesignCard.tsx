import { memo, useMemo } from 'react';
import css from './ArrivalSequenceDesignCard.module.css';
import { usePathStore, type DesignPath } from '../../store/pathStore.js';
import { useStructureStore, type Structure, type StructureType } from '../../store/structureStore.js';

interface ArrivalSequenceDesignCardProps {
  projectId: string;
}

const GUEST_FACING: ReadonlySet<StructureType> = new Set<StructureType>([
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

const MILESTONE_RADIUS_M = 30;
const WALKING_PACE_MS = 1.4;
const SLOW_DRIVE_MS = 4;

type Tier = 'linear-march' | 'direct' | 'single-reveal' | 'curated' | 'crowded';

const TIER_LABEL: Record<Tier, string> = {
  'linear-march': 'Linear march',
  direct: 'Direct',
  'single-reveal': 'Single reveal',
  curated: 'Curated',
  crowded: 'Crowded',
};

const TIER_TONE: Record<Tier, 'caution' | 'good' | 'info'> = {
  'linear-march': 'caution',
  direct: 'info',
  'single-reveal': 'good',
  curated: 'good',
  crowded: 'caution',
};

function haversineM(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const c = s1 * s1 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(c)));
}

function minDistanceToPath(point: [number, number], path: DesignPath): number {
  const coords = path.geometry.coordinates as [number, number][];
  if (coords.length === 0) return Infinity;
  let min = Infinity;
  for (const c of coords) {
    const d = haversineM(point, c);
    if (d < min) min = d;
  }
  return min;
}

function endpointStraightness(path: DesignPath): number {
  const coords = path.geometry.coordinates as [number, number][];
  if (coords.length < 2 || path.lengthM <= 0) return 1;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (!first || !last) return 1;
  const straight = haversineM(first, last);
  return Math.min(1, straight / path.lengthM);
}

function classifyTier(milestoneCount: number, straightness: number, lengthM: number): Tier {
  if (milestoneCount === 0) {
    if (lengthM > 100 && straightness > 0.85) return 'linear-march';
    return 'direct';
  }
  if (milestoneCount <= 2) return 'single-reveal';
  if (milestoneCount <= 5) return 'curated';
  return 'crowded';
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const min = Math.round(seconds / 60);
  return `${min} min`;
}

function ArrivalSequenceDesignCard({ projectId }: ArrivalSequenceDesignCardProps) {
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);

  const arrivalPaths = useMemo(
    () => allPaths.filter((p) => p.projectId === projectId && p.type === 'arrival_sequence'),
    [allPaths, projectId],
  );

  const guestStructures: Structure[] = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId && GUEST_FACING.has(s.type)),
    [allStructures, projectId],
  );

  const rows = useMemo(() => {
    return arrivalPaths.map((path) => {
      const milestones = guestStructures
        .map((s) => ({ structure: s, distanceM: minDistanceToPath(s.center, path) }))
        .filter((m) => m.distanceM <= MILESTONE_RADIUS_M)
        .sort((a, b) => a.distanceM - b.distanceM);
      const straightness = endpointStraightness(path);
      const tier = classifyTier(milestones.length, straightness, path.lengthM);
      const walkSec = path.lengthM / WALKING_PACE_MS;
      const driveSec = path.lengthM / SLOW_DRIVE_MS;
      return { path, milestones, tier, straightness, walkSec, driveSec };
    });
  }, [arrivalPaths, guestStructures]);

  const summary = useMemo(() => {
    const totalLengthM = rows.reduce((sum, r) => sum + r.path.lengthM, 0);
    const totalMilestones = rows.reduce((sum, r) => sum + r.milestones.length, 0);
    const meanRevealSpacingM =
      totalMilestones > 0 ? totalLengthM / totalMilestones : null;
    return { totalLengthM, totalMilestones, meanRevealSpacingM };
  }, [rows]);

  const verdict = useMemo<{ tone: 'good' | 'caution' | 'info'; title: string; note: string } | null>(() => {
    if (rows.length === 0) return null;
    const cautions = rows.filter((r) => TIER_TONE[r.tier] === 'caution');
    if (cautions.length > 0) {
      const linearMarches = cautions.filter((r) => r.tier === 'linear-march').length;
      const crowded = cautions.filter((r) => r.tier === 'crowded').length;
      const parts: string[] = [];
      if (linearMarches > 0) parts.push(`${linearMarches} linear march${linearMarches === 1 ? '' : 'es'}`);
      if (crowded > 0) parts.push(`${crowded} crowded approach${crowded === 1 ? '' : 'es'}`);
      return {
        tone: 'caution',
        title: 'Sequence needs attention',
        note: `${parts.join(' and ')} — consider adding curated milestones, easing curvature, or splitting busy approaches.`,
      };
    }
    const curated = rows.filter((r) => r.tier === 'curated').length;
    const single = rows.filter((r) => r.tier === 'single-reveal').length;
    if (curated + single >= rows.length / 2) {
      return {
        tone: 'good',
        title: 'Reveal sequence reads cleanly',
        note: `${curated + single} of ${rows.length} arrival path${rows.length === 1 ? '' : 's'} land in the curated or single-reveal tier.`,
      };
    }
    return {
      tone: 'info',
      title: 'Direct approaches dominate',
      note: 'No reveal milestones placed near the arrival path. Direct is appropriate for working farms; consider sequencing if guests visit.',
    };
  }, [rows]);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h4 className={css.cardTitle}>Arrival sequence design</h4>
          <p className={css.cardHint}>
            For each arrival-type path, counts guest-facing structures within {MILESTONE_RADIUS_M} m as reveal
            milestones, classifies the approach tier from milestone count and endpoint straightness, and surfaces
            walking + slow-drive travel time.
          </p>
        </div>
        <span className={css.modeBadge}>HEURISTIC</span>
      </div>

      {arrivalPaths.length === 0 ? (
        <div className={css.empty}>
          No arrival-sequence paths drawn for this project. Use the Arrival Sequence path type to define the
          guest entry flow, then reveal milestones will appear here.
        </div>
      ) : (
        <>
          {verdict && (
            <div
              className={[
                css.verdictBanner,
                verdict.tone === 'good' ? css.verdictGood : verdict.tone === 'caution' ? css.verdictCaution : css.verdictInfo,
              ].join(' ')}
            >
              <div className={css.verdictTitle}>{verdict.title}</div>
              <div className={css.verdictNote}>{verdict.note}</div>
            </div>
          )}

          <div className={css.headlineGrid}>
            <div className={css.headlineStat}>
              <span className={css.statValue}>{rows.length}</span>
              <span className={css.statLabel}>Arrival paths</span>
            </div>
            <div className={css.headlineStat}>
              <span className={css.statValue}>
                {summary.totalLengthM > 1000
                  ? `${(summary.totalLengthM / 1000).toFixed(2)} km`
                  : `${Math.round(summary.totalLengthM)} m`}
              </span>
              <span className={css.statLabel}>Total length</span>
            </div>
            <div className={css.headlineStat}>
              <span className={css.statValue}>{summary.totalMilestones}</span>
              <span className={css.statLabel}>Reveal milestones</span>
            </div>
            <div className={css.headlineStat}>
              <span className={css.statValue}>
                {summary.meanRevealSpacingM != null ? `${Math.round(summary.meanRevealSpacingM)} m` : '—'}
              </span>
              <span className={css.statLabel}>Mean reveal spacing</span>
            </div>
          </div>

          <div className={css.sectionLabel}>Per-path reveal sequence</div>
          <div className={css.rowList}>
            {rows.map(({ path, milestones, tier, straightness, walkSec, driveSec }) => (
              <div key={path.id} className={[css.pathRow, css[`tier-${tier}`] ?? ''].join(' ')}>
                <div className={css.rowHead}>
                  <div className={css.rowMain}>
                    <span className={css.pathName}>{path.name}</span>
                    <span className={css.pathLength}>
                      {path.lengthM > 1000 ? `${(path.lengthM / 1000).toFixed(2)} km` : `${Math.round(path.lengthM)} m`}
                    </span>
                  </div>
                  <span className={[css.tierBadge, css[`tierBadge-${tier}`] ?? ''].join(' ')}>
                    {TIER_LABEL[tier]}
                  </span>
                </div>
                <div className={css.rowMetrics}>
                  <div className={css.metricBlock}>
                    <span className={css.metricLabel}>Milestones</span>
                    <span className={css.metricValue}>{milestones.length}</span>
                  </div>
                  <div className={css.metricBlock}>
                    <span className={css.metricLabel}>Walk</span>
                    <span className={css.metricValue}>{formatTime(walkSec)}</span>
                  </div>
                  <div className={css.metricBlock}>
                    <span className={css.metricLabel}>Slow drive</span>
                    <span className={css.metricValue}>{formatTime(driveSec)}</span>
                  </div>
                  <div className={css.metricBlock}>
                    <span className={css.metricLabel}>Straightness</span>
                    <span className={css.metricValue}>{(straightness * 100).toFixed(0)}%</span>
                  </div>
                </div>
                {milestones.length > 0 && (
                  <div className={css.milestoneList}>
                    {milestones.map((m, i) => (
                      <span key={m.structure.id} className={css.milestoneChip}>
                        <span className={css.milestoneIndex}>{i + 1}</span>
                        {m.structure.name}
                        <span className={css.milestoneDist}> · {Math.round(m.distanceM)}m</span>
                      </span>
                    ))}
                  </div>
                )}
                {milestones.length === 0 && tier === 'linear-march' && (
                  <div className={css.cautionNote}>
                    Path is {(straightness * 100).toFixed(0)}% straight with no guest-facing structures within {MILESTONE_RADIUS_M} m.
                    Consider routing past a pavilion, prayer space, or lookout to break the march.
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={css.assumption}>
            Milestone radius {MILESTONE_RADIUS_M} m around each path coordinate. Walking pace
            {' '}{WALKING_PACE_MS} m/s ({Math.round(WALKING_PACE_MS * 3.6 * 10) / 10} km/h); slow drive
            {' '}{SLOW_DRIVE_MS} m/s. Tier rules: 0 milestones + length &gt; 100 m + straightness &gt; 85% =
            linear march; 1–2 = single reveal; 3–5 = curated; 6+ = crowded. Guest-facing structures =
            pavilion, prayer space, classroom, bathhouse, lookout, fire circle, cabin, yurt, tent glamping.
            Distance is path-coord min-distance, not perpendicular projection — slight overestimate for
            sparsely-sampled paths.
          </div>
        </>
      )}
    </div>
  );
}

export default memo(ArrivalSequenceDesignCard);
