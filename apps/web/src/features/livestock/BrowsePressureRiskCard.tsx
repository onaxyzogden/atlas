/**
 * §11 BrowsePressureRiskCard — combined browse-pressure / overgrazing audit.
 *
 * Wraps the existing livestockAnalysis helpers (computeForageQuality,
 * computeRecommendedStocking, computeOvergrazingRisk, computeRecoveryStatus)
 * into a per-paddock browse-pressure ranking. The HerdRotationDashboard
 * already has these signals but only as a single-line "high stocking
 * pressure on X, Y, Z" alert — this card surfaces every paddock with
 * its forage quality, recommended-vs-actual stocking ratio, recovery
 * status, and a combined tier so stewards can see *which* paddocks are
 * being pushed and by how much.
 *
 * Combined tier:
 *   high      - overgrazing.high OR (overgrazing.moderate AND recovery.overdue)
 *   elevated  - overgrazing.moderate OR recovery.overdue
 *   ok        - everything else
 *
 * Pure presentation. Reads useLivestockStore + useSiteData for forage
 * inputs (slope, growing season). No new entity types, no shared math
 * (uses existing helpers as-is), no map overlay.
 *
 * Closes manifest item `browse-pressure-overgrazing-risk` (P3 partial -> done).
 */

import { memo, useMemo } from 'react';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import {
  computeForageQuality,
  computeRecommendedStocking,
  computeOvergrazingRisk,
  computeRecoveryStatus,
  type ForageQuality,
  type RiskLevel,
  type RecoveryStatus,
} from './livestockAnalysis.js';
import { LIVESTOCK_SPECIES } from './speciesData.js';
import css from './BrowsePressureRiskCard.module.css';

interface Props {
  projectId: string;
}

interface ClimateSummary {
  growing_season_days?: number;
  annual_precip_mm?: number;
}
interface ElevationSummary {
  mean_slope_deg?: number;
}

type Tier = 'ok' | 'elevated' | 'high';

interface PressureRow {
  paddockId: string;
  paddockName: string;
  speciesEmoji: string;
  forage: ForageQuality;
  recommendedDensity: number;
  actualDensity: number | null;
  overgrazing: RiskLevel;
  recovery: RecoveryStatus;
  tier: Tier;
}

const TIER_LABEL: Record<Tier, string> = {
  ok: 'OK',
  elevated: 'ELEVATED',
  high: 'HIGH',
};
const TIER_CLASS: Record<Tier, string> = {
  ok: css.tierOk ?? '',
  elevated: css.tierElevated ?? '',
  high: css.tierHigh ?? '',
};

const FORAGE_LABEL: Record<ForageQuality['quality'], string> = {
  high: 'High',
  good: 'Good',
  moderate: 'Moderate',
  poor: 'Poor',
};

function speciesEmoji(p: Paddock): string {
  if (p.species.length === 0) return '\u2014';
  return p.species
    .slice(0, 3)
    .map((sp) => LIVESTOCK_SPECIES[sp]?.icon ?? '?')
    .join(' ');
}

function combinedTier(over: RiskLevel, recov: RecoveryStatus): Tier {
  if (over.risk === 'high') return 'high';
  if (over.risk === 'moderate' && recov.status === 'overdue') return 'high';
  if (over.risk === 'moderate' || recov.status === 'overdue') return 'elevated';
  return 'ok';
}

