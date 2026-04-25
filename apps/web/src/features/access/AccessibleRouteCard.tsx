/**
 * AccessibleRouteCard — §10 accessible-route-planning surface.
 *
 * Closes the §10 spec line "Accessible route planning" by classifying
 * each guest-circulation path against an ADA-flavored heuristic
 * (running grade ≤ 5% / cross-grade implicit, firm surface, adequate
 * width). The result is a per-path rating:
 *
 *   - accessible   — firm-surface route on terrain mean slope ≤ 5%
 *   - conditional  — firm route on 5–8.33% slope, or trail on flat
 *                    terrain (surface variability still a concern)
 *   - not_accessible — terrain >8.33% (1:12) or trail on rolling ground
 *
 * Animal corridors, grazing routes, emergency access, and farm lanes
 * are excluded from the rollup — they are not guest-mobility surfaces
 * and the spec calls out not to conflate accessible routes with
 * generic pedestrian paths (see CONTEXT.md gotcha).
 *
 * Pure heuristic — derives from `pathStore` `type`/`lengthM` and the
 * existing `terrain_analysis.mean_slope_deg` site summary already used
 * by `SlopeWarnings`. No per-segment slope (we only have site-wide
 * mean), no surface field on `DesignPath`, no width field. Treat the
 * rating as a steward pre-flight, not a code-compliant ADA audit.
 *
 * Spec: §10 accessible-route-planning (featureManifest).
 */

import { useMemo } from 'react';
import type { DesignPath, PathType } from '../../store/pathStore.js';
import { PATH_TYPE_CONFIG } from '../../store/pathStore.js';
import p from '../../styles/panel.module.css';
import s from './AccessPanel.module.css';

interface Props {
  paths: DesignPath[];
  terrainSummary: { elevation_max?: number; elevation_min?: number; mean_slope_deg?: number } | null;
}

/**
 * Path types that carry guest / mobility-impaired traffic and should
 * be evaluated for accessibility. Ordered by typical priority for an
 * accessible primary path (firm wide road first, casual trail last).
 */
const GUEST_TYPES: ReadonlySet<PathType> = new Set<PathType>([
  'main_road',
  'secondary_road',
  'service_road',
  'pedestrian_path',
  'arrival_sequence',
  'quiet_route',
  'trail',
]);

/**
 * Surface assumption per path type. Used as a coarse firm/variable
 * proxy until `DesignPath` carries an explicit surface field.
 */
const SURFACE_ASSUMED: Record<PathType, 'firm' | 'variable' | 'na'> = {
  main_road: 'firm',
  secondary_road: 'firm',
  service_road: 'firm',
  pedestrian_path: 'firm',
  arrival_sequence: 'firm',
  quiet_route: 'firm',
  trail: 'variable',
  emergency_access: 'na',
  farm_lane: 'na',
  animal_corridor: 'na',
  grazing_route: 'na',
};

/**
 * ADA running-slope thresholds in degrees. 5% ≈ 2.862° and 8.33% (1:12)
 * ≈ 4.764°. We use degrees here because that's the unit terrain
 * summaries report; convert mentally as needed when reading.
 */
const FLAT_LIMIT_DEG = 2.862;     // 5% running slope — accessible primary path
const RAMP_LIMIT_DEG = 4.764;     // 8.33% — short ramps with handrails

type Rating = 'accessible' | 'conditional' | 'not_accessible';

interface RouteRating {
  path: DesignPath;
  rating: Rating;
  reason: string;
}

function ratePath(path: DesignPath, meanSlopeDeg: number): RouteRating {
  const surface = SURFACE_ASSUMED[path.type];
  // Should be filtered upstream, but defensive:
  if (surface === 'na') {
    return { path, rating: 'not_accessible', reason: 'Non-guest route type.' };
  }
  if (meanSlopeDeg > RAMP_LIMIT_DEG) {
    return {
      path,
      rating: 'not_accessible',
      reason: `Site mean slope ${meanSlopeDeg.toFixed(1)}\u00B0 (\u2248${(Math.tan(meanSlopeDeg * Math.PI / 180) * 100).toFixed(1)}%) exceeds 8.33% \u2014 grading or switchbacks required.`,
    };
  }
  if (meanSlopeDeg > FLAT_LIMIT_DEG) {
    return {
      path,
      rating: 'conditional',
      reason: surface === 'variable'
        ? `Trail on rolling ground (${meanSlopeDeg.toFixed(1)}\u00B0 mean) \u2014 surface plus grade likely block wheeled access.`
        : `Slope ${meanSlopeDeg.toFixed(1)}\u00B0 is between 5% and 8.33% \u2014 needs ramp segments with handrails to stay accessible.`,
    };
  }
  if (surface === 'variable') {
    return {
      path,
      rating: 'conditional',
      reason: 'Trail on flat ground \u2014 grade is fine, but loose / uneven surface still a barrier for wheelchairs.',
    };
  }
  return {
    path,
    rating: 'accessible',
    reason: `Firm-surface route on ${meanSlopeDeg.toFixed(1)}\u00B0 (\u2264 5%) terrain \u2014 likely clears ADA running-grade.`,
  };
}

