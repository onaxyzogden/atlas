/**
 * HerdRotationDashboard — Herd rotation management with paddock info, alerts, and CTA.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import ProgressBar from '../components/ProgressBar.js';
import css from './HerdRotationDashboard.module.css';

interface HerdRotationDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function HerdRotationDashboard({ project, onSwitchToMap }: HerdRotationDashboardProps) {
  return (
    <div className={css.page}>
      {/* Hero */}
      <div className={css.hero}>
        <span className={css.heroTag}>OPERATIONAL UNIT: NORTH SECTOR</span>
        <h1 className={css.title}>Herd Alpha Rotation</h1>
      </div>

      {/* Alert cards */}
      <div className={css.alertRow}>
        <div className={`${css.alertCard} ${css.alertWarning}`}>
          <span className={css.alertIcon}>
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#c4a265" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1L15 14H1L8 1Z" />
              <line x1="8" y1="6" x2="8" y2="9" />
              <circle cx="8" cy="11.5" r="0.5" fill="#c4a265" />
            </svg>
          </span>
          <div>
            <span className={css.alertTitle}>Predator Sighting</span>
            <span className={css.alertDesc}>Coyote tracks identified near Paddock 14. Increase perimeter frequency.</span>
          </div>
        </div>
        <div className={`${css.alertCard} ${css.alertInfo}`}>
          <span className={css.alertIcon}>
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#7a8a9a" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1C5 4 3 6 3 9C3 11.8 5.2 14 8 14C10.8 14 13 11.8 13 9C13 6 11 4 8 1Z" />
            </svg>
          </span>
          <div>
            <span className={css.alertTitle}>Water Level Warning</span>
            <span className={css.alertDesc}>Trough 09 reporting 15% capacity. Secondary pump check required.</span>
          </div>
        </div>
      </div>

      {/* Active paddock card */}
      <div className={css.paddockCard}>
        <div className={css.paddockHeader}>
          <div>
            <span className={css.paddockLabel}>ACTIVE PADDOCK</span>
            <h3 className={css.paddockName}>Paddock 09 <span className={css.paddockSub}>(The Basin)</span></h3>
          </div>
          <div className={css.paddockAcres}>
            <span className={css.acresValue}>4.5</span>
            <span className={css.acresUnit}>ACRES</span>
          </div>
        </div>

        <div className={css.biomassBar}>
          <div className={css.biomassBarHeader}>
            <span>Estimated Biomass Remaining</span>
            <span className={css.biomassBarPct}>62%</span>
          </div>
          <ProgressBar label="" value={62} color="#8a9a74" />
          <span className={css.biomassBarNote}>Approx. 4,200 lbs dry matter/acre</span>
        </div>

        <div className={css.statGrid}>
          <div className={css.statBox}>
            <span className={css.statLabel}>TIME ON SITE</span>
            <span className={css.statValue}>3 Days</span>
          </div>
          <div className={css.statBox}>
            <span className={css.statLabel}>SOIL MOISTURE</span>
            <span className={css.statValue}>22.4%</span>
          </div>
        </div>
      </div>

      {/* Trough status + quick stats */}
      <div className={css.infoRow}>
        <div className={css.troughCard}>
          <div className={css.troughHeader}>
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="rgba(180,165,140,0.5)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1C5 4 3 6 3 9C3 11.8 5.2 14 8 14C10.8 14 13 11.8 13 9C13 6 11 4 8 1Z" />
            </svg>
            <span className={css.troughLabel}>TROUGH STATUS</span>
          </div>
          <span className={css.troughValue}>Flow Rate: 4.2 gal/min</span>
        </div>

        <div className={css.quickStats}>
          <div className={css.quickStat}>
            <span className={css.quickStatLabel}>Herd Size</span>
            <span className={css.quickStatValue}>142</span>
          </div>
          <div className={css.quickStat}>
            <span className={css.quickStatLabel}>Last Checked</span>
            <span className={css.quickStatValue}>06:42</span>
          </div>
          <div className={css.quickStat}>
            <span className={css.quickStatLabel}>Weather Forecast</span>
            <span className={css.quickStatValue}>Partly Cloudy | 17&deg;C</span>
          </div>
        </div>
      </div>

      {/* Biomass Health Index */}
      <div className={css.healthCard}>
        <h3 className={css.healthTitle}>Biomass Health Index</h3>
        <div className={css.healthIndicator}>
          <span className={css.healthDot} />
          <span className={css.healthText}>Vegetation density consistent with seasonal model.</span>
        </div>
      </div>

      {/* CTA */}
      <button className={css.ctaButton} onClick={onSwitchToMap}>
        INITIATE HERD ROTATION
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8H13M10 5L13 8L10 11" />
        </svg>
      </button>

      {/* Coordinates bar */}
      <div className={css.coordsBar}>
        <span>LAT: <strong>45.5231&deg; N</strong></span>
        <span>LONG: <strong>122.6765&deg; W</strong></span>
        <span>ELEVATION: <strong>1,240 FT</strong></span>
        <span className={css.coordsStatus}>
          SYSTEM STATUS: <span className={css.syncDot} /> Synchronized
        </span>
      </div>
    </div>
  );
}