export const BrowsePressureRiskCard = memo(function BrowsePressureRiskCard({ projectId }: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const siteData = useSiteData(projectId);

  const data = useMemo(() => {
    const paddocks = allPaddocks.filter((p) => p.projectId === projectId);
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const elev = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const slopeDeg = elev?.mean_slope_deg ?? 3;
    const growDays = climate?.growing_season_days ?? 150;

    const rows: PressureRow[] = paddocks.map((p) => {
      const forage = computeForageQuality(2, 20, slopeDeg, growDays);
      const primarySpecies = p.species[0] ?? 'cattle';
      const recommendedDensity = computeRecommendedStocking(primarySpecies, forage);
      const overgrazing = computeOvergrazingRisk(p, recommendedDensity);
      const recovery = computeRecoveryStatus(p);
      return {
        paddockId: p.id,
        paddockName: p.name,
        speciesEmoji: speciesEmoji(p),
        forage,
        recommendedDensity,
        actualDensity: p.stockingDensity,
        overgrazing,
        recovery,
        tier: combinedTier(overgrazing, recovery),
      };
    });

    rows.sort((a, b) => {
      const order: Record<Tier, number> = { high: 0, elevated: 1, ok: 2 };
      const t = order[a.tier] - order[b.tier];
      if (t !== 0) return t;
      return b.overgrazing.ratio - a.overgrazing.ratio;
    });

    const tierCounts: Record<Tier, number> = { ok: 0, elevated: 0, high: 0 };
    rows.forEach((r) => { tierCounts[r.tier]++; });

    const overdueCount = rows.filter((r) => r.recovery.status === 'overdue').length;
    const noStockingCount = rows.filter((r) => r.actualDensity == null).length;

    return {
      rows,
      tierCounts,
      overdueCount,
      noStockingCount,
      hasContext: siteData != null,
      slopeDeg,
      growDays,
    };
  }, [allPaddocks, siteData, projectId]);

  const isEmpty = data.rows.length === 0;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Browse Pressure &amp; Overgrazing Risk</h3>
          <p className={css.cardHint}>
            Per-paddock combined risk: <strong>HIGH</strong> when stocking
            exceeds 1.2{'\u00d7'} the forage-adjusted recommendation, OR
            moderate stocking on an overdue paddock. <strong>ELEVATED</strong>{' '}
            for either signal alone. Forage quality from site slope ({data.slopeDeg.toFixed(1)}{'\u00b0'})
            and growing season ({Math.round(data.growDays)} days).
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </div>

      <div className={css.stats}>
        <div className={css.stat}>
          <span className={css.statLabel}>Paddocks</span>
          <span className={css.statVal}>{data.rows.length}</span>
        </div>
        <div className={`${css.stat} ${css.statHigh}`}>
          <span className={css.statLabel}>High</span>
          <span className={css.statVal}>{data.tierCounts.high}</span>
        </div>
        <div className={`${css.stat} ${css.statElevated}`}>
          <span className={css.statLabel}>Elevated</span>
          <span className={css.statVal}>{data.tierCounts.elevated}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Overdue rest</span>
          <span className={css.statVal}>{data.overdueCount}</span>
        </div>
      </div>

      {isEmpty && (
        <div className={css.empty}>
          No paddocks drawn for this project yet. Use the <strong>Paddock</strong>{' '}
          tool on the Map to draw grazing cells, then assign species and
          stocking density to activate this audit.
        </div>
      )}

      {!isEmpty && (
        <ul className={css.rowList}>
          {data.rows.map((r) => {
            const ratioPct = r.actualDensity != null && r.recommendedDensity > 0
              ? Math.round(r.overgrazing.ratio * 100)
              : null;
            return (
              <li key={r.paddockId} className={`${css.row} ${TIER_CLASS[r.tier]}`}>
                <div className={css.rowHead}>
                  <div className={css.rowIdent}>
                    <span className={css.rowName}>{r.paddockName}</span>
                    <span className={css.rowSpecies}>{r.speciesEmoji}</span>
                  </div>
                  <span className={`${css.tierChip} ${TIER_CLASS[r.tier]}`}>
                    {TIER_LABEL[r.tier]}
                  </span>
                </div>
                <div className={css.metrics}>
                  <div className={css.metric}>
                    <span className={css.metricLabel}>Forage</span>
                    <span className={css.metricVal}>{FORAGE_LABEL[r.forage.quality]}</span>
                  </div>
                  <div className={css.metric}>
                    <span className={css.metricLabel}>Recommended</span>
                    <span className={css.metricVal}>
                      {r.recommendedDensity.toFixed(1)} hd/ha
                    </span>
                  </div>
                  <div className={css.metric}>
                    <span className={css.metricLabel}>Actual</span>
                    <span className={css.metricVal}>
                      {r.actualDensity != null ? `${r.actualDensity} hd/ha` : '\u2014'}
                    </span>
                  </div>
                  <div className={css.metric}>
                    <span className={css.metricLabel}>Recovery</span>
                    <span className={css.metricVal}>
                      {r.recovery.daysRested}/{r.recovery.requiredDays} d
                    </span>
                  </div>
                </div>
                {ratioPct != null && (
                  <div className={css.ratioBar}>
                    <div className={css.ratioLabel}>
                      Stocking pressure: <strong>{ratioPct}%</strong> of recommended
                      {r.recovery.status === 'overdue' && (
                        <> {'\u00b7'} <span className={css.overdueTag}>overdue rest</span></>
                      )}
                    </div>
                    <div className={css.ratioTrack}>
                      <div
                        className={`${css.ratioFill} ${ratioPct > 120 ? css.ratioHigh : ratioPct > 100 ? css.ratioModerate : css.ratioOk}`}
                        style={{ width: `${Math.min(150, ratioPct) / 1.5}%` }}
                      />
                      <div className={css.ratioMark} style={{ left: `${100 / 1.5}%` }} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!isEmpty && data.noStockingCount > 0 && (
        <div className={css.infoLine}>
          {data.noStockingCount} paddock{data.noStockingCount === 1 ? '' : 's'}{' '}
          without a stocking-density entry {'\u2014'} the overgrazing ratio
          can{'\u2019'}t be evaluated until you set hd/ha on the paddock.
        </div>
      )}

      <p className={css.footnote}>
        <em>Heuristic:</em> Forage quality is approximated from organic
        matter (assumed 2%), canopy (assumed 20%), site slope, and growing
        season. <strong>Recommended stocking</strong> = species default{' '}
        {'\u00d7'} forage multiplier (high 1.1, good 1.0, moderate 0.75,
        poor 0.5). <strong>Recovery</strong> = days since paddock updated /
        max species recovery days. The combined tier is a planning prompt,
        not a yield prediction {'\u2014'} actual carrying capacity depends
        on real soil tests, observed pasture cover, and weather.
      </p>
    </div>
  );
});

export default BrowsePressureRiskCard;
