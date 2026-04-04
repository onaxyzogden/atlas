/**
 * HydrologyDashboard — Water resilience score, storage, catchment, drought buffer, stewardship guidance.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import ProgressBar from '../components/ProgressBar.js';
import css from './HydrologyDashboard.module.css';

interface HydrologyDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function HydrologyDashboard({ project, onSwitchToMap }: HydrologyDashboardProps) {
  return (
    <div className={css.page}>
      {/* Hero */}
      <div className={css.hero}>
        <span className={css.heroTag}>DIAGNOSTIC OVERVIEW</span>
        <h1 className={css.title}>
          Water Resilience Score: <span className={css.score}>84/100</span>
        </h1>
        <p className={css.desc}>
          A robust ecological buffer exists. Stewardship focus recommended for Sector 3
          lowlands during high-evaporation cycles.
        </p>
        <div className={css.heroActions}>
          <button className={css.heroBtn}>View Sector 3</button>
          <button className={css.heroBtn}>Annual Hydrology Report</button>
        </div>
      </div>

      {/* Top metrics row */}
      <div className={css.metricsRow}>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>TOTAL STORAGE CAPACITY</span>
          <span className={css.metricValue}>1.2M</span>
          <span className={css.metricUnit}>GALLONS</span>
        </div>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>ANNUAL CATCHMENT POTENTIAL</span>
          <span className={css.metricValue}>4.8M</span>
          <span className={css.metricUnit}>GALLONS/YEAR</span>
          <span className={css.metricNote}>BASED ON 30-YEAR ANNUAL PRECIPITATION</span>
        </div>
      </div>

      {/* Aquifer card */}
      <div className={css.aquiferCard}>
        <h3 className={css.aquiferTitle}>Aquifer Hydration</h3>
        <p className={css.aquiferDesc}>
          Current soil moisture levels are performing at 112% of the decadal average.
          Primary storage ponds are at 92% capacity.
        </p>
      </div>

      {/* Drought buffer + flow metrics */}
      <div className={css.bufferRow}>
        <div className={css.droughtCard}>
          <span className={css.droughtLabel}>DROUGHT BUFFER</span>
          <div className={css.droughtValueRow}>
            <span className={css.droughtValue}>214</span>
            <div className={css.droughtIcons}>
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7" cy="7" r="5" /><circle cx="7" cy="7" r="1" fill="rgba(180,165,140,0.4)" />
              </svg>
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7" cy="7" r="5" /><polyline points="7 3.5 7 7 9 8.5" />
              </svg>
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 10 5 4 8 7 12 2" />
              </svg>
            </div>
          </div>
          <span className={css.droughtTrend}>+14 days from previous quarter</span>
        </div>

        <div className={css.flowCard}>
          <span className={css.flowLabel}>FLOW ANALYSIS</span>
          <div className={css.flowStats}>
            <div className={css.flowStat}>
              <span className={css.flowStatLabel}>Inlet Rate</span>
              <span className={css.flowStatValue}>8.2 gal/min</span>
            </div>
            <div className={css.flowStat}>
              <span className={css.flowStatLabel}>Outlet Rate</span>
              <span className={css.flowStatValue}>3.1 gal/min</span>
            </div>
            <div className={css.flowStat}>
              <span className={css.flowStatLabel}>Net Gain</span>
              <span className={css.flowStatValue} style={{ color: '#8a9a74' }}>+5.1 gal/min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Biomass vs Water Consumption */}
      <div className={css.comparisonCard}>
        <h3 className={css.comparisonTitle}>Biomass vs. Water Consumption</h3>
        <div className={css.comparisonLegend}>
          <span className={css.legendItem}><span className={css.legendDot} style={{ background: '#8a9a74' }} /> BIOMASS INDEX</span>
          <span className={css.legendItem}><span className={css.legendDot} style={{ background: '#9a6a5a' }} /> CONSUMPTION</span>
        </div>
        <div className={css.comparisonChart}>
          {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG'].map((m, i) => {
            const biomass = [30, 35, 45, 55, 72, 85, 80, 75][i];
            const consumption = [20, 22, 28, 35, 48, 62, 58, 50][i];
            return (
              <div key={m} className={css.barGroup}>
                <div className={css.barPair}>
                  <div className={css.bar} style={{ height: `${biomass}%`, background: '#8a9a74' }} />
                  <div className={css.bar} style={{ height: `${consumption}%`, background: '#9a6a5a' }} />
                </div>
                <span className={css.barLabel}>{m}</span>
              </div>
            );
          })}
          <div className={css.chartPeak}>Peak</div>
        </div>
      </div>

      {/* Stewardship Guidance */}
      <div className={css.guidanceCard}>
        <h3 className={css.guidanceTitle}>Stewardship Guidance</h3>
        <div className={css.guidanceItem}>
          <span className={css.guidanceIcon}>
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="#c4a265" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="5.5" /><line x1="7" y1="4" x2="7" y2="7.5" /><circle cx="7" cy="10" r="0.5" fill="#c4a265" />
            </svg>
          </span>
          <div>
            <p className={css.guidanceText}>
              <strong>Increasing riparian buffer in Sector 3 to reduce evaporation.</strong>
            </p>
            <p className={css.guidanceDetail}>
              Implement native sedge and willow plantings along the 480-foot swale line.
            </p>
          </div>
        </div>
        <div className={css.guidanceItem}>
          <span className={css.guidanceIcon}>
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="#7a8a9a" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="5.5" /><polyline points="4.5 7 6.5 9.5 10 5" />
            </svg>
          </span>
          <div>
            <p className={css.guidanceText}>
              <strong>Calibrate flow sensors in Basin 2.</strong>
            </p>
            <p className={css.guidanceDetail}>
              Data variance detected in main outlet readings.
            </p>
          </div>
        </div>
      </div>

      <button className={css.reportBtn} onClick={onSwitchToMap}>
        GENERATE REPORT
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
