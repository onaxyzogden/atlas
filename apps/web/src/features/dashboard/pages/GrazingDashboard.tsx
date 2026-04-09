/**
 * GrazingDashboard — Grazing Analysis & Recovery dashboard page.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import ProgressBar from '../components/ProgressBar.js';
import SimpleBarChart from '../components/SimpleBarChart.js';
import css from './GrazingDashboard.module.css';

interface GrazingDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ClimateSummary { annual_precip_mm?: number; annual_temp_mean_c?: number; growing_season_days?: number; }
interface SoilsSummary { organic_matter_pct?: number | string; drainage_class?: string; }

export default function GrazingDashboard({ project, onSwitchToMap }: GrazingDashboardProps) {
  const siteData = useSiteData(project.id);

  const historical = useMemo(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils   = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;

    const precip = climate?.annual_precip_mm ?? 440;
    const tempC  = climate?.annual_temp_mean_c ?? 9;
    const omRaw  = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om     = isFinite(omRaw) ? omRaw : 3.5;
    const drain  = (soils?.drainage_class ?? '').toLowerCase();

    // Growing season soil temp heuristic: mean annual + 5°C
    const soilTempC = Math.round((tempC + 5) * 10) / 10;

    // Evaporation rate
    const evap = tempC > 15 && precip < 700 ? 'High' : tempC < 10 ? 'Low' : 'Moderate';

    // Status from OM + drainage
    const status = (om >= 4 && drain.includes('well')) ? 'Stable' : om < 2 ? 'Monitor' : 'Stable';

    return {
      precip: `${precip}mm`,
      soilTemp: `${soilTempC}\u00b0C`,
      evap,
      status,
    };
  }, [siteData]);

  return (
    <div className={css.page}>
      {/* Hero section */}
      <div className={css.hero}>
        <h1 className={css.title}>Grazing Analysis &amp; Recovery</h1>
        <p className={css.desc}>
          Observing the 120-day regrowth cycle across the North-Western Quadrant.
          Our current trajectory indicates a <em>14% increase</em> in biomass density
          relative to the seasonal baseline.
        </p>
        <div className={css.statusBadge}>
          <span className={css.statusLabel}>Status</span>
          <span className={css.statusValue}>ACTIVE STEWARDSHIP</span>
        </div>
      </div>

      {/* Recovery hotspot card */}
      <div className={css.hotspotCard}>
        <div className={css.hotspotOverlay}>
          <span className={css.hotspotTag}>RECOVERY HOTSPOT</span>
          <h3 className={css.hotspotTitle}>Section 4A: Verdant Flush</h3>
          <div className={css.hotspotStats}>
            <div>
              <span className={css.hotspotStatLabel}>GROWTH RATE</span>
              <span className={css.hotspotStatValue}>+2.4cm / day</span>
            </div>
            <div>
              <span className={css.hotspotStatLabel}>DAYS RESTED</span>
              <span className={css.hotspotStatValue}>42 Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline scrubber */}
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
              <rect x="1" y="8" width="3" height="5" rx="0.3"/>
              <rect x="5.5" y="5" width="3" height="8" rx="0.3"/>
              <rect x="10" y="2" width="3" height="11" rx="0.3"/>
            </svg>
          </div>
          <SimpleBarChart
            data={[
              { label: 'WEEK 01', value: 42, color: 'rgba(138,154,116,0.5)' },
              { label: '', value: 38, color: 'rgba(138,154,116,0.5)' },
              { label: 'WEEK 04', value: 55, color: 'rgba(138,154,116,0.6)' },
              { label: '', value: 48, color: 'rgba(138,154,116,0.6)' },
              { label: 'WEEK 08', value: 72, color: 'rgba(138,154,116,0.75)' },
              { label: '', value: 65, color: 'rgba(138,154,116,0.75)' },
              { label: 'CURRENT', value: 88, color: '#8a9a74' },
              { label: '', value: 82, color: '#8a9a74' },
            ]}
            height={200}
          />
        </div>

        <div className={css.card}>
          <div className={css.cardHeader}>
            <h3 className={css.cardTitle}>Recovery Cycle Compliance</h3>
            <svg width={18} height={18} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="2"/>
              <path d="M7 1.5L8 3.5L10 2.7L9.7 4.8L11.8 5.3L10.5 7L11.8 8.7L9.7 9.2L10 11.3L8 10.5L7 12.5L6 10.5L4 11.3L4.3 9.2L2.2 8.7L3.5 7L2.2 5.3L4.3 4.8L4 2.7L6 3.5L7 1.5Z"/>
            </svg>
          </div>
          <div className={css.complianceList}>
            <ProgressBar label="Optimal Rest Achieved" value={92} color="#8a9a74" />
            <ProgressBar label="Overgrazing Prevention" value={84} color="#c4a265" />
            <ProgressBar label="Sector 1: High Yield" value={87} color="#8a9a74" />
            <ProgressBar label="Sector 2: Riparian Buffer" value={95} color="#8a9a74" />
            <ProgressBar label="Sector 3: South Meadow" value={100} color="#8a9a74" />
            <ProgressBar label="Sector 4: Northern Ridge" value={28} color="#9a6a5a" />
          </div>
        </div>
      </div>

      {/* Historical archetypes */}
      <div className={css.historicalSection}>
        <h3 className={css.historicalTitle}>Historical Archetypes</h3>
        <p className={css.historicalDesc}>
          Comparison against the 10-year rolling average suggests an accelerated biomass
          accumulation this season. We advise maintaining the 120-day rest period despite
          visual abundance to ensure deep carbon sequestration remains the primary objective.
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
        </div>
      </div>
    </div>
  );
}
