/**
 * TerrainDashboard — Elevation analysis, slope classification, aspect, drainage patterns.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import ProgressBar from '../components/ProgressBar.js';
import css from './TerrainDashboard.module.css';

interface TerrainDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SLOPE_CLASSES = [
  { label: 'Flat (0–2%)', value: 25, color: '#8a9a74' },
  { label: 'Gentle (2–8%)', value: 40, color: '#8a9a74' },
  { label: 'Moderate (8–15%)', value: 22, color: '#c4a265' },
  { label: 'Steep (15–30%)', value: 10, color: '#9a6a5a' },
  { label: 'Very Steep (>30%)', value: 3, color: '#9a6a5a' },
];

const ASPECT_DATA = [
  { direction: 'N', value: 12 },
  { direction: 'NE', value: 18 },
  { direction: 'E', value: 8 },
  { direction: 'SE', value: 15 },
  { direction: 'S', value: 22 },
  { direction: 'SW', value: 10 },
  { direction: 'W', value: 8 },
  { direction: 'NW', value: 7 },
];

export default function TerrainDashboard({ project, onSwitchToMap }: TerrainDashboardProps) {
  return (
    <div className={css.page}>
      <h1 className={css.title}>Terrain Analysis</h1>
      <p className={css.desc}>
        Digital elevation model analysis for slope classification, aspect distribution,
        and drainage pattern identification.
      </p>

      {/* Elevation summary */}
      <div className={css.elevGrid}>
        <div className={css.elevCard}>
          <span className={css.elevLabel}>HIGHEST POINT</span>
          <span className={css.elevValue}>412</span>
          <span className={css.elevUnit}>m ASL</span>
        </div>
        <div className={css.elevCard}>
          <span className={css.elevLabel}>LOWEST POINT</span>
          <span className={css.elevValue}>368</span>
          <span className={css.elevUnit}>m ASL</span>
        </div>
        <div className={css.elevCard}>
          <span className={css.elevLabel}>TOTAL RELIEF</span>
          <span className={css.elevValue}>44</span>
          <span className={css.elevUnit}>m</span>
        </div>
        <div className={css.elevCard}>
          <span className={css.elevLabel}>AVG SLOPE</span>
          <span className={css.elevValue}>6.2</span>
          <span className={css.elevUnit}>%</span>
        </div>
      </div>

      {/* Slope classification */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SLOPE CLASSIFICATION</h3>
        <div className={css.slopeCard}>
          {SLOPE_CLASSES.map((s) => (
            <ProgressBar key={s.label} label={`${s.label} — ${s.value}% of area`} value={s.value} color={s.color} />
          ))}
        </div>
      </div>

      {/* Aspect distribution */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>ASPECT DISTRIBUTION</h3>
        <div className={css.aspectCard}>
          <div className={css.aspectGrid}>
            {ASPECT_DATA.map((a) => (
              <div key={a.direction} className={css.aspectItem}>
                <span className={css.aspectDir}>{a.direction}</span>
                <div className={css.aspectBarTrack}>
                  <div className={css.aspectBarFill} style={{ width: `${(a.value / 25) * 100}%` }} />
                </div>
                <span className={css.aspectPct}>{a.value}%</span>
              </div>
            ))}
          </div>
          <p className={css.aspectNote}>
            South-facing slopes (22%) receive maximum solar exposure — ideal for warm-season crops
            and passive solar building orientation.
          </p>
        </div>
      </div>

      {/* Drainage patterns */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>DRAINAGE ANALYSIS</h3>
        <div className={css.drainageCard}>
          <div className={css.drainageRow}>
            <span className={css.drainageLabel}>Primary Drainage</span>
            <span className={css.drainageValue}>SW → Creek Bottom</span>
          </div>
          <div className={css.drainageRow}>
            <span className={css.drainageLabel}>Watershed</span>
            <span className={css.drainageValue}>Sixteen Mile Creek</span>
          </div>
          <div className={css.drainageRow}>
            <span className={css.drainageLabel}>Permeability</span>
            <span className={css.drainageValue}>Moderate (Silt Loam)</span>
          </div>
          <div className={css.drainageRow}>
            <span className={css.drainageLabel}>Erosion Risk</span>
            <span className={css.drainageValue} style={{ color: '#c4a265' }}>Low–Moderate</span>
          </div>
        </div>
      </div>

      <button className={css.mapBtn} onClick={onSwitchToMap}>
        VIEW TERRAIN ON MAP
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
