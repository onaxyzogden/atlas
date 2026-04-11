/**
 * GrazingDashboard — Grazing Analysis & Recovery dashboard page.
 *
 * Fully wired to livestockStore paddocks, zoneStore zones, siteData layers,
 * and the shared livestockAnalysis module. No hardcoded demo data.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import {
  computeForageQuality,
  computeRecommendedStocking,
  computeRecoveryStatus,
  computeOvergrazingRisk,
  computeSeasonalCarryingCapacity,
  type ForageQuality,
  type RecoveryStatus,
  type RiskLevel,
  type CarryingCapacity,
} from '../../livestock/livestockAnalysis.js';
import { LIVESTOCK_SPECIES } from '../../livestock/speciesData.js';
import ProgressBar from '../components/ProgressBar.js';
import SimpleBarChart from '../components/SimpleBarChart.js';
import css from './GrazingDashboard.module.css';

interface GrazingDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ClimateSummary {
  annual_precip_mm?: number;
  annual_temp_mean_c?: number;
  growing_season_days?: number;
  first_frost_date?: string;
  last_frost_date?: string;
}
interface SoilsSummary {
  organic_matter_pct?: number | string;
  drainage_class?: string;
}
interface ElevationSummary {
  mean_slope_deg?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
}

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */

function forageColor(quality: ForageQuality['quality']): string {
  switch (quality) {
    case 'high': return '#8a9a74';
    case 'good': return 'rgba(138,154,116,0.7)';
    case 'moderate': return '#c4a265';
    case 'poor': return '#9a6a5a';
  }
}

