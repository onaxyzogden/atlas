/**
 * CarbonDiagnosticDashboard — Canopy maturity simulation, carbon sequestration, timeline.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import SimpleBarChart from '../components/SimpleBarChart.js';
import css from './CarbonDiagnosticDashboard.module.css';

interface CarbonDiagnosticDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const TIMELINE_STAGES = [
  { label: 'PLANTING', year: 0, active: false },
  { label: '5 YEARS', year: 5, active: false },
  { label: 'YEAR 7 (CURRENT)', year: 7, active: true },
  { label: '15 YEARS', year: 15, active: false },
  { label: '30 YEARS (OLD GROWTH)', year: 30, active: false },
];

export default function CarbonDiagnosticDashboard({ project, onSwitchToMap }: CarbonDiagnosticDashboardProps) {
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
          <span className={css.topMetricValue}>8.2</span>
          <span className={css.topMetricNote}>Prime Growth</span>
        </div>
        <div className={css.topMetric}>
          <span className={css.topMetricLabel}>CARBON SEQ.</span>
          <span className={css.topMetricValue}>42.5</span>
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
            { label: 'JUL', value: 88, color: '#8a9a74' },
            { label: 'AUG', value: 90, color: '#8a9a74' },
            { label: 'SEP', value: 95, color: '#8a9a74' },
          ]}
          height={200}
        />
      </div>

      {/* Stewardship Guidance */}
      <div className={css.guidanceCard}>
        <span className={css.guidanceLabel}>
          <svg width={10} height={10} viewBox="0 0 10 10" fill="#8a9a74"><circle cx="5" cy="5" r="5" /></svg>
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
            <span className={css.envValue}>1,240mm / yr</span>
          </div>
        </div>
        <div className={css.envStat}>
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="5" /><polyline points="7 4 7 7 9 8.5" />
          </svg>
          <div>
            <span className={css.envLabel}>SOIL TEMP</span>
            <span className={css.envValue}>14.2&deg;C</span>
          </div>
        </div>
        <div className={css.envStat}>
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 11 4 5 7 8 10 3 13 11" />
          </svg>
          <div>
            <span className={css.envLabel}>EVAP RATE</span>
            <span className={css.envValue}>3.8mm / d</span>
          </div>
        </div>
        <div className={css.envStat}>
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="#8a9a74" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="5" /><polyline points="4.5 7 6.5 9.5 10 5" />
          </svg>
          <div>
            <span className={css.envLabel}>SYSTEM STATUS</span>
            <span className={css.envValue}>Stable Equilibrium</span>
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