function RatingBadge({ rating }: { rating: Rating }) {
  const cls =
    rating === 'accessible' ? s.accessibleBadge_yes
    : rating === 'conditional' ? s.accessibleBadge_maybe
    : s.accessibleBadge_no;
  const label =
    rating === 'accessible' ? 'Accessible'
    : rating === 'conditional' ? 'Conditional'
    : 'Not accessible';
  return <span className={`${s.accessibleBadge} ${cls}`}>{label}</span>;
}

export default function AccessibleRouteCard({ paths, terrainSummary }: Props) {
  const guestPaths = useMemo(
    () => paths.filter((pa) => GUEST_TYPES.has(pa.type)),
    [paths],
  );

  const ratings = useMemo<RouteRating[]>(() => {
    if (!terrainSummary || terrainSummary.mean_slope_deg == null) return [];
    const slope = terrainSummary.mean_slope_deg;
    return guestPaths.map((pa) => ratePath(pa, slope));
  }, [guestPaths, terrainSummary]);

  // Empty: no terrain analysis run yet
  if (!terrainSummary || terrainSummary.mean_slope_deg == null) {
    return (
      <div>
        <div className={p.sectionLabel}>Accessible Routes</div>
        <div className={s.accessibleEmpty}>
          Site terrain analysis hasn{'\u2019'}t run yet {'\u2014'} accessibility
          rating depends on mean slope. Run Site Assessment (Section 4) to
          populate <em>terrain_analysis</em>.
        </div>
      </div>
    );
  }

  // Empty: no guest-circulation paths drawn
  if (guestPaths.length === 0) {
    return (
      <div>
        <div className={p.sectionLabel}>Accessible Routes</div>
        <div className={s.accessibleEmpty}>
          No guest-circulation paths drawn yet. Draw a main road, pedestrian
          path, or arrival sequence and accessibility ratings will surface
          here.
        </div>
      </div>
    );
  }

  const counts = ratings.reduce<Record<Rating, number>>(
    (acc, r) => {
      acc[r.rating] = (acc[r.rating] ?? 0) + 1;
      return acc;
    },
    { accessible: 0, conditional: 0, not_accessible: 0 },
  );

  return (
    <div>
      <div className={p.sectionLabel}>
        Accessible Routes {'\u00B7'}{' '}
        <span style={{ opacity: 0.65, fontWeight: 400 }}>
          {counts.accessible} accessible {'\u00B7'} {counts.conditional} conditional {'\u00B7'} {counts.not_accessible} not
        </span>
      </div>
      {ratings.map((r) => {
        const cfg = PATH_TYPE_CONFIG[r.path.type];
        return (
          <div key={r.path.id} className={s.accessibleRow}>
            <div className={s.accessibleHead}>
              <span className={p.swatchLine} style={{ background: r.path.color ?? cfg.color }} />
              <div className={s.accessibleName}>{r.path.name}</div>
              <RatingBadge rating={r.rating} />
            </div>
            <div className={s.accessibleNote}>
              {cfg.label} {'\u00B7'} {r.path.lengthM > 1000 ? `${(r.path.lengthM / 1000).toFixed(1)} km` : `${Math.round(r.path.lengthM)} m`} {'\u2014'} {r.reason}
            </div>
          </div>
        );
      })}
      <div className={s.accessibleFootnote}>
        Heuristic only. Uses site-wide mean slope, not per-segment grade,
        and infers surface from path type (no surface field on paths
        yet). For ADA compliance, verify running slope, cross slope,
        width, and surface firmness on every segment in the field.
      </div>
    </div>
  );
}
