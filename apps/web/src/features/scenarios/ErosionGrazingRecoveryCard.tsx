/**
 * §16 ErosionGrazingRecoveryCard — site-level erosion risk, grazing pressure
 * overlap, and recovery-to-baseline timeline.
 *
 * Per-paddock heuristic combines:
 *   - Erosion risk: slope × hydrologic group × (1 - canopy) × (1 - OM/10)
 *   - Grazing pressure: stockingDensity / recommendedDensity (forage-adjusted)
 *   - Compound risk band: low | moderate | high | critical (slot the worst)
 *   - Recovery-to-baseline timeline (years): function of (rest debt + erosion
 *     severity), bounded 0.5y..6y so the visual stays meaningful.
 *
 * Pure presentation — re-uses `computeForageQuality`,
 * `computeRecommendedStocking`, `computeRecoveryStatus` already in the app.
 * No shared-package math, no new entity types, no map overlays.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import {
  computeForageQuality,
  computeRecommendedStocking,
  computeRecoveryStatus,
  type ForageQuality,
} from '../livestock/livestockAnalysis.js';
import { LIVESTOCK_SPECIES } from '../livestock/speciesData.js';
import css from './ErosionGrazingRecoveryCard.module.css';

/* ── Site-data summary types ───────────────────────────────────────────── */

interface ClimateSummary {
  annual_precip_mm?: number;
  growing_season_days?: number;
}
interface SoilsSummary {
  organic_matter_pct?: number | string;
  hydrologic_group?: string;
}
interface ElevationSummary {
  mean_slope_deg?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
}

interface Props {
  project: LocalProject;
}

/* ── Heuristic constants ───────────────────────────────────────────────── */

/** Hydrologic-group erosion weight — D drains poorest, erodes most. */
const GROUP_EROSION_WEIGHT: Record<string, number> = {
  A: 0.4, B: 0.65, C: 0.85, D: 1.0,
};

/** Slope at which erosion risk is considered fully-loaded (degrees). */
const SLOPE_FULL_RISK_DEG = 25;

/** Recovery-to-baseline ceiling (years) — caps the timeline so the bar
 *  never claims a site is decades from recovery. Multi-decade restoration
 *  needs intervention design, not a heuristic. */
const RECOVERY_YEARS_MAX = 6;

/** Recovery-to-baseline floor (years) — even a healthy paddock takes a
 *  rotation cycle to fully reset. */
const RECOVERY_YEARS_MIN = 0.5;

type RiskBand = 'low' | 'moderate' | 'high' | 'critical';

interface PaddockRow {
  paddockId: string;
  paddockName: string;
  areaHa: number;
  primarySpeciesLabel: string;
  /** 0-100 erosion risk score from site environment. */
  erosionScore: number;
  /** Stocking ratio: actual / recommended — >1 is overgrazing pressure. */
  stockingRatio: number;
  /** Days behind required rest (0 = on cycle, +N = overdue by N days). */
  restDebtDays: number;
  /** Compound risk band combining the three. */
  riskBand: RiskBand;
  /** Years to baseline at adjusted-stocking discipline (bounded). */
  recoveryYears: number;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function bandFromScores(erosionScore: number, stockingRatio: number, restDebtDays: number): RiskBand {
  // Critical: high erosion AND active overgrazing
  if (erosionScore >= 70 && stockingRatio >= 1.2) return 'critical';
  if (erosionScore >= 70 || stockingRatio >= 1.5 || restDebtDays >= 60) return 'high';
  if (erosionScore >= 45 || stockingRatio >= 1.0 || restDebtDays >= 20) return 'moderate';
  return 'low';
}

function recoveryYearsForRow(erosionScore: number, stockingRatio: number, restDebtDays: number): number {
  // Base = 0.5y. Add up to 3y for erosion, up to 1.5y for over-stocking,
  // up to 1y for rest debt. Cap at RECOVERY_YEARS_MAX.
  let years = RECOVERY_YEARS_MIN;
  years += (Math.min(erosionScore, 100) / 100) * 3;
  if (stockingRatio > 1) years += Math.min(1.5, (stockingRatio - 1) * 1.5);
  if (restDebtDays > 0) years += Math.min(1, restDebtDays / 90);
  return Math.min(RECOVERY_YEARS_MAX, Math.round(years * 10) / 10);
}

function bandLabel(band: RiskBand): string {
  switch (band) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'moderate': return 'moderate';
    case 'low': return 'low';
  }
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function ErosionGrazingRecoveryCard({ project }: Props) {
  const siteData = useSiteData(project.id);
  const allPaddocks = useLivestockStore((s) => s.paddocks);

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );

