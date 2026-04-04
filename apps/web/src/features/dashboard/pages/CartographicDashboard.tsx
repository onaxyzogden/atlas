/**
 * CartographicDashboard — Map layer management, survey data, coordinate systems.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import css from './CartographicDashboard.module.css';

interface CartographicDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const LAYERS = [
  { name: 'Topographic Contours', source: 'LiDAR HRDEM', status: 'Active', interval: '1m' },
  { name: 'Watershed Boundaries', source: 'Ontario Hydro Network', status: 'Active', interval: '—' },
  { name: 'Soil Classification', source: 'CanSIS / OMAFRA', status: 'Active', interval: '—' },
  { name: 'Flood Risk Zones', source: 'Conservation Authority', status: 'Active', interval: '—' },
  { name: 'Wetland Boundaries', source: 'OWES / MNRF', status: 'Pending', interval: '—' },
  { name: 'Aerial Orthophoto', source: 'Sentinel-2 / Planet', status: 'Active', interval: '10m' },
];

const SURVEYS = [
  { name: 'Property Boundary Survey', date: 'Mar 2024', accuracy: '±0.5m', provider: 'Ontario Parcel' },
  { name: 'Elevation Model', date: 'Jan 2024', accuracy: '±0.15m', provider: 'LiDAR HRDEM' },
  { name: 'Soil Sampling Grid', date: 'Oct 2023', accuracy: '50m grid', provider: 'Field Survey' },
];

export default function CartographicDashboard({ project, onSwitchToMap }: CartographicDashboardProps) {
  return (
    <div className={css.page}>
      <h1 className={css.title}>Cartographic Overview</h1>
      <p className={css.desc}>
        Manage spatial data layers, coordinate reference systems, and survey baselines
        for the property.
      </p>

      {/* Coordinate info */}
      <div className={css.coordCard}>
        <h3 className={css.sectionLabel}>COORDINATE REFERENCE</h3>
        <div className={css.coordGrid}>
          <div className={css.coordItem}>
            <span className={css.coordLabel}>Datum</span>
            <span className={css.coordValue}>NAD83 (CSRS)</span>
          </div>
          <div className={css.coordItem}>
            <span className={css.coordLabel}>Projection</span>
            <span className={css.coordValue}>UTM Zone 17N</span>
          </div>
          <div className={css.coordItem}>
            <span className={css.coordLabel}>Vertical Datum</span>
            <span className={css.coordValue}>CGVD2013</span>
          </div>
          <div className={css.coordItem}>
            <span className={css.coordLabel}>Property Area</span>
            <span className={css.coordValue}>{project.acreage ? `${project.acreage} ha` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Active layers */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>ACTIVE DATA LAYERS</h3>
        <div className={css.layerTable}>
          <div className={css.layerHeaderRow}>
            <span>Layer</span>
            <span>Source</span>
            <span>Resolution</span>
            <span>Status</span>
          </div>
          {LAYERS.map((l) => (
            <div key={l.name} className={css.layerRow}>
              <span className={css.layerName}>{l.name}</span>
              <span className={css.layerSource}>{l.source}</span>
              <span className={css.layerRes}>{l.interval}</span>
              <span className={l.status === 'Active' ? css.layerStatusActive : css.layerStatusPending}>{l.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Survey baselines */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SURVEY BASELINES</h3>
        <div className={css.surveyList}>
          {SURVEYS.map((s) => (
            <div key={s.name} className={css.surveyCard}>
              <h4 className={css.surveyName}>{s.name}</h4>
              <div className={css.surveyMeta}>
                <span>Date: <strong>{s.date}</strong></span>
                <span>Accuracy: <strong>{s.accuracy}</strong></span>
                <span>Provider: <strong>{s.provider}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className={css.mapBtn} onClick={onSwitchToMap}>
        OPEN MAP VIEW
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
