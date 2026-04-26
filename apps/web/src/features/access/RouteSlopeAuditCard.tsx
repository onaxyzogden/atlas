/**
 * §10 RouteSlopeAuditCard — per-path slope and erosion-risk audit.
 *
 * The existing SlopeWarnings is a binary >15° site-mean warning that
 * flags every path identically. This card upgrades that to a per-path,
 * per-surface audit: each DesignPath is sized for worst-case vertical
 * traverse (length × sin(siteMeanSlope)) and graded against a surface-
 * specific threshold table (paved roads vs unsurfaced trails vs
 * pedestrian paths each tolerate different grades before erosion or
 * switchbacks become necessary).
 *
 * HEURISTIC: site mean slope is taken from the terrain summary (DEM-
 * derived single number for the whole parcel) — we do not have per-
 * segment elevation samples, so the "vertical traverse" estimate
 * assumes worst-case direction (path runs perpendicular to contours).
 * Real grade along any one path will typically be lower. This is
 * decision-support for the steward, not an engineering deliverable.
 *
 * Closes manifest §10 `route-slope-conflict-detection` (P3 partial → done).
 */

import { useMemo } from 'react';
import { usePathStore, PATH_TYPE_CONFIG, type PathType, type DesignPath } from '../../store/pathStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import s from './RouteSlopeAuditCard.module.css';

interface TerrainSummary {
  elevation_max?: number;
  elevation_min?: number;
  mean_slope_deg?: number;
}

interface Props {
  projectId: string;
}

type SurfaceCategory = 'paved' | 'unsurfaced' | 'pedestrian' | 'animal';
type Band = 'safe' | 'caution' | 'risk';

interface SurfaceProfile {
  category: SurfaceCategory;
  label: string;
  /** Slope (degrees) at/below which the path is "safe" for this surface. */
  safeMaxDeg: number;
  /** Slope (degrees) above which erosion / switchback action is required. */
  riskMinDeg: number;
}

const SURFACE_BY_TYPE: Record<PathType, SurfaceProfile> = {
  // Paved / vehicular: tolerate ~8% (≈4.5°) before caution, ~12% (≈7°) before risk.
  main_road:        { category: 'paved',      label: 'Paved vehicular',  safeMaxDeg: 4.5, riskMinDeg: 7.0 },
  secondary_road:   { category: 'paved',      label: 'Paved vehicular',  safeMaxDeg: 4.5, riskMinDeg: 7.0 },
  emergency_access: { category: 'paved',      label: 'Paved vehicular',  safeMaxDeg: 4.5, riskMinDeg: 7.0 },
  service_road:     { category: 'paved',      label: 'Paved vehicular',  safeMaxDeg: 4.5, riskMinDeg: 7.0 },
  arrival_sequence: { category: 'paved',      label: 'Paved vehicular',  safeMaxDeg: 4.5, riskMinDeg: 7.0 },
  // Unsurfaced lanes / trails: ~6% (≈3.5°) safe, >10% (≈6°) erosion risk.
  trail:            { category: 'unsurfaced', label: 'Unsurfaced trail', safeMaxDeg: 3.5, riskMinDeg: 6.0 },
  farm_lane:        { category: 'unsurfaced', label: 'Unsurfaced lane',  safeMaxDeg: 3.5, riskMinDeg: 6.0 },
  // Pedestrian: ≤5° comfortable, >8° wants steps or switchbacks.
  pedestrian_path:  { category: 'pedestrian', label: 'Pedestrian',       safeMaxDeg: 5.0, riskMinDeg: 8.0 },
  quiet_route:      { category: 'pedestrian', label: 'Pedestrian',       safeMaxDeg: 5.0, riskMinDeg: 8.0 },
  // Animal corridors: livestock can manage moderate grades but mud / hoof rutting compounds erosion above 6°.
  animal_corridor:  { category: 'animal',     label: 'Animal corridor',  safeMaxDeg: 4.0, riskMinDeg: 6.5 },
  grazing_route:    { category: 'animal',     label: 'Grazing route',    safeMaxDeg: 4.0, riskMinDeg: 6.5 },
};