  /* ── Site environment ───────────────────────────────────────────── */

  const env = useMemo(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const elev = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const cover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;

    const omRaw = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const canopyRaw = parseFloat(String(cover?.tree_canopy_pct ?? ''));
    const groupMatch = (soils?.hydrologic_group ?? '').match(/^[ABCD]/);

    return {
      precipMm: climate?.annual_precip_mm ?? null,
      growingSeasonDays: climate?.growing_season_days ?? 150,
      organicMatterPct: isFinite(omRaw) ? omRaw : 3.0,
      canopyPct: isFinite(canopyRaw) ? canopyRaw : 15,
      slopeDeg: elev?.mean_slope_deg ?? 3,
      hydrologicGroup: (groupMatch?.[0] ?? 'B') as 'A' | 'B' | 'C' | 'D',
    };
  }, [siteData]);

  /* ── Site-wide erosion score (drives per-paddock baseline) ────────── */

  const siteErosionScore = useMemo(() => {
    const slopeFactor = Math.min(env.slopeDeg / SLOPE_FULL_RISK_DEG, 1);
    const groupWeight = GROUP_EROSION_WEIGHT[env.hydrologicGroup] ?? 0.65;
    const canopyShield = Math.max(0, 1 - env.canopyPct / 100);
    const omShield = Math.max(0, 1 - env.organicMatterPct / 10);
    // Multiplicative — stack risks. Scale to 0-100.
    const raw = slopeFactor * groupWeight * canopyShield * omShield;
    return Math.round(raw * 100);
  }, [env]);

  /* ── Forage quality (drives recommended stocking) ───────────────── */

  const forage: ForageQuality = useMemo(
    () => computeForageQuality(
      env.organicMatterPct,
      env.canopyPct,
      env.slopeDeg,
      env.growingSeasonDays,
    ),
    [env],
  );

  /* ── Per-paddock rows ───────────────────────────────────────────── */

  const rows = useMemo<PaddockRow[]>(() => {
    return paddocks.map((p) => {
      const primarySpecies = p.species[0] ?? 'cattle';
      const speciesInfo = LIVESTOCK_SPECIES[primarySpecies];
      const recommended = computeRecommendedStocking(primarySpecies, forage);
      const stockingRatio = (p.stockingDensity ?? 0) > 0 && recommended > 0
        ? (p.stockingDensity ?? 0) / recommended
        : 0;

      const recovery = computeRecoveryStatus(p);
      const restDebtDays = recovery.status === 'overdue'
        ? Math.max(0, recovery.daysRested - recovery.requiredDays)
        : 0;

      // Per-paddock erosion: site score modulated by stocking exposure
      // (heavily stocked paddocks lose ground cover, raising local risk).
      const stockingPenalty = Math.min(20, Math.max(0, (stockingRatio - 1)) * 25);
      const erosionScore = Math.min(100, Math.round(siteErosionScore + stockingPenalty));

      const riskBand = bandFromScores(erosionScore, stockingRatio, restDebtDays);
      const recoveryYears = recoveryYearsForRow(erosionScore, stockingRatio, restDebtDays);

      return {
        paddockId: p.id,
        paddockName: p.name,
        areaHa: p.areaM2 / 10_000,
        primarySpeciesLabel: speciesInfo?.label ?? primarySpecies,
        erosionScore,
        stockingRatio,
        restDebtDays,
        riskBand,
        recoveryYears,
      };
    });
  }, [paddocks, forage, siteErosionScore]);

  /* ── Aggregate rollup ───────────────────────────────────────────── */

  const totals = useMemo(() => {
    if (rows.length === 0) {
      return {
        totalHa: 0,
        avgErosion: 0,
        criticalHa: 0,
        highHa: 0,
        moderateHa: 0,
        lowHa: 0,
        worstRecoveryYears: 0,
        overgrazedPaddocks: 0,
      };
    }
    let totalHa = 0;
    let weightedErosion = 0;
    let criticalHa = 0, highHa = 0, moderateHa = 0, lowHa = 0;
    let worstYears = 0;
    let overgrazed = 0;
    for (const r of rows) {
      totalHa += r.areaHa;
      weightedErosion += r.erosionScore * r.areaHa;
      if (r.riskBand === 'critical') criticalHa += r.areaHa;
      else if (r.riskBand === 'high') highHa += r.areaHa;
      else if (r.riskBand === 'moderate') moderateHa += r.areaHa;
      else lowHa += r.areaHa;
      if (r.recoveryYears > worstYears) worstYears = r.recoveryYears;
      if (r.stockingRatio > 1) overgrazed += 1;
    }
    return {
      totalHa,
      avgErosion: totalHa > 0 ? Math.round(weightedErosion / totalHa) : 0,
      criticalHa, highHa, moderateHa, lowHa,
      worstRecoveryYears: worstYears,
      overgrazedPaddocks: overgrazed,
    };
  }, [rows]);

  /* ── Render ─────────────────────────────────────────────────────── */

  if (paddocks.length === 0) {
    // Parent dashboard handles its own empty state — this card just stays out.
    return null;
  }

  const pctOf = (ha: number) => totals.totalHa > 0 ? (ha / totals.totalHa) * 100 : 0;

  return (
    <div className={css.section}>
      <h3 className={css.sectionLabel}>{'EROSION RISK \u00B7 GRAZING PRESSURE \u00B7 RECOVERY TIMELINE (\u00A716)'}</h3>

      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h4 className={css.cardTitle}>Erosion, grazing pressure & recovery</h4>
            <p className={css.cardHint}>
              Per-paddock erosion risk (slope, hydrologic group, canopy &
              organic-matter shielding) cross-referenced against current
              stocking ratio and rest-cycle compliance. Recovery-to-baseline
              timeline projects how long until the worst paddock heals
              {' '}<em>at adjusted-stocking discipline</em>.
            </p>
          </div>
          <span className={css.heuristicBadge}>Planning-grade</span>
        </div>

        {/* ── Aggregate summary ────────────────────────────────────── */}
        <div className={css.summary}>
          <div className={css.summaryStat}>
            <span className={css.summaryStatLabel}>SITE EROSION</span>
            <span className={css.summaryStatValue}>{totals.avgErosion}<span className={css.summaryStatUnit}>/100</span></span>
            <span className={css.summaryStatNote}>area-weighted</span>
          </div>
          <div className={css.summaryStat}>
            <span className={css.summaryStatLabel}>OVERGRAZED</span>
            <span className={css.summaryStatValue}>{totals.overgrazedPaddocks}<span className={css.summaryStatUnit}> / {paddocks.length}</span></span>
            <span className={css.summaryStatNote}>paddocks above recommended</span>
          </div>
          <div className={css.summaryStat}>
            <span className={css.summaryStatLabel}>WORST RECOVERY</span>
            <span className={css.summaryStatValue}>{totals.worstRecoveryYears.toFixed(1)}<span className={css.summaryStatUnit}> yr</span></span>
            <span className={css.summaryStatNote}>worst paddock to baseline</span>
          </div>
        </div>

        {/* ── Risk distribution stacked bar ────────────────────────── */}
        <div className={css.riskBar}>
          <div className={css.riskBarTrack}>
            {totals.criticalHa > 0 && (
              <div
                className={`${css.riskBarSeg} ${css.bandCritical}`}
                style={{ width: `${pctOf(totals.criticalHa)}%` }}
                title={`Critical: ${totals.criticalHa.toFixed(2)} ha`}
              />
            )}
            {totals.highHa > 0 && (
              <div
                className={`${css.riskBarSeg} ${css.bandHigh}`}
                style={{ width: `${pctOf(totals.highHa)}%` }}
                title={`High: ${totals.highHa.toFixed(2)} ha`}
              />
            )}
            {totals.moderateHa > 0 && (
              <div
                className={`${css.riskBarSeg} ${css.bandModerate}`}
                style={{ width: `${pctOf(totals.moderateHa)}%` }}
                title={`Moderate: ${totals.moderateHa.toFixed(2)} ha`}
              />
            )}
            {totals.lowHa > 0 && (
              <div
                className={`${css.riskBarSeg} ${css.bandLow}`}
                style={{ width: `${pctOf(totals.lowHa)}%` }}
                title={`Low: ${totals.lowHa.toFixed(2)} ha`}
              />
            )}
          </div>
          <div className={css.riskBarLegend}>
            {totals.criticalHa > 0 && (
              <span className={css.legendItem}>
                <span className={`${css.legendSwatch} ${css.bandCritical}`} /> Critical {pctOf(totals.criticalHa).toFixed(0)}%
              </span>
            )}
            {totals.highHa > 0 && (
              <span className={css.legendItem}>
                <span className={`${css.legendSwatch} ${css.bandHigh}`} /> High {pctOf(totals.highHa).toFixed(0)}%
              </span>
            )}
            {totals.moderateHa > 0 && (
              <span className={css.legendItem}>
                <span className={`${css.legendSwatch} ${css.bandModerate}`} /> Moderate {pctOf(totals.moderateHa).toFixed(0)}%
              </span>
            )}
            {totals.lowHa > 0 && (
              <span className={css.legendItem}>
                <span className={`${css.legendSwatch} ${css.bandLow}`} /> Low {pctOf(totals.lowHa).toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* ── Per-paddock rows ─────────────────────────────────────── */}
        <div className={css.rowList}>
          {rows.map((r) => (
            <div key={r.paddockId} className={`${css.row} ${css[`band_${r.riskBand}`] ?? ''}`}>
              <div className={css.rowHead}>
                <span className={css.rowName}>{r.paddockName}</span>
                <span className={`${css.rowBand} ${css[`bandText_${r.riskBand}`] ?? ''}`}>
                  {bandLabel(r.riskBand)}
                </span>
              </div>
              <div className={css.rowMeta}>
                {`${r.areaHa.toFixed(2)} ha \u00B7 ${r.primarySpeciesLabel}`}
              </div>
              <div className={css.rowMetrics}>
                <div className={css.rowMetric}>
                  <span className={css.rowMetricLabel}>Erosion</span>
                  <span className={css.rowMetricVal}>{r.erosionScore}/100</span>
                </div>
                <div className={css.rowMetric}>
                  <span className={css.rowMetricLabel}>Stocking</span>
                  <span className={css.rowMetricVal}>
                    {r.stockingRatio > 0 ? `${r.stockingRatio.toFixed(2)}\u00D7` : '\u2014'}
                  </span>
                </div>
                <div className={css.rowMetric}>
                  <span className={css.rowMetricLabel}>Rest debt</span>
                  <span className={css.rowMetricVal}>
                    {r.restDebtDays > 0 ? `${r.restDebtDays}d` : 'on cycle'}
                  </span>
                </div>
                <div className={css.rowMetric}>
                  <span className={css.rowMetricLabel}>Recovery</span>
                  <span className={css.rowMetricVal}>{r.recoveryYears.toFixed(1)} yr</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className={css.footnote}>
          <em>Heuristic.</em> Erosion combines slope (full-load at
          {' '}{SLOPE_FULL_RISK_DEG}{'\u00B0'}), NRCS hydrologic group, and
          shielding from canopy + organic matter. Stocking ratio compares
          paddock density to <strong>forage-adjusted recommended</strong>
          {' '}per species. Recovery timeline assumes the steward returns
          stocking to recommended and respects rest cycles \u2014 capped at
          {' '}{RECOVERY_YEARS_MAX} years because longer projections need
          intervention design, not a back-of-envelope rollup.
        </p>
      </div>
    </div>
  );
}
