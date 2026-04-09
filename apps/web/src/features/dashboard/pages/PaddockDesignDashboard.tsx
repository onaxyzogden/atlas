/**
 * PaddockDesignDashboard — Paddock layout overview with grid, summary stats, rotation schedule.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import ProgressBar from '../components/ProgressBar.js';
import css from './PaddockDesignDashboard.module.css';

interface PaddockDesignDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ClimateSummary { growing_season_days?: number; }
interface SoilsSummary { drainage_class?: string; predominant_texture?: string; }

const PADDOCKS = [
  { name: 'Paddock 01', sub: 'North Ridge', acres: 3.2, status: 'Resting', restDays: 18, forage: 'Tall Fescue / Clover', biomass: 85, color: '#8a9a74' },
  { name: 'Paddock 02', sub: 'Creek Bottom', acres: 4.8, status: 'Resting', restDays: 32, forage: 'Orchard Grass Mix', biomass: 94, color: '#8a9a74' },
  { name: 'Paddock 03', sub: 'South Slope', acres: 2.9, status: 'Resting', restDays: 7, forage: 'Ryegrass / Chicory', biomass: 45, color: '#c4a265' },
  { name: 'Paddock 04A', sub: 'The Basin', acres: 4.5, status: 'Active', restDays: 0, forage: 'Mixed Perennial', biomass: 62, color: '#c4a265' },
  { name: 'Paddock 04B', sub: 'Basin East', acres: 3.1, status: 'Resting', restDays: 52, forage: 'Native Prairie', biomass: 98, color: '#8a9a74' },
  { name: 'Paddock 05', sub: 'Windbreak Corridor', acres: 2.4, status: 'Reserved', restDays: 90, forage: 'Silvopasture', biomass: 100, color: '#7a8a9a' },
];

const SCHEDULE = [
  { paddock: 'Paddock 04A', action: 'Move out', date: 'Apr 6', note: 'Target 3-day graze' },
  { paddock: 'Paddock 03', action: 'Move in', date: 'Apr 6', note: 'Minimum rest met' },
  { paddock: 'Paddock 01', action: 'Move in', date: 'Apr 10', note: 'Projected' },
  { paddock: 'Paddock 02', action: 'Hay cut', date: 'Apr 15', note: 'Excess biomass' },
];

export default function PaddockDesignDashboard({ project, onSwitchToMap }: PaddockDesignDashboardProps) {
  const siteData = useSiteData(project.id);

  const siteContext = useMemo(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils   = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;

    const growSeason = climate?.growing_season_days;
    const avgRest = growSeason
      ? Math.round(growSeason / PADDOCKS.length / 5) * 5
      : Math.round(PADDOCKS.filter((p) => p.restDays > 0).reduce((s, p) => s + p.restDays, 0) / PADDOCKS.filter((p) => p.restDays > 0).length);

    const drain   = soils?.drainage_class ?? null;
    const texture = soils?.predominant_texture ?? null;
    const soilNote = drain && texture ? `${texture}, ${drain.toLowerCase()}` : drain ?? texture ?? null;

    return { avgRest, soilNote };
  }, [siteData]);

  const totalAcres = PADDOCKS.reduce((s, p) => s + p.acres, 0);

  return (
    <div className={css.page}>
      <h1 className={css.title}>Paddock Design &amp; Layout</h1>
      <p className={css.desc}>
        Manage paddock boundaries, track rest periods, and plan rotational grazing
        sequences across the property.
      </p>

      {/* Summary stats */}
      <div className={css.summaryRow}>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>TOTAL PADDOCKS</span>
          <span className={css.summaryValue}>{PADDOCKS.length}</span>
        </div>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>TOTAL ACREAGE</span>
          <span className={css.summaryValue}>{totalAcres.toFixed(1)}</span>
        </div>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>AVG REST DAYS</span>
          <span className={css.summaryValue}>{siteContext.avgRest}</span>
        </div>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>ACTIVE PADDOCK</span>
          <span className={css.summaryValue}>04A</span>
        </div>
      </div>

      {siteContext.soilNote && (
        <p className={css.soilNote}>
          <span className={css.soilNoteLabel}>SITE SOILS:</span> {siteContext.soilNote}
        </p>
      )}

      {/* Paddock grid */}
      <div className={css.paddockGrid}>
        {PADDOCKS.map((p) => (
          <div key={p.name} className={css.paddockCard}>
            <div className={css.paddockCardHeader}>
              <div>
                <h3 className={css.paddockName}>{p.name}</h3>
                <span className={css.paddockSub}>{p.sub}</span>
              </div>
              <span className={css.paddockStatus} style={{ color: p.color, borderColor: p.color + '44', backgroundColor: p.color + '15' }}>
                {p.status}
              </span>
            </div>

            <div className={css.paddockMeta}>
              <div>
                <span className={css.metaLabel}>Acreage</span>
                <span className={css.metaValue}>{p.acres}</span>
              </div>
              <div>
                <span className={css.metaLabel}>Rest Days</span>
                <span className={css.metaValue}>{p.restDays}</span>
              </div>
            </div>

            <span className={css.forageType}>{p.forage}</span>

            <div className={css.biomassRow}>
              <span className={css.biomassLabel}>Biomass</span>
              <ProgressBar label="" value={p.biomass} color={p.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Rotation schedule */}
      <div className={css.scheduleSection}>
        <h3 className={css.scheduleTitle}>Upcoming Rotation Schedule</h3>
        <div className={css.scheduleTable}>
          <div className={css.scheduleHeaderRow}>
            <span>Paddock</span>
            <span>Action</span>
            <span>Date</span>
            <span>Note</span>
          </div>
          {SCHEDULE.map((s, i) => (
            <div key={i} className={css.scheduleRow}>
              <span className={css.scheduleCell}>{s.paddock}</span>
              <span className={css.scheduleCell}>{s.action}</span>
              <span className={css.scheduleCell}>{s.date}</span>
              <span className={css.scheduleCellMuted}>{s.note}</span>
            </div>
          ))}
        </div>
      </div>

      <button className={css.mapBtn} onClick={onSwitchToMap}>
        VIEW ON MAP
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