interface PathEval {
  path: DesignPath;
  surface: SurfaceProfile;
  band: Band;
  worstCaseVerticalM: number;
  recommendation: string;
}

const RECOMMENDATIONS: Record<SurfaceCategory, Record<Band, string>> = {
  paved: {
    safe:    'Standard surface holds. No grading required.',
    caution: 'Borderline grade — specify base prep and surface drainage swales.',
    risk:    'Cut-and-fill grading or switchback re-routing required; without it, surface ruts and runoff become inevitable.',
  },
  unsurfaced: {
    safe:    'Compacted gravel or stabilized soil holds at this grade.',
    caution: 'Add culverts at low points and waterbars every 30–40 m; consider gravel surfacing.',
    risk:    'High erosion risk — switchbacks, rolling-grade dips, or rock armor required to retain the lane.',
  },
  pedestrian: {
    safe:    'Comfortable walking grade.',
    caution: 'Add intermediate landings or shallow steps for accessibility.',
    risk:    'Switchbacks or step-and-landing sequence required for safe passage.',
  },
  animal: {
    safe:    'Acceptable for routine herd movement.',
    caution: 'Reinforce wet spots; rotate use to avoid trail incision.',
    risk:    'Excessive grade causes hoof shear and trail rutting — re-route across slope or add hardened crossings.',
  },
};

function classify(slopeDeg: number, surface: SurfaceProfile): Band {
  if (slopeDeg >= surface.riskMinDeg) return 'risk';
  if (slopeDeg >= surface.safeMaxDeg) return 'caution';
  return 'safe';
}

const BAND_LABEL: Record<Band, string> = { safe: 'Safe', caution: 'Caution', risk: 'High risk' };
const BAND_TAG_CLASS: Record<Band, string> = { safe: s.tag_safe!, caution: s.tag_caution!, risk: s.tag_risk! };
const BAND_ROW_CLASS: Record<Band, string> = { safe: s.row_safe!, caution: s.row_caution!, risk: s.row_risk! };

