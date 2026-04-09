/**
 * LivestockDashboard — Inventory & Health Ledger with herd cards, analytics, activity logs.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import SimpleBarChart from '../components/SimpleBarChart.js';
import css from './LivestockDashboard.module.css';

interface LivestockDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ClimateSummary { annual_temp_mean_c?: number; growing_season_days?: number; hardiness_zone?: string; }
interface SoilsSummary { organic_matter_pct?: number | string; }

const HERDS = [
  {
    name: 'Cattle Herd A',
    breed: 'ANGUS CROSS \u2022 NORTH RANGE',
    status: 'OPTIMAL',
    statusColor: '#8a9a74',
    headCount: 142,
    lastCheck: '2d ago',
    bcs: '6.2 (Avg)',
    parasiteLoad: null,
  },
  {
    name: 'Sheep Flock B',
    breed: 'DORPER \u2022 WILLOW CREEK',
    status: 'MONITOR',
    statusColor: '#c4a265',
    headCount: 385,
    lastCheck: 'Tomorrow',
    bcs: null,
    parasiteLoad: 'Moderate',
  },
];

const RECENT_LOGS = [
  { icon: 'vaccine', title: 'BVDV Vaccination Booster', detail: 'OCT 12 \u2022 142 HEAD TREATED', color: '#7a8a9a' },
  { icon: 'supplement', title: 'Kelp-Mineral Supplement Refresh', detail: 'OCT 09 \u2022 PADDOCK 4A', color: '#8a9a74' },
  { icon: 'rotation', title: 'Paddock Rotation: 3B to 4A', detail: 'OCT 05 \u2022 3 DAYS REST GOAL', color: '#c4a265' },
];

export default function LivestockDashboard({ project, onSwitchToMap }: LivestockDashboardProps) {
  const siteData = useSiteData(project.id);

  const pasture = useMemo(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils   = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;

    const omRaw  = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om     = isFinite(omRaw) ? omRaw : 3.5;
    const growSeason = climate?.growing_season_days ?? 165;
    const zone       = climate?.hardiness_zone ?? null;

    const forageQuality = (om >= 5 && growSeason > 180) ? 'High Quality'
      : om >= 3 ? 'Good'
      : 'Moderate';

    const seasonNote = zone
      ? `${growSeason}-day growing season · Hardiness zone ${zone}`
      : `${growSeason}-day growing season`;

    return { forageQuality, seasonNote };
  }, [siteData]);

  return (
    <div className={css.page}>
      {/* Hero */}
      <h1 className={css.title}>
        Livestock Inventory <span className={css.titleAmp}>&amp;</span> Health Ledger
      </h1>
      <p className={css.desc}>
        Centralized records for regenerative management. Track animal density, health
        interventions, and performance across the OGDEN landscape.
      </p>

      {/* Active Herds & Flocks */}
      <div className={css.sectionHeader}>
        <h2 className={css.sectionTitle}>Active Herds &amp; Flocks</h2>
        <div className={css.sectionControls}>
          <span className={css.filterLabel}>FILTER: ALL SPECIES</span>
          <span className={css.sortLabel}>SORT: HEALTH STATUS</span>
        </div>
      </div>

      <div className={css.herdRow}>
        {HERDS.map((herd) => (
          <div key={herd.name} className={css.herdCard}>
            <div className={css.herdCardHeader}>
              <span className={css.herdCardLabel}>ACTIVE STOCK</span>
              <span className={css.herdStatusBadge} style={{ backgroundColor: herd.statusColor + '22', color: herd.statusColor, borderColor: herd.statusColor + '44' }}>
                {herd.status}
              </span>
            </div>
            <h3 className={css.herdName}>{herd.name}</h3>
            <span className={css.herdBreed}>{herd.breed}</span>

            <div className={css.herdStats}>
              <div>
                <span className={css.herdStatLabel}>TOTAL HEAD</span>
                <span className={css.herdStatValue}>{herd.headCount}</span>
              </div>
              <div>
                <span className={css.herdStatLabel}>{herd.bcs ? 'LAST CHECK' : 'NEXT CHECK'}</span>
                <span className={css.herdStatValue}>{herd.lastCheck}</span>
              </div>
            </div>

            {herd.bcs && (
              <div className={css.herdFooter}>
                <span>Body Condition</span>
                <strong>{herd.bcs}</strong>
              </div>
            )}
            {herd.parasiteLoad && (
              <div className={css.herdFooter}>
                <span>Parasite Load</span>
                <strong>{herd.parasiteLoad}</strong>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detailed Ledger */}
      <div className={css.ledgerSection}>
        <div className={css.ledgerHeader}>
          <div>
            <span className={css.ledgerTag}>DETAILED LEDGER</span>
            <h3 className={css.ledgerTitle}>Cattle Herd A: Health Analytics</h3>
          </div>
          <button className={css.logActivityBtn}>LOG NEW ACTIVITY</button>
        </div>

        <div className={css.ledgerGrid}>
          {/* Weight Trends */}
          <div className={css.ledgerCard}>
            <h4 className={css.ledgerCardTitle}>Weight Trends</h4>
            <SimpleBarChart
              data={[
                { label: 'MAY', value: 52, color: 'rgba(138,154,116,0.45)' },
                { label: 'JUN', value: 58, color: 'rgba(138,154,116,0.5)' },
                { label: 'JUL', value: 64, color: 'rgba(138,154,116,0.55)' },
                { label: 'AUG', value: 71, color: 'rgba(138,154,116,0.65)' },
                { label: 'SEP', value: 78, color: 'rgba(138,154,116,0.75)' },
                { label: 'OCT', value: 85, color: '#8a9a74' },
              ]}
              height={180}
            />
            <p className={css.trendNote}>
              Daily average gain (ADG) is tracking +2.4 lbs/day since North Range rotation.
              Forage quality: <strong>{pasture.forageQuality}</strong>.
            </p>
            <p className={css.trendNote} style={{ marginTop: 4 }}>{pasture.seasonNote}</p>
          </div>

          {/* Recent Logs */}
          <div className={css.ledgerCard}>
            <h4 className={css.ledgerCardTitle}>Recent Logs</h4>
            <div className={css.logsList}>
              {RECENT_LOGS.map((log, i) => (
                <div key={i} className={css.logItem}>
                  <div className={css.logIcon} style={{ borderColor: log.color + '55' }}>
                    <LogIcon type={log.icon} color={log.color} />
                  </div>
                  <div className={css.logContent}>
                    <span className={css.logTitle}>{log.title}</span>
                    <span className={css.logDetail}>{log.detail}</span>
                  </div>
                  <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="5 2 10 7 5 12" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogIcon({ type, color }: { type: string; color: string }) {
  const p = { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'vaccine':
      return <svg {...p}><path d="M7 1V13" /><path d="M4 4H10" /><circle cx="7" cy="7" r="2" /></svg>;
    case 'supplement':
      return <svg {...p}><path d="M7 1C7 1 3 6 3 9C3 11.2 4.8 13 7 13C9.2 13 11 11.2 11 9C11 6 7 1 7 1Z" /></svg>;
    case 'rotation':
      return <svg {...p}><circle cx="7" cy="7" r="5" /><path d="M7 2C9.8 2 12 4.2 12 7" /><polyline points="10 5 12 7 14 5" /></svg>;
    default:
      return <svg {...p}><circle cx="7" cy="7" r="3" /></svg>;
  }
}
