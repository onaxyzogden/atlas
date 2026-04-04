/**
 * EcologicalDashboard — Soil composition, F:B ratio (domain-contextual), sun exposure, ecological opportunities.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import ProgressBar from '../components/ProgressBar.js';
import css from './EcologicalDashboard.module.css';

interface EcologicalDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SOIL_COMPOSITION = [
  { label: 'Clay', value: 35, color: '#7a8a9a' },
  { label: 'Silt', value: 40, color: '#8a9a74' },
  { label: 'Sand', value: 20, color: '#c4a265' },
  { label: 'Organic Matter', value: 5, color: '#9a6a5a' },
];

const ZONE_FB_RATIOS = [
  { zone: 'Forest Sector A', fbRatio: '3.2:1', target: '2.0–5.0', status: 'Optimal', statusColor: '#8a9a74', context: 'Mycorrhizal networks active' },
  { zone: 'Pasture Paddock 01–04', fbRatio: '0.8:1', target: '0.5–1.5', status: 'Optimal', statusColor: '#8a9a74', context: 'Bacterial-dominant, grass-favoring' },
  { zone: 'Orchard Zone B', fbRatio: '1.8:1', target: '1.5–3.0', status: 'Optimal', statusColor: '#8a9a74', context: 'Transitional — fruit tree zone' },
  { zone: 'Riparian Buffer', fbRatio: '2.5:1', target: '2.0–4.0', status: 'Monitor', statusColor: '#c4a265', context: 'Sedge/willow corridor' },
];

const OPPORTUNITIES = [
  { icon: 'water', name: 'Water Harvesting', desc: 'Swale potential identified in Sector 3 lowlands' },
  { icon: 'tree', name: 'Agroforestry', desc: 'Windbreak expansion along NW corridor' },
  { icon: 'soil', name: 'Cover Cropping', desc: 'Winter cover recommended for Paddock 02–03' },
];

export default function EcologicalDashboard({ project, onSwitchToMap }: EcologicalDashboardProps) {
  return (
    <div className={css.page}>
      {/* Header */}
      <div className={css.headerRow}>
        <div>
          <span className={css.statusTag}>STATUS</span>
          <h1 className={css.title}>Regenerative Potential</h1>
        </div>
        <div className={css.scoreCard}>
          <span className={css.scoreValue}>85</span>
          <span className={css.scoreUnit}>/100</span>
        </div>
      </div>
      <p className={css.desc}>
        Soil health in the northern quadrant indicates <em>Excellent</em> carbon sequestration
        capacity and microbiome diversity.
      </p>

      {/* Soil Composition */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SOIL COMPOSITION</h3>
        <div className={css.soilBars}>
          {SOIL_COMPOSITION.map((s) => (
            <ProgressBar key={s.label} label={s.label} value={s.value} color={s.color} />
          ))}
        </div>
      </div>

      {/* F:B Ratio — domain-contextual */}
      <div className={css.fbSection}>
        <h3 className={css.sectionLabel}>FUNGI:BACTERIA RATIO — BY LAND USE</h3>
        <p className={css.fbNote}>
          F:B ratio interpretation varies by zone. Forest zones thrive with fungal-dominant soil,
          while pastures perform best with bacterial-dominant biology.
        </p>
        <div className={css.fbTable}>
          <div className={css.fbHeaderRow}>
            <span>Zone</span>
            <span>F:B Ratio</span>
            <span>Target Range</span>
            <span>Status</span>
          </div>
          {ZONE_FB_RATIOS.map((z) => (
            <div key={z.zone} className={css.fbRow}>
              <div>
                <span className={css.fbZone}>{z.zone}</span>
                <span className={css.fbContext}>{z.context}</span>
              </div>
              <span className={css.fbValue}>{z.fbRatio}</span>
              <span className={css.fbTarget}>{z.target}</span>
              <span className={css.fbStatus} style={{ color: z.statusColor }}>{z.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ecological Opportunities */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>ECOLOGICAL OPPORTUNITIES</h3>
        <div className={css.opportunityList}>
          {OPPORTUNITIES.map((o) => (
            <div key={o.name} className={css.opportunityItem}>
              <div className={css.opportunityIcon}>
                <OpportunityIcon type={o.icon} />
              </div>
              <div>
                <span className={css.opportunityName}>{o.name}</span>
                <span className={css.opportunityDesc}>{o.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className={css.surveyBtn}>
        NEW SURVEY
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="1" x2="7" y2="13" /><line x1="1" y1="7" x2="13" y2="7" />
        </svg>
      </button>
    </div>
  );
}

function OpportunityIcon({ type }: { type: string }) {
  const p = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'rgba(180,165,140,0.5)', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'water':
      return <svg {...p}><path d="M8 2C8 2 4 7 4 10C4 12.2 5.8 14 8 14C10.2 14 12 12.2 12 10C12 7 8 2 8 2Z" /></svg>;
    case 'tree':
      return <svg {...p}><path d="M8 1L4 7H6L3 13H13L10 7H12L8 1Z" /><line x1="8" y1="13" x2="8" y2="15" /></svg>;
    case 'soil':
      return <svg {...p}><line x1="2" y1="8" x2="14" y2="8" /><path d="M4 8V12" /><path d="M8 8V14" /><path d="M12 8V11" /><path d="M6 4C6 4 7 2 8 2C9 2 10 4 10 4" /></svg>;
    default:
      return <svg {...p}><circle cx="8" cy="8" r="4" /></svg>;
  }
}