function fmtLength(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function fmtVertical(m: number): string {
  if (m >= 100) return `${Math.round(m)} m`;
  return `${m.toFixed(1)} m`;
}

function fmtGradePct(deg: number): string {
  return `${(Math.tan((deg * Math.PI) / 180) * 100).toFixed(1)}%`;
}

export default function RouteSlopeAuditCard({ projectId }: Props) {
  const allPaths = usePathStore((st) => st.paths);
  const paths = useMemo(() => allPaths.filter((pa) => pa.projectId === projectId), [allPaths, projectId]);
  const siteData = useSiteData(projectId);
  const terrainSummary = useMemo(
    () => (siteData ? getLayerSummary<TerrainSummary>(siteData, 'terrain_analysis') : null),
    [siteData],
  );

  const meanSlopeDeg = terrainSummary?.mean_slope_deg ?? null;

  const evals: PathEval[] = useMemo(() => {
    if (meanSlopeDeg == null) return [];
    const slopeRad = (meanSlopeDeg * Math.PI) / 180;
    const sinSlope = Math.sin(slopeRad);
    return paths.map((path) => {
      const surface = SURFACE_BY_TYPE[path.type];
      const band = classify(meanSlopeDeg, surface);
      return {
        path,
        surface,
        band,
        worstCaseVerticalM: path.lengthM * sinSlope,
        recommendation: RECOMMENDATIONS[surface.category][band],
      };
    });
  }, [paths, meanSlopeDeg]);

  const tally = useMemo(() => {
    const t = { safe: 0, caution: 0, risk: 0 };
    for (const e of evals) t[e.band] += 1;
    return t;
  }, [evals]);

  if (paths.length === 0) {
    return (
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}>Route Slope &amp; Erosion Audit</h3>
            <p className={s.cardHint}>
              Per-path grade vs surface-specific erosion thresholds. Draw a path to begin.
            </p>
          </div>
          <span className={s.heuristicBadge}>HEURISTIC</span>
        </div>
        <p className={s.empty}>No paths drawn yet — slope audit runs once routes are placed.</p>
      </div>
    );
  }

  if (meanSlopeDeg == null) {
    return (
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}>Route Slope &amp; Erosion Audit</h3>
            <p className={s.cardHint}>
              Per-path grade vs surface-specific erosion thresholds.
            </p>
          </div>
          <span className={s.heuristicBadge}>HEURISTIC</span>
        </div>
        <p className={s.empty}>
          Terrain analysis is not yet available for this project — slope audit cannot run.
          Trigger the terrain layer fetch to populate <em>mean_slope_deg</em>.
        </p>
      </div>
    );
  }

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Route Slope &amp; Erosion Audit</h3>
          <p className={s.cardHint}>
            Per-path grade against surface-specific erosion thresholds.
            Vertical estimates assume <em>worst-case direction</em> — real grade
            along a contour-following path will typically be lower.
          </p>
        </div>
        <span className={s.heuristicBadge}>HEURISTIC</span>
      </div>

      <div className={s.summaryRow}>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{meanSlopeDeg.toFixed(1)}°</span>
          <span className={s.summaryLabel}>Site Mean Slope</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{fmtGradePct(meanSlopeDeg)}</span>
          <span className={s.summaryLabel}>Equivalent Grade</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{tally.safe}</span>
          <span className={s.summaryLabel}>Safe</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{tally.caution}</span>
          <span className={s.summaryLabel}>Caution</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{tally.risk}</span>
          <span className={s.summaryLabel}>High Risk</span>
        </div>
      </div>

      <ul className={s.list}>
        {evals.map((e) => {
          const cfg = PATH_TYPE_CONFIG[e.path.type];
          return (
            <li key={e.path.id} className={`${s.row} ${BAND_ROW_CLASS[e.band]}`}>
              <div className={s.rowHead}>
                <span className={`${s.tag} ${BAND_TAG_CLASS[e.band]}`}>{BAND_LABEL[e.band]}</span>
                <span className={s.rowTitle}>{e.path.name}</span>
                <span className={s.typeBadge} style={{ borderColor: `${cfg.color}55`, color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
              <div className={s.metaRow}>
                <span className={s.metaItem}>
                  <span className={s.metaLabel}>Length</span>
                  <span className={s.metaValue}>{fmtLength(e.path.lengthM)}</span>
                </span>
                <span className={s.metaItem}>
                  <span className={s.metaLabel}>Worst-case Δh</span>
                  <span className={s.metaValue}>{fmtVertical(e.worstCaseVerticalM)}</span>
                </span>
                <span className={s.metaItem}>
                  <span className={s.metaLabel}>Surface model</span>
                  <span className={s.metaValue}>{e.surface.label}</span>
                </span>
                <span className={s.metaItem}>
                  <span className={s.metaLabel}>Threshold</span>
                  <span className={s.metaValue}>
                    safe ≤{e.surface.safeMaxDeg.toFixed(1)}° · risk ≥{e.surface.riskMinDeg.toFixed(1)}°
                  </span>
                </span>
              </div>
              <p className={s.recommendation}>{e.recommendation}</p>
            </li>
          );
        })}
      </ul>

      <p className={s.footnote}>
        Site mean slope is a single DEM-derived value for the parcel —
        per-segment elevation samples are not available, so the audit
        applies the site mean uniformly to every path. Use this as
        decision-support to flag candidates for closer field survey,
        not as engineering certification. Surface thresholds: paved
        ≤4.5° / risk ≥7° · unsurfaced ≤3.5° / risk ≥6° · pedestrian
        ≤5° / risk ≥8° · animal ≤4° / risk ≥6.5°.
      </p>
    </div>
  );
}