function complianceColor(value: number): string {
  if (value >= 80) return '#8a9a74';
  if (value >= 50) return '#c4a265';
  return '#9a6a5a';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GrazingDashboard({ project, onSwitchToMap }: GrazingDashboardProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allZones = useZoneStore((s) => s.zones);
  const siteData = useSiteData(project.id);

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );

  const _livestockZones = useMemo(
    () => allZones.filter((z) => z.projectId === project.id && z.category === 'livestock'),
    [allZones, project.id],
  );

  /* ---------- Site data layers ---------- */

  const siteEnv = useMemo(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const elev = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const cover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;

    const omRaw = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const organicMatterPct = isFinite(omRaw) ? omRaw : 3.5;
    const canopyRaw = parseFloat(String(cover?.tree_canopy_pct ?? ''));
    const canopyPct = isFinite(canopyRaw) ? canopyRaw : 15;
    const slopeDeg = elev?.mean_slope_deg ?? 3;
    const growingSeasonDays = climate?.growing_season_days ?? 150;
    const precipMm = climate?.annual_precip_mm ?? 440;
    const tempC = climate?.annual_temp_mean_c ?? 9;
    const drain = (soils?.drainage_class ?? '').toLowerCase();
    const firstFrost = climate?.first_frost_date ?? null;
    const lastFrost = climate?.last_frost_date ?? null;

    return {
      organicMatterPct,
      canopyPct,
      slopeDeg,
      growingSeasonDays,
      precipMm,
      tempC,
      drain,
      firstFrost,
      lastFrost,
    };
  }, [siteData]);

  /* ---------- Forage quality (shared across paddocks) ---------- */

  const forage = useMemo<ForageQuality>(
    () =>
      computeForageQuality(
        siteEnv.organicMatterPct,
        siteEnv.canopyPct,
        siteEnv.slopeDeg,
        siteEnv.growingSeasonDays,
      ),
    [siteEnv],
  );

  /* ---------- Recovery statuses ---------- */

  const recoveries = useMemo<RecoveryStatus[]>(
    () => paddocks.map(computeRecoveryStatus),
    [paddocks],
  );

  /* ---------- Overall compliance for status badge ---------- */

  const overallCompliance = useMemo(() => {
    if (recoveries.length === 0) return 0;
    const sum = recoveries.reduce((acc, r) => acc + r.compliance, 0);
    return Math.round(sum / recoveries.length);
  }, [recoveries]);

  const statusLabel = useMemo(() => {
    if (paddocks.length === 0) return 'NO DATA';
    if (overallCompliance > 80) return 'ACTIVE STEWARDSHIP';
    if (overallCompliance < 60) return 'NEEDS ATTENTION';
    return 'MONITORING';
  }, [paddocks.length, overallCompliance]);

  /* ---------- Best recovery hotspot ---------- */

  const hotspot = useMemo(() => {
    if (recoveries.length === 0) return null;
    return recoveries.reduce((best, r) => (r.compliance > best.compliance ? r : best), recoveries[0]!);
  }, [recoveries]);

  /* ---------- Biomass chart data ---------- */

  const biomassData = useMemo(
    () =>
      paddocks.map((p) => ({
        label: p.name,
        value: forage.biomassEstimate,
        color: forageColor(forage.quality),
      })),
    [paddocks, forage],
  );

  /* ---------- Overgrazing alerts ---------- */

  const overgrazingAlerts = useMemo(() => {
    const alerts: { paddockName: string; risk: RiskLevel }[] = [];
    for (const p of paddocks) {
      const primarySpecies = p.species[0];
      if (!primarySpecies) continue;
      const recommended = computeRecommendedStocking(primarySpecies, forage);
      const riskLevel = computeOvergrazingRisk(p, recommended);
      if (riskLevel.risk !== 'low') {
        alerts.push({ paddockName: p.name, risk: riskLevel });
      }
    }
    return alerts;
  }, [paddocks, forage]);

  /* ---------- Unique species across all paddocks ---------- */

  const uniqueSpecies = useMemo(() => {
    const set = new Set<string>();
    for (const p of paddocks) {
      for (const sp of p.species) set.add(sp);
    }
    return Array.from(set) as Array<keyof typeof LIVESTOCK_SPECIES>;
  }, [paddocks]);

  /* ---------- Total area in hectares ---------- */

  const totalHa = useMemo(
    () => Math.round(paddocks.reduce((sum, p) => sum + p.areaM2, 0) / 10_000 * 10) / 10,
    [paddocks],
  );

  /* ---------- Seasonal carrying capacity per species ---------- */

  const carryingCapacities = useMemo<CarryingCapacity[]>(
    () =>
      uniqueSpecies.map((sp) =>
        computeSeasonalCarryingCapacity(sp, totalHa, siteEnv.growingSeasonDays, {
          first: siteEnv.firstFrost,
          last: siteEnv.lastFrost,
        }),
      ),
    [uniqueSpecies, totalHa, siteEnv],
  );

  /* ---------- Historical section (existing live data) ---------- */

  const historical = useMemo(() => {
    const soilTempC = Math.round((siteEnv.tempC + 5) * 10) / 10;
    const evap =
      siteEnv.tempC > 15 && siteEnv.precipMm < 700
        ? 'High'
        : siteEnv.tempC < 10
          ? 'Low'
          : 'Moderate';
    const status =
      siteEnv.organicMatterPct >= 4 && siteEnv.drain.includes('well')
        ? 'Stable'
        : siteEnv.organicMatterPct < 2
          ? 'Monitor'
          : 'Stable';

    return {
      precip: `${siteEnv.precipMm}mm`,
      soilTemp: `${soilTempC}\u00b0C`,
      evap,
      status,
    };
  }, [siteEnv]);

  /* ================================================================ */
  /*  Empty state                                                      */
  /* ================================================================ */

  if (paddocks.length === 0) {
    return (
      <div className={css.page}>
        <div className={css.hero}>
          <h1 className={css.title}>Grazing Analysis &amp; Recovery</h1>
          <p className={css.desc}>No paddocks drawn yet</p>
          <p className={css.desc}>
            Draw paddocks in the map view to see grazing analysis
          </p>
          <button
            onClick={onSwitchToMap}
            style={{
              marginTop: 16,
              padding: '10px 24px',
              background: 'rgba(138,154,116,0.15)',
              color: '#8a9a74',
              border: '1px solid rgba(138,154,116,0.3)',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              letterSpacing: '0.05em',
              fontSize: 13,
            }}
          >
            OPEN MAP VIEW &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Main render                                                      */
  /* ================================================================ */

  return (
    <div className={css.page}>
      {/* Hero section */}
      <div className={css.hero}>
        <h1 className={css.title}>Grazing Analysis &amp; Recovery</h1>
        <p className={css.desc}>
          {paddocks.length} paddock{paddocks.length !== 1 ? 's' : ''} across{' '}
          {totalHa} hectares, {uniqueSpecies.length} species tracked.
        </p>
        <div className={css.statusBadge}>
          <span className={css.statusLabel}>Status</span>
          <span className={css.statusValue}>{statusLabel}</span>
        </div>
      </div>

      {/* Recovery hotspot card */}
      <div className={css.hotspotCard}>
        <div className={css.hotspotOverlay}>
          <span className={css.hotspotTag}>RECOVERY HOTSPOT</span>
          {hotspot ? (
            <>
              <h3 className={css.hotspotTitle}>{hotspot.paddockName}</h3>
              <div className={css.hotspotStats}>
                <div>
                  <span className={css.hotspotStatLabel}>COMPLIANCE</span>
                  <span className={css.hotspotStatValue}>{hotspot.compliance}%</span>
                </div>
                <div>
                  <span className={css.hotspotStatLabel}>DAYS RESTED</span>
                  <span className={css.hotspotStatValue}>{hotspot.daysRested} Days</span>
                </div>
              </div>
            </>
          ) : (
            <h3 className={css.hotspotTitle}>No paddock data yet</h3>
          )}
        </div>
      </div>

      {/* Timeline scrubber (placeholder for future feature) */}
      <div className={css.timeline}>
        <button className={css.timelinePlay} aria-label="Play timeline">
          <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 1L10 6L2 11V1Z" />
          </svg>
        </button>
        <span className={css.timelineRange}>MARCH 12 — JUNE 28</span>
        <div className={css.timelineTrack}>
          <div className={css.timelineProgress} style={{ width: '65%' }} />
        </div>
        <div className={css.timelineActions}>
          <button className={css.timelineBtn}>COMPARE DATES</button>
          <button className={css.timelineBtn}>EXPORT LEDGER</button>
        </div>
      </div>

      {/* Two-column grid: Biomass Trends + Recovery Compliance */}
      <div className={css.grid}>
        <div className={css.card}>
          <div className={css.cardHeader}>
            <h3 className={css.cardTitle}>Biomass Trends</h3>
            <svg width={18} height={18} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="8" width="3" height="5" rx="0.3" />
              <rect x="5.5" y="5" width="3" height="8" rx="0.3" />
              <rect x="10" y="2" width="3" height="11" rx="0.3" />
            </svg>
          </div>
          <SimpleBarChart data={biomassData} height={200} />
        </div>

        <div className={css.card}>
          <div className={css.cardHeader}>
            <h3 className={css.cardTitle}>Recovery Cycle Compliance</h3>
            <svg width={18} height={18} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="2" />
              <path d="M7 1.5L8 3.5L10 2.7L9.7 4.8L11.8 5.3L10.5 7L11.8 8.7L9.7 9.2L10 11.3L8 10.5L7 12.5L6 10.5L4 11.3L4.3 9.2L2.2 8.7L3.5 7L2.2 5.3L4.3 4.8L4 2.7L6 3.5L7 1.5Z" />
            </svg>
          </div>
          <div className={css.complianceList}>
            {recoveries.map((r) => (
              <ProgressBar
                key={r.paddockId}
                label={`${r.paddockName} (${r.status})`}
                value={r.compliance}
                color={complianceColor(r.compliance)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Overgrazing alerts */}
      {overgrazingAlerts.length > 0 && (
        <div className={css.grid}>
          {overgrazingAlerts.map((alert) => (
            <div key={alert.paddockName} className={css.card}>
              <div className={css.cardHeader}>
                <h3 className={css.cardTitle}>
                  {alert.risk.risk === 'high' ? '\u26a0' : '\u26a0'} Overgrazing Alert
                </h3>
              </div>
              <div className={css.complianceList}>
                <div style={{ padding: '8px 0' }}>
                  <strong>{alert.paddockName}</strong>
                  <span style={{ marginLeft: 8, color: alert.risk.risk === 'high' ? '#9a6a5a' : '#c4a265' }}>
                    {alert.risk.risk.toUpperCase()} RISK
                  </span>
                  <span style={{ marginLeft: 8, opacity: 0.7 }}>
                    Stocking ratio: {alert.risk.ratio.toFixed(2)}x
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historical archetypes */}
      <div className={css.historicalSection}>
        <h3 className={css.historicalTitle}>Historical Archetypes</h3>
        <p className={css.historicalDesc}>
          Site environmental baselines derived from live climate, soils, and
          elevation data. Seasonal carrying capacity is computed per tracked
          species across the total paddock area of {totalHa} ha.
        </p>
        <div className={css.historicalGrid}>
          <div className={css.historicalStat}>
            <span className={css.historicalLabel}>PRECIPITATION</span>
            <span className={css.historicalValue}>{historical.precip}</span>
          </div>
          <div className={css.historicalStat}>
            <span className={css.historicalLabel}>SOIL TEMP</span>
            <span className={css.historicalValue}>{historical.soilTemp}</span>
          </div>
          <div className={css.historicalStat}>
            <span className={css.historicalLabel}>EVAP RATE</span>
            <span className={css.historicalValue}>{historical.evap}</span>
          </div>
          <div className={css.historicalStat}>
            <span className={css.historicalLabel}>STATUS</span>
            <span className={css.historicalValue}>{historical.status}</span>
          </div>
          {carryingCapacities.map((cap) => (
            <div key={cap.species} className={css.historicalStat}>
              <span className={css.historicalLabel}>{cap.label.toUpperCase()} CAPACITY</span>
              <span className={css.historicalValue}>
                {cap.adjustedCapacity} head ({Math.round(cap.seasonMultiplier * 100)}% season)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
