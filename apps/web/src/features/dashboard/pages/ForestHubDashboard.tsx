/**
 * ForestHubDashboard — Forest management with health index, alerts, maintenance schedule.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import css from './ForestHubDashboard.module.css';

interface ForestHubDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface SoilsSummary { organic_matter_pct?: number | string; drainage_class?: string; ph_range?: string; }
interface LandCoverSummary { tree_canopy_pct?: number | string; }
interface ClimateSummary { annual_precip_mm?: number; annual_temp_mean_c?: number; }

const ALERTS = [
  { type: 'warning', title: 'Irrigation System Alert', detail: 'PRESSURE DROP IN SECTOR B', color: '#c4a265' },
  { type: 'pest', title: 'Pest Activity Detected', detail: 'JAPANESE BEETLE IN ORCHARD A', color: '#9a6a5a' },
];

const MAINTENANCE = [
  { icon: 'mulch', title: 'Mulch Refresh', due: null },
  { icon: 'pruning', title: 'Pruning Window - Sector A', due: 'Due in 4 days' },
  { icon: 'audit', title: 'Nursery Stock Audit', due: null },
];

export default function ForestHubDashboard({ project, onSwitchToMap }: ForestHubDashboardProps) {
  const siteData = useSiteData(project.id);

  const forest = useMemo(() => {
    const soils    = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const landCover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;

    const omRaw    = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om       = isFinite(omRaw) ? omRaw : 4.5;
    const canopyRaw = parseFloat(String(landCover?.tree_canopy_pct ?? ''));
    const canopy   = isFinite(canopyRaw) ? canopyRaw : 45;
    const drain    = (soils?.drainage_class ?? '').toLowerCase();
    const ph       = soils?.ph_range ?? '';

    // Tree Health Index (0–99)
    const omBonus  = om >= 5 ? 15 : om >= 3 ? 10 : om >= 1 ? 6 : 2;
    const drainBonus = drain.includes('well') ? 8 : drain.includes('poor') ? 2 : 5;
    const healthIdx = Math.min(Math.max(Math.round(55 + (canopy / 100 * 20) + omBonus + drainBonus), 0), 99);

    // Canopy Vitality NDVI (0.00–0.95)
    const ndvi = Math.round((canopy / 100) * 0.9 * 100) / 100;

    // F:B Ratio
    const wellDrained = drain.includes('well');
    const fbRatio = (om >= 5 && wellDrained) ? '4.2:1' : om >= 3 ? '3.2:1' : '1.8:1';

    // Mycorrhizal colonization (%)
    const mycOm = om >= 5 ? 20 : om >= 3 ? 15 : 5;
    const mycDrain = wellDrained ? 8 : 0;
    const myc = Math.min(Math.max(50 + mycOm + mycDrain, 0), 95);

    // Nutrient balance from pH
    let nutrients = 'Balanced';
    if (ph) {
      if (/^[45]\./.test(ph)) nutrients = 'Slightly Acidic';
      else if (/^[89]\./.test(ph)) nutrients = 'Alkaline';
    }

    // Soil moisture proxy from drainage
    const soilMoisture = wellDrained ? '18–22' : drain.includes('poor') ? '30–40' : '24–30';

    return { healthIdx, ndvi, fbRatio, myc, nutrients, soilMoisture, om, canopy };
  }, [siteData]);

  const healthLabel = forest.healthIdx >= 90 ? 'OPTIMAL' : forest.healthIdx >= 75 ? 'GOOD' : 'MONITOR';

  return (
    <div className={css.page}>
      {/* Alerts */}
      <div className={css.alertStack}>
        {ALERTS.map((a, i) => (
          <div key={i} className={css.alertCard} style={{ borderLeftColor: a.color + '66' }}>
            <span className={css.alertIcon} style={{ color: a.color }}>
              {a.type === 'warning' ? (
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="6.5" /><line x1="8" y1="5" x2="8" y2="8.5" /><circle cx="8" cy="11" r="0.5" fill="currentColor" />
                </svg>
              ) : (
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 1C5 4 3 6 3 9C3 11.8 5.2 14 8 14C10.8 14 13 11.8 13 9C13 6 11 4 8 1Z" />
                </svg>
              )}
            </span>
            <div>
              <span className={css.alertTitle}>{a.title}</span>
              <span className={css.alertDetail}>{a.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Management status header */}
      <div className={css.statusHeader}>
        <span className={css.statusTag}>MANAGEMENT STATUS</span>
        <h1 className={css.sectorTitle}>Sector 02</h1>
        <span className={css.sectorSub}>Active Monitoring</span>
      </div>

      {/* Tree Health Index */}
      <div className={css.healthCard}>
        <span className={css.healthLabel}>TREE HEALTH INDEX</span>
        <div className={css.gaugeWrapper}>
          <svg viewBox="0 0 120 120" width={120} height={120}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#8a9a74" strokeWidth="8"
              strokeDasharray={`${forest.healthIdx * 3.14} ${100 * 3.14}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)" />
          </svg>
          <div className={css.gaugeText}>
            <span className={css.gaugeValue}>{forest.healthIdx}%</span>
            <span className={css.gaugeLabel}>{healthLabel}</span>
          </div>
        </div>
        <span className={css.gaugeTrend}>Based on site soil &amp; canopy data</span>
      </div>

      {/* Operational Data */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>OPERATIONAL DATA</h3>
        <div className={css.dataList}>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Soil Moisture</span>
            <span className={css.dataValue}>{forest.soilMoisture} <span className={css.dataUnit}>cb</span></span>
          </div>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Canopy Vitality</span>
            <span className={css.dataValue}>{forest.ndvi.toFixed(2)} <span className={css.dataUnit}>NDVI</span></span>
          </div>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Leaf Nutrient Levels</span>
            <span className={css.dataValue}>{forest.nutrients}</span>
          </div>
        </div>
      </div>

      {/* Soil context — F:B ratio for forestry */}
      <div className={css.soilCard}>
        <h3 className={css.sectionLabel}>SOIL BIOLOGY — FOREST CONTEXT</h3>
        <div className={css.dataList}>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Fungi:Bacteria Ratio</span>
            <span className={css.dataValue}>{forest.fbRatio} <span className={css.dataOptimal}>Optimal</span></span>
          </div>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Mycorrhizal Colonization</span>
            <span className={css.dataValue}>{forest.myc}% <span className={css.dataUnit}>of roots</span></span>
          </div>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Target F:B Range</span>
            <span className={css.dataValue}>2.0 — 5.0 <span className={css.dataUnit}>for forest</span></span>
          </div>
        </div>
      </div>

      {/* Upcoming Maintenance */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>UPCOMING MAINTENANCE</h3>
        <div className={css.maintenanceList}>
          {MAINTENANCE.map((m, i) => (
            <div key={i} className={css.maintenanceItem}>
              <div className={css.maintenanceIcon}>
                <MaintenanceIcon type={m.icon} />
              </div>
              <div>
                <span className={css.maintenanceTitle}>{m.title}</span>
                {m.due && <span className={css.maintenanceDue}>{m.due}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className={css.ctaBtn} onClick={onSwitchToMap}>
        INITIATE MAINTENANCE PLAN
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}

function MaintenanceIcon({ type }: { type: string }) {
  const p = { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', stroke: 'rgba(180,165,140,0.5)', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'mulch':
      return <svg {...p}><path d="M1 11L4 5L7 8L10 3L13 11" /><line x1="1" y1="11" x2="13" y2="11" /></svg>;
    case 'pruning':
      return <svg {...p}><circle cx="5" cy="5" r="3" /><line x1="7.5" y1="7.5" x2="12" y2="12" /></svg>;
    case 'audit':
      return <svg {...p}><rect x="2" y="1" width="10" height="12" rx="1" /><line x1="5" y1="5" x2="9" y2="5" /><line x1="5" y1="7.5" x2="9" y2="7.5" /><line x1="5" y1="10" x2="7" y2="10" /></svg>;
    default:
      return <svg {...p}><circle cx="7" cy="7" r="3" /></svg>;
  }
}
