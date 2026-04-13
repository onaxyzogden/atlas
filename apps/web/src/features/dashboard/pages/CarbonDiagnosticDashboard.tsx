/**
 * CarbonDiagnosticDashboard — Canopy maturity simulation, carbon sequestration, timeline.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import SimpleBarChart from '../components/SimpleBarChart.js';
import css from './CarbonDiagnosticDashboard.module.css';
import { status as statusToken } from '../../../lib/tokens.js';

interface CarbonDiagnosticDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface SoilsSummary { organic_matter_pct?: number | string; depth_to_bedrock_m?: number | string; }
interface LandCoverSummary { tree_canopy_pct?: number | string; }
interface ClimateSummary { annual_precip_mm?: number; annual_temp_mean_c?: number; }

const TIMELINE_STAGES = [
  { label: 'PLANTING', year: 0, active: false },
  { label: '5 YEARS', year: 5, active: false },
  { label: 'YEAR 7 (CURRENT)', year: 7, active: true },
  { label: '15 YEARS', year: 15, active: false },
  { label: '30 YEARS (OLD GROWTH)', year: 30, active: false },
];

export default function CarbonDiagnosticDashboard({ project, onSwitchToMap }: CarbonDiagnosticDashboardProps) {
  const siteData = useSiteData(project.id);

  const carbon = useMemo(() => {
    const soils    = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const landCover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;
    const climate  = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;

    const omRaw    = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om       = isFinite(omRaw) ? omRaw : 4.0;
    const canopyRaw = parseFloat(String(landCover?.tree_canopy_pct ?? ''));
    const canopy   = isFinite(canopyRaw) ? canopyRaw : 40;
    const precip   = climate?.annual_precip_mm ?? 800;
    const tempC    = climate?.annual_temp_mean_c ?? 9;

    // Maturity Score (1.0–10.0)
    const canopyBonus = canopy > 60 ? 2.0 : canopy > 30 ? 1.2 : canopy > 10 ? 0.5 : 0.1;
    const omBonus     = om >= 5 ? 1.5 : om >= 3 ? 1.0 : 0.3;
    const maturity    = Math.min(Math.max(5.0 + canopyBonus + omBonus, 1.0), 10.0);

    // Carbon Sequestration (TCO2e/HA)
    const carbonSeq = Math.max((canopy / 100 * 35) + (om / 10 * 12) + (precip / 1000 * 5), 5.0);

    // Biomass Accumulation YoY (%)
    const biomassYoY = Math.round(8 + (canopy / 100 * 15) + (om / 5 * 5));

    // Environmental stats
    const precipDisplay = `${precip.toLocaleString()}mm / yr`;
    const tempDisplay   = `${tempC.toFixed(1)}\u00b0C avg`;
    const evap = tempC > 15 && precip < 700 ? 'High' : tempC < 10 ? 'Low' : 'Moderate';
    const status = maturity >= 7 ? 'Stable Equilibrium' : 'Active Growth';

    return { maturity, carbonSeq, biomassYoY, precipDisplay, tempDisplay, evap, status };
  }, [siteData]);

  return (
    <div className={css.page}>
      {/* Hero */}
      <div className={css.hero}>
        <h1 className={css.title}>Canopy Maturity Simulation</h1>
        <span className={css.heroTag}>ACTIVE ZONE: OGDEN CREST NORTH-EAST</span>
      </div>

      {/* Top metrics */}
      <div className={css.topMetrics}>
        <div className={css.topMetric}>
          <span className={css.topMetricLabel}>MATURITY SCORE</span>
          <span className={css.topMetricValue}>{carbon.maturity.toFixed(1)}</span>
          <span className={css.topMetricNote}>{carbon.maturity >= 8 ? 'Prime Growth' : carbon.maturity >= 6 ? 'Establishing' : 'Early Stage'}</span>
        </div>
        <div className={css.topMetric}>
          <span className={css.topMetricLabel}>CARBON SEQ.</span>
          <span className={css.topMetricValue}>{carbon.carbonSeq.toFixed(1)}</span>
          <span className={css.topMetricNote}>TCO2e / HA</span>
        </div>
      </div>

      {/* Biomass Accumulation chart */}
      <div className={css.chartCard}>
        <div className={css.chartHeader}>
          <h3 className={css.chartTitle}>Biomass Accumulation</h3>
          <span className={css.chartPeriod}>LAST 12 MONTHS</span>
        </div>
        <SimpleBarChart
          data={[
            { label: 'OCT', value: 35, color: 'rgba(138,154,116,0.4)' },
            { label: 'NOV', value: 38, color: 'rgba(138,154,116,0.45)' },
            { label: 'DEC', value: 42, color: 'rgba(138,154,116,0.5)' },
            { label: 'JAN', value: 48, color: 'rgba(138,154,116,0.55)' },
            { label: 'FEB', value: 55, color: 'rgba(138,154,116,0.6)' },
            { label: 'MAR', value: 65, color: 'rgba(138,154,116,0.7)' },
            { label: 'APR', value: 72, color: 'rgba(138,154,116,0.75)' },
            { label: 'MAY', value: 78, color: 'rgba(138,154,116,0.8)' },
            { label: 'JUN', value: 82, color: 'rgba(138,154,116,0.85)' },
            { label: 'JUL', value: 88, color: statusToken.good },
            { label: 'AUG', value: 90, color: statusToken.good },
            { label: 'SEP', value: 95, color: statusToken.good },
          ]}
          height={200}
        />
      </div>

      {/* Stewardship Guidance */}
      <div className={css.guidanceCard}>
        <span className={css.guidanceLabel}>
          <svg width={10} height={10} viewBox="0 0 10 10" fill={statusToken.good}><circle cx="5" cy="5" r="5" /></svg>
          STEWARDSHIP GUIDANCE
        </span>
        <p className={css.guidanceQuote}>
          &ldquo;Comparison against the 15-year baseline suggests an accelerated biomass accumulation
          this season. We advise maintaining the 5-year rest period to ensure deep carbon sequestration.&rdquo;
        </p>
      </div>

      {/* Generate Report CTA */}
      <button className={css.reportBtn}>
        GENERATE CARBON REPORT
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>

      {/* Environmental stats bar */}
      <div className={css.envBar}>
        <div className={css.envStat}>
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1C7 1 3 6 3 9C3 11.2 4.8 13 7 13C9.2 13 11 11.2 11 9C11 6 7 1 7 1Z" />
          </svg>
          <div>
            <span className={css.envLabel}>PRECIPITATION</span>
            <span className={css.envValue}>{carbon.precipDisplay}</span>
          </div>
        </div>
        <div className={css.envStat}>
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="5" /><polyline points="7 4 7 7 9 8.5" />
          </svg>
          <div>
            <span className={css.envLabel}>SOIL TEMP</span>
            <span className={css.envValue}>{carbon.tempDisplay}</span>
          </div>
        </div>
        <div className={css.envStat}>
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 11 4 5 7 8 10 3 13 11" />
          </svg>
          <div>
            <span className={css.envLabel}>EVAP RATE</span>
            <span className={css.envValue}>{carbon.evap}</span>
          </div>
        </div>
        <div className={css.envStat}>
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke={statusToken.good} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="5" /><polyline points="4.5 7 6.5 9.5 10 5" />
          </svg>
          <div>
            <span className={css.envLabel}>SYSTEM STATUS</span>
            <span className={css.envValue}>{carbon.status}</span>
          </div>
        </div>
      </div>

      {/* Timeline scrubber */}
      <div className={css.timelineCard}>
        <div className={css.timelineTrack}>
          {TIMELINE_STAGES.map((s, i) => (
            <div key={i} className={`${css.timelineStage} ${s.active ? css.timelineStageActive : ''}`}>
              <div className={css.timelineDot} />
              {s.active && <span className={css.timelineCurrentLabel}>{s.label}</span>}
              {!s.active && <span className={css.timelineLabel}>{s.label}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
